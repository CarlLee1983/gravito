import type {
  CompressionOptions,
  ShardInfo,
  ShardManifest,
  SitemapEntry,
  SitemapProvider,
  SitemapStorage,
  SitemapStreamOptions,
} from '../types'
import { compressToBuffer, toGzipFilename } from '../utils/Compression'
import type { ShadowProcessor } from './ShadowProcessor'
import { ShadowProcessor as ShadowProcessorImpl } from './ShadowProcessor'
import { SitemapIndex } from './SitemapIndex'
import { SitemapStream } from './SitemapStream'

/**
 * Options for configuring the `SitemapGenerator`.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapGeneratorOptions extends SitemapStreamOptions {
  /** The storage backend where the sitemap files will be written. */
  storage: SitemapStorage
  /** An array of providers that supply the entries to be included in the sitemap. */
  providers: SitemapProvider[]
  /** Maximum number of entries per individual sitemap file. @default 50000 */
  maxEntriesPerFile?: number
  /** The name of the main sitemap or sitemap index file. @default 'sitemap.xml' */
  filename?: string
  /** Whether to generate a shard manifest file. @default false */
  generateManifest?: boolean
  /** Configuration for staging files before atomic deployment. */
  shadow?: {
    /** Whether shadow processing is enabled. */
    enabled: boolean
    /** Deployment mode: 'atomic' or 'versioned'. */
    mode: 'atomic' | 'versioned'
  }
  /** Optional callback to track generation progress. */
  onProgress?: (progress: { processed: number; total: number; percentage: number }) => void
  /** Compression configuration for reducing sitemap file sizes. @since 3.1.0 */
  compression?: CompressionOptions
}

