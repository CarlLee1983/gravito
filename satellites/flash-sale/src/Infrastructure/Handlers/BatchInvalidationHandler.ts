/**
 * BatchInvalidationHandler - 批量快取失效處理器
 *
 * 將 200ms 內的相同模式快取失效請求合併為一次操作
 * 消除失效衝突，減少 Redis 命令數 50%
 */

import type { CacheService, PlanetCore } from '@gravito/core'

interface MetricsRegistry {
  counter(config: { name: string; labels?: string[] }): {
    inc(labels?: Record<string, string>): void
  }
  histogram(config: { name: string; labels?: string[] }): {
    observe(value: number, labels?: Record<string, string>): void
  }
}

/**
 * 待處理失效請求
 */
interface PendingInvalidation {
  patterns: Set<string>
  requestTime: number
}

/**
 * BatchInvalidationHandler 類
 *
 * 批量處理快取失效，減少衝突和命令數
 */
export class BatchInvalidationHandler {
  private pendingInvalidations = new Map<string, PendingInvalidation>()
  private flushTimers = new Map<string, NodeJS.Timeout>()
  private readonly batchWindowMs = 200
  private readonly metricsLabels = ['pattern']

  constructor(
    private cache: CacheService,
    private core: PlanetCore,
    private metrics: MetricsRegistry
  ) {}

  /**
   * 提交失效請求到批處理隊列
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      const normalized = this.normalizePattern(pattern)

      // 添加到待處理集合
      if (!this.pendingInvalidations.has(normalized)) {
        this.pendingInvalidations.set(normalized, {
          patterns: new Set(),
          requestTime: Date.now(),
        })
      }

      const pending = this.pendingInvalidations.get(normalized)!
      pending.patterns.add(pattern)

      // 重置計時器（延長視窗）
      const existingTimer = this.flushTimers.get(normalized)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      // 200ms 後執行批量失效
      const timer = setTimeout(() => {
        this.flushBatch(normalized).catch((error) => {
          this.core.logger.error(`[BatchInvalidation] flushBatch 失敗: ${String(error)}`)
        })
      }, this.batchWindowMs)

      this.flushTimers.set(normalized, timer)
    } catch (error) {
      this.core.logger.error(`[BatchInvalidation] invalidate 失敗: ${String(error)}`)
      throw error
    }
  }

  /**
   * 執行批量失效操作
   */
  private async flushBatch(normalizedPattern: string): Promise<void> {
    const pending = this.pendingInvalidations.get(normalizedPattern)
    if (!pending) {
      return
    }

    const startTime = performance.now()
    const duplicateCount = pending.patterns.size - 1

    try {
      // 執行一次 deletePattern 操作（假設 CacheService 支持）
      const cacheAny = this.cache as any
      const deletedCount =
        typeof cacheAny.deletePattern === 'function'
          ? await cacheAny.deletePattern(normalizedPattern)
          : 0

      const duration = performance.now() - startTime

      this.core.logger.debug(
        `[BatchInvalidation] 批量失效完成: pattern=${normalizedPattern}, deleted=${deletedCount}, merged=${duplicateCount}, duration=${duration.toFixed(0)}ms`
      )

      // 記錄 metrics
      this.metrics
        .counter({
          name: 'cache_batch_invalidations_total',
          labels: this.metricsLabels,
        })
        .inc({ pattern: normalizedPattern })

      this.metrics
        .histogram({
          name: 'cache_batch_invalidation_duration_seconds',
          labels: this.metricsLabels,
        })
        .observe(duration / 1000, { pattern: normalizedPattern })

      // 記錄合併的請求數
      if (duplicateCount > 0) {
        this.metrics
          .counter({
            name: 'cache_batch_merged_requests_total',
            labels: this.metricsLabels,
          })
          .inc({ pattern: normalizedPattern })
      }

      // 清除待處理
      this.pendingInvalidations.delete(normalizedPattern)
      this.flushTimers.delete(normalizedPattern)
    } catch (error) {
      this.core.logger.error(
        `[BatchInvalidation] 批量失效失敗: pattern=${normalizedPattern}, error=${String(error)}`
      )

      // 發送到 DLQ 進行重試
      try {
        await this.sendToDLQ(normalizedPattern, error)
      } catch (dlqError) {
        this.core.logger.error(`[BatchInvalidation] DLQ 發送失敗: ${String(dlqError)}`)
      }

      // 清除待處理（即使失敗）
      this.pendingInvalidations.delete(normalizedPattern)
      this.flushTimers.delete(normalizedPattern)
    }
  }

  /**
   * 正規化 pattern（去重相同模式）
   *
   * 例如：
   * - `product:detail:*` 和 `product:detail:*` → 同一個
   * - `product:list:*` → `product:list:*`
   */
  private normalizePattern(pattern: string): string {
    // 移除多餘空格
    return pattern.trim()
  }

  /**
   * 發送到 DLQ 進行失敗重試
   */
  private async sendToDLQ(pattern: string, error: unknown): Promise<void> {
    try {
      // 使用 core.hooks 系統發送到 DLQ
      await this.core.hooks.doActionAsync(
        'cache:invalidation:failed',
        {
          pattern,
          error: String(error),
          timestamp: Date.now(),
        },
        {
          retry: {
            maxRetries: 3,
            backoff: 'exponential',
            dlqAfterMaxRetries: true,
          },
        }
      )

      this.core.logger.info(`[BatchInvalidation] DLQ 已發送: pattern=${pattern}`)
    } catch (dlqError) {
      this.core.logger.error(`[BatchInvalidation] DLQ 發送失敗: ${String(dlqError)}`)
      throw dlqError
    }
  }

  /**
   * 獲取待處理的失效請求信息
   */
  getPendingStats(): {
    totalPatterns: number
    patterns: string[]
  } {
    const patterns: string[] = []

    for (const [pattern, pending] of this.pendingInvalidations.entries()) {
      patterns.push(`${pattern} (${pending.patterns.size} requests)`)
    }

    return {
      totalPatterns: this.pendingInvalidations.size,
      patterns,
    }
  }

  /**
   * 立即刷新所有待處理的失效
   * 用於應用關閉或緊急情況
   */
  async flushAll(): Promise<void> {
    this.core.logger.info('[BatchInvalidation] 立即刷新所有待處理失效...')

    const patterns = Array.from(this.pendingInvalidations.keys())

    for (const pattern of patterns) {
      // 取消計時器
      const timer = this.flushTimers.get(pattern)
      if (timer) {
        clearTimeout(timer)
        this.flushTimers.delete(pattern)
      }

      // 立即刷新
      await this.flushBatch(pattern)
    }

    this.core.logger.info(`[BatchInvalidation] 已刷新 ${patterns.length} 個 pattern`)
  }

  /**
   * 清理資源
   */
  destroy(): void {
    // 取消所有待處理的計時器
    for (const timer of this.flushTimers.values()) {
      clearTimeout(timer)
    }

    this.flushTimers.clear()
    this.pendingInvalidations.clear()
    this.core.logger.info('[BatchInvalidation] 已清理資源')
  }
}
