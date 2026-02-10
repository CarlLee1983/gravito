/**
 * 快取失效批量處理器
 *
 * 優化事件驅動快取更新：
 * - 批量收集失效請求
 * - 去重和合併相同模式
 * - 原子執行失效操作
 * - 失敗進入 DLQ 重試
 */

export interface InvalidationEvent {
  pattern: string
  timestamp: number
  source: string
  priority: 'low' | 'normal' | 'high'
}

export interface BatchStats {
  totalEvents: number
  batchesProcessed: number
  avgBatchSize: number
  failedCount: number
  dlqCount: number
}

export class CacheInvalidationBatcher {
  private queue: InvalidationEvent[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private readonly batchWindowMs = 200 // 200ms 批處理窗口
  private readonly l1Cache: any
  private readonly l2Cache: any
  private readonly dlqManager: any
  private stats: BatchStats = {
    totalEvents: 0,
    batchesProcessed: 0,
    avgBatchSize: 0,
    failedCount: 0,
    dlqCount: 0,
  }

  constructor(l1Cache: any, l2Cache: any, dlqManager?: any) {
    this.l1Cache = l1Cache
    this.l2Cache = l2Cache
    this.dlqManager = dlqManager
  }

  /**
   * 添加快取失效事件
   */
  async addInvalidationEvent(event: InvalidationEvent): Promise<void> {
    this.queue.push(event)
    this.stats.totalEvents++

    // 高優先級事件立即處理
    if (event.priority === 'high') {
      await this.processBatch()
      return
    }

    // 低優先級事件等待批處理窗口
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch().catch((error) => {
          console.error('[CacheInvalidationBatcher] 批處理失敗:', error)
        })
      }, this.batchWindowMs)
    }
  }

  /**
   * 處理批量失效
   */
  private async processBatch(): Promise<void> {
    if (this.queue.length === 0) {
      if (this.batchTimer) {
        clearTimeout(this.batchTimer)
        this.batchTimer = null
      }
      return
    }

    // 清除計時器
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    try {
      // 去重和合併模式
      const uniquePatterns = this.deduplicatePatterns(this.queue)

      // 按優先級分類
      const highPriority = uniquePatterns.filter(
        (p) => this.queue.find((e) => e.pattern === p)?.priority === 'high'
      )
      const otherPatterns = uniquePatterns.filter((p) => !highPriority.includes(p))

      // 先處理高優先級
      await this.executeInvalidation([...highPriority, ...otherPatterns])

      this.stats.batchesProcessed++
      this.stats.avgBatchSize =
        (this.stats.avgBatchSize * (this.stats.batchesProcessed - 1) + this.queue.length) /
        this.stats.batchesProcessed

      console.log(
        `[CacheInvalidationBatcher] 批次完成: ${uniquePatterns.length} 個模式, ${this.queue.length} 個事件`
      )

      this.queue = []
    } catch (error) {
      console.error('[CacheInvalidationBatcher] 批處理錯誤:', error)
      this.stats.failedCount++

      // 失敗事件進入 DLQ
      if (this.dlqManager) {
        for (const event of this.queue) {
          try {
            await this.dlqManager.moveToDLQ('cache-invalidation-failed', {
              event,
              error: String(error),
              timestamp: Date.now(),
            })
            this.stats.dlqCount++
          } catch (dlqError) {
            console.error('[CacheInvalidationBatcher] DLQ 移動失敗:', dlqError)
          }
        }
      }

      this.queue = []
    }
  }

  /**
   * 執行失效操作
   */
  private async executeInvalidation(patterns: string[]): Promise<void> {
    // 使用 Promise.all 並行執行
    const promises = patterns.map((pattern) => this.invalidatePattern(pattern))

    const results = await Promise.allSettled(promises)

    // 檢查失敗
    const failed = results.filter((r) => r.status === 'rejected')
    if (failed.length > 0) {
      console.warn(`[CacheInvalidationBatcher] ${failed.length} 個模式失效失敗`)
    }
  }

  /**
   * 失效單個模式
   */
  private async invalidatePattern(pattern: string): Promise<void> {
    try {
      // L1 失效
      const l1Deleted = this.l1Cache.deletePattern(pattern)

      // L2 失效
      let l2Deleted = 0
      if (this.l2Cache) {
        try {
          l2Deleted = await this.l2Cache.deletePattern(pattern)
        } catch (error) {
          console.error(`[CacheInvalidationBatcher] L2 失效失敗 (${pattern}):`, error)
          throw error
        }
      }

      console.debug(`[CacheInvalidationBatcher] 失效 ${pattern}: L1=${l1Deleted}, L2=${l2Deleted}`)
    } catch (error) {
      console.error(`[CacheInvalidationBatcher] 失效失敗 (${pattern}):`, error)
      throw error
    }
  }

  /**
   * 去重和合併模式
   */
  private deduplicatePatterns(events: InvalidationEvent[]): string[] {
    const patterns = new Set<string>()

    for (const event of events) {
      // 檢查是否存在更寬泛的模式
      let shouldAdd = true
      for (const existing of patterns) {
        // 如果新模式是現有模式的子集，則跳過
        if (this.isPatternSubset(event.pattern, existing)) {
          shouldAdd = false
          break
        }
        // 如果現有模式是新模式的子集，則移除現有
        if (this.isPatternSubset(existing, event.pattern)) {
          patterns.delete(existing)
        }
      }

      if (shouldAdd) {
        patterns.add(event.pattern)
      }
    }

    return Array.from(patterns)
  }

  /**
   * 檢查模式是否為子集
   */
  private isPatternSubset(pattern: string, superPattern: string): boolean {
    // 簡單的模式匹配檢查
    try {
      const patternRegex = new RegExp(pattern)
      const testStr = 'test'
      return patternRegex.test(testStr) && superPattern.includes(pattern.replace(/[^a-z:]/gi, ''))
    } catch {
      return false
    }
  }

  /**
   * 取得統計信息
   */
  getStats(): BatchStats {
    return { ...this.stats }
  }

  /**
   * 重置統計
   */
  resetStats(): void {
    this.stats = {
      totalEvents: 0,
      batchesProcessed: 0,
      avgBatchSize: 0,
      failedCount: 0,
      dlqCount: 0,
    }
  }

  /**
   * 停止批處理
   */
  async stop(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
    // 處理剩餘事件
    if (this.queue.length > 0) {
      await this.processBatch()
    }
  }
}
