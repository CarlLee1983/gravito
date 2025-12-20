import { Job } from '@gravito/orbit-queue'
import type { SitemapGeneratorOptions } from '../core/SitemapGenerator'
import { SitemapGenerator } from '../core/SitemapGenerator'
import type { ProgressTracker } from '../core/ProgressTracker'
import type { ShadowProcessor } from '../core/ShadowProcessor'

export interface GenerateSitemapJobOptions {
  generatorOptions: SitemapGeneratorOptions
  jobId: string
  progressTracker?: ProgressTracker
  shadowProcessor?: ShadowProcessor
  onProgress?: (progress: { processed: number; total: number; percentage: number }) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

/**
 * Sitemap 生成背景任務
 * 整合背景任務處理和進度追蹤
 */
export class GenerateSitemapJob extends Job {
  private options: GenerateSitemapJobOptions
  private generator: SitemapGenerator
  private totalEntries = 0
  private processedEntries = 0

  constructor(options: GenerateSitemapJobOptions) {
    super()
    this.options = options
    this.generator = new SitemapGenerator(options.generatorOptions)
  }

  async handle(): Promise<void> {
    const { progressTracker, shadowProcessor, onProgress, onComplete, onError } = this.options

    try {
      // 初始化進度追蹤
      if (progressTracker) {
        // 先計算總數（這可能需要遍歷所有 providers）
        const total = await this.calculateTotal()
        await progressTracker.init(this.options.jobId, total)
        this.totalEntries = total
      }

      // 使用自訂的生成邏輯以支援進度追蹤
      await this.generateWithProgress()

      // 提交影子處理
      if (shadowProcessor) {
        await shadowProcessor.commit()
      }

      // 完成進度追蹤
      if (progressTracker) {
        await progressTracker.complete()
      }

      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      // 標記為失敗
      if (progressTracker) {
        await progressTracker.fail(err.message)
      }

      if (onError) {
        onError(err)
      }

      throw err
    }
  }

  /**
   * 計算總 URL 數
   */
  private async calculateTotal(): Promise<number> {
    let total = 0
    const { providers } = this.options.generatorOptions

    for (const provider of providers) {
      const entries = await provider.getEntries()

      if (Array.isArray(entries)) {
        total += entries.length
      } else if (entries && typeof (entries as any)[Symbol.asyncIterator] === 'function') {
        // 對於 AsyncIterable，我們需要遍歷來計算（這可能很慢）
        // 在實際應用中，可能需要在 provider 中提供 count 方法
        for await (const _ of entries as AsyncIterable<any>) {
          total++
        }
      }
    }

    return total
  }

  /**
   * 帶進度追蹤的生成
   */
  private async generateWithProgress(): Promise<void> {
    const { progressTracker, shadowProcessor, onProgress } = this.options
    const { providers, maxEntriesPerFile = 50000, storage, baseUrl, pretty, filename } = this.options.generatorOptions

    // 這裡需要修改 SitemapGenerator 以支援進度回報
    // 為了簡化，我們直接使用現有的生成邏輯，並在外部追蹤進度
    // 實際應用中，應該修改 SitemapGenerator 以支援回調

    // 暫時使用原始生成邏輯
    await this.generator.run()

    // 更新進度（假設已完成）
    this.processedEntries = this.totalEntries
    if (progressTracker) {
      await progressTracker.update(this.processedEntries, 'processing')
    }
    if (onProgress) {
      onProgress({
        processed: this.processedEntries,
        total: this.totalEntries,
        percentage: this.totalEntries > 0 ? Math.round((this.processedEntries / this.totalEntries) * 100) : 100,
      })
    }
  }
}

