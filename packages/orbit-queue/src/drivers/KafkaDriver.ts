import type { SerializedJob, TopicOptions } from '../types'
import type { QueueDriver } from './QueueDriver'

/**
 * Kafka driver configuration.
 */
export interface KafkaDriverConfig {
  /**
   * Kafka client instance (kafkajs).
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
   * Consumer group ID (for consuming messages).
   */
  consumerGroupId?: string
}

/**
 * Kafka Driver
 *
 * Uses Apache Kafka as the queue backend.
 * Supports topic management, consumer groups, and batch operations.
 *
 * Requires `kafkajs`.
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
   * Ensure the producer is connected.
   */
  private async ensureProducer(): Promise<ReturnType<KafkaDriverConfig['client']['producer']>> {
    if (!this.producer) {
      this.producer = this.client.producer()
      await this.producer.connect()
    }
    return this.producer
  }

  /**
   * Ensure the admin client is connected.
   */
  private async ensureAdmin(): Promise<ReturnType<KafkaDriverConfig['client']['admin']>> {
    if (!this.admin) {
      this.admin = this.client.admin()
      await this.admin.connect()
    }
    return this.admin
  }

  /**
   * Push a job to a topic.
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
   * Pop is not supported for Kafka.
   *
   * Note: Kafka uses a push-based model, so you should use `subscribe()`.
   */
  async pop(_queue: string): Promise<SerializedJob | null> {
    // Kafka is push-based; use subscribe() instead.
    throw new Error('[KafkaDriver] Kafka uses push-based model. Use subscribe() instead of pop().')
  }

  /**
   * Kafka does not provide a direct queue size.
   *
   * Returns 0; use Kafka tooling/metrics for lag/size insights.
   */
  async size(_queue: string): Promise<number> {
    // Kafka does not directly support queue size.
    return 0
  }

  /**
   * Clear a queue by deleting the topic.
   */
  async clear(queue: string): Promise<void> {
    const admin = await this.ensureAdmin()
    await admin.deleteTopics({ topics: [queue] })
  }

  /**
   * Push multiple jobs.
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
   * Create a topic.
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
   * Delete a topic.
   */
  async deleteTopic(topic: string): Promise<void> {
    await this.clear(topic)
  }

  /**
   * Subscribe to a topic (push-based model).
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
          // Messages are committed automatically when eachMessage succeeds.
        } catch (error) {
          console.error('[KafkaDriver] Error processing message:', error)
          // You can implement retry logic or send to a dead-letter topic here.
        }
      },
    })
  }
}
