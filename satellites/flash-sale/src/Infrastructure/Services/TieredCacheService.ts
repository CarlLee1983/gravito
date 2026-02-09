/**
 * TieredCacheService - 分層快取服務
 *
 * 利用 @gravito/stasis 的 TieredStore，實現 L1（內存）+ L2（Redis）兩層快取
 * 大幅降低訪問延遲：L1 命中 < 0.1ms，L2 命中 2-5ms
 */

import type { CacheService } from '@gravito/core'
import { MemoryStore, TieredStore } from '@gravito/stasis'

interface Logger {
  debug(message: string): void
  info(message: string): void
  warn(message: string): void
  error(message: string): void
}

interface MetricsRegistry {
  histogram(config: { name: string; labels?: string[] }): {
    observe(value: number, labels?: Record<string, string>): void
  }
  gauge(config: { name: string; labels?: string[] }): {
    set(value: number, labels?: Record<string, string>): void
  }
  counter(config: { name: string; labels?: string[] }): {
    inc(labels?: Record<string, string>): void
  }
}

/**
 * L2 快取包裝器 - 簡化版，直接使用 CacheService
 */
class L2CacheStore {
  constructor(private l2Cache: CacheService) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    return this.l2Cache.get<T>(key)
  }

  async put(
    key: string,
    value: unknown,
    ttl: string | number | Date | undefined | null
  ): Promise<void> {
    let ttlSeconds: number | undefined

    if (typeof ttl === 'number') {
      ttlSeconds = ttl
    } else if (ttl instanceof Date) {
      // 計算距離現在的秒數
      ttlSeconds = Math.max(0, Math.floor((ttl.getTime() - Date.now()) / 1000))
    }

    await this.l2Cache.set(key, value, ttlSeconds)
  }

  async add(
    key: string,
    value: unknown,
    ttl: string | number | Date | undefined | null
  ): Promise<boolean> {
    const existing = await this.get(key)
    if (existing !== null) {
      return false
    }

    await this.put(key, value, ttl)
    return true
  }

  async forget(key: string): Promise<boolean> {
    try {
      await this.l2Cache.delete(key)
      return true
    } catch {
      return false
    }
  }

  async flush(): Promise<void> {
    await this.l2Cache.clear()
  }

  async increment(key: string, value = 1): Promise<number> {
    const l2CacheAny = this.l2Cache as any
    if (typeof l2CacheAny.increment === 'function') {
      return await l2CacheAny.increment(key, value)
    }
    const current = (await this.get<number>(key)) ?? 0
    const next = current + value
    await this.put(key, next, null)
    return next
  }

  async decrement(key: string, value = 1): Promise<number> {
    return this.increment(key, -value)
  }

  async ttl(key: string): Promise<number | null> {
    return null
  }
}

/**
 * TieredCacheService 類
 *
 * 實現分層快取，結合 MemoryStore（L1）和 RedisCacheService（L2）
 */
export class TieredCacheService implements CacheService {
  private tieredStore: TieredStore
  private memoryStore: MemoryStore
  private l1Stats = { hits: 0, misses: 0 }
  private metricsCollector: NodeJS.Timeout | null = null

  constructor(
    private l2Cache: CacheService,
    private metrics: MetricsRegistry,
    private logger: Logger
  ) {
    // 創建 L1 內存快取（限制 10K 條目）
    this.memoryStore = new MemoryStore({ maxItems: 10000 })

    // 創建 L2 包裝器
    const l2Store = new L2CacheStore(l2Cache)

    // 創建分層快取
    this.tieredStore = new TieredStore(this.memoryStore, l2Store)

    // 啟動 Metrics 收集（每分鐘）
    this.startMetricsCollection()

    this.logger.debug('[TieredCache] 已初始化，L1 限制 10K 條目')
  }

  /**
   * 從快取獲取值（L1 優先）
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const startTime = performance.now()

    try {
      const value = await this.tieredStore.get<T>(key)
      const duration = performance.now() - startTime

      // 判斷是 L1 還是 L2 命中
      if (value !== null) {
        // 檢查 L1 是否命中（通過 MemoryStore 統計）
        const stats = this.memoryStore.getStats()
        const currentHits = stats.hits

        if (currentHits > this.l1Stats.hits) {
          this.l1Stats.hits = currentHits
          this.metrics
            .histogram({
              name: 'cache_get_duration_seconds',
              labels: ['level'],
            })
            .observe(duration / 1000, { level: 'l1' })
        } else {
          this.metrics
            .histogram({
              name: 'cache_get_duration_seconds',
              labels: ['level'],
            })
            .observe(duration / 1000, { level: 'l2' })
        }
      }

      return value
    } catch (error) {
      this.logger.error(`[TieredCache] get 失敗: ${String(error)}`)
      return null
    }
  }

  /**
   * 設置快取值
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      await this.tieredStore.put(key, value, ttl ?? null)
    } catch (error) {
      this.logger.error(`[TieredCache] set 失敗: ${String(error)}`)
      throw error
    }
  }

  /**
   * 刪除快取
   */
  async delete(key: string): Promise<void> {
    try {
      await this.tieredStore.forget(key)
    } catch (error) {
      this.logger.error(`[TieredCache] delete 失敗: ${String(error)}`)
      throw error
    }
  }

