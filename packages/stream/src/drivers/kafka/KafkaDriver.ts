import type {
  KafkaAdminClient,
  KafkaClientFactory,
  KafkaConsumerClient,
  KafkaDriverFullConfig,
  KafkaMessage,
  KafkaProducerClient,
} from './types'
import {
  KafkaNotifier,
  MessageBuffer,
  OffsetTracker,
} from '.'
import type {
  JobPushOptions,
  QueueStats,
  SerializedJob,
  TopicOptions,
} from '../types'
import type { QueueDriver } from '../QueueDriver'

/**
 * Kafka-native queue driver implementing the QueueDriver interface.
 *
 * Bridges Kafka's push model with QueueDriver's pull model using:
 * - MessageBuffer (FIFO buffering from Kafka consumer)
 * - OffsetTracker (at-least-once semantic with continuous-ack)
 * - KafkaNotifier (ReactiveStrategy integration)
 *
 * @public
 */
export class KafkaDriver implements QueueDriver {
  // Lazy singleton clients
  private producer: KafkaProducerClient | null = null
  private consumer: KafkaConsumerClient | null = null
  private admin: KafkaAdminClient | null = null

  // Phase 6A components
  private readonly buffer: MessageBuffer
  private readonly offsetTracker: OffsetTracker
  private readonly notifier: KafkaNotifier

  // Internal state
  private readonly subscribedTopics = new Set<string>()
  private readonly knownQueues = new Set<string>()
  private readonly dlqBuffer = new Map<string, SerializedJob[]>()
  private readonly messageIdToMeta = new Map<
    string,
    { topic: string; partition: number; offset: string }
  >()
  private consumerRunning = false
  private offsetCommitTimer: ReturnType<typeof setInterval> | null = null

  private readonly config: Required<KafkaDriverFullConfig>

  // 6B-1: Constructor & Config (~15 min)
  constructor(config: KafkaDriverFullConfig) {
    if (!config.client) {
      throw new Error('KafkaDriver: client factory is required')
    }

    this.config = {
      client: config.client,
      consumerGroupId: config.consumerGroupId ?? 'gravito-stream',
      bufferSize: config.bufferSize ?? 1000,
      popTimeout: config.popTimeout ?? 5000,
      autoCreateTopics: config.autoCreateTopics ?? true,
      dlqSuffix: config.dlqSuffix ?? '.dlq',
      autoCommit: config.autoCommit ?? true,
      autoCommitInterval: config.autoCommitInterval ?? 5000,
      maxBatchSize: config.maxBatchSize ?? 100,
      serializer: config.serializer ?? 'json',
    }

    this.buffer = new MessageBuffer(this.config.bufferSize)
    this.offsetTracker = new OffsetTracker()
    this.notifier = new KafkaNotifier()
  }

  // 6B-2: Producer & Push (~25 min)
  private async ensureProducer(): Promise<KafkaProducerClient> {
    if (!this.producer) {
      this.producer = this.config.client.producer()
      await this.producer.connect()
    }
    return this.producer
  }

  async push(
    queue: string,
    job: SerializedJob,
    options?: JobPushOptions
  ): Promise<void> {
    const producer = await this.ensureProducer()

    const messageKey = options?.groupId ?? job.groupId ?? job.id
    const payload = JSON.stringify(job)

    await producer.send({
      topic: queue,
      messages: [
        {
          key: messageKey,
          value: payload,
        },
      ],
    })

    this.knownQueues.add(queue)
  }

  async pushMany(queue: string, jobs: SerializedJob[]): Promise<void> {
    if (jobs.length === 0) return

    const producer = await this.ensureProducer()
    const batchSize = this.config.maxBatchSize

    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize)
      const messages = batch.map((job) => ({
        key: job.groupId ?? job.id,
        value: JSON.stringify(job),
      }))

