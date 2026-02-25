import type { SerializedJob } from '../../types'

/**
 * Kafka 用戶端介面（與 KafkaJS 相容）。
 *
 * 定義驅動程式所需的最小 API 表面，
 * 允許使用任何相容的 Kafka 用戶端實作。
 *
 * @public
 */
export interface KafkaClientFactory {
  producer: () => KafkaProducerClient
  admin: () => KafkaAdminClient
  consumer: (config: { groupId: string }) => KafkaConsumerClient
}

/**
 * Kafka Producer 用戶端介面。
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
 * Kafka Admin 用戶端介面。
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
 * Kafka Consumer 用戶端介面。
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
 * Kafka 訊息介面。
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
 * 完整的 Kafka 驅動程式配置。
 *
 * @public
 */
export interface KafkaDriverFullConfig {
  /** Kafka 用戶端工廠（KafkaJS 相容） */
  client: KafkaClientFactory

  /** Consumer Group ID */
  consumerGroupId?: string

  /** 訊息緩衝區大小上限（每個 queue） */
  bufferSize?: number

  /** pop() 等待超時（毫秒） */
  popTimeout?: number

  /** 是否自動建立 topic */
  autoCreateTopics?: boolean

  /** DLQ topic 後綴 */
  dlqSuffix?: string

  /** 是否啟用自動 offset commit */
  autoCommit?: boolean

  /** 自動 commit 間隔（毫秒） */
  autoCommitInterval?: number

  /** 每次 fetch 的最大訊息數 */
  maxBatchSize?: number

  /** 訊息序列化器（預設 JSON） */
  serializer?: 'json' | 'binary'
}

/**
 * 內部緩衝的 Kafka 訊息。
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