/**
 * SitemapGenerator is the primary orchestrator for creating sitemaps in Gravito.
 *
 * It coordinates multiple `SitemapProvider`s, handles file sharding when
 * URL limits are reached, and uses a `ShadowProcessor` for atomic deployments.
 * It automatically generates a sitemap index if multiple files are produced.
 *
 * @example
 * ```typescript
 * const generator = new SitemapGenerator({
 *   baseUrl: 'https://example.com',
 *   storage: new DiskSitemapStorage('./public'),
 *   providers: [new RouteScanner()]
 * });
 * await generator.run();
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class SitemapGenerator {
  private options: SitemapGeneratorOptions
  private shadowProcessor: ShadowProcessor | null = null

  constructor(options: SitemapGeneratorOptions) {
    this.options = {
      maxEntriesPerFile: 50000,
      filename: 'sitemap.xml',
      ...options,
    }

    // Initialize shadow processor
    if (this.options.shadow?.enabled) {
      this.shadowProcessor = new ShadowProcessorImpl({
        storage: this.options.storage,
        mode: this.options.shadow.mode,
        enabled: true,
      })
    }
  }

  /**
   * Orchestrates the sitemap generation process.
   *
   * This method scans all providers, handles sharding, generates the XML files,
   * and optionally creates a sitemap index and manifest.
   */
  async run(): Promise<void> {
    let shardIndex = 1
    let currentCount = 0
    let currentStream = new SitemapStream({
      baseUrl: this.options.baseUrl,
      pretty: this.options.pretty,
    })

    const index = new SitemapIndex({
      baseUrl: this.options.baseUrl,
      pretty: this.options.pretty,
    })

    const shards: ShardInfo[] = []
    let isMultiFile = false

    const flushShard = async () => {
      isMultiFile = true

      const baseName = this.options.filename?.replace(/\.xml$/, '')
      const filename = `${baseName}-${shardIndex}.xml`
      const entries = currentStream.getEntries()

      let actualFilename: string

      if (this.shadowProcessor) {
        // Shadow processor 需要完整內容，使用 toXML()
        // Shadow 需要手動處理 .gz 檔名
        actualFilename = this.options.compression?.enabled ? toGzipFilename(filename) : filename
        const xml = currentStream.toXML()
        await this.shadowProcessor.addOperation({ filename: actualFilename, content: xml })
      } else {
        // 直接寫入使用串流方法，writeSitemap 會回傳實際檔名
        actualFilename = await this.writeSitemap(currentStream, filename)
      }

      shards.push({
        filename: actualFilename,
        from: this.normalizeUrl(entries[0].url),
        to: this.normalizeUrl(entries[entries.length - 1].url),
        count: entries.length,
        lastmod: new Date(),
      })

      const url = this.options.storage.getUrl(actualFilename)
      index.add({
        url: url,
        lastmod: new Date(),
      })

      shardIndex++
      currentCount = 0
      currentStream = new SitemapStream({
        baseUrl: this.options.baseUrl,
        pretty: this.options.pretty,
      })
    }

    const { providers, maxEntriesPerFile } = this.options

    for (const provider of providers) {
      const entries = await provider.getEntries()

      // Helper to process a single entry
      const processEntry = async (entry: SitemapEntry) => {
        currentStream.add(entry)
        currentCount++

        if (currentCount >= maxEntriesPerFile!) {
          await flushShard()
        }
      }

      if (Array.isArray(entries)) {
        for (const entry of entries) {
          await processEntry(entry)
        }
      } else if (entries && typeof (entries as any)[Symbol.asyncIterator] === 'function') {
        for await (const entry of entries as AsyncIterable<SitemapEntry>) {
          await processEntry(entry)
        }
      }
    }

    const writeManifest = async () => {
      if (!this.options.generateManifest) return

      const manifest: ShardManifest = {
        version: 1,
        generatedAt: new Date(),
        baseUrl: this.options.baseUrl,
        maxEntriesPerShard: this.options.maxEntriesPerFile!,
        sort: 'url-lex',
        shards,
      }

      const manifestFilename =
        this.options.filename?.replace(/\.xml$/, '-manifest.json') || 'sitemap-manifest.json'
      const content = JSON.stringify(manifest, null, this.options.pretty ? 2 : 0)

      if (this.shadowProcessor) {
        await this.shadowProcessor.addOperation({ filename: manifestFilename, content })
      } else {
        await this.options.storage.write(manifestFilename, content)
      }
    }

    if (!isMultiFile) {
      const entries = currentStream.getEntries()
      let actualFilename: string

      if (this.shadowProcessor) {
        // Shadow processor 需要完整內容，使用 toXML()
        // Shadow 需要手動處理 .gz 檔名
        actualFilename = this.options.compression?.enabled
          ? toGzipFilename(this.options.filename!)
          : this.options.filename!
        const xml = currentStream.toXML()
        await this.shadowProcessor.addOperation({
          filename: actualFilename,
          content: xml,
        })
      } else {
        // 直接寫入使用串流方法，writeSitemap 會回傳實際檔名
        actualFilename = await this.writeSitemap(currentStream, this.options.filename!)
      }

      // 必須在 writeManifest 之前 push，因為 manifest 需要 shards 陣列
      shards.push({
        filename: actualFilename,
        from: entries[0] ? this.normalizeUrl(entries[0].url) : '',
        to: entries[entries.length - 1] ? this.normalizeUrl(entries[entries.length - 1].url) : '',
        count: entries.length,
        lastmod: new Date(),
      })

      if (this.shadowProcessor) {
        await writeManifest()
        await this.shadowProcessor.commit()
      } else {
        await writeManifest()
      }

      return
    }

    if (currentCount > 0) {
      await flushShard()
    }

    const indexXml = index.toXML()

    if (this.shadowProcessor) {
      await this.shadowProcessor.addOperation({
        filename: this.options.filename!,
        content: indexXml,
      })
      await writeManifest()
      await this.shadowProcessor.commit()
    } else {
      await this.options.storage.write(this.options.filename!, indexXml)
      await writeManifest()
    }
  }

  /**
   * 統一的 sitemap 寫入方法，優先使用串流寫入以降低記憶體使用。
   *
   * @param stream - SitemapStream 實例
   * @param filename - 檔案名稱（不含 .gz）
   * @returns 實際寫入的檔名（可能包含 .gz）
   * @since 3.1.0
   */
  private async writeSitemap(stream: SitemapStream, filename: string): Promise<string> {
    const { storage, compression } = this.options
    const compress = compression?.enabled ?? false

    // 優先使用串流寫入（如果 storage 支援）
    // Storage 會負責處理 .gz 檔名
    if (storage.writeStream) {
      await storage.writeStream(filename, stream.toAsyncIterable(), {
        compress,
        contentType: 'application/xml',
      })
    } else {
      // 回退到字串寫入 - 需要手動處理壓縮和檔名
      const xml = stream.toXML()
      if (compress) {
        const buffer = await compressToBuffer(
          (async function* () {
            yield xml
          })(),
          { level: compression?.level }
        )
        await storage.write(toGzipFilename(filename), buffer.toString('base64'))
      } else {
        await storage.write(filename, xml)
      }
    }

    // 回傳實際檔名
    return compress ? toGzipFilename(filename) : filename
  }

  /**
   * Normalizes a URL to an absolute URL using the base URL.
   */
  private normalizeUrl(url: string): string {
    if (url.startsWith('http')) {
      return url
    }
    const { baseUrl } = this.options
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    const normalizedPath = url.startsWith('/') ? url : `/${url}`
    return normalizedBase + normalizedPath
  }

  /**
   * Returns the shadow processor instance if enabled.
   */
  getShadowProcessor(): ShadowProcessor | null {
    return this.shadowProcessor
  }
}
