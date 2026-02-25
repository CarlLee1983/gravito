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
