import { StreamError, StreamErrorCodes } from './errors'
import { MemoryDriver } from './drivers/MemoryDriver'
import type { QueueDriver } from './drivers/QueueDriver'
import type { Job } from './Job'
import type { Queueable } from './Queueable'
import type { Scheduler } from './Scheduler'
import { CachedSerializer } from './serializers/CachedSerializer'
import { ClassNameSerializer } from './serializers/ClassNameSerializer'
import type { JobSerializer } from './serializers/JobSerializer'
import { JsonSerializer } from './serializers/JsonSerializer'
import type {
  JobPushOptions,
  PersistenceAdapter,
  QueueConfig,
  QueueConnectionConfig,
  QueueStats,
  SerializedJob,
} from './types'

/**
 * The central manager for queue operations.
 *
 * This class manages multiple queue connections and drivers, exposing a unified API for pushing,
 * popping, and managing jobs. It handles connection pooling, serialization, persistence,
 * and driver lazy-loading.
 *
 * @public
 * @example
 * ```typescript
 * const manager = new QueueManager({
 *   default: 'redis',
 *   connections: {
 *     redis: { driver: 'redis', client: redisClient }
 *   }
 * });
 *
 * await manager.push(new SendEmailJob('hello@example.com'));
 * ```
 */
export class QueueManager {
  private drivers = new Map<string, QueueDriver>()
  private serializers = new Map<string, JobSerializer>()
  private defaultConnection: string
  private defaultSerializer: JobSerializer
  private persistence?: QueueConfig['persistence']
  private scheduler?: Scheduler
  private debug: boolean

  constructor(config: QueueConfig = {}) {
    this.persistence = config.persistence
    this.defaultConnection = config.default ?? 'default'
    this.debug = config.debug ?? false

    // Wrap persistence adapter if buffering is configured
    if (this.persistence && (this.persistence.bufferSize || this.persistence.flushInterval)) {
      const { BufferedPersistence } = require('./persistence/BufferedPersistence')
      this.persistence.adapter = new BufferedPersistence(this.persistence.adapter, {
        maxBufferSize: this.persistence.bufferSize,
        flushInterval: this.persistence.flushInterval,
      })
    }

    // Initialize default serializer
    const serializerType = config.defaultSerializer ?? 'class'
    if (serializerType === 'class') {
      this.defaultSerializer = new ClassNameSerializer()
    } else if (serializerType === 'msgpack') {
      const { MessagePackSerializer } = require('./serializers/MessagePackSerializer')
      this.defaultSerializer = new MessagePackSerializer()
    } else {
      this.defaultSerializer = new JsonSerializer()
    }

    // Wrap with CachedSerializer if enabled
    if (config.useSerializationCache) {
      this.defaultSerializer = new CachedSerializer(this.defaultSerializer)
    }

    // Initialize default connection (MemoryDriver)
    if (!this.drivers.has('default')) {
      this.drivers.set('default', new MemoryDriver())
    }

    // Initialize additional connections
    if (config.connections) {
      for (const [name, connectionConfig] of Object.entries(config.connections)) {
        this.registerConnection(name, connectionConfig)
      }
    }
  }

  /**
   * Log debug message.
   */
  private log(message: string, data?: unknown): void {
    if (this.debug) {
      const timestamp = new Date().toISOString()
      const prefix = `[QueueManager] [${timestamp}]`
      if (data) {
        console.log(prefix, message, data)
      } else {
        console.log(prefix, message)
      }
    }
  }

