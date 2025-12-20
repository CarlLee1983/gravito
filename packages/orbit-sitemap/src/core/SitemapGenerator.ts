import type { SitemapProvider, SitemapStorage, SitemapStreamOptions } from '../types'
import { SitemapIndex } from './SitemapIndex'
import { SitemapStream } from './SitemapStream'
import type { ShadowProcessor, ShadowProcessorOptions } from './ShadowProcessor'
import { ShadowProcessor as ShadowProcessorImpl } from './ShadowProcessor'

export interface SitemapGeneratorOptions extends SitemapStreamOptions {
  storage: SitemapStorage
  providers: SitemapProvider[]
  maxEntriesPerFile?: number // Default 50000
  filename?: string // Default 'sitemap.xml' (index)
  shadow?: {
    enabled: boolean
    mode: 'atomic' | 'versioned'
  }
  onProgress?: (progress: { processed: number; total: number; percentage: number }) => void
}

export class SitemapGenerator {
  private options: SitemapGeneratorOptions
  private shadowProcessor: ShadowProcessor | null = null

  constructor(options: SitemapGeneratorOptions) {
    this.options = {
      maxEntriesPerFile: 50000,
      filename: 'sitemap.xml',
      ...options,
    }

    // 初始化影子處理器
    if (this.options.shadow?.enabled) {
      this.shadowProcessor = new ShadowProcessorImpl({
        storage: this.options.storage,
        mode: this.options.shadow.mode,
        enabled: true,
      })
    }
  }

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

    const flushShard = async () => {
      if (currentCount === 0) {
        return
      }

      const baseName = this.options.filename?.replace(/\.xml$/, '')
      const filename = `${baseName}-${shardIndex}.xml`
      const xml = currentStream.toXML()

      // 使用影子處理器（如果啟用）
      if (this.shadowProcessor) {
        await this.shadowProcessor.addOperation({ filename, content: xml })
      } else {
        await this.options.storage.write(filename, xml)
      }

      const url = this.options.storage.getUrl(filename)
      // Extract public URL path if possible, or just use absolute URL
      // SitemapIndex usually expects absolute URLs.
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

    // Flush remaining
    await flushShard()

    // Write Index
    const indexXml = index.toXML()
    
    // 使用影子處理器（如果啟用）
    if (this.shadowProcessor) {
      await this.shadowProcessor.addOperation({ filename: this.options.filename!, content: indexXml })
      // 提交所有影子操作
      await this.shadowProcessor.commit()
    } else {
      await this.options.storage.write(this.options.filename!, indexXml)
    }
  }

  /**
   * 獲取影子處理器（如果啟用）
   */
  getShadowProcessor(): ShadowProcessor | null {
    return this.shadowProcessor
  }
}
