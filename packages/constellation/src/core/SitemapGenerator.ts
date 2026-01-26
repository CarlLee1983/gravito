import type {
  ShardInfo,
  ShardManifest,
  SitemapEntry,
  SitemapProvider,
  SitemapStorage,
  SitemapStreamOptions,
} from '../types'
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
      const xml = currentStream.toXML()
      const entries = currentStream.getEntries()

      shards.push({
        filename,
        from: this.normalizeUrl(entries[0].url),
        to: this.normalizeUrl(entries[entries.length - 1].url),
        count: entries.length,
        lastmod: new Date(),
      })

      if (this.shadowProcessor) {
        await this.shadowProcessor.addOperation({ filename, content: xml })
      } else {
        await this.options.storage.write(filename, xml)
      }

      const url = this.options.storage.getUrl(filename)
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
      const processEntry = async (entry: any) => {
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
        for await (const entry of entries as AsyncIterable<any>) {
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
      const xml = currentStream.toXML()
      const entries = currentStream.getEntries()

      shards.push({
        filename: this.options.filename!,
        from: entries[0] ? this.normalizeUrl(entries[0].url) : '',
        to: entries[entries.length - 1] ? this.normalizeUrl(entries[entries.length - 1].url) : '',
        count: entries.length,
        lastmod: new Date(),
      })

      if (this.shadowProcessor) {
        await this.shadowProcessor.addOperation({
          filename: this.options.filename!,
          content: xml,
        })
        await writeManifest()
        await this.shadowProcessor.commit()
      } else {
        await this.options.storage.write(this.options.filename!, xml)
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