  /**
   * Registers a new queue connection with the manager.
   *
   * Dynamically loads the required driver implementation based on the configuration.
   *
   * @param name - The name of the connection (e.g., 'primary').
   * @param config - The configuration object for the driver.
   * @throws {Error} If the driver type is missing required dependencies or unsupported.
   *
   * @example
   * ```typescript
   * manager.registerConnection('analytics', { driver: 'sqs', client: sqs });
   * ```
   */
  registerConnection(name: string, config: QueueConnectionConfig): void {
    const driverType = config.driver

    switch (driverType) {
      case 'memory':
        this.drivers.set(name, new MemoryDriver())
        break

      case 'database': {
        // Lazy-load DatabaseDriver
        const { DatabaseDriver } = require('./drivers/DatabaseDriver')
        if (!config.dbService) {
          throw new StreamError(500, StreamErrorCodes.DATABASE_DRIVER_REQUIRED, {
            message:
              '[QueueManager] DatabaseDriver requires dbService. Please provide a database service that implements DatabaseService interface.',
            retryable: false,
          })
        }
        this.drivers.set(
          name,
          new DatabaseDriver({
            dbService: config.dbService,
            table: config.table,
          })
        )
        break
      }

      case 'redis': {
        // Lazy-load RedisDriver
        const { RedisDriver } = require('./drivers/RedisDriver')
        if (!config.client) {
          throw new StreamError(500, StreamErrorCodes.CONFIGURATION_ERROR, {
            message:
              '[QueueManager] RedisDriver requires client. Please provide Redis client in connection config.',
            retryable: false,
          })
        }
        this.drivers.set(
          name,
          new RedisDriver({
            client: config.client,
            prefix: config.prefix,
          })
        )
        break
      }

      case 'kafka': {
        // Lazy-load KafkaDriver
        const { KafkaDriver } = require('./drivers/KafkaDriver')
        if (!config.client) {
          throw new StreamError(500, StreamErrorCodes.KAFKA_CLIENT_REQUIRED, {
            message:
              '[QueueManager] KafkaDriver requires client. Please provide Kafka client in connection config.',
            retryable: false,
          })
        }
        this.drivers.set(
          name,
          new KafkaDriver({
            client: config.client,
            consumerGroupId: config.consumerGroupId,
          })
        )
        break
      }

      case 'sqs': {
        // Lazy-load SQSDriver
        const { SQSDriver } = require('./drivers/SQSDriver')
        if (!config.client) {
          throw new StreamError(500, StreamErrorCodes.CONFIGURATION_ERROR, {
            message:
              '[QueueManager] SQSDriver requires client. Please provide SQS client in connection config.',
            retryable: false,
          })
        }
        this.drivers.set(
          name,
          new SQSDriver({
            client: config.client,
            queueUrlPrefix: config.queueUrlPrefix,
            visibilityTimeout: config.visibilityTimeout,
            waitTimeSeconds: config.waitTimeSeconds,
          })
        )
        break
      }

      case 'rabbitmq': {
        // Lazy-load RabbitMQDriver
        const { RabbitMQDriver } = require('./drivers/RabbitMQDriver')
        if (!config.client) {
          throw new StreamError(500, StreamErrorCodes.CONFIGURATION_ERROR, {
            message:
              '[QueueManager] RabbitMQDriver requires client. Please provide RabbitMQ connection/channel in connection config.',
            retryable: false,
          })
        }
        this.drivers.set(
          name,
          new RabbitMQDriver({
            client: config.client,
            exchange: config.exchange,
            exchangeType: config.exchangeType,
          })
        )
        break
      }

      case 'bullmq': {
        // Lazy-load BullMQDriver
        const { BullMQDriver } = require('./drivers/BullMQDriver')
        if (!config.queue) {
          throw new StreamError(500, StreamErrorCodes.BULLMQ_QUEUE_REQUIRED, {
            message:
              '[QueueManager] BullMQDriver requires queue. Please provide Bull Queue instance in connection config.',
            retryable: false,
          })
        }
        this.drivers.set(
          name,
          new BullMQDriver({
            queue: config.queue,
            worker: config.worker,
            prefix: config.prefix,
            debug: config.debug,
          })
        )
        break
      }

      default:
        throw new StreamError(500, StreamErrorCodes.DRIVER_NOT_FOUND, {
          message: `Driver "${driverType}" is not supported. Supported drivers: memory, database, redis, kafka, sqs, rabbitmq, bullmq`,
          retryable: false,
        })
    }
  }

  /**
   * Retrieves the driver instance for a specific connection.
   *
   * @param connection - The name of the connection.
   * @returns The configured QueueDriver instance.
   * @throws {Error} If the connection has not been registered.
   *
   * @example
   * ```typescript
   * const driver = manager.getDriver('redis');
   * ```
   */
  getDriver(connection: string): QueueDriver {
    const driver = this.drivers.get(connection)
    if (!driver) {
      throw new StreamError(500, StreamErrorCodes.CONNECTION_NOT_FOUND, {
        message: `Connection "${connection}" not found`,
        retryable: false,
      })
    }
    return driver
  }

