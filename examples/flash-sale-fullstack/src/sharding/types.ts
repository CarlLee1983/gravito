/**
 * Sharding Types and Interfaces
 * 分片系統的類型定義
 */

export interface ShardingConfig {
  // 分片基本配置
  shardCount: number // 分片總數（默認 8）
  shardKeyField: string // 分片鍵欄位（默認 'userId'）

  // 數據庫連接配置
  database: DatabaseConfig[]

  // 虛擬節點配置（用於一致性哈希）
  virtualNodesPerShard?: number // 默認 160

  // 路由和查詢優化
  enableLocalCache?: boolean // 啟用本地快取路由表
  enableCrossShardQuery?: boolean // 啟用跨分片查詢聚合

  // 監控和指標
  enableMetrics?: boolean // 啟用分片指標收集
  metricsInterval?: number // 指標收集間隔（毫秒）
}

export interface DatabaseConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  pool?: {
    min: number
    max: number
  }
}

export interface ShardingMetrics {
  shardId: number
  requestCount: number
  errorCount: number
  averageLatency: number
  p99Latency: number
  lastUpdated: Date
}

export interface ShardInfo {
  shardId: number
  nodeId: string
  isHealthy: boolean
  metrics?: ShardingMetrics
}

export interface RoutingKey {
  shardId: number
  nodeId: string
  isPrimary: boolean
}

/**
 * 分片查詢結果
 */
export interface ShardQueryResult<T> {
  data: T[]
  shardId: number
  executionTime: number
  success: boolean
  error?: string
}

/**
 * 跨分片聚合結果
 */
export interface AggregateQueryResult<T> {
  data: T[]
  totalShards: number
  successfulShards: number
  failedShards: number
  aggregationType: 'union' | 'sum' | 'avg' | 'count'
  executionTime: number
}

/**
 * 分片事件（用於監控和日誌）
 */
export type ShardingEventType =
  | 'shard_added'
  | 'shard_removed'
  | 'shard_failed'
  | 'shard_recovered'
  | 'query_executed'
  | 'rebalance_started'
  | 'rebalance_completed'

export interface ShardingEvent {
  type: ShardingEventType
  timestamp: Date
  shardId?: number
  details: Record<string, any>
}
