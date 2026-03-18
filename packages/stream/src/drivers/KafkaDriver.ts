import type { SerializedJob, TopicOptions } from '../types'
import type { QueueDriver } from './QueueDriver'

/**
 * Kafka driver configuration.
 */
export interface KafkaDriverConfig {
  /**
   * Kafka client instance (kafkajs).
   *
   * Must provide producer, admin, and consumer factories compatible with KafkaJS.
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
      run: (args: KafkaConsumerRunOptions) => Promise<void>
      disconnect: () => Promise<void>
    }
  }

  /**
   * Consumer group ID used for reading messages.
   * @default 'gravito-workers'
   */
  consumerGroupId?: string
}

interface KafkaMessage {
  key?: Buffer
  value: Buffer | null
  offset: string
}

interface KafkaBatch {
  messages: KafkaMessage[]
}

interface KafkaEachBatchPayload {
  batch: KafkaBatch
  resolveOffset(offset: string): void
  heartbeat(): Promise<void>
  isRunning(): boolean
}

interface KafkaConsumerRunOptions {
  eachMessage?: (args: { topic: string; partition: number; message: KafkaMessage }) => Promise<void>
  eachBatch?: (args: KafkaEachBatchPayload) => Promise<void>
}

/**
 * Kafka-backed queue driver.
 *
 * Uses Apache Kafka topics as queues. Designed for high-throughput streaming
 * rather than traditional job queue semantics (pop/delete).
 * Supports push-based consumption via `subscribe()`.
 *
 * @public
 * @example
 * ```typescript
 * const driver = new KafkaDriver({ client: kafka, consumerGroupId: 'my-app' });
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
   * Pushes a job to a Kafka topic.
   *
   * @param queue - The topic name.
   * @param job - The job to publish.
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
   * Pop is not supported for Kafka (Push-based).
   *
   * Kafka consumers typically stream messages. Use `subscribe()` instead.
   *
   * @throws {Error} Always throws as Kafka does not support polling individual messages in this manner.
   */
  async pop(_queue: string): Promise<SerializedJob | null> {
    // Kafka is push-based; use subscribe() instead.
    throw new Error('[KafkaDriver] Kafka uses push-based model. Use subscribe() instead of pop().')
  }

  /**
   * Returns 0 as Kafka does not expose a simple "queue size".
   *
   * Monitoring lag requires external tools or Admin API checks not implemented here.
   */
  async size(_queue: string): Promise<number> {
    // Kafka does not directly support queue size.
    return 0
  }

  /**
   * Clears a queue by deleting the topic.
   *
   * @param queue - The topic name.
   */
  async clear(queue: string): Promise<void> {
    const admin = await this.ensureAdmin()
    await admin.deleteTopics({ topics: [queue] })
  }

  /**
   * Pushes multiple jobs to a Kafka topic.
   *
   * @param queue - The topic name.
   * @param jobs - Array of jobs.
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
   * Creates a new Kafka topic.
   *
   * @param topic - The topic name.
   * @param options - Config for partitions/replication.
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
   * Deletes a Kafka topic.
   *
   * @param topic - The topic name.
   */
  async deleteTopic(topic: string): Promise<void> {
    await this.clear(topic)
  }

  /**
   * Subscribes to a topic for streaming jobs.
   *
   * Starts a Kafka consumer group and processes messages as they arrive.
   *
   * @param queue - The topic name.
   * @param callback - Function to handle the job.
   */
  async subscribe(queue: string, callback: (job: SerializedJob) => Promise<void>): Promise<void> {
    const consumer = this.client.consumer({ groupId: this.consumerGroupId })
    await consumer.connect()
    await consumer.subscribe({ topics: [queue] })

    await consumer.run({
      eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning }) => {
        for (const message of batch.messages) {
          if (!isRunning() || !message.value) {
            continue
          }

          try {
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

            await callback(job)
            resolveOffset(message.offset)
            await heartbeat()
          } catch (error) {
            console.error('[KafkaDriver] Error processing message:', error)
          }
        }
      },
    })
  }
}