  /**
   * Gets the name of the default connection.
   *
   * @returns The default connection name.
   */
  getDefaultConnection(): string {
    return this.defaultConnection
  }

  /**
   * Retrieves a serializer instance by type.
   *
   * @param type - The serializer type (e.g., 'json', 'class'). If omitted, returns the default serializer.
   * @returns The JobSerializer instance.
   * @throws {Error} If the requested serializer type is not found.
   */
  getSerializer(type?: string): JobSerializer {
    if (type) {
      const serializer = this.serializers.get(type)
      if (!serializer) {
        throw new StreamError(500, StreamErrorCodes.SERIALIZER_NOT_FOUND, {
          message: `Serializer "${type}" not found`,
          retryable: false,
        })
      }
      return serializer
    }
    return this.defaultSerializer
  }

  /**
   * Registers Job classes for the `ClassNameSerializer`.
   *
   * This is required when using 'class' serialization to allow proper hydration of job instances
   * upon deserialization.
   *
   * @param jobClasses - An array of Job class constructors.
   *
   * @example
   * ```typescript
   * manager.registerJobClasses([SendEmailJob, ProcessOrderJob]);
   * ```
   */
  registerJobClasses(jobClasses: Array<new (...args: unknown[]) => Job>): void {
    const serializer = this.getClassSerializer()
    if (serializer) {
      serializer.registerMany(jobClasses)
    }
  }

  private getClassSerializer(): ClassNameSerializer | null {
    return this.unwrapClassSerializer(this.defaultSerializer)
  }

  private unwrapClassSerializer(serializer: JobSerializer): ClassNameSerializer | null {
    if (serializer instanceof ClassNameSerializer) {
      return serializer
    }

    if (serializer instanceof CachedSerializer) {
      return this.unwrapClassSerializer(serializer.getDelegate())
    }

    return null
  }

  /**
   * Pushes a single job to the queue.
   *
   * Serializes the job, selects the appropriate driver based on job configuration,
   * and dispatches it. Also handles audit logging if persistence is enabled.
   *
   * @template T - The type of the job (extends Job).
   * @param job - The job instance to enqueue.
   * @param options - Optional overrides for push behavior (priority, delay, etc.).
   * @returns The same job instance (for chaining).
   *
   * @example
   * ```typescript
   * await manager.push(new SendEmailJob('user@example.com'));
   * ```
   */
  async push<T extends Job & Queueable>(job: T, options?: JobPushOptions): Promise<T> {
    const connection = job.connectionName ?? this.defaultConnection
    const queue = job.queueName ?? 'default'
    const driver = this.getDriver(connection)
    const serializer = this.getSerializer()

    this.getClassSerializer()?.register(job.constructor as new (...args: unknown[]) => Job)

    // Serialize job
    const serialized = serializer.serialize(job)

    // Push to queue
    const pushOptions = { ...options }
    if (job.priority) {
      pushOptions.priority = job.priority
    }
    await driver.push(queue, serialized, pushOptions)

    this.log(`Pushed job to ${queue} (${connection})`, {
      id: serialized.id,
      job: serialized.className ?? 'json',
      options: pushOptions,
    })

    // Auto-archive (Audit Mode) - Fire and forget
    if (this.persistence?.archiveEnqueued) {
      this.persistence.adapter.archive(queue, serialized, 'waiting').catch((err) => {
        console.error('[QueueManager] Persistence archive failed (waiting):', err)
      })
    }

    return job
  }

  /**
   * Pushes multiple jobs to the queue in a batch.
   *
   * Optimizes network requests by batching jobs where possible. Groups jobs by connection
   * and queue to maximize throughput.
   *
   * @template T - The type of the jobs.
   * @param jobs - An array of job instances to enqueue.
   * @param options - Configuration for batch size and concurrency.
   * @returns A promise that resolves when all jobs have been pushed.
   *
   * @example
   * ```typescript
   * await manager.pushMany(jobs, { batchSize: 500, concurrency: 5 });
   * ```
   */
  async pushMany<T extends Job & Queueable>(
    jobs: T[],
    options: {
      batchSize?: number
      concurrency?: number
    } = {}
  ): Promise<void> {
    if (jobs.length === 0) {
      return
    }

    const batchSize = options.batchSize ?? 100
    const concurrency = options.concurrency ?? 1

    // Group by connection and queue
    const groups = new Map<string, SerializedJob[]>()
    const serializer = this.getSerializer()

    for (const job of jobs) {
      const connection = job.connectionName ?? this.defaultConnection
      const queue = job.queueName ?? 'default'
      const key = `${connection}:${queue}`
      this.getClassSerializer()?.register(job.constructor as new (...args: unknown[]) => Job)
      const serialized = serializer.serialize(job)

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)?.push(serialized)
    }

