import type { SerializedJob } from '../../types'

/**
 * Kafka client factory interface (compatible with KafkaJS).
 *
 * Defines the minimal API surface to allow any compatible Kafka client implementation.
 *
 * @public
 */
export interface KafkaClientFactory {
  producer: () => KafkaProducerClient
  admin: () => KafkaAdminClient
  consumer: (config: { groupId: string }) => KafkaConsumerClient
}

/**
 * Kafka Producer client interface.
 *
 * @public
 */
export interface KafkaProducerClient {
  connect(): Promise<void>
  send(args: {
    topic: string
    messages: Array<{
      key?: string | Buffer | null
      value: string | Buffer
      partition?: number
      headers?: Record<string, string | Buffer>
    }>
  }): Promise<Array<{ topicName: string; partition: number; errorCode: number; offset: string }>>
  disconnect(): Promise<void>
}

/**
 * Kafka Admin client interface.
 *
 * @public
 */
export interface KafkaAdminClient {
  connect(): Promise<void>
  createTopics(args: {
    topics: Array<{
      topic: string
      numPartitions?: number
      replicationFactor?: number
      configEntries?: Array<{ name: string; value: string }>
    }>
  }): Promise<boolean>
  deleteTopics(args: { topics: string[] }): Promise<void>
  fetchTopicOffsets(topic: string): Promise<
    Array<{
      partition: number
      offset: string
      high: string
      low: string
    }>
  >
  fetchOffsets(args: { groupId: string; topics: string[] }): Promise<
    Array<{
      topic: string
      partitions: Array<{ partition: number; offset: string }>
    }>
  >
  listTopics(): Promise<string[]>
  disconnect(): Promise<void>
}

/**
 * Kafka Consumer client interface.
 *
 * @public
 */
export interface KafkaConsumerClient {
  connect(): Promise<void>
  subscribe(args: { topics: string[]; fromBeginning?: boolean }): Promise<void>
  run(args: {
    eachMessage?: (args: {
      topic: string
      partition: number
      message: KafkaMessage
    }) => Promise<void>
    eachBatch?: (args: {
      batch: {
        topic: string
        partition: number
        messages: KafkaMessage[]
      }
      resolveOffset: (offset: string) => void
      heartbeat: () => Promise<void>
      isRunning: () => boolean
      commitOffsetsIfNecessary: () => Promise<void>
    }) => Promise<void>
    autoCommit?: boolean
  }): Promise<void>
  commitOffsets(
    offsets: Array<{
      topic: string
      partition: number
      offset: string
    }>
  ): Promise<void>
  seek(args: { topic: string; partition: number; offset: string }): void
  pause(topics: Array<{ topic: string; partitions?: number[] }>): void
  resume(topics: Array<{ topic: string; partitions?: number[] }>): void
  disconnect(): Promise<void>
}

/**
 * Kafka message interface.
 *
 * @public
 */
export interface KafkaMessage {
  key?: Buffer | null
  value: Buffer | null
  offset: string
  timestamp?: string
  headers?: Record<string, Buffer | string>
}

/**
 * Full Kafka driver configuration.
 *
 * @public
 */
export interface KafkaDriverFullConfig {
  /** Kafka client factory (KafkaJS compatible) */
  client: KafkaClientFactory

  /** Consumer Group ID */
  consumerGroupId?: string

  /** Message buffer size limit (per queue) */
  bufferSize?: number

  /** pop() wait timeout (milliseconds) */
  popTimeout?: number

  /** Auto-create topics */
  autoCreateTopics?: boolean

  /** DLQ topic suffix */
  dlqSuffix?: string

  /** Auto-commit offsets */
  autoCommit?: boolean

  /** Auto-commit interval (milliseconds) */
  autoCommitInterval?: number

  /** Max batch size per fetch */
  maxBatchSize?: number

  /** Message serializer (default: json) */
  serializer?: 'json' | 'binary'
}

/**
 * Buffered Kafka message.
 *
 * @public
 */
export interface BufferedMessage {
  job: SerializedJob
  topic: string
  partition: number
  offset: string
  timestamp: number
  acknowledged: boolean
}

/**
 * Consumer lifecycle states for Phase 6C.
 *
 * State transitions:
 * - idle → starting → running → stopping → stopped
 * - running → restarting → running
 * - any → error
 *
 * @public
 */
