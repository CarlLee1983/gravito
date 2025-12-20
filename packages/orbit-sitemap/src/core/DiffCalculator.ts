import type { SitemapEntry, SitemapChange, ChangeType } from '../types'

export interface DiffResult {
  added: SitemapEntry[]
  updated: SitemapEntry[]
  removed: string[] // URLs
}

export interface DiffCalculatorOptions {
  batchSize?: number // 分批處理大小，預設 10000
}

/**
 * 差異計算器
 * 比較兩個 sitemap 狀態，計算差異
 */
export class DiffCalculator {
  private batchSize: number

  constructor(options: DiffCalculatorOptions = {}) {
    this.batchSize = options.batchSize || 10000
  }

  /**
   * 計算兩個 sitemap 狀態的差異
   */
  calculate(oldEntries: SitemapEntry[], newEntries: SitemapEntry[]): DiffResult {
    const oldMap = new Map<string, SitemapEntry>()
    const newMap = new Map<string, SitemapEntry>()

    // 建立舊狀態的映射
    for (const entry of oldEntries) {
      oldMap.set(entry.url, entry)
    }

    // 建立新狀態的映射
    for (const entry of newEntries) {
      newMap.set(entry.url, entry)
    }

    const added: SitemapEntry[] = []
    const updated: SitemapEntry[] = []
    const removed: string[] = []

    // 找出新增和更新的
    for (const [url, newEntry] of newMap) {
      const oldEntry = oldMap.get(url)
      if (!oldEntry) {
        added.push(newEntry)
      } else if (this.hasChanged(oldEntry, newEntry)) {
        updated.push(newEntry)
      }
    }

    // 找出刪除的
    for (const [url] of oldMap) {
      if (!newMap.has(url)) {
        removed.push(url)
      }
    }

    return { added, updated, removed }
  }

  /**
   * 批次計算差異（用於大量 URL）
   */
  async calculateBatch(
    oldEntries: AsyncIterable<SitemapEntry>,
    newEntries: AsyncIterable<SitemapEntry>
  ): Promise<DiffResult> {
    const oldMap = new Map<string, SitemapEntry>()
    const newMap = new Map<string, SitemapEntry>()

    // 批次讀取舊狀態
    for await (const entry of oldEntries) {
      oldMap.set(entry.url, entry)
    }

    // 批次讀取新狀態
    for await (const entry of newEntries) {
      newMap.set(entry.url, entry)
    }

    return this.calculate(Array.from(oldMap.values()), Array.from(newMap.values()))
  }

  /**
   * 從變更記錄計算差異
   */
  calculateFromChanges(
    baseEntries: SitemapEntry[],
    changes: SitemapChange[]
  ): DiffResult {
    const entryMap = new Map<string, SitemapEntry>()

    // 建立基礎狀態的映射
    for (const entry of baseEntries) {
      entryMap.set(entry.url, entry)
    }

    // 應用變更
    for (const change of changes) {
      if (change.type === 'add' && change.entry) {
        entryMap.set(change.url, change.entry)
      } else if (change.type === 'update' && change.entry) {
        entryMap.set(change.url, change.entry)
      } else if (change.type === 'remove') {
        entryMap.delete(change.url)
      }
    }

    // 計算差異
    const newEntries = Array.from(entryMap.values())
    return this.calculate(baseEntries, newEntries)
  }

  /**
   * 檢查 entry 是否有變更
   */
  private hasChanged(oldEntry: SitemapEntry, newEntry: SitemapEntry): boolean {
    // 比較關鍵欄位
    if (oldEntry.lastmod !== newEntry.lastmod) {
      return true
    }
    if (oldEntry.changefreq !== newEntry.changefreq) {
      return true
    }
    if (oldEntry.priority !== newEntry.priority) {
      return true
    }

    // 比較 alternates（簡化比較）
    const oldAlternates = JSON.stringify(oldEntry.alternates || [])
    const newAlternates = JSON.stringify(newEntry.alternates || [])
    if (oldAlternates !== newAlternates) {
      return true
    }

    return false
  }
}