    // Helper to process a batch
    const processBatch = async (
      driver: QueueDriver,
      queue: string,
      batch: SerializedJob[]
    ): Promise<void> => {
      if (driver.pushMany) {
        await driver.pushMany(queue, batch)
      } else {
        // Fallback: push one-by-one
        for (const job of batch) {
          await driver.push(queue, job)
        }
      }
    }

    // Process each group
    for (const [key, serializedJobs] of groups.entries()) {
      const [connection, queue] = key.split(':')
      if (!connection || !queue) {
        continue
      }
      const driver = this.getDriver(connection)

      this.log(`Pushing ${serializedJobs.length} jobs to ${queue} (${connection})`)

      // Chunk jobs
      const chunks: SerializedJob[][] = []
      for (let i = 0; i < serializedJobs.length; i += batchSize) {
        chunks.push(serializedJobs.slice(i, i + batchSize))
      }

      // Process chunks with concurrency
      if (concurrency > 1) {
        for (let i = 0; i < chunks.length; i += concurrency) {
          const batchPromises = chunks
            .slice(i, i + concurrency)
            .map((chunk) => processBatch(driver, queue, chunk))
          await Promise.all(batchPromises)
        }
      } else {
        // Serial
        for (const chunk of chunks) {
          await processBatch(driver, queue, chunk)
        }
      }
    }
  }

  /**
   * Pops a single job from the queue.
   *
   * Retrieves the next available job from the specified queue.
   *
   * @param queue - The queue name (default: 'default').
   * @param connection - The connection name (defaults to default connection).
   * @returns A Job instance if found, or `null` if the queue is empty.
   *
   * @example
   * ```typescript
   * const job = await manager.pop('priority-queue');
   * if (job) await job.handle();
   * ```
   */
  async pop(queue = 'default', connection: string = this.defaultConnection): Promise<Job | null> {
    const driver = this.getDriver(connection)
    const serializer = this.getSerializer()

    const serialized = await driver.pop(queue)
    if (!serialized) {
      return null
    }

    this.log(`Popped job from ${queue} (${connection})`, { id: serialized.id })

    try {
      return serializer.deserialize(serialized)
    } catch (error) {
      // Deserialization failure: log and continue
      console.error('[QueueManager] Failed to deserialize job:', error)
      return null
    }
  }

  /**
   * Pops multiple jobs from the queue efficiently.
   *
   * Attempts to retrieve a batch of jobs from the driver. If the driver does not support
   * batching, it falls back to sequential popping.
   *
   * @param queue - The queue name (default: 'default').
   * @param count - The maximum number of jobs to retrieve (default: 10).
   * @param connection - The connection name.
   * @returns An array of Job instances.
   *
   * @example
   * ```typescript
   * const jobs = await manager.popMany('default', 50);
   * ```
   */
  async popMany(
    queue = 'default',
    count = 10,
    connection: string = this.defaultConnection
  ): Promise<Job[]> {
    const driver = this.getDriver(connection)
    const serializer = this.getSerializer()
    const results: Job[] = []

    if (driver.popMany) {
      const serializedJobs = await driver.popMany(queue, count)
      if (serializedJobs.length > 0) {
        this.log(`Popped ${serializedJobs.length} jobs from ${queue} (${connection})`)
      }
      for (const serialized of serializedJobs) {
        try {
          results.push(serializer.deserialize(serialized))
        } catch (error) {
          console.error('[QueueManager] Failed to deserialize job:', error)
        }
      }
    } else {
      // Fallback: pop one-by-one
      for (let i = 0; i < count; i++) {
        const job = await this.pop(queue, connection)
        if (job) {
          results.push(job)
        } else {
          break
        }
      }
    }

    return results
  }

  /**
   * Retrieves the current size of a queue.
   *
   * @param queue - The queue name (default: 'default').
   * @param connection - The connection name.
   * @returns The number of waiting jobs.
   *
   * @example
   * ```typescript
   * const count = await manager.size('emails');
   * ```
   */
  async size(queue = 'default', connection: string = this.defaultConnection): Promise<number> {
    const driver = this.getDriver(connection)
    return driver.size(queue)
  }

  /**
   * Pops a job from the queue with blocking (wait) behavior.
   *
   * Waits for a job to become available for the specified timeout duration.
   * Useful for reducing polling loop frequency.
   *
   * @param queues - A queue name or array of queue names to listen to.
   * @param timeout - Timeout in seconds (0 = block indefinitely).
   * @param connection - The connection name.
   * @returns A Job instance if found, or `null` if timed out.
   *
   * @example
   * ```typescript
   * // Wait up to 30 seconds for a job
   * const job = await manager.popBlocking('default', 30);
   * ```
   */
  async popBlocking(
    queues: string | string[] = 'default',
    timeout = 0,
    connection: string = this.defaultConnection
  ): Promise<Job | null> {
    const driver = this.getDriver(connection)
    const serializer = this.getSerializer()

    if (!driver.popBlocking) {
      const q = Array.isArray(queues) ? queues[0]! : queues
      return this.pop(q, connection)
    }

    const serialized = await driver.popBlocking(queues, timeout)
    if (!serialized) {
      return null
    }

    this.log(
      `Popped job (blocking) from ${Array.isArray(queues) ? queues.join(',') : queues} (${connection})`,
      { id: serialized.id }
    )

    try {
      return serializer.deserialize(serialized)
    } catch (error) {
      console.error('[QueueManager] Failed to deserialize job:', error)
      return null
    }
  }

  /**
   * Removes all jobs from a specific queue.
   *
   * @param queue - The queue name to purge.
   * @param connection - The connection name.
   *
   * @example
   * ```typescript
   * await manager.clear('test-queue');
   * ```
   */
  async clear(queue = 'default', connection: string = this.defaultConnection): Promise<void> {
    const driver = this.getDriver(connection)
    await driver.clear(queue)
  }

  /**
   * Retrieves comprehensive statistics for a queue.
   *
   * Includes counts for pending, processing, delayed, and failed jobs.
   *
   * @param queue - The queue name.
   * @param connection - The connection name.
   * @returns A QueueStats object.
   *
   * @example
   * ```typescript
   * const stats = await manager.stats('default');
   * console.log(stats.size, stats.failed);
   * ```
   */
  async stats(queue = 'default', connection: string = this.defaultConnection): Promise<QueueStats> {
    const driver = this.getDriver(connection)
    if (driver.stats) {
      return await driver.stats(queue)
    }

    // Fallback: minimal stats
    return {
      queue,
      size: await driver.size(queue),
    }
  }

  /**
   * Marks a job as successfully completed.
   *
   * Removes the job from the processing state and optionally archives it.
   *
   * @param job - The job instance that finished.
   *
   * @example
   * ```typescript
   * await manager.complete(job);
   * ```
   */
  async complete<T extends Job & Queueable>(job: T): Promise<void> {
    const connection = job.connectionName ?? this.defaultConnection
    const queue = job.queueName ?? 'default'
    const driver = this.getDriver(connection)
    const serializer = this.getSerializer()

    if (driver.complete) {
      const serialized = serializer.serialize(job)
      await driver.complete(queue, serialized)

      this.log(`Completed job ${job.id} in ${queue}`)

      // Auto-archive
      if (this.persistence?.archiveCompleted) {
        await this.persistence.adapter.archive(queue, serialized, 'completed').catch((err) => {
          console.error('[QueueManager] Persistence archive failed (completed):', err)
        })
      }
    }
  }

  /**
   * Marks a job as failed.
   *
   * Moves the job to the failed state (Dead Letter Queue) and optionally archives it.
   * This is typically called after max retry attempts are exhausted.
   *
   * @param job - The job instance that failed.
   * @param error - The error that caused the failure.
   *
   * @example
   * ```typescript
   * await manager.fail(job, new Error('Something went wrong'));
   * ```
   */
  async fail<T extends Job & Queueable>(job: T, error: Error): Promise<void> {
    const connection = job.connectionName ?? this.defaultConnection
    const queue = job.queueName ?? 'default'
    const driver = this.getDriver(connection)
    const serializer = this.getSerializer()

    if (driver.fail) {
      const serialized = serializer.serialize(job)
      serialized.error = error.message
      serialized.failedAt = Date.now()
      await driver.fail(queue, serialized)

      this.log(`Failed job ${job.id} in ${queue}`, { error: error.message })

      // Auto-archive
      if (this.persistence?.archiveFailed) {
        await this.persistence.adapter.archive(queue, serialized, 'failed').catch((err) => {
          console.error('[QueueManager] Persistence archive failed (failed):', err)
        })
      }
    }
  }

  /**
   * Retrieves the configured persistence adapter.
   *
   * @returns The PersistenceAdapter instance, or undefined if not configured.
   */
  getPersistence(): PersistenceAdapter | undefined {
    return this.persistence?.adapter
  }

  /**
   * Gets the Scheduler instance associated with this manager.
   *
   * The Scheduler handles delayed jobs and periodic tasks.
   *
   * @returns The Scheduler instance.
   */
  getScheduler(): Scheduler {
    if (!this.scheduler) {
      const { Scheduler } = require('./Scheduler')
      this.scheduler = new Scheduler(this)
    }
    return this.scheduler!
  }

  /**
   * Retrieves failed jobs from the Dead Letter Queue.
   *
   * @param queue - The queue name.
   * @param start - The starting index (pagination).
   * @param end - The ending index (pagination).
   * @param connection - The connection name.
   * @returns An array of serialized jobs.
   *
   * @example
   * ```typescript
   * const failedJobs = await manager.getFailed('default', 0, 10);
   * ```
   */
  async getFailed(
    queue: string,
    start = 0,
    end = -1,
    connection: string = this.defaultConnection
  ): Promise<SerializedJob[]> {
    const driver = this.getDriver(connection)
    if (driver.getFailed) {
      return driver.getFailed(queue, start, end)
    }
    return []
  }

  /**
   * Retries failed jobs from the Dead Letter Queue.
   *
   * Moves jobs from the failed state back to the active queue for re-processing.
   *
   * @param queue - The queue name.
   * @param count - The number of jobs to retry.
   * @param connection - The connection name.
   * @returns The number of jobs successfully retried.
   *
   * @example
   * ```typescript
   * await manager.retryFailed('default', 5);
   * ```
   */
  async retryFailed(
    queue: string,
    count = 1,
    connection: string = this.defaultConnection
  ): Promise<number> {
    const driver = this.getDriver(connection)
    if (driver.retryFailed) {
      return driver.retryFailed(queue, count)
    }
    return 0
  }

  /**
   * Clears all failed jobs from the Dead Letter Queue.
   *
   * @param queue - The queue name.
   * @param connection - The connection name.
   *
   * @example
   * ```typescript
   * await manager.clearFailed('default');
   * ```
   */
  async clearFailed(queue: string, connection: string = this.defaultConnection): Promise<void> {
    const driver = this.getDriver(connection)
    if (driver.clearFailed) {
      await driver.clearFailed(queue)
    }
  }

  /**
   * Retrieves high-level statistics across all registered connections and queues.
   *
   * Iterates through all drivers and collects metadata to provide a comprehensive
   * snapshot of the entire queue system's health.
   *
   * @returns A promise resolving to a GlobalStats object.
   */
  async getGlobalStats(): Promise<import('./types').GlobalStats> {
    const stats: import('./types').GlobalStats = {
      connections: {},
      totalSize: 0,
      totalFailed: 0,
      timestamp: Date.now(),
    }

    for (const [name, driver] of this.drivers.entries()) {
      const queueNames = driver.getQueues ? await driver.getQueues() : ['default']
      const connectionStats: QueueStats[] = []

      for (const queue of queueNames) {
        const qStats = await this.stats(queue, name)
        connectionStats.push(qStats)
        stats.totalSize += qStats.size
        stats.totalFailed += qStats.failed ?? 0
      }

      stats.connections[name] = connectionStats
    }

    return stats
  }
}
