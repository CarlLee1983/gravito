/**
 * 本地二級快取管理器 (L1 Cache)
 *
 * 三層快取架構：
 * L1: 本地記憶體 (微秒級)
 * L2: Redis (毫秒級)
 * L3: 資料庫 (秒級)
 *
 * 支持事件驅動快取失效
 */

import type { EventAggregator } from './events'
import { CacheEventType, createCacheEvent, type EventPriority, EventSource } from './events'

export interface CacheEntry<T> {
  value: T
  expiresAt: number
  hits: number
  version: number
  lastModified: number
}

export interface L1CacheStats {
  l1Hits: number
  l2Hits: number
  l3Hits: number
  totalHits: number
  l1HitRate: number
  l2HitRate: number
  currentSize: number
  maxSize: number
}

export class L1CacheManager<T = any> {
  private cache = new Map<string, CacheEntry<T>>()
  private maxSize: number // 最大記憶體大小（字節）
  private maxEntries: number // 最大條目數
  private stats = {
    l1Hits: 0,
    l2Hits: 0,
    l3Hits: 0,
    totalHits: 0,
  }
  private currentSize = 0

  // 事件驅動支持
  private eventAggregator?: EventAggregator
  private invalidationListeners: Set<(pattern: string) => void> = new Set()

  constructor(
    maxSize: number = 100 * 1024 * 1024,
    maxEntries = 10000,
    eventAggregator?: EventAggregator
  ) {
    this.maxSize = maxSize
    this.maxEntries = maxEntries
    this.eventAggregator = eventAggregator
  }

  /**
   * 分層快取讀取
   */
  async get(key: string, l2Cache?: any, l3Loader?: () => Promise<T>): Promise<T | null> {
    // L1：本地快取
    const l1Entry = this.cache.get(key)
    if (l1Entry && !this.isExpired(l1Entry)) {
      l1Entry.hits++
      this.stats.l1Hits++
      this.stats.totalHits++
      return l1Entry.value
    }

    // L2：Redis 快取
    if (l2Cache) {
      try {
        const l2Value = await l2Cache.get(key)
        if (l2Value) {
          this.stats.l2Hits++
          this.stats.totalHits++
          // 回源到 L1
          this.set(key, l2Value, 300)
          return l2Value
        }
      } catch (error) {
        console.error(`[L1Cache] L2 讀取失敗 (${key}):`, error)
      }
    }

    // L3：資料庫
    if (l3Loader) {
      try {
        const l3Value = await l3Loader()
        if (l3Value) {
          this.stats.l3Hits++
          this.stats.totalHits++
          // 回源到 L1 和 L2
          this.set(key, l3Value, 300)
          if (l2Cache) {
            await l2Cache.set(key, l3Value, 300)
          }
          return l3Value
        }
      } catch (error) {
        console.error(`[L1Cache] L3 加載失敗 (${key}):`, error)
      }
    }

    return null
  }

  /**
   * 設置快取條目
   */
  set(key: string, value: T, ttlSeconds = 300, version?: number): void {
    // 計算大小
    const size = this.estimateSize(value)

    // 檢查是否需要驅逐
    if (this.cache.size >= this.maxEntries || this.currentSize + size > this.maxSize) {
      this.evictLRU()
    }

    // 刪除舊條目
    const oldEntry = this.cache.get(key)
    if (oldEntry) {
      this.currentSize -= this.estimateSize(oldEntry.value)
    }

    // 設置新條目
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      hits: 0,
      version: version ?? 1,
      lastModified: Date.now(),
    }

