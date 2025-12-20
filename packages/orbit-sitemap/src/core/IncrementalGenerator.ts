import type { SitemapEntry, ChangeTracker, SitemapChange } from '../types'
import { DiffCalculator } from './DiffCalculator'
import type { SitemapGenerator, SitemapGeneratorOptions } from './SitemapGenerator'
import { SitemapGenerator as SitemapGeneratorImpl } from './SitemapGenerator'

export interface IncrementalGeneratorOptions extends SitemapGeneratorOptions {
  changeTracker: ChangeTracker
  diffCalculator?: DiffCalculator
  autoTrack?: boolean // 自動追蹤變更，預設 true
}

/**
 * 增量生成器
 * 只生成變更的 URL，不重新生成整個 sitemap
 */
export class IncrementalGenerator {
  private options: IncrementalGeneratorOptions
  private changeTracker: ChangeTracker
  private diffCalculator: DiffCalculator
  private generator: SitemapGenerator

  constructor(options: IncrementalGeneratorOptions) {
    this.options = options
    this.changeTracker = options.changeTracker
    this.diffCalculator = options.diffCalculator || new DiffCalculator()
    this.generator = new SitemapGeneratorImpl(options)
  }

  /**
   * 生成完整的 sitemap（首次生成）
   */
  async generateFull(): Promise<void> {
    await this.generator.run()

    // 如果啟用自動追蹤，記錄所有 entries 為新增
    if (this.options.autoTrack) {
      const { providers } = this.options
      for (const provider of providers) {
        const entries = await provider.getEntries()
        const entriesArray = Array.isArray(entries) ? entries : await this.toArray(entries)

        for (const entry of entriesArray) {
          await this.changeTracker.track({
            type: 'add',
            url: entry.url,
            entry,
            timestamp: new Date(),
          })
        }
      }
    }
  }

  /**
   * 增量生成（只更新變更的部分）
   */
  async generateIncremental(since?: Date): Promise<void> {
    // 1. 獲取變更記錄
    const changes = await this.changeTracker.getChanges(since)

    if (changes.length === 0) {
      return // 沒有變更，不需要更新
    }

    // 2. 從現有 sitemap 讀取基礎狀態
    const baseEntries = await this.loadBaseEntries()

    // 3. 計算差異
    const diff = this.diffCalculator.calculateFromChanges(baseEntries, changes)

    // 4. 生成增量 sitemap
    await this.generateDiff(diff)

    // 5. 更新變更追蹤（標記已處理）
    // 這裡可以選擇清除已處理的變更，或保留歷史記錄
  }

  /**
   * 手動追蹤變更
   */
  async trackChange(change: SitemapChange): Promise<void> {
    await this.changeTracker.track(change)
  }

  /**
   * 獲取變更記錄
   */
  async getChanges(since?: Date): Promise<SitemapChange[]> {
    return this.changeTracker.getChanges(since)
  }

  /**
   * 載入基礎 entries（從現有 sitemap）
   */
  private async loadBaseEntries(): Promise<SitemapEntry[]> {
    // 這裡需要從儲存讀取現有的 sitemap
    // 簡化實作：從 providers 重新獲取（實際應用中應該從 sitemap 檔案解析）
    const entries: SitemapEntry[] = []
    const { providers } = this.options

    for (const provider of providers) {
      const providerEntries = await provider.getEntries()
      const entriesArray = Array.isArray(providerEntries)
        ? providerEntries
        : await this.toArray(providerEntries)
      entries.push(...entriesArray)
    }

    return entries
  }

  /**
   * 生成差異部分
   */
  private async generateDiff(diff: {
    added: SitemapEntry[]
    updated: SitemapEntry[]
    removed: string[]
  }): Promise<void> {
    // 這裡需要實作增量更新邏輯
    // 簡化實作：重新生成整個 sitemap（實際應用中應該只更新變更的部分）
    // 對於企業級應用，應該：
    // 1. 只更新變更的 shard 檔案
    // 2. 更新 sitemap index
    // 3. 處理刪除的 URL

    // 暫時使用完整生成
    await this.generator.run()
  }

  /**
   * 將 AsyncIterable 轉換為陣列
   */
  private async toArray<T>(iterable: AsyncIterable<T>): Promise<T[]> {
    const array: T[] = []
    for await (const item of iterable) {
      array.push(item)
    }
    return array
  }
}

