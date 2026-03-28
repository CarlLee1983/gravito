import { StreamError, StreamErrorCodes } from '../../errors'
import type { JobPushOptions, QueueStats, SerializedJob, TopicOptions } from '../../types'
import type { QueueDriver } from '../QueueDriver'
import {
  BackpressureController,
  BatchProcessor,
  ConsumerLifecycleManager,
  ErrorCategorizer,
  ErrorRecoveryManager,
  HeartbeatManager,
  KafkaMetrics,
  KafkaNotifier,
  MessageBuffer,
  OffsetTracker,
  PerformanceMonitor,
  RebalanceHandler,
} from '.'
import type {
  KafkaAdminClient,
  KafkaConsumerClient,
  KafkaDriverFullConfig,
  KafkaDriverMetrics,
  KafkaMessage,
  KafkaProducerClient,
  PerformanceSnapshot,
  SerializationErrorRecord,
  SubscribeOptions,
} from './types'

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

  // Phase 6C components
  private readonly lifecycleManager: ConsumerLifecycleManager
  private readonly backpressure: BackpressureController

  // Phase 6D components
  private readonly heartbeatManager: HeartbeatManager
  private readonly metrics: KafkaMetrics
  private readonly errorRecovery: ErrorRecoveryManager
  private readonly rebalanceHandler: RebalanceHandler

  // Phase 6E components
  private readonly batchProcessor: BatchProcessor
  private readonly performanceMonitor: PerformanceMonitor

  // Phase 6F components
  private readonly errorCategorizer: ErrorCategorizer

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
  private subscriptionCallbacks = new Map<string, (job: SerializedJob) => Promise<void>>()

  // Phase 6E: Reverse index for O(1) clear() by topic
  private readonly topicToMessageIds = new Map<string, Set<string>>()

  // Phase 6E: Serialization cache for push() hot path (WeakMap for automatic GC)
  private readonly serializationCache = new WeakMap<SerializedJob, string>()

  // Phase 6F: Serialization error DLQ buffer and per-partition tracking
  private readonly serializationDlq: SerializationErrorRecord[] = []
  private readonly partitionSerializationErrors = new Map<string, number>()

  // Phase 6F-4: Per-queue callback failure tracking for circuit breaker integration
  private readonly callbackFailureCounts = new Map<string, number>()

  // Phase 6F-5: DLQ retry timer
  private dlqRetryTimer: ReturnType<typeof setInterval> | null = null

  private readonly config: Required<KafkaDriverFullConfig>

  // 6B-1: Constructor & Config (~15 min)
  constructor(config: KafkaDriverFullConfig) {
    if (!config.client) {
      throw new StreamError(500, StreamErrorCodes.KAFKA_CLIENT_REQUIRED, {
        message: 'KafkaDriver: client factory is required',
        retryable: false,
      })
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
      maxDlqBufferSize: config.maxDlqBufferSize ?? 1000,
      dlqRetryIntervalMs: config.dlqRetryIntervalMs ?? 60000,
      dlqRetryEnabled: config.dlqRetryEnabled ?? true,
      callbackCircuitThreshold: config.callbackCircuitThreshold ?? 5,
    }

    this.buffer = new MessageBuffer(this.config.bufferSize)
    this.offsetTracker = new OffsetTracker()
    this.notifier = new KafkaNotifier()

    // Phase 6C components
    this.lifecycleManager = new ConsumerLifecycleManager()
    this.backpressure = new BackpressureController(this.config.bufferSize, {
      highWatermark: 0.8,
      lowWatermark: 0.5,
      maxInFlight: 10,
    })

    // Phase 6D components
    this.heartbeatManager = new HeartbeatManager()
    this.metrics = new KafkaMetrics()
    this.errorRecovery = new ErrorRecoveryManager()
    this.rebalanceHandler = new RebalanceHandler()
    this.batchProcessor = new BatchProcessor({
      maxBatchSize: this.config.maxBatchSize,
    })
    this.performanceMonitor = new PerformanceMonitor()
    this.errorCategorizer = new ErrorCategorizer()
    this.performanceMonitor.bind({
      metrics: this.metrics,
      errorRecovery: this.errorRecovery,
      heartbeat: this.heartbeatManager,
      backpressure: this.backpressure,
      lifecycle: this.lifecycleManager,
    })

    // 註冊重新平衡回調
    this.rebalanceHandler.registerCallbacks({
      commitOffsets: () => this.commitOffsets(),
      clearPartitionBuffers: (partitions) => {
        for (const { topic } of partitions) {
          this.buffer.clear(topic)
          // Also clear reverse index for the partition's topic
          const messageIds = this.topicToMessageIds.get(topic)
          if (messageIds) {
            for (const id of messageIds) {
              this.messageIdToMeta.delete(id)
            }
            this.topicToMessageIds.delete(topic)
          }
        }
      },
      clearPartitionTracking: (partitions) => {
        for (const { topic } of partitions) {
          this.offsetTracker.clear(topic)
        }
      },
    })
  }

  // 6B-2: Producer & Push (~25 min)
  private async ensureProducer(): Promise<KafkaProducerClient> {
    if (!this.producer) {
      this.producer = this.config.client.producer()
      await this.producer.connect()
    }
    return this.producer
  }

  async push(queue: string, job: SerializedJob, options?: JobPushOptions): Promise<void> {
    // 電路斷路器檢查
    if (!this.errorRecovery.canProceed()) {
      await this.errorRecovery.waitForBackoff()
    }

    try {
      const producer = await this.ensureProducer()

      const messageKey = options?.groupId ?? job.groupId ?? job.id
      const payload = this.serializeJob(job)

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
      this.errorRecovery.recordSuccess()
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      const category = this.errorCategorizer.categorize(err)
      this.errorRecovery.recordFailure(err, category)
      this.metrics.recordError(category === 'transient' ? 'connection' : 'serialization')
      throw error
    }
  }

  /**
   * Serialize a job with WeakMap caching.
   * Avoids re-serializing the same object reference (e.g. retries).
   */
  private serializeJob(job: SerializedJob): string {
    let cached = this.serializationCache.get(job)
    if (!cached) {
      cached = JSON.stringify(job)
      this.serializationCache.set(job, cached)
    }
    return cached
  }

  async pushMany(queue: string, jobs: SerializedJob[]): Promise<void> {
    if (jobs.length === 0) {
      return
    }

    // 電路斷路器檢查
    if (!this.errorRecovery.canProceed()) {
      await this.errorRecovery.waitForBackoff()
    }

    try {
      const producer = await this.ensureProducer()

      await this.batchProcessor.pushBatches(producer, queue, jobs, (job) => this.serializeJob(job))

      this.knownQueues.add(queue)
      this.errorRecovery.recordSuccess()
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      const category = this.errorCategorizer.categorize(err)
      this.errorRecovery.recordFailure(err, category)
      this.metrics.recordError(category === 'transient' ? 'connection' : 'serialization')
      throw error
    }
  }

  // 6B-3: Consumer initialization & Pop (~45 min)
  private async handleIncomingMessage(
    topic: string,
    partition: number,
    message: KafkaMessage
  ): Promise<void> {
    if (!message.value) {
      return
    }

    try {
      const payload = message.value.toString()
      const job: SerializedJob = JSON.parse(payload)

      // Track offset in OffsetTracker
      this.offsetTracker.track(topic, partition, message.offset)

      // Create messageId → metadata mapping + reverse index
      this.messageIdToMeta.set(job.id, {
        topic,
        partition,
        offset: message.offset,
      })

      // Maintain reverse index for O(1) clear()
      if (!this.topicToMessageIds.has(topic)) {
        this.topicToMessageIds.set(topic, new Set())
      }
      this.topicToMessageIds.get(topic)?.add(job.id)

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

      // 記錄成功
      this.errorRecovery.recordSuccess()
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      const category = this.errorCategorizer.categorize(err)
      this.metrics.recordError(category === 'serialization' ? 'serialization' : 'callback')
      this.errorRecovery.recordFailure(err, category)

      // Phase 6F: 序列化錯誤路由至 DLQ 緩衝區
      if (category === 'serialization') {
        const partitionKey = `${topic}:${partition}`
        const current = this.partitionSerializationErrors.get(partitionKey) ?? 0
        this.partitionSerializationErrors.set(partitionKey, current + 1)

        const record: SerializationErrorRecord = {
          topic,
          partition,
          offset: message.offset,
          rawPayload: message.value?.toString() ?? '',
          error: err.message,
          timestamp: Date.now(),
          category: 'serialization',
        }

        const maxSize = this.config.maxDlqBufferSize
        if (this.serializationDlq.length < maxSize) {
          this.serializationDlq.push(record)
        }
      }

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
    if (this.subscribedTopics.has(topic)) {
      return
    }

    // 如果電路打開，等待退避後再繼續
    if (!this.errorRecovery.canProceed()) {
      await this.errorRecovery.waitForBackoff()
    }

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
    if (!this.consumer) {
      return
    }

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

  async popBlocking(queues: string | string[], timeout: number): Promise<SerializedJob | null> {
    const queueList = Array.isArray(queues) ? queues : [queues]

    // Ensure consumer for all queues
    for (const queue of queueList) {
      await this.ensureConsumerForTopic(queue)
    }

    // Try immediate pop from any queue
    for (const queue of queueList) {
      const job = await this.pop(queue)
      if (job) {
        return job
      }
    }

    // Use MessageBuffer's event-driven dequeueBlocking instead of polling
    const timeoutMs = timeout * 1000
    const result = await Promise.race(
      queueList.map((queue) =>
        this.buffer.dequeueBlocking(queue, timeoutMs).then((msg) => msg?.job ?? null)
      )
    )
    return result
  }

  async popMany(queue: string, count: number): Promise<SerializedJob[]> {
    await this.ensureConsumerForTopic(queue)
    const buffered = this.buffer.dequeueMany(queue, count)
    return buffered.map((m) => m.job)
  }

  // 6C-5: Subscribe (Reactive Push Model) (~50 min)
  async subscribe(
    queue: string,
    callback: (job: SerializedJob) => Promise<void>,
    options?: SubscribeOptions
  ): Promise<void> {
    const opts = {
      concurrency: options?.concurrency ?? 1,
      autoAcknowledge: options?.autoAcknowledge ?? true,
      callbackTimeout: options?.callbackTimeout ?? 30000,
      fromBeginning: options?.fromBeginning ?? false,
    }

    // Store callback for this queue
    this.subscriptionCallbacks.set(queue, callback)

    // Ensure consumer is subscribed to this topic
    await this.ensureConsumerForTopic(queue)

    // Enable notifier for reactive updates
    this.notifier.enable()

    // Set up backpressure callbacks
    this.backpressure.onBackpressure({
      pause: (topics) => {
        // Pause Kafka consumer for these topics
        if (this.consumer) {
          this.consumer.pause(topics.map((t) => ({ topic: t })))
        }
      },
      resume: (topics) => {
        // Resume Kafka consumer for these topics
        if (this.consumer) {
          this.consumer.resume(topics.map((t) => ({ topic: t })))
        }
      },
    })

    // Set up lifecycle manager listener
    this.lifecycleManager.onStateChange((event) => {
      // Handle lifecycle events if needed
      if (event.state === 'error') {
        console.error(`[KafkaDriver] Consumer lifecycle error: ${event.error?.message}`)
      }
    })

    // Start heartbeat, lifecycle, and performance monitoring
    await this.heartbeatManager.start(this.config.consumerGroupId, [queue])
    await this.lifecycleManager.start()
    this.performanceMonitor.start()

    try {
      await this.runSubscription(queue, callback, opts)
    } catch (error) {
      this.performanceMonitor.stop()
      await this.heartbeatManager.stop()
      await this.lifecycleManager.stop()
      throw error
    }
  }

  /**
   * Internal method to run the subscription message processing loop.
   */
  private async runSubscription(
    queue: string,
    callback: (job: SerializedJob) => Promise<void>,
    options: Required<SubscribeOptions>
  ): Promise<void> {
    const inFlightJobs = new Map<
      string,
      { resolve: () => void; timer: ReturnType<typeof setTimeout> }
    >()

    while (this.lifecycleManager.isRunning()) {
      // 檢查電路狀態，如果打開則等待退避
      if (!this.errorRecovery.canProceed()) {
        await this.errorRecovery.waitForBackoff()
        continue
      }

      // Check backpressure before processing
      const bufferSize = this.buffer.size(queue)
      this.backpressure.evaluate(bufferSize, [queue])

      // Try to acquire slot for in-flight processing
      if (!this.backpressure.acquireSlot()) {
        // Too many in-flight jobs, wait a bit
        await new Promise((resolve) => setTimeout(resolve, 100))
        continue
      }

      // Dequeue message with timeout
      const buffered = await this.buffer.dequeueBlocking(queue, 1000) // 1 second timeout

      if (!buffered) {
        // No message available
        this.backpressure.releaseSlot()
        continue
      }

      const job = buffered.job
      const messageId = job.id

      // Track this job
      inFlightJobs.set(messageId, {
        resolve: () => {},
        timer: setTimeout(() => {}, 0),
      })

      // Execute callback with timeout and latency tracking
      const callbackStart = Date.now()
      const callbackPromise = Promise.race([
        callback(job),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Callback timeout')), options.callbackTimeout)
        ),
      ])

      callbackPromise
        .then(() => {
          // Success - record metrics and signal heartbeat
          const latencyMs = Date.now() - callbackStart
          this.metrics.recordMessage(queue, latencyMs)
          this.heartbeatManager.beat()
          this.errorRecovery.recordSuccess()

          // Reset callback failure count on success
          this.callbackFailureCounts.set(queue, 0)

          if (options.autoAcknowledge) {
            this.offsetTracker.resolve(buffered.topic, buffered.partition, buffered.offset)
            this.removeMessageTracking(messageId, buffered.topic)
          }

          // Notify completion
          this.notifier.notify(queue)
        })
        .catch((err) => {
          // Failure - record error metrics and mark for DLQ
          const isTimeout = err instanceof Error && err.message === 'Callback timeout'
          this.metrics.recordError(isTimeout ? 'timeout' : 'callback')

          // Track consecutive callback failures per queue
          const currentCount = this.callbackFailureCounts.get(queue) ?? 0
          const newCount = currentCount + 1
          this.callbackFailureCounts.set(queue, newCount)

          // If consecutive failures reach threshold, trigger circuit breaker
          if (newCount >= this.config.callbackCircuitThreshold) {
            const circuitErr = err instanceof Error ? err : new Error(String(err))
            this.errorRecovery.recordFailure(circuitErr, 'transient')
          }

          console.error(`[KafkaDriver] Callback error for ${queue}: ${err}`)
          this.fail(queue, job).catch((failErr) => {
            console.error(`[KafkaDriver] Failed to move job to DLQ: ${failErr}`)
          })
        })
        .finally(() => {
          // Release slot
          this.backpressure.releaseSlot()
          inFlightJobs.delete(messageId)
        })
    }
  }

  // 6B-4: Complete/Ack/Fail + Offset Commit (~30 min)
  async complete(_queue: string, job: SerializedJob): Promise<void> {
    const meta = this.messageIdToMeta.get(job.id)
    if (meta) {
      this.offsetTracker.resolve(meta.topic, meta.partition, meta.offset)
      this.removeMessageTracking(job.id, meta.topic)
    }
  }

  async acknowledge(messageId: string): Promise<void> {
    const meta = this.messageIdToMeta.get(messageId)
    if (meta) {
      this.offsetTracker.resolve(meta.topic, meta.partition, meta.offset)
      this.removeMessageTracking(messageId, meta.topic)
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
      const buffer = this.dlqBuffer.get(dlqTopic)!
      buffer.push(failedJob)

      // Discard oldest items when exceeding maxDlqBufferSize
      const maxSize = this.config.maxDlqBufferSize
      while (buffer.length > maxSize) {
        buffer.shift()
      }

      console.error(`[KafkaDriver] Failed to send to DLQ: ${error}`)
    }

    // Mark as resolved (at-least-once: already processed)
    if (meta) {
      this.offsetTracker.resolve(meta.topic, meta.partition, meta.offset)
      this.removeMessageTracking(job.id, meta.topic)
    }
  }

  private startOffsetCommitLoop(): void {
    if (this.offsetCommitTimer) {
      return
    }

    this.offsetCommitTimer = setInterval(
      () =>
        this.commitOffsets().catch((err) =>
          console.error(`[KafkaDriver] Offset commit failed: ${err}`)
        ),
      this.config.autoCommitInterval
    )
  }

  private async commitOffsets(): Promise<void> {
    if (!this.consumer) {
      return
    }

    const committable = this.offsetTracker.getCommittableOffsets()
    if (committable.length === 0) {
      return
    }

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
          numPartitions: options?.partitions ?? 1,
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
    const metricsSnapshot = this.metrics.getSnapshot()
    return {
      queue,
      size: this.buffer.size(queue),
      failed: this.dlqBuffer.get(`${queue}${this.config.dlqSuffix}`)?.length ?? 0,
      metrics: {
        pendingAcks: trackerStats.pending,
        committedOffsets: trackerStats.committed,
        trackedMessages: trackerStats.tracked,
        totalProcessed: metricsSnapshot.totalProcessed,
        totalFailed: metricsSnapshot.totalFailed,
        inFlight: metricsSnapshot.inFlight,
        latencyP50: metricsSnapshot.latency.p50,
        latencyP95: metricsSnapshot.latency.p95,
        latencyP99: metricsSnapshot.latency.p99,
        latencyAvg: metricsSnapshot.latency.avg,
        errorsTotal: metricsSnapshot.errors.total,
      },
    }
  }

  /**
   * Get full driver metrics snapshot.
   */
  getMetrics(): KafkaDriverMetrics {
    return this.metrics.getSnapshot()
  }

  /**
   * Get aggregated performance snapshot.
   */
  getPerformanceSnapshot(): PerformanceSnapshot {
    return this.performanceMonitor.collectSnapshot()
  }

  /**
   * Get performance history.
   */
  getPerformanceHistory(count?: number): PerformanceSnapshot[] {
    return this.performanceMonitor.getHistory(count)
  }

  /**
   * Generate a performance report string.
   */
  getPerformanceReport(): string {
    return this.performanceMonitor.generateReport()
  }

  /**
   * 取得序列化錯誤 DLQ 緩衝區的不可變副本。
   */
  getSerializationDlq(): readonly SerializationErrorRecord[] {
    return [...this.serializationDlq]
  }

  /**
   * 取得每個分區的序列化錯誤計數。
   */
  getPartitionSerializationErrors(): ReadonlyMap<string, number> {
    return new Map(this.partitionSerializationErrors)
  }

  /**
   * 取得每個佇列的回呼連續失敗計數。
   */
  getCallbackFailureCounts(): ReadonlyMap<string, number> {
    return new Map(this.callbackFailureCounts)
  }

  /**
   * 取得 DLQ 緩衝區統計資訊。
   */
  getDlqStats(): {
    totalBuffered: number
    perTopic: Record<string, number>
    retryEnabled: boolean
    retryIntervalMs: number
  } {
    let totalBuffered = 0
    const perTopic: Record<string, number> = {}
    for (const [topic, jobs] of this.dlqBuffer) {
      totalBuffered += jobs.length
      perTopic[topic] = jobs.length
    }
    return {
      totalBuffered,
      perTopic,
      retryEnabled: this.config.dlqRetryEnabled,
      retryIntervalMs: this.config.dlqRetryIntervalMs,
    }
  }

  /**
   * 啟動 DLQ 重試迴圈，定期嘗試將緩衝區中的失敗訊息重新發送至 Kafka。
   */
  startDlqRetryLoop(): void {
    if (this.dlqRetryTimer || !this.config.dlqRetryEnabled) {
      return
    }

    this.dlqRetryTimer = setInterval(
      () =>
        this.flushDlqBuffer().catch((err) =>
          console.error(`[KafkaDriver] DLQ retry flush failed: ${err}`)
        ),
      this.config.dlqRetryIntervalMs
    )
  }

  /**
   * 嘗試將所有緩衝的 DLQ 訊息重新發送至 Kafka。
   * 成功發送的訊息會從緩衝區中移除。
   */
  async flushDlqBuffer(): Promise<{ flushed: number; remaining: number }> {
    let flushed = 0
    let remaining = 0

    for (const [dlqTopic, jobs] of this.dlqBuffer) {
      if (jobs.length === 0) {
        continue
      }

      try {
        const producer = await this.ensureProducer()
        const messages = jobs.map((job) => ({
          key: job.id,
          value: JSON.stringify(job),
        }))
        await producer.send({ topic: dlqTopic, messages })
        flushed += jobs.length
        this.dlqBuffer.set(dlqTopic, [])
      } catch (error) {
        remaining += jobs.length
        console.error(`[KafkaDriver] DLQ flush failed for ${dlqTopic}: ${error}`)
      }
    }

    return { flushed, remaining }
  }

  async clear(queue: string): Promise<void> {
    this.buffer.clear(queue)
    this.offsetTracker.clear(queue)
    this.dlqBuffer.delete(`${queue}${this.config.dlqSuffix}`)

    // O(1) clear using reverse index instead of O(n) iteration
    const messageIds = this.topicToMessageIds.get(queue)
    if (messageIds) {
      for (const id of messageIds) {
        this.messageIdToMeta.delete(id)
      }
      this.topicToMessageIds.delete(queue)
    }
  }

  /**
   * Remove message tracking from both primary and reverse indexes.
   */
  private removeMessageTracking(messageId: string, topic: string): void {
    this.messageIdToMeta.delete(messageId)
    const topicIds = this.topicToMessageIds.get(topic)
    if (topicIds) {
      topicIds.delete(messageId)
      if (topicIds.size === 0) {
        this.topicToMessageIds.delete(topic)
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
  async getFailed(queue: string, start?: number, end?: number): Promise<SerializedJob[]> {
    const dlqTopic = `${queue}${this.config.dlqSuffix}`
    const failed = this.dlqBuffer.get(dlqTopic) ?? []

    if (start === undefined) {
      return failed
    }
    if (end === undefined) {
      return failed.slice(start)
    }
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
      // Stop lifecycle manager to terminate runSubscription loop
      await this.lifecycleManager.stop()

      // Stop performance monitor
      this.performanceMonitor.destroy()

      // Stop heartbeat manager
      await this.heartbeatManager.stop()

      // 清理錯誤恢復管理器和重新平衡處理器
      this.errorRecovery.destroy()
      this.rebalanceHandler.destroy()

      // Stop DLQ retry loop
      if (this.dlqRetryTimer) {
        clearInterval(this.dlqRetryTimer)
        this.dlqRetryTimer = null
      }

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
      this.topicToMessageIds.clear()
      // serializationCache is a WeakMap, auto-cleaned by GC
    } catch (error) {
      console.error(`[KafkaDriver] Disconnect error: ${error}`)
      throw error
    }
  }
}