  /**
   * 清除所有快取
   */
  async clear(): Promise<void> {
    try {
      await this.tieredStore.flush()
    } catch (error) {
      this.logger.error(`[TieredCache] clear 失敗: ${String(error)}`)
      throw error
    }
  }

  /**
   * Remember 模式（如果不存在則設置）
   */
  async remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
    try {
      const cached = await this.get<T>(key)
      if (cached !== null) {
        return cached
      }

      const result = await callback()
      await this.set(key, result, ttl)
      return result
    } catch (error) {
      this.logger.error(`[TieredCache] remember 失敗: ${String(error)}`)
      throw error
    }
  }

  /**
   * 檢查快取是否存在
   */
  async has(key: string): Promise<boolean> {
    try {
      const value = await this.get(key)
      return value !== null
    } catch {
      return false
    }
  }

  /**
   * 遞增計數器
   */
  async increment(key: string, value = 1): Promise<number> {
    try {
      return await this.tieredStore.increment(key, value)
    } catch (error) {
      this.logger.error(`[TieredCache] increment 失敗: ${String(error)}`)
      throw error
    }
  }

  /**
   * 遞減計數器
   */
  async decrement(key: string, value = 1): Promise<number> {
    try {
      return await this.tieredStore.decrement(key, value)
    } catch (error) {
      this.logger.error(`[TieredCache] decrement 失敗: ${String(error)}`)
      throw error
    }
  }

  /**
   * 根據模式刪除快取
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      // 委託給 L2 快取（假設支持）
      const l2CacheAny = this.l2Cache as any
      if (typeof l2CacheAny.deletePattern === 'function') {
        return await l2CacheAny.deletePattern(pattern)
      }
      this.logger.warn(`[TieredCache] L2 快取不支持 deletePattern`)
      return 0
    } catch (error) {
      this.logger.error(`[TieredCache] deletePattern 失敗: ${String(error)}`)
      throw error
    }
  }

  /**
   * 獲取快取統計
   */
  async getStats(): Promise<{
    keysCount: number
    memoryUsage: string
  }> {
    try {
      const l1Stats = this.memoryStore.getStats()

      // 嘗試從 L2 獲取統計
      const l2CacheAny = this.l2Cache as any
      let l2Stats: any = null
      if (typeof l2CacheAny.getStats === 'function') {
        l2Stats = await l2CacheAny.getStats()
      }

      return {
        keysCount: (l2Stats?.keysCount ?? 0) + l1Stats.size,
        memoryUsage: `L1: ${l1Stats.size} items, L2: ${l2Stats?.memoryUsage ?? 'unknown'}`,
      }
    } catch (error) {
      this.logger.error(`[TieredCache] getStats 失敗: ${String(error)}`)
      return {
        keysCount: 0,
        memoryUsage: 'error',
      }
    }
  }

  /**
   * 獲取 TTL
   */
  async ttl(key: string): Promise<number | null> {
    try {
      return await this.tieredStore.ttl(key)
    } catch {
      return null
    }
  }

  /**
   * 啟動 Metrics 收集
   */
  private startMetricsCollection(): void {
    this.metricsCollector = setInterval(() => {
      try {
        const l1Stats = this.memoryStore.getStats()

        // 記錄 L1 命中率
        this.metrics
          .gauge({
            name: 'cache_l1_hit_rate',
          })
          .set(l1Stats.hitRate)

        // 記錄 L1 當前大小
        this.metrics
          .gauge({
            name: 'cache_l1_size',
          })
          .set(l1Stats.size)

        // 記錄 L1 LRU 驅逐次數
        this.metrics
          .counter({
            name: 'cache_l1_evictions_total',
          })
          .inc()

        this.logger.debug(
          `[TieredCache] L1 Hit Rate: ${(l1Stats.hitRate * 100).toFixed(1)}%, Size: ${l1Stats.size}, Evictions: ${l1Stats.evictions}`
        )
      } catch (error) {
        this.logger.error(`[TieredCache] Metrics 收集失敗: ${String(error)}`)
      }
    }, 60000) // 每分鐘收集一次
  }

  /**
   * 停止 Metrics 收集
   */
  stopMetricsCollection(): void {
    if (this.metricsCollector) {
      clearInterval(this.metricsCollector)
      this.metricsCollector = null
    }
  }

  /**
   * 銷毀服務
   */
  destroy(): void {
    this.stopMetricsCollection()
  }
}
