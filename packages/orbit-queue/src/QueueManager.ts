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
 * 管理多個隊列連接和驅動，提供統一的 API 來推送和處理 Job。
 * 支援按需載入驅動，確保輕量和高效能。
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

    // 初始化預設序列化器
    const serializerType = config.defaultSerializer ?? 'class'
    if (serializerType === 'class') {
      this.defaultSerializer = new ClassNameSerializer()
    } else {
      this.defaultSerializer = new JsonSerializer()
    }

    // 初始化預設連接（MemoryDriver）
    if (!this.drivers.has('default')) {
      this.drivers.set('default', new MemoryDriver())
    }

    // 初始化其他連接（按需載入）
    if (config.connections) {
      for (const [name, connectionConfig] of Object.entries(config.connections)) {
        this.registerConnection(name, connectionConfig)
      }
    }
  }

  /**
   * 註冊連接
   * @param name - 連接名稱
   * @param config - 連接配置
   */
  registerConnection(name: string, config: unknown): void {
    const driverType = (config as { driver: string }).driver

    switch (driverType) {
      case 'memory':
        this.drivers.set(name, new MemoryDriver())
        break

      case 'database': {
        // 動態載入 DatabaseDriver
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
        // 動態載入 RedisDriver
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
        // 動態載入 KafkaDriver
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
        // 動態載入 SQSDriver
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
   * 取得驅動
   * @param connection - 連接名稱
   * @returns 驅動實例
   */
  getDriver(connection: string): QueueDriver {
    const driver = this.drivers.get(connection)
    if (!driver) {
      throw new Error(`Connection "${connection}" not found`)
    }
    return driver
  }

  /**
   * 取得序列化器
   * @param type - 序列化器類型
   * @returns 序列化器實例
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
   * 註冊 Job 類別（用於 ClassNameSerializer）
   * @param jobClasses - Job 類別陣列
   */
  registerJobClasses(jobClasses: Array<new (...args: unknown[]) => Job>): void {
    if (this.defaultSerializer instanceof ClassNameSerializer) {
      this.defaultSerializer.registerMany(jobClasses)
    }
  }

  /**
   * 推送 Job 到隊列
   * @param job - Job 實例
   * @returns 返回 Job 實例以支援鏈式調用
   */
  async push<T extends Job & Queueable>(job: T): Promise<T> {
    const connection = job.connectionName ?? this.defaultConnection
    const queue = job.queueName ?? 'default'
    const driver = this.getDriver(connection)
    const serializer = this.getSerializer()

    // 序列化 Job
    const serialized = serializer.serialize(job)

    // 推送 to 隊列
    await driver.push(queue, serialized)

    return job
  }

  /**
   * 批量推送 Job
   * @param jobs - Job 陣列
   */
  async pushMany<T extends Job & Queueable>(jobs: T[]): Promise<void> {
    if (jobs.length === 0) {
      return
    }

    // 按連接和隊列分組
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

    // 批量推送
    for (const [key, serializedJobs] of groups.entries()) {
      const [connection, queue] = key.split(':')
      const driver = this.getDriver(connection)

      if (driver.pushMany) {
        await driver.pushMany(queue, serializedJobs)
      } else {
        // 降級為單個推送
        for (const job of serializedJobs) {
          await driver.push(queue, job)
        }
      }
    }
  }

  /**
   * 從隊列取出 Job
   * @param queue - 隊列名稱
   * @param connection - 連接名稱
   * @returns Job 實例或 null
   */
  async pop(
    queue = 'default',
    connection: string = this.defaultConnection
  ): Promise<Job | null> {
    const driver = this.getDriver(connection)
    const serializer = this.getSerializer()

    const serialized = await driver.pop(queue)
    if (!serialized) {
      return null
    }

    try {
      return serializer.deserialize(serialized)
    } catch (error) {
      // 反序列化失敗，記錄錯誤但繼續處理
      console.error('[QueueManager] Failed to deserialize job:', error)
      return null
    }
  }

  /**
   * 取得隊列大小
   * @param queue - 隊列名稱
   * @param connection - 連接名稱
   * @returns 隊列中的 Job 數量
   */
  async size(
    queue = 'default',
    connection: string = this.defaultConnection
  ): Promise<number> {
    const driver = this.getDriver(connection)
    return driver.size(queue)
  }

  /**
   * 清空隊列
   * @param queue - 隊列名稱
   * @param connection - 連接名稱
   */
  async clear(
    queue = 'default',
    connection: string = this.defaultConnection
  ): Promise<void> {
    const driver = this.getDriver(connection)
    await driver.clear(queue)
  }
}

