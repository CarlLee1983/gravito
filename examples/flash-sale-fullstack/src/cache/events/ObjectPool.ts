/**
 * 對象池管理器 - Phase 3 優化核心組件
 *
 * 通過復用 CacheEvent 對象，減少 GC 壓力和內存分配開銷
 * 預期性能改進：15-20%
 *
 * 實現原理：
 * 1. 維護一個預分配的對象池
 * 2. 高頻操作時從池中獲取對象
 * 3. 使用完成後歸還到池中復用
 * 4. 超過池大小限制時丟棄對象，由 GC 回收
 */

import type { CacheEvent } from './types.js'
import { CacheEventType, EventPriority, EventSource } from './types.js'

/**
 * 對象池統計信息
 */
export interface ObjectPoolStats {
  // 池的當前大小
  poolSize: number

  // 池中可用對象數量
  available: number

  // 對象復用總次數
  reused: number

  // 新創建對象總次數
  created: number

  // 命中率 (%)
  hitRate: number

  // 總獲取次數
  totalAcquisitions: number

  // 最大池大小
  maxSize: number
}

/**
 * CacheEvent 對象池
 *
 * 核心優化：
 * - 減少對象創建開銷
 * - 降低 GC 壓力
 * - 提高內存分配效率
 */
export class CacheEventPool {
  private pool: CacheEvent[] = []
  private maxSize: number
  private createFn: () => CacheEvent
  private resetFn: (event: CacheEvent) => void

  // 統計信息
  private stats = {
    reused: 0,
    created: 0,
    totalAcquisitions: 0,
  }

  /**
   * 創建對象池
   *
   * @param maxSize 池的最大對象數量
   * @param createFn 創建新對象的工廠函數
   * @param resetFn 重置對象的函數（準備復用）
   */
  constructor(maxSize: number, createFn: () => CacheEvent, resetFn: (event: CacheEvent) => void) {
    this.maxSize = maxSize
    this.createFn = createFn
    this.resetFn = resetFn
  }

  /**
   * 從池中獲取對象
   *
   * 優先級：
   * 1. 池中有可用對象 -> 復用（快速路徑）
   * 2. 池為空 -> 創建新對象
   */
  acquire(): CacheEvent {
    this.stats.totalAcquisitions++

    if (this.pool.length > 0) {
      // 快速路徑：從池中獲取
      this.stats.reused++
      return this.pool.pop()!
    }

    // 創建新對象
    this.stats.created++
    return this.createFn()
  }

  /**
   * 將對象歸還到池中
   *
   * 規則：
   * 1. 如果池未滿 -> 歸還對象
   * 2. 如果池已滿 -> 丟棄對象（由 GC 回收）
   */
  release(event: CacheEvent): void {
    // 只有當池未滿時才保存對象
    if (this.pool.length < this.maxSize) {
      // 重置對象狀態，準備復用
      this.resetFn(event)
      this.pool.push(event)
    }
    // 否則對象將被 GC 回收
  }

  /**
   * 批量歸還對象
   */
  releaseBatch(events: CacheEvent[]): void {
    for (const event of events) {
      this.release(event)
    }
  }

  /**
   * 獲取池的統計信息
   */
  getStats(): ObjectPoolStats {
    const total = this.stats.reused + this.stats.created
    return {
      poolSize: this.pool.length,
      available: this.pool.length,
      reused: this.stats.reused,
      created: this.stats.created,
      hitRate: total > 0 ? Math.round((this.stats.reused / total) * 10000) / 100 : 0,
      totalAcquisitions: this.stats.totalAcquisitions,
      maxSize: this.maxSize,
    }
  }

  /**
   * 獲取命中率（百分比）
   */
  getHitRate(): number {
    const total = this.stats.reused + this.stats.created
    if (total === 0) {
      return 0
    }
    return Math.round((this.stats.reused / total) * 10000) / 100
  }

  /**
   * 清空池
   */
  clear(): void {
    this.pool = []
    this.stats = {
      reused: 0,
      created: 0,
      totalAcquisitions: 0,
    }
  }

  /**
   * 重置統計信息（保留池中的對象）
   */
  resetStats(): void {
    this.stats = {
      reused: 0,
      created: 0,
      totalAcquisitions: 0,
    }
  }

  /**
   * 獲取池的大小
   */
  size(): number {
    return this.pool.length
  }

  /**
   * 調整池的最大大小
   */
  resize(newMaxSize: number): void {
    this.maxSize = newMaxSize

    // 如果池超過新的最大大小，移除多餘的對象
    while (this.pool.length > this.maxSize) {
      this.pool.pop()
    }
  }

  /**
   * 預熱池（初始化池中的對象）
   * 用於減少啟動時的延遲
   */
  warmup(count: number): void {
    const toCreate = Math.min(count, this.maxSize - this.pool.length)
    for (let i = 0; i < toCreate; i++) {
      this.pool.push(this.createFn())
    }
  }
}

/**
 * 對象池工廠 - 簡化池的創建
 */
export function createCacheEventPool(maxSize: number): CacheEventPool {
  return new CacheEventPool(
    maxSize,
    // 創建新的 CacheEvent
    () => ({
      id: '',
      type: CacheEventType.BATCH_INVALIDATION,
      priority: EventPriority.NORMAL,
      source: EventSource.SYSTEM,
      patterns: [],
      timestamp: 0,
      metadata: undefined,
      retryCount: 0,
      maxRetries: 3,
    }),
    // 重置 CacheEvent
    (event) => {
      event.id = ''
      event.patterns = []
      event.metadata = undefined
      event.retryCount = 0
    }
  )
}
