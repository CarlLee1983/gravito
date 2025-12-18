import { MemoryDriver } from './drivers/MemoryDriver'
import type { QueueDriver } from './drivers/QueueDriver'
import type { Job } from './Job'
import type { Queueable } from './Queueable'
import { ClassNameSerializer } from './serializers/ClassNameSerializer'
import type { JobSerializer } from './serializers/JobSerializer'
import { JsonSerializer } from './serializers/JsonSerializer'
import type { QueueConfig, SerializedJob } from './types'

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

  constructor(config: QueueConfig = {}) {
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
            '[QueueManager] DatabaseDriver requires dbService. Please provide dbService in connection config or ensure @gravito/orbit-db is installed.'
          )
        }
        this.drivers.set(
          name,
          new DatabaseDriver({
            dbService: dbService as Parameters<typeof DatabaseDriver>[0]['dbService'],
            table: (config as { table?: string }).table,
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
            client: client as Parameters<typeof RedisDriver>[0]['client'],
            prefix: (config as { prefix?: string }).prefix,
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
            client: client as Parameters<typeof KafkaDriver>[0]['client'],
            consumerGroupId: (config as { consumerGroupId?: string }).consumerGroupId,
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
            client: client as Parameters<typeof SQSDriver>[0]['client'],
            queueUrlPrefix: (config as { queueUrlPrefix?: string }).queueUrlPrefix,
            visibilityTimeout: (config as { visibilityTimeout?: number }).visibilityTimeout,
            waitTimeSeconds: (config as { waitTimeSeconds?: number }).waitTimeSeconds,
          })
        )
        break
      }

      default:
        throw new Error(
          `Driver "${driverType}" is not supported. Supported drivers: memory, database, redis, kafka, sqs`
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
   * @param job - Job instance
   * @returns The same job instance (for fluent chaining)
   */
  async push<T extends Job & Queueable>(job: T): Promise<T> {
    const connection = job.connectionName ?? this.defaultConnection
    const queue = job.queueName ?? 'default'
    const driver = this.getDriver(connection)
    const serializer = this.getSerializer()

    // Serialize job
    const serialized = serializer.serialize(job)

    // Push to queue
    await driver.push(queue, serialized)

    return job
  }

  /**
   * Push multiple jobs.
   * @param jobs - Job array
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
   * @param queue - Queue name
   * @param connection - Connection name
   * @returns Job instance or null
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
   * @param queue - Queue name
   * @param connection - Connection name
   * @returns Number of jobs in the queue
   */
  async size(queue = 'default', connection: string = this.defaultConnection): Promise<number> {
    const driver = this.getDriver(connection)
    return driver.size(queue)
  }

  /**
   * Clear a queue.
   * @param queue - Queue name
   * @param connection - Connection name
   */
  async clear(queue = 'default', connection: string = this.defaultConnection): Promise<void> {
    const driver = this.getDriver(connection)
    await driver.clear(queue)
  }
}