export type ConsumerLifecycleState =
  | 'idle'
  | 'starting'
  | 'running'
  | 'restarting'
  | 'stopping'
  | 'stopped'
  | 'error'

/**
 * Configuration for subscribe() push-based consumption.
 *
 * @public
 */
export interface SubscribeOptions {
  /** Parallel callback concurrency (default: 1) */
  concurrency?: number
  /** Whether to auto-acknowledge after callback completes (default: true) */
  autoAcknowledge?: boolean
  /** Callback timeout in milliseconds (default: 30000) */
  callbackTimeout?: number
  /** Whether to start from beginning (default: false) */
  fromBeginning?: boolean
}

/**
 * Backpressure controller configuration.
 *
 * @public
 */
export interface BackpressureConfig {
  /** High watermark percentage (0-1). Pause consumer when buffer exceeds this. Default: 0.8 */
  highWatermark?: number
  /** Low watermark percentage (0-1). Resume consumer when buffer drops below this. Default: 0.5 */
  lowWatermark?: number
  /** Check interval in milliseconds. Default: 100 */
  checkInterval?: number
  /** Maximum number of in-flight (processing) callbacks. Default: concurrency * 2 */
  maxInFlight?: number
}

/**
 * Lifecycle event payload.
 *
 * @public
 */
export interface LifecycleEvent {
  state: ConsumerLifecycleState
  previousState: ConsumerLifecycleState
  timestamp: number
  error?: Error
}

/**
 * Heartbeat configuration.
 * @public
 */
export interface HeartbeatConfig {
  /** Heartbeat interval in milliseconds. Default: 3000 */
  interval?: number
  /** Session timeout in milliseconds. Default: 30000 */
  sessionTimeout?: number
  /** Maximum consecutive missed heartbeats before declaring dead. Default: 3 */
  maxMissed?: number
}

/**
 * Heartbeat status snapshot.
 * @public
 */
export interface HeartbeatStatus {
  consumerId: string
  lastHeartbeat: number
  missedCount: number
  isAlive: boolean
  uptime: number
  queues: string[]
}

/**
 * Kafka driver metrics snapshot.
 * @public
 */
export interface KafkaDriverMetrics {
  /** Timestamp of this snapshot */
  timestamp: number

  /** Per-queue throughput (messages/second) */
  throughput: Record<string, number>

  /** Consumer lag per topic-partition */
  lag: Record<string, number>

  /** Error counts by type */
  errors: {
    total: number
    serialization: number
    callback: number
    connection: number
    timeout: number
  }

  /** Processing latency stats (milliseconds) */
  latency: {
    p50: number
    p95: number
    p99: number
    avg: number
    min: number
    max: number
  }

  /** Buffer utilization */
  buffer: {
    totalSize: number
    perQueue: Record<string, number>
    utilization: number // 0-1
  }

  /** Rate limit stats */
  rateLimits: {
    totalAllowed: number
    totalDenied: number
    perQueue: Record<string, { allowed: number; denied: number }>
  }

  /** In-flight processing stats */
  inFlight: number
  /** Total messages processed since start */
  totalProcessed: number
  /** Total messages failed since start */
  totalFailed: number
}

/**
 * Metrics configuration.
 * @public
 */
export interface MetricsConfig {
  /** Enable metrics collection. Default: true */
  enabled?: boolean
  /** Collection interval in milliseconds. Default: 5000 */
  collectionInterval?: number
  /** Histogram bucket count for latency tracking. Default: 100 */
  histogramSize?: number
  /** Whether to track per-partition lag. Default: false */
  perPartitionLag?: boolean
}

/**
 * Circuit breaker states for Kafka operations.
 * @public
 */
export type KafkaCircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

/**
 * Error recovery configuration.
 * @public
 */
export interface ErrorRecoveryConfig {
  /** Circuit breaker failure threshold. Default: 5 */
  failureThreshold?: number
  /** Circuit breaker reset timeout in ms. Default: 30000 */
  resetTimeoutMs?: number
  /** Half-open max probe requests. Default: 1 */
  halfOpenMaxRequests?: number
  /** Initial backoff delay in ms. Default: 1000 */
  initialBackoffMs?: number
  /** Maximum backoff delay in ms. Default: 60000 */
  maxBackoffMs?: number
  /** Backoff multiplier. Default: 2 */
  backoffMultiplier?: number
  /** Whether to add jitter to backoff. Default: true */
  jitter?: boolean
  /** Max consecutive retries before giving up. Default: 10 */
  maxRetries?: number
}

