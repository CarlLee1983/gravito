/**
 * Sharding Manager
 * 分片系統的核心管理器
 *
 * 職責：
 * 1. 初始化分片配置和連接
 * 2. 計算和管理分片路由
 * 3. 執行單分片查詢和跨分片聚合
 * 4. 監控分片健康狀況
 * 5. 支持動態分片調整
 */

import { ConsistentHash } from './ConsistentHash'
import type {
  AggregateQueryResult,
  ShardInfo,
  ShardingConfig,
  ShardingEvent,
  ShardingEventType,
  ShardingMetrics,
  ShardQueryResult,
} from './types'

export class ShardingManager {
  private config: ShardingConfig
  private consistentHash: ConsistentHash
  private shards: Map<number, ShardInfo> = new Map()
  private metrics: Map<number, ShardingMetrics> = new Map()
  private eventListeners: Map<ShardingEventType, Set<(event: ShardingEvent) => void>> = new Map()
  private metricsCollector: NodeJS.Timeout | null = null

  constructor(config: ShardingConfig) {
    this.config = {
      virtualNodesPerShard: 160,
      enableLocalCache: true,
      enableCrossShardQuery: true,
      enableMetrics: true,
      metricsInterval: 30000, // 30 秒
      ...config,
    }

    this.consistentHash = new ConsistentHash({
      virtualNodes: this.config.virtualNodesPerShard,
    })

    this.initializeShards()
  }

  /**
   * 初始化分片
   */
  private initializeShards(): void {
    for (let i = 0; i < this.config.shardCount; i++) {
      const nodeId = `shard-${i}`
      this.consistentHash.addNode(nodeId)

      this.shards.set(i, {
        shardId: i,
        nodeId,
        isHealthy: true,
      })

      this.metrics.set(i, {
        shardId: i,
        requestCount: 0,
        errorCount: 0,
        averageLatency: 0,
        p99Latency: 0,
        lastUpdated: new Date(),
      })
    }

    // 啟動指標收集器
    if (this.config.enableMetrics) {
      this.startMetricsCollector()
    }

    this.emitEvent('shard_added', {
      details: {
        message: `Initialized ${this.config.shardCount} shards`,
      },
    })
  }

  /**
   * 計算鍵對應的分片 ID
   * @param key 分片鍵值
   * @returns 分片 ID (0 to shardCount-1)
   */
  getShardId(key: string): number {
    const nodeId = this.consistentHash.getNode(key)
    if (!nodeId) {
      throw new Error('No shards available')
    }

    const shardId = parseInt(nodeId.split('-')[1], 10)
    return shardId
  }

  /**
   * 獲取鍵對應的分片信息
   */
  getShardInfo(key: string): ShardInfo {
    const shardId = this.getShardId(key)
    const shard = this.shards.get(shardId)

    if (!shard) {
      throw new Error(`Shard ${shardId} not found`)
    }

    return shard
  }

  /**
   * 獲取所有分片的健康狀況
   */
  getShardStatus(): ShardInfo[] {
    return Array.from(this.shards.values())
  }

  /**
   * 檢查分片是否健康
   */
  isShardHealthy(shardId: number): boolean {
    const shard = this.shards.get(shardId)
    return shard?.isHealthy ?? false
  }

  /**
   * 標記分片為不健康（故障）
   */
  markShardUnhealthy(shardId: number, reason: string): void {
    const shard = this.shards.get(shardId)
    if (shard) {
      shard.isHealthy = false
      this.emitEvent('shard_failed', {
        shardId,
        details: { reason },
      })
    }
  }

  /**
   * 標記分片為健康（恢復）
   */
  markShardHealthy(shardId: number): void {
    const shard = this.shards.get(shardId)
    if (shard) {
      shard.isHealthy = true
      this.emitEvent('shard_recovered', {
        shardId,
        details: { recoveredAt: new Date().toISOString() },
      })
    }
  }

  /**
   * 獲取分片指標
   */
  getMetrics(shardId: number): ShardingMetrics | undefined {
    return this.metrics.get(shardId)
  }

  /**
   * 獲取所有分片指標
   */
  getAllMetrics(): ShardingMetrics[] {
    return Array.from(this.metrics.values())
  }

  /**
   * 更新查詢指標
   */
  recordQueryMetric(shardId: number, latency: number, success: boolean): void {
    const metric = this.metrics.get(shardId)
    if (!metric) return

    metric.requestCount++
    if (!success) {
      metric.errorCount++
    }

    // 更新平均延遲（指數移動平均）
    const alpha = 0.3
    metric.averageLatency = alpha * latency + (1 - alpha) * metric.averageLatency

    // 簡化的 P99 計算（實際應使用直方圖）
    if (latency > metric.p99Latency * 1.5) {
      metric.p99Latency = latency
    } else {
      metric.p99Latency = metric.p99Latency * 0.95 + latency * 0.05
    }

    metric.lastUpdated = new Date()

    this.emitEvent('query_executed', {
      shardId,
      details: {
        latency,
        success,
        averageLatency: metric.averageLatency,
        p99Latency: metric.p99Latency,
      },
    })
  }

  /**
   * 事件監聽
   */
  on(eventType: ShardingEventType, listener: (event: ShardingEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(listener)
  }

  /**
   * 取消事件監聽
   */
  off(eventType: ShardingEventType, listener: (event: ShardingEvent) => void): void {
    this.eventListeners.get(eventType)?.delete(listener)
  }

  /**
   * 觸發事件
   */
  private emitEvent(eventType: ShardingEventType, partial: Partial<ShardingEvent>): void {
    const event: ShardingEvent = {
      type: eventType,
      timestamp: new Date(),
      ...partial,
      details: partial.details || {},
    }

    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event)
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error)
        }
      })
    }
  }

  /**
   * 啟動指標收集器
   */
  private startMetricsCollector(): void {
    this.metricsCollector = setInterval(() => {
      for (const metric of this.metrics.values()) {
        // 定期重置計數器，用於計算速率
        if (metric.requestCount > 0) {
          // 這裡可以記錄到外部監控系統（Prometheus 等）
        }
      }
    }, this.config.metricsInterval || 30000)
  }

  /**
   * 獲取分片配置
   */
  getConfig(): ShardingConfig {
    return { ...this.config }
  }

  /**
   * 獲取分片統計信息
   */
  getStats() {
    const allMetrics = Array.from(this.metrics.values())
    const totalRequests = allMetrics.reduce((sum, m) => sum + m.requestCount, 0)
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errorCount, 0)
    const avgLatency =
      allMetrics.length > 0
        ? allMetrics.reduce((sum, m) => sum + m.averageLatency, 0) / allMetrics.length
        : 0
    const maxP99 = Math.max(...allMetrics.map((m) => m.p99Latency), 0)

    return {
      totalShards: this.config.shardCount,
      healthyShards: Array.from(this.shards.values()).filter((s) => s.isHealthy).length,
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      averageLatency: avgLatency,
      maxP99Latency: maxP99,
    }
  }

  /**
   * 清理資源
   */
  destroy(): void {
    if (this.metricsCollector) {
      clearInterval(this.metricsCollector)
    }
    this.shards.clear()
    this.metrics.clear()
    this.eventListeners.clear()
    this.consistentHash.clear()
  }
}