      await producer.send({
        topic: queue,
        messages,
      })
    }

    this.knownQueues.add(queue)
  }

  // 6B-3: Consumer initialization & Pop (~45 min)
  private async handleIncomingMessage(
    topic: string,
    partition: number,
    message: KafkaMessage
  ): Promise<void> {
    if (!message.value) return

    try {
      const payload = message.value.toString()
      const job: SerializedJob = JSON.parse(payload)

      // Track offset in OffsetTracker
      this.offsetTracker.track(topic, partition, message.offset)

      // Create messageId → metadata mapping
      this.messageIdToMeta.set(job.id, {
        topic,
        partition,
        offset: message.offset,
      })

      // Push into buffer
      const queued = this.buffer.enqueue(topic, {
        job,
        topic,
        partition,
        offset: message.offset,
        timestamp: Date.now(),
        acknowledged: false,
      })

      // If buffer is full, pause consumer to prevent overflow
      if (!queued) {
        const consumer = await this.ensureConsumer()
        consumer.pause([{ topic }])
      }

      // Notify subscribers
      this.notifier.notify(topic)
    } catch (error) {
      console.error(`[KafkaDriver] Failed to handle message: ${error}`)
    }
  }

  private async ensureConsumer(): Promise<KafkaConsumerClient> {
    if (!this.consumer) {
      this.consumer = this.config.client.consumer({
        groupId: this.config.consumerGroupId,
      })
      await this.consumer.connect()
    }
    return this.consumer
  }

  private async ensureConsumerForTopic(topic: string): Promise<void> {
    if (this.subscribedTopics.has(topic)) return

    this.subscribedTopics.add(topic)
    const consumer = await this.ensureConsumer()

    if (this.consumerRunning) {
      // Consumer already running, need to restart to add topic
      await this.restartConsumer()
    } else {
      // First topic, start consumer
      const topics = Array.from(this.subscribedTopics)
      await consumer.subscribe({
        topics,
        fromBeginning: false,
      })
      await this.startConsumerLoop()
      this.startOffsetCommitLoop()
    }
  }

  private async restartConsumer(): Promise<void> {
    if (!this.consumer) return

    try {
      // Stop offset commit loop
      if (this.offsetCommitTimer) {
        clearInterval(this.offsetCommitTimer)
        this.offsetCommitTimer = null
      }

      // Final commit
      await this.commitOffsets()

      // Disconnect
      await this.consumer.disconnect()
      this.consumer = null
      this.consumerRunning = false

      // Re-subscribe with updated topics
      const consumer = await this.ensureConsumer()
      const topics = Array.from(this.subscribedTopics)
      await consumer.subscribe({
        topics,
        fromBeginning: false,
      })

      await this.startConsumerLoop()
      this.startOffsetCommitLoop()
    } catch (error) {
      console.error(`[KafkaDriver] Consumer restart failed: ${error}`)
      throw error
    }
  }

  private async startConsumerLoop(): Promise<void> {
    const consumer = await this.ensureConsumer()
    this.consumerRunning = true

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await this.handleIncomingMessage(topic, partition, message)
      },
      autoCommit: false,
    })
  }

  async pop(queue: string): Promise<SerializedJob | null> {
    await this.ensureConsumerForTopic(queue)
    const buffered = this.buffer.dequeue(queue)

    // Resume consumer if buffer has space
    if (buffered && this.consumer) {
      const size = this.buffer.size(queue)
      if (size < this.config.bufferSize * 0.8) {
        this.consumer.resume([{ topic: queue }])
      }
    }

    return buffered?.job ?? null
  }

  async popBlocking(
    queues: string | string[],
    timeout: number
  ): Promise<SerializedJob | null> {
    const queueList = Array.isArray(queues) ? queues : [queues]

    // Ensure consumer for all queues
    for (const queue of queueList) {
      await this.ensureConsumerForTopic(queue)
    }

    // Try immediate pop
    for (const queue of queueList) {
      const job = await this.pop(queue)
      if (job) return job
    }

    // Wait with timeout
    return new Promise((resolve) => {
      const startTime = Date.now()
      const timeoutMs = timeout * 1000

      const checkQueue = async () => {
        for (const queue of queueList) {
          const buffered = this.buffer.dequeue(queue)
          if (buffered) {
            resolve(buffered.job)
            return
          }
        }

        if (Date.now() - startTime >= timeoutMs) {
          resolve(null)
        } else {
          setTimeout(checkQueue, 100)
        }
      }

      checkQueue()
    })
  }

  async popMany(queue: string, count: number): Promise<SerializedJob[]> {
    await this.ensureConsumerForTopic(queue)
    const buffered = this.buffer.dequeueMany(queue, count)
    return buffered.map((m) => m.job)
  }

  // 6B-4: Complete/Ack/Fail + Offset Commit (~30 min)
  async complete(queue: string, job: SerializedJob): Promise<void> {
    const meta = this.messageIdToMeta.get(job.id)
    if (meta) {
      this.offsetTracker.resolve(meta.topic, meta.partition, meta.offset)
      this.messageIdToMeta.delete(job.id)
    }
  }

  async acknowledge(messageId: string): Promise<void> {
    const meta = this.messageIdToMeta.get(messageId)
    if (meta) {
      this.offsetTracker.resolve(meta.topic, meta.partition, meta.offset)
      this.messageIdToMeta.delete(messageId)
    }
  }

  async fail(queue: string, job: SerializedJob): Promise<void> {
    const dlqTopic = `${queue}${this.config.dlqSuffix}`
    const meta = this.messageIdToMeta.get(job.id)

    // Add failure metadata
    const failedJob: SerializedJob = {
      ...job,
      error: job.error ?? 'Job processing failed',
      failedAt: Date.now(),
    }

    // Try to send to DLQ
    try {
      const producer = await this.ensureProducer()
      await producer.send({
        topic: dlqTopic,
        messages: [
          {
            key: job.id,
            value: JSON.stringify(failedJob),
          },
        ],
      })
    } catch (error) {
      // Buffer locally if send fails
      if (!this.dlqBuffer.has(dlqTopic)) {
        this.dlqBuffer.set(dlqTopic, [])
      }
      this.dlqBuffer.get(dlqTopic)!.push(failedJob)
      console.error(`[KafkaDriver] Failed to send to DLQ: ${error}`)
    }

    // Mark as resolved (at-least-once: already processed)
    if (meta) {
      this.offsetTracker.resolve(meta.topic, meta.partition, meta.offset)
      this.messageIdToMeta.delete(job.id)
    }
  }

  private startOffsetCommitLoop(): void {
    if (this.offsetCommitTimer) return

    this.offsetCommitTimer = setInterval(
      () => this.commitOffsets().catch((err) =>
        console.error(`[KafkaDriver] Offset commit failed: ${err}`)
      ),
      this.config.autoCommitInterval
    )
  }

  private async commitOffsets(): Promise<void> {
    if (!this.consumer) return

    const committable = this.offsetTracker.getCommittableOffsets()
    if (committable.length === 0) return

    // Kafka offset = next offset to read (offset + 1)
    const offsets = committable.map((c) => ({
      topic: c.topic,
      partition: c.partition,
      offset: String(BigInt(c.offset) + 1n),
    }))

    try {
      await this.consumer.commitOffsets(offsets)
    } catch (error) {
      console.error(`[KafkaDriver] commitOffsets error: ${error}`)
    }
  }

  // 6B-5: Topic Management (~15 min)
  private async ensureAdmin(): Promise<KafkaAdminClient> {
    if (!this.admin) {
      this.admin = this.config.client.admin()
      await this.admin.connect()
    }
    return this.admin
  }

  async createTopic(topic: string, options?: TopicOptions): Promise<void> {
    const admin = await this.ensureAdmin()
    await admin.createTopics({
      topics: [
        {
          topic,
          numPartitions: options?.numPartitions ?? 1,
          replicationFactor: options?.replicationFactor ?? 1,
        },
      ],
    })
    this.knownQueues.add(topic)
  }

  async deleteTopic(topic: string): Promise<void> {
    const admin = await this.ensureAdmin()
    await admin.deleteTopics({ topics: [topic] })
    this.knownQueues.delete(topic)
    this.subscribedTopics.delete(topic)
    this.buffer.destroy()
    this.offsetTracker.clear(topic)
    this.dlqBuffer.delete(topic)
  }

  async getQueues(): Promise<string[]> {
    try {
      const admin = await this.ensureAdmin()
      const topics = await admin.listTopics()
      const dlqSuffix = this.config.dlqSuffix
      return topics.filter((t) => !t.endsWith(dlqSuffix))
    } catch {
      return Array.from(this.knownQueues)
    }
  }

  // 6B-6: Stats/Size & Notifications (~15 min)
  async size(queue: string): Promise<number> {
    return this.buffer.size(queue)
  }

  async stats(queue: string): Promise<QueueStats> {
    const trackerStats = this.offsetTracker.getStats()
    return {
      queue,
      size: this.buffer.size(queue),
      failed: this.dlqBuffer.get(`${queue}${this.config.dlqSuffix}`)?.length ?? 0,
      metrics: {
        pendingAcks: trackerStats.pending,
        committedOffsets: trackerStats.committed,
        trackedMessages: trackerStats.tracked,
      },
    }
  }

  async clear(queue: string): Promise<void> {
    this.buffer.clear(queue)
    this.offsetTracker.clear(queue)
    this.dlqBuffer.delete(`${queue}${this.config.dlqSuffix}`)

    // Clear messageIdToMeta for this queue
    for (const [id, meta] of this.messageIdToMeta.entries()) {
      if (meta.topic === queue) {
        this.messageIdToMeta.delete(id)
      }
    }
  }

  async enableNotifications(): Promise<void> {
    this.notifier.enable()
  }

  async disableNotifications(): Promise<void> {
    this.notifier.disable()
  }

  async onNotify(
    queues: string | string[],
    callback: (queue: string) => Promise<void>
  ): Promise<void> {
    const queueList = Array.isArray(queues) ? queues : [queues]

    // Ensure consumer for all queues
    for (const queue of queueList) {
      await this.ensureConsumerForTopic(queue)
    }

    this.notifier.registerCallback(queueList, callback)
  }

  // 6B-7: DLQ Management (~10 min)
  async getFailed(
    queue: string,
    start?: number,
    end?: number
  ): Promise<SerializedJob[]> {
    const dlqTopic = `${queue}${this.config.dlqSuffix}`
    const failed = this.dlqBuffer.get(dlqTopic) ?? []

    if (start === undefined) return failed
    if (end === undefined) return failed.slice(start)
    return failed.slice(start, end)
  }

  async clearFailed(queue: string): Promise<void> {
    const dlqTopic = `${queue}${this.config.dlqSuffix}`
    this.dlqBuffer.delete(dlqTopic)
  }

  async retryFailed(queue: string, count?: number): Promise<number> {
    const dlqTopic = `${queue}${this.config.dlqSuffix}`
    const failed = this.dlqBuffer.get(dlqTopic) ?? []

    const toRetry = count ? failed.splice(0, count) : failed.splice(0)

    for (const job of toRetry) {
      const cleanJob: SerializedJob = {
        ...job,
        error: undefined,
        failedAt: undefined,
      }
      await this.push(queue, cleanJob)
    }

    return toRetry.length
  }

  // 6B-8: Graceful Shutdown (~15 min)
  async disconnect(): Promise<void> {
    try {
      // Stop offset commit loop
      if (this.offsetCommitTimer) {
        clearInterval(this.offsetCommitTimer)
        this.offsetCommitTimer = null
      }

      // Final offset commit
      try {
        await this.commitOffsets()
      } catch (error) {
        console.error(`[KafkaDriver] Final commit failed: ${error}`)
      }

      // Destroy buffer (cancel waiters)
      this.buffer.destroy()
      this.notifier.clearCallbacks()

      // Disconnect all clients
      if (this.consumer) {
        try {
          await this.consumer.disconnect()
        } catch (error) {
          console.error(`[KafkaDriver] Consumer disconnect failed: ${error}`)
        }
        this.consumer = null
      }

      if (this.producer) {
        try {
          await this.producer.disconnect()
        } catch (error) {
          console.error(`[KafkaDriver] Producer disconnect failed: ${error}`)
        }
        this.producer = null
      }

      if (this.admin) {
        try {
          await this.admin.disconnect()
        } catch (error) {
          console.error(`[KafkaDriver] Admin disconnect failed: ${error}`)
        }
        this.admin = null
      }

      this.consumerRunning = false
      this.subscribedTopics.clear()
      this.messageIdToMeta.clear()
    } catch (error) {
      console.error(`[KafkaDriver] Disconnect error: ${error}`)
      throw error
    }
  }
}