/**
 * Error recovery state snapshot.
 * @public
 */
export interface ErrorRecoveryState {
  circuitState: KafkaCircuitState
  consecutiveFailures: number
  lastFailureTime: number
  currentBackoffMs: number
  totalRecoveries: number
  isRecovering: boolean
}

/**
 * Partition assignment descriptor.
 * @public
 */
export interface PartitionAssignment {
  topic: string
  partition: number
}

/**
 * Rebalance lifecycle states.
 *
 * State transitions:
 * - stable → revoking → assigning → stable
 * - any → error
 *
 * @public
 */
export type RebalanceState = 'stable' | 'revoking' | 'assigning' | 'error'

/**
 * Rebalance event payload emitted during rebalance lifecycle.
 * @public
 */
export interface RebalanceEvent {
  state: RebalanceState
  previousState: RebalanceState
  timestamp: number
  /** Partitions being revoked (available during 'revoking' state) */
  revokedPartitions?: PartitionAssignment[]
  /** Partitions being assigned (available during 'assigning' state) */
  assignedPartitions?: PartitionAssignment[]
  error?: Error
}

/**
 * Rebalance handler configuration.
 * @public
 */
export interface RebalanceConfig {
  /** Timeout for revocation processing in milliseconds. Default: 10000 */
  revocationTimeoutMs?: number
  /** Whether to commit offsets before revocation. Default: true */
  commitOnRevoke?: boolean
  /** Whether to clear buffer for revoked partitions. Default: true */
  clearBufferOnRevoke?: boolean
  /** Maximum concurrent rebalance operations. Default: 1 */
  maxConcurrentRebalances?: number
}

/**
 * Rebalance handler status snapshot.
 * @public
 */
export interface RebalanceStatus {
  state: RebalanceState
  assignedPartitions: PartitionAssignment[]
  totalRebalances: number
  lastRebalanceTimestamp: number
  isRebalancing: boolean
}

/**
 * 批次處理配置。
 * @public
 */
export interface BatchConfig {
  /** 最大批次大小。Default: 100 */
  maxBatchSize?: number
  /** 批次收集逾時（ms）。Default: 50 */
  batchLingerMs?: number
  /** 批次並行度。Default: 3 */
  concurrency?: number
  /** 是否啟用 producer batch 管線。Default: true */
  enablePipeline?: boolean
}

/**
 * 批次處理結果。
 * @public
 */
export interface BatchResult {
  /** 成功處理的訊息 ID */
  succeeded: string[]
  /** 失敗的訊息 */
  failed: Array<{ id: string; error: Error }>
}

/**
 * 效能監控配置。
 * @public
 */
export interface PerformanceConfig {
  /** 快照收集間隔（毫秒）。Default: 5000 */
  snapshotIntervalMs?: number
  /** 歷史快照保留數量。Default: 60 */
  historySize?: number
  /** 是否啟用效能監控。Default: true */
  enabled?: boolean
}

/**
 * 效能快照，聚合所有元件的狀態。
 * @public
 */
export interface PerformanceSnapshot {
  /** 快照時間戳 */
  timestamp: number
  /** 吞吐量指標（來自 KafkaMetrics） */
  throughput: Record<string, number>
  /** 延遲指標（來自 KafkaMetrics） */
  latency: {
    p50: number
    p95: number
    p99: number
    avg: number
  }
  /** 錯誤統計（來自 KafkaMetrics） */
  errors: {
    total: number
    serialization: number
    callback: number
    connection: number
    timeout: number
  }
  /** 電路斷路器狀態（來自 ErrorRecoveryManager） */
  circuitState: KafkaCircuitState
  /** 心跳狀態（來自 HeartbeatManager） */
  heartbeatAlive: boolean
  /** 背壓狀態（來自 BackpressureController） */
  backpressurePaused: boolean
  /** 消費者生命週期狀態（來自 ConsumerLifecycleManager） */
  consumerState: ConsumerLifecycleState
  /** 緩衝區利用率 */
  bufferUtilization: number
  /** 處理中的訊息數 */
  inFlight: number
  /** 總處理量 */
  totalProcessed: number
  /** 總失敗量 */
  totalFailed: number
  /** 整體健康狀態 */
  health: 'healthy' | 'degraded' | 'unhealthy'
}
