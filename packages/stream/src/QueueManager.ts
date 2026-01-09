import { MemoryDriver } from './drivers/MemoryDriver'
import type { QueueDriver } from './drivers/QueueDriver'
import type { Job } from './Job'
import type { Queueable } from './Queueable'
import { ClassNameSerializer } from './serializers/ClassNameSerializer'
import type { JobSerializer } from './serializers/JobSerializer'
import { JsonSerializer } from './serializers/JsonSerializer'
import type { JobPushOptions, QueueConfig, SerializedJob } from './types'

/**
 * Queue Manager
 *
 * Manages multiple queue connections and drivers, exposing a unified API for pushing and consuming jobs.
 * Supports lazy-loading drivers to keep the core lightweight.
 *
 * @example
 * ```typescript
 * const manager = new QueueManager({
 *   default: 'database',
 *   connections: {
 *     database: { driver: 'database', table: 'jobs' },
 *     redis: { driver: 'redis', url: 'redis://...' }
 *   }
 * })
 *
 * await manager.push(new SendEmail('user@example.com'))
 * ```
 */
export class QueueManager {
  private drivers = new Map<string, QueueDriver>()
  private serializers = new Map<string, JobSerializer>()
  private defaultConnection: string
  private defaultSerializer: JobSerializer
  private persistence?: QueueConfig['persistence']
  private scheduler?: any // Using any to avoid circular dependency or import issues for now