    this.cache.set(key, entry)
    this.currentSize += size
  }

  /**
   * 刪除快取條目
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.currentSize -= this.estimateSize(entry.value)
      this.cache.delete(key)
      return true
    }
    return false
  }

  /**
   * 按模式刪除（支持事件驅動）
   */
  async deletePattern(pattern: string, priority?: EventPriority): Promise<number> {
    const regex = new RegExp(pattern)
    let deleted = 0

    for (const [key, entry] of this.cache.entries()) {
      if (regex.test(key)) {
        this.currentSize -= this.estimateSize(entry.value)
        this.cache.delete(key)
        deleted++
      }
    }

    // 發佈失效事件
    if (deleted > 0 && this.eventAggregator) {
      const event = createCacheEvent(CacheEventType.BATCH_INVALIDATION, [pattern], {
        source: EventSource.SYSTEM,
        priority,
        metadata: {
          source: 'L1CacheManager',
          deletedCount: deleted,
          pattern,
        },
      })
      await this.eventAggregator.submit(event)
    }

    // 通知監聽器
    if (deleted > 0) {
      for (const listener of this.invalidationListeners) {
        listener(pattern)
      }
    }

    return deleted
  }

  /**
   * 清空快取
   */
  clear(): void {
    this.cache.clear()
    this.currentSize = 0
  }

  /**
   * 同步失效 L1 和 L2（支持事件驅動）
   */
  async invalidateWithL2(key: string, l2Cache?: any, priority?: EventPriority): Promise<void> {
    this.delete(key)
    if (l2Cache) {
      try {
        await l2Cache.delete(key)
      } catch (error) {
        console.error(`[L1Cache] L2 失效失敗 (${key}):`, error)
      }
    }

    // 發佈失效事件
    if (this.eventAggregator) {
      const event = createCacheEvent(CacheEventType.BATCH_INVALIDATION, [key], {
        source: EventSource.SYSTEM,
        priority,
        metadata: { source: 'L1CacheManager' },
      })
      await this.eventAggregator.submit(event)
    }

    // 通知監聽器
    for (const listener of this.invalidationListeners) {
      listener(key)
    }
  }

  /**
   * 清理過期條目
   * @returns 清理的條目數量
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.currentSize -= this.estimateSize(entry.value)
        this.cache.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * 檢查 L1 與 L2 的一致性
   * @param keys 要檢查的鍵列表
   * @param l2Cache L2 快取實例
   * @returns 不一致的鍵列表
   */
  async checkConsistency(keys: string[], l2Cache?: any): Promise<string[]> {
    const inconsistent: string[] = []

    if (!l2Cache) {
      return inconsistent
    }

    for (const key of keys) {
      const l1Entry = this.cache.get(key)
      if (!l1Entry) continue

      try {
        const l2Data = await l2Cache.get(key)
        if (!l2Data) continue

        const l2Entry = typeof l2Data === 'string' ? JSON.parse(l2Data) : l2Data

        // 比較版本號
        if (l1Entry.version !== (l2Entry.version ?? 1)) {
          inconsistent.push(key)
        }
      } catch (error) {
        console.error(`[L1Cache] 檢查一致性失敗 (${key}):`, error)
      }
    }

    return inconsistent
  }

  /**
   * 修復不一致的快取條目
   * @param keys 需要修復的鍵列表
   * @param l2Cache L2 快取實例
   * @returns 成功修復的數量
   */
  async repairInconsistency(keys: string[], l2Cache?: any): Promise<number> {
    let repaired = 0

    if (!l2Cache) {
      return repaired
    }

    for (const key of keys) {
      try {
        const l2Data = await l2Cache.get(key)
        if (!l2Data) {
          // L2 也沒有，從 L1 刪除
          this.delete(key)
          repaired++
          continue
        }

        const l2Entry = typeof l2Data === 'string' ? JSON.parse(l2Data) : l2Data

        // 使用 L2 的數據更新 L1
        await this.set(key, l2Entry.value ?? l2Entry, undefined, l2Entry.version ?? 1)
        repaired++
      } catch (error) {
        console.error(`[L1Cache] 修復失敗 (${key}):`, error)
      }
    }

    return repaired
  }

  /**
   * 取得快取統計
   */
  getStats(): L1CacheStats {
    const totalHits = this.stats.totalHits || 1 // 避免除以零
    return {
      l1Hits: this.stats.l1Hits,
      l2Hits: this.stats.l2Hits,
      l3Hits: this.stats.l3Hits,
      totalHits: this.stats.totalHits,
      l1HitRate: (this.stats.l1Hits / totalHits) * 100,
      l2HitRate: ((this.stats.l1Hits + this.stats.l2Hits) / totalHits) * 100,
      currentSize: this.currentSize,
      maxSize: this.maxSize,
    }
  }

  /**
   * 重置統計
   */
  resetStats(): void {
    this.stats = { l1Hits: 0, l2Hits: 0, l3Hits: 0, totalHits: 0 }
  }

  /**
   * 設置事件聚合器
   */
  setEventAggregator(aggregator: EventAggregator): void {
    this.eventAggregator = aggregator
  }

  /**
   * 監聽失效事件
   */
  onInvalidation(listener: (pattern: string) => void): void {
    this.invalidationListeners.add(listener)
  }

  /**
   * 移除失效事件監聽器
   */
  offInvalidation(listener: (pattern: string) => void): void {
    this.invalidationListeners.delete(listener)
  }

  /**
   * 清空所有失效監聽器
   */
  clearInvalidationListeners(): void {
    this.invalidationListeners.clear()
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() > entry.expiresAt
  }

  /**
   * LRU 驅逐
   */
  private evictLRU(): void {
    let minHits = Infinity
    let lruKey: string | null = null

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits
        lruKey = key
      }
    }

    if (lruKey) {
      this.delete(lruKey)
    }
  }

  /**
   * 估計對象大小（字節）
   */
  private estimateSize(value: any): number {
    // 簡化估算
    const str = JSON.stringify(value)
    return new Blob([str]).size
  }
}
