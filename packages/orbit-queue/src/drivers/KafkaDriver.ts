import type { SerializedJob, TopicOptions } from '../types'
import type { QueueDriver } from './QueueDriver'

/**
 * Kafka Driver 配置
 */
export interface KafkaDriverConfig {
  /**
   * Kafka 客戶端實例（kafkajs）
   */
  client: {
    producer: () => {
      connect: () => Promise<void>
      send: (args: {
        topic: string
        messages: Array<{ key?: string; value: string }>
      }) => Promise<void>
      disconnect: () => Promise<void>
    }
    admin: () => {
      connect: () => Promise<void>
      createTopics: (args: {
        topics: Array<{ topic: string; numPartitions?: number; replicationFactor?: number }>
      }) => Promise<void>
      deleteTopics: (args: { topics: string[] }) => Promise<void>
      disconnect: () => Promise<void>
    }
    consumer: (args: { groupId: string }) => {
      connect: () => Promise<void>
      subscribe: (args: { topics: string[] }) => Promise<void>
      run: (args: {
        eachMessage: (args: {
          topic: string
          partition: number
          message: { key?: Buffer; value: Buffer; offset: string }
        }) => Promise<void>
      }) => Promise<void>
      disconnect: () => Promise<void>
    }
  }

  /**
   * Consumer Group ID（用於消費消息）
   */
  consumerGroupId?: string
}

/**
 * Kafka Driver
 *
 * 使用 Apache Kafka 作為隊列儲存。
 * 支援 Topic 管理、Consumer Groups、批量操作等企業級功能。
 *
 * **要求**：需要安裝 `kafkajs` 套件。
 *
 * @example
 * ```typescript
 * import { Kafka } from 'kafkajs'
 *
 * const kafka = new Kafka({
 *   brokers: ['localhost:9092'],
 *   clientId: 'gravito-app'
 * })
 *
 * const driver = new KafkaDriver({ client: kafka, consumerGroupId: 'workers' })
 * await driver.push('default', serializedJob)
 * ```
 */
export class KafkaDriver implements QueueDriver {
  private client: KafkaDriverConfig['client']
  private consumerGroupId: string
  private producer?: ReturnType<KafkaDriverConfig['client']['producer']>
  private admin?: ReturnType<KafkaDriverConfig['client']['admin']>

  constructor(config: KafkaDriverConfig) {
    this.client = config.client
    this.consumerGroupId = config.consumerGroupId ?? 'gravito-workers'

    if (!this.client) {
      throw new Error('[KafkaDriver] Kafka client is required. Please install kafkajs package.')
    }
  }

  /**
   * 確保 Producer 已連接
   */
  private async ensureProducer(): Promise<ReturnType<KafkaDriverConfig['client']['producer']>> {
    if (!this.producer) {
      this.producer = this.client.producer()
      await this.producer.connect()
    }
    return this.producer
  }

  /**
   * 確保 Admin 已連接
   */
  private async ensureAdmin(): Promise<ReturnType<KafkaDriverConfig['client']['admin']>> {
    if (!this.admin) {
      this.admin = this.client.admin()
      await this.admin.connect()
    }
    return this.admin
  }

  /**
   * 推送 Job 到 Topic（隊列）
   */
  async push(queue: string, job: SerializedJob): Promise<void> {
    const producer = await this.ensureProducer()
    const payload = JSON.stringify({
      id: job.id,
      type: job.type,
      data: job.data,
      className: job.className,
      createdAt: job.createdAt,
      delaySeconds: job.delaySeconds,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
    })

    await producer.send({
      topic: queue,
      messages: [
        {
          key: job.id,
          value: payload,
        },
      ],
    })
  }

  /**
   * 從 Topic 取出 Job
   *
   * **注意**：Kafka 使用 Push-based 模式，應該使用 `subscribe()` 方法。
   * 此方法僅用於相容性，實際應該使用訂閱模式。
   */
  async pop(_queue: string): Promise<SerializedJob | null> {
    // Kafka 是 Push-based，不支援傳統的 pop 操作
    // 此方法僅用於相容性，實際應該使用 subscribe()
    throw new Error('[KafkaDriver] Kafka uses push-based model. Use subscribe() instead of pop().')
  }

  /**
   * 取得隊列大小
   *
   * **注意**：Kafka 不直接支援取得隊列大小。
   * 此方法返回 0，實際大小需要透過 Kafka 管理工具查詢。
   */
  async size(_queue: string): Promise<number> {
    // Kafka 不直接支援取得隊列大小
    return 0
  }

  /**
   * 清空隊列（刪除 Topic）
   */
  async clear(queue: string): Promise<void> {
    const admin = await this.ensureAdmin()
    await admin.deleteTopics({ topics: [queue] })
  }

  /**
   * 批量推送 Job
   */
  async pushMany(queue: string, jobs: SerializedJob[]): Promise<void> {
    if (jobs.length === 0) {
      return
    }

    const producer = await this.ensureProducer()
    const messages = jobs.map((job) => {
      const payload = JSON.stringify({
        id: job.id,
        type: job.type,
        data: job.data,
        className: job.className,
        createdAt: job.createdAt,
        delaySeconds: job.delaySeconds,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
      })

      return {
        key: job.id,
        value: payload,
      }
    })

    await producer.send({
      topic: queue,
      messages,
    })
  }

  /**
   * 建立 Topic
   */
  async createTopic(topic: string, options?: TopicOptions): Promise<void> {
    const admin = await this.ensureAdmin()
    await admin.createTopics({
      topics: [
        {
          topic,
          numPartitions: options?.partitions ?? 1,
          replicationFactor: options?.replicationFactor ?? 1,
        },
      ],
    })
  }

  /**
   * 刪除 Topic
   */
  async deleteTopic(topic: string): Promise<void> {
    await this.clear(topic)
  }

  /**
   * 訂閱 Topic（Push-based 模式）
   */
  async subscribe(queue: string, callback: (job: SerializedJob) => Promise<void>): Promise<void> {
    const consumer = this.client.consumer({ groupId: this.consumerGroupId })
    await consumer.connect()
    await consumer.subscribe({ topics: [queue] })

    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) {
          return
        }

        const payload = JSON.parse(message.value.toString())
        const job: SerializedJob = {
          id: payload.id,
          type: payload.type,
          data: payload.data,
          className: payload.className,
          createdAt: payload.createdAt,
          delaySeconds: payload.delaySeconds,
          attempts: payload.attempts,
          maxAttempts: payload.maxAttempts,
        }

        try {
          await callback(job)
          // 確認消息（自動確認，因為 eachMessage 成功後會自動確認）
        } catch (error) {
          console.error('[KafkaDriver] Error processing message:', error)
          // 可以實作重試邏輯或發送到死信隊列
        }
      },
    })
  }
}