  constructor(config: QueueConfig = {}) {
    this.persistence = config.persistence
    this.defaultConnection = config.default ?? 'default'

    // Initialize default serializer
    const serializerType = config.defaultSerializer ?? 'class'
    if (serializerType === 'class') {
      this.defaultSerializer = new ClassNameSerializer()
    } else {
      this.defaultSerializer = new JsonSerializer()
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
   * Register a connection.
   * @param name - Connection name
   * @param config - Connection config
   */
  registerConnection(name: string, config: unknown): void {
    const driverType = (config as { driver: string }).driver

    switch (driverType) {
      case 'memory':
        this.drivers.set(name, new MemoryDriver())
        break

      case 'database': {
        // Lazy-load DatabaseDriver
        const { DatabaseDriver } = require('./drivers/DatabaseDriver')
        const dbService = (config as { dbService?: unknown }).dbService
        if (!dbService) {
          throw new Error(
            '[QueueManager] DatabaseDriver requires dbService. Please provide a database service that implements DatabaseService interface.'
          )
        }
        this.drivers.set(
          name,
          new DatabaseDriver({
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic driver loading requires type assertion
            dbService: dbService as any,
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic driver config type
            table: (config as any).table,
          })
        )
        break
      }

      case 'redis': {
        // Lazy-load RedisDriver
        const { RedisDriver } = require('./drivers/RedisDriver')
        const client = (config as { client?: unknown }).client
        if (!client) {
          throw new Error(
            '[QueueManager] RedisDriver requires client. Please provide Redis client in connection config.'
          )
        }
        this.drivers.set(
          name,
          new RedisDriver({
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic driver loading requires type assertion
            client: client as any,
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic driver config type
            prefix: (config as any).prefix,
          })
        )
        break
      }

      case 'kafka': {
        // Lazy-load KafkaDriver
        const { KafkaDriver } = require('./drivers/KafkaDriver')
        const client = (config as { client?: unknown }).client
        if (!client) {
          throw new Error(
            '[QueueManager] KafkaDriver requires client. Please provide Kafka client in connection config.'
          )
        }
        this.drivers.set(
          name,
          new KafkaDriver({
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic driver loading requires type assertion
            client: client as any,
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic driver config type
            consumerGroupId: (config as any).consumerGroupId,
          })
        )
        break
      }

      case 'sqs': {
        // Lazy-load SQSDriver
        const { SQSDriver } = require('./drivers/SQSDriver')
        const client = (config as { client?: unknown }).client
        if (!client) {
          throw new Error(
            '[QueueManager] SQSDriver requires client. Please provide SQS client in connection config.'
          )
        }
        this.drivers.set(
          name,
          new SQSDriver({
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic driver loading requires type assertion
            client: client as any,
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic driver config type
            queueUrlPrefix: (config as any).queueUrlPrefix,
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic driver config type
            visibilityTimeout: (config as any).visibilityTimeout,
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic driver config type
            waitTimeSeconds: (config as any).waitTimeSeconds,
          })
        )
        break
      }

      case 'rabbitmq': {
        // Lazy-load RabbitMQDriver
        const { RabbitMQDriver } = require('./drivers/RabbitMQDriver')
        const client = (config as { client?: unknown }).client
        if (!client) {
          throw new Error(
            '[QueueManager] RabbitMQDriver requires client. Please provide RabbitMQ connection/channel in connection config.'
          )
        }
        this.drivers.set(
          name,
          new RabbitMQDriver({
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic driver loading requires type assertion
            client: client as any,
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic driver config type
            exchange: (config as any).exchange,
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic driver config type
            exchangeType: (config as any).exchangeType,
          })
        )
        break
      }

      default:
        throw new Error(
          `Driver "${driverType}" is not supported. Supported drivers: memory, database, redis, kafka, sqs, rabbitmq`
        )
    }
  }

  /**
   * Get a driver for a connection.
   * @param connection - Connection name
   * @returns Driver instance
   */
  getDriver(connection: string): QueueDriver {
    const driver = this.drivers.get(connection)
    if (!driver) {
      throw new Error(`Connection "${connection}" not found`)
    }
    return driver
  }

  /**
   * Get the default connection name.
   * @returns Default connection name
   */
  getDefaultConnection(): string {
    return this.defaultConnection
  }

  /**
   * Get a serializer.
   * @param type - Serializer type
   * @returns Serializer instance
   */
  getSerializer(type?: string): JobSerializer {
    if (type) {
      const serializer = this.serializers.get(type)
      if (!serializer) {
        throw new Error(`Serializer "${type}" not found`)
      }
      return serializer
    }
    return this.defaultSerializer
  }

  /**
   * Register Job classes (used by ClassNameSerializer).
   * @param jobClasses - Job class array
   */
  registerJobClasses(jobClasses: Array<new (...args: unknown[]) => Job>): void {
    if (this.defaultSerializer instanceof ClassNameSerializer) {
      this.defaultSerializer.registerMany(jobClasses)
    }
  }

  /**
   * Push a Job to the queue.
   *
   * @template T - The type of the job.
   * @param job - Job instance to push.
   * @param options - Push options.
   * @returns The same job instance (for fluent chaining).
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

    // Serialize job
    const serialized = serializer.serialize(job)

    // Push to queue
    const pushOptions = { ...options }
    if (job.priority) {
      pushOptions.priority = job.priority
    }
    await driver.push(queue, serialized, pushOptions)

    // Auto-archive (Audit Mode) - Fire and forget
    if (this.persistence?.archiveEnqueued) {
      this.persistence.adapter.archive(queue, serialized, 'waiting').catch((err) => {
        console.error('[QueueManager] Persistence archive failed (waiting):', err)
      })
    }

    return job
  }

  /**
   * Push multiple jobs to the queue.
   *
   * @template T - The type of the jobs.
   * @param jobs - Array of job instances.
   *
   * @example
   * ```typescript
   * await manager.pushMany([new JobA(), new JobB()]);
   * ```
   */
  async pushMany<T extends Job & Queueable>(jobs: T[]): Promise<void> {
    if (jobs.length === 0) {
      return
    }

    // Group by connection and queue
    const groups = new Map<string, SerializedJob[]>()
    const serializer = this.getSerializer()

    for (const job of jobs) {
      const connection = job.connectionName ?? this.defaultConnection
      const queue = job.queueName ?? 'default'
      const key = `${connection}:${queue}`
      const serialized = serializer.serialize(job)

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)?.push(serialized)
    }

    // Batch push
    for (const [key, serializedJobs] of groups.entries()) {
      const [connection, queue] = key.split(':')
      if (!connection || !queue) {
        continue
      }
      const driver = this.getDriver(connection)

      if (driver.pushMany) {
        await driver.pushMany(queue, serializedJobs)
      } else {
        // Fallback: push one-by-one
        for (const job of serializedJobs) {
          await driver.push(queue, job)
        }
      }
    }
  }

  /**
   * Pop a job from the queue.
   *
   * @param queue - Queue name (default: 'default').
   * @param connection - Connection name (optional).
   * @returns Job instance or null if queue is empty.
   *
   * @example
   * ```typescript
   * const job = await manager.pop('emails');
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

    try {
      return serializer.deserialize(serialized)
    } catch (error) {
      // Deserialization failure: log and continue
      console.error('[QueueManager] Failed to deserialize job:', error)
      return null
    }
  }

  /**
   * Get queue size.
   *
   * @param queue - Queue name (default: 'default').
   * @param connection - Connection name (optional).
   * @returns Number of jobs in the queue.
   */
  async size(queue = 'default', connection: string = this.defaultConnection): Promise<number> {
    const driver = this.getDriver(connection)
    return driver.size(queue)
  }

  /**
   * Clear all jobs from a queue.
   *
   * @param queue - Queue name (default: 'default').
   * @param connection - Connection name (optional).
   */
  async clear(queue = 'default', connection: string = this.defaultConnection): Promise<void> {
    const driver = this.getDriver(connection)
    await driver.clear(queue)
  }

  /**
   * Mark a job as completed.
   * @param job - Job instance
   */
  async complete<T extends Job & Queueable>(job: T): Promise<void> {
    const connection = job.connectionName ?? this.defaultConnection
    const queue = job.queueName ?? 'default'
    const driver = this.getDriver(connection)
    const serializer = this.getSerializer()

    if (driver.complete) {
      const serialized = serializer.serialize(job)
      await driver.complete(queue, serialized)

      // Auto-archive
      if (this.persistence?.archiveCompleted) {
        await this.persistence.adapter.archive(queue, serialized, 'completed').catch((err) => {
          console.error('[QueueManager] Persistence archive failed (completed):', err)
        })
      }
    }
  }

  /**
   * Mark a job as permanently failed.
   * @param job - Job instance
   * @param error - Error object
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

      // Auto-archive
      if (this.persistence?.archiveFailed) {
        await this.persistence.adapter.archive(queue, serialized, 'failed').catch((err) => {
          console.error('[QueueManager] Persistence archive failed (failed):', err)
        })
      }
    }
  }

  /**
   * Get the persistence adapter if configured.
   */
  getPersistence(): any {
    return this.persistence?.adapter
  }

  /**
   * Get the scheduler if configured.
   */
  getScheduler(): any {
    if (!this.scheduler) {
      const { Scheduler } = require('./Scheduler')
      this.scheduler = new Scheduler(this)
    }
    return this.scheduler
  }

  /**
   * Get failed jobs from DLQ (if driver supports it).
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
   * Retry failed jobs from DLQ (if driver supports it).
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
   * Clear failed jobs from DLQ (if driver supports it).
   */
  async clearFailed(queue: string, connection: string = this.defaultConnection): Promise<void> {
    const driver = this.getDriver(connection)
    if (driver.clearFailed) {
      await driver.clearFailed(queue)
    }
  }
}
