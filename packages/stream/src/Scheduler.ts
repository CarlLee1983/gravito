import parser from 'cron-parser'
import type { GroupRedisClient } from './drivers/RedisDriver'
import { DistributedLock } from './locks/DistributedLock'
import type { QueueManager } from './QueueManager'
import type { SerializedJob } from './types'

/**
 * Configuration for a recurring scheduled job.
 *
 * Defines the schedule (CRON), the job to execute, and metadata tracking execution times.
 *
 * @public
 * @since 3.0.0
 * @example
 * ```typescript
 * const config: ScheduledJobConfig = {
 *   id: 'daily-report',
 *   cron: '0 0 * * *',
 *   queue: 'reports',
 *   job: serializedJob,
 *   enabled: true
 * };
 * ```
 */
export interface ScheduledJobConfig {
  /** Unique identifier for the scheduled task. */
  id: string
  /** Cron expression defining the schedule (e.g., '* * * * *'). */
  cron: string
  /** The target queue name where the job should be pushed. */
  queue: string
  /** The serialized job data. */
  job: SerializedJob
  /** Timestamp of the last successful execution in milliseconds. */
  lastRun?: number
  /** Timestamp of the next scheduled execution in milliseconds. */
  nextRun?: number
  /** Whether the scheduled job is active. */
  enabled: boolean
}

/**
 * Scheduler 的配置選項。
 *
 * 定義排程器的行為，包含分散式鎖的設定。
 *
 * @public
 * @since 3.1.0
 * @example
 * ```typescript
 * const options: SchedulerOptions = {
 *   prefix: 'myapp:queue:',
 *   lockTtl: 60000,        // 鎖持有 60 秒
 *   lockRefreshInterval: 20000  // 每 20 秒自動續約
 * };
 * ```
 */
export interface SchedulerOptions {
  /**
   * Redis 鍵的前綴。
   *
   * @default 'queue:'
   */
  prefix?: string

  /**
   * 分散式鎖的生存時間（毫秒）。
   *
   * 設定較長的 TTL 可確保長時間運行的任務不會因鎖過期而被重複執行。
   * 建議設為任務預期執行時間的 2-3 倍。
   *
   * @default 60000 (60 秒)
   */
  lockTtl?: number

  /**
   * 鎖的自動續約間隔（毫秒）。
   *
   * 如果設定此值，鎖將每隔 lockRefreshInterval 自動延長 TTL。
   * 建議設為 lockTtl 的 1/3。
   *
   * @default 20000 (20 秒)
   */
  lockRefreshInterval?: number

  /**
   * 獲取鎖失敗時的重試次數。
   *
   * @default 0
   */
  lockRetryCount?: number

  /**
   * 每次重試之間的延遲時間（毫秒）。
   *
   * @default 100
   */
  lockRetryDelay?: number
}

/**
 * Manages recurring tasks and cron jobs.
 *
 * The Scheduler allows you to register jobs to run at specific intervals using CRON syntax.
 * It uses Redis (or a compatible driver) to coordinate distributed execution, ensuring that
 * a scheduled job runs only once per interval across multiple scheduler instances.
 *
 * @public
 * @since 3.0.0
 * @example
 * ```typescript
 * const scheduler = manager.getScheduler();
 * await scheduler.register({
 *   id: 'cleanup',
 *   cron: '0 * * * *', // Every hour
 *   job: new CleanupJob()
 * });
 *
 * // In your worker loop or separate process
 * setInterval(() => scheduler.tick(), 60000);
 * ```
 */
export class Scheduler {
  private prefix: string
  private lockTtl: number
  private lockRefreshInterval?: number
  private lockRetryCount: number
  private lockRetryDelay: number
  private distributedLock?: DistributedLock

  constructor(
    private manager: QueueManager,
    options: SchedulerOptions = {}
  ) {
    this.prefix = options.prefix ?? 'queue:'
    this.lockTtl = options.lockTtl ?? 60000 // 預設 60 秒
    this.lockRefreshInterval = options.lockRefreshInterval ?? 20000 // 預設 20 秒
    this.lockRetryCount = options.lockRetryCount ?? 0
    this.lockRetryDelay = options.lockRetryDelay ?? 100
  }

  private get client(): GroupRedisClient {
    const driver = this.manager.getDriver(this.manager.getDefaultConnection())
    if (!driver || !('client' in driver)) {
      throw new Error('[Scheduler] Driver does not support Redis client access')
    }
    return (driver as { client: GroupRedisClient }).client
  }

  /**
   * 獲取或創建分散式鎖實例。
   *
   * @private
   */
  private getDistributedLock(): DistributedLock {
    if (!this.distributedLock) {
      this.distributedLock = new DistributedLock(this.client)
    }
    return this.distributedLock
  }

  /**
   * Registers a new scheduled job or updates an existing one.
   *
   * Calculates the next run time based on the CRON expression and stores the configuration in Redis.
   *
   * @param config - The job configuration (excluding nextRun and enabled status which are auto-set).
   * @throws {Error} If Redis client does not support pipelining.
   */
  async register(config: Omit<ScheduledJobConfig, 'nextRun' | 'enabled'>): Promise<void> {
    const nextRun = (parser as any).parse(config.cron).next().getTime()
    const fullConfig: ScheduledJobConfig = {
      ...config,
      nextRun,
      enabled: true,
    }

    const client = this.client
    if (typeof client.pipeline !== 'function') {
      throw new Error('[Scheduler] Redis client does not support pipeline')
    }

    const pipe = client.pipeline()
    // 1. Store metadata
    pipe.hset(`${this.prefix}schedule:${config.id}`, {
      ...fullConfig,
      job: JSON.stringify(fullConfig.job),
    })
    // 2. Add to timeline
    pipe.zadd(`${this.prefix}schedules`, nextRun, config.id)
    await pipe.exec()
  }

  /**
   * Removes a scheduled job.
   *
   * Deletes the job metadata and schedule entry from Redis.
   *
   * @param id - The unique identifier of the scheduled job.
   */
  async remove(id: string): Promise<void> {
    const client = this.client
    if (typeof client.pipeline !== 'function') {
      throw new Error('[Scheduler] Redis client does not support pipeline')
    }

    const pipe = client.pipeline()
    pipe.del(`${this.prefix}schedule:${id}`)
    pipe.zrem(`${this.prefix}schedules`, id)
    await pipe.exec()
  }

  /**
   * Lists all registered scheduled jobs.
   *
   * @returns An array of all scheduled job configurations.
   */
  async list(): Promise<ScheduledJobConfig[]> {
    const client = this.client
    if (typeof client.zrange !== 'function') {
      throw new Error('[Scheduler] Redis client does not support zrange')
    }

    const ids = await client.zrange(`${this.prefix}schedules`, 0, -1)
    const configs: ScheduledJobConfig[] = []

    for (const id of ids) {
      const data = await client.hgetall?.(`${this.prefix}schedule:${id}`)
      if (data?.id) {
        configs.push({
          ...data,
          lastRun: data.lastRun ? parseInt(data.lastRun, 10) : undefined,
          nextRun: data.nextRun ? parseInt(data.nextRun, 10) : undefined,
          enabled: data.enabled === 'true',
          job: JSON.parse(data.job),
        })
      }
    }

    return configs
  }

  /**
   * Manually triggers a scheduled job immediately.
   *
   * Forces execution of the job regardless of its schedule, without affecting the next scheduled run time.
   *
   * @param id - The unique identifier of the scheduled job.
   */
  async runNow(id: string): Promise<void> {
    const client = this.client
    const data = await client.hgetall?.(`${this.prefix}schedule:${id}`)

    if (data?.id) {
      const serialized = JSON.parse(data.job)
      const serializer = this.manager.getSerializer()
      const job = serializer.deserialize(serialized) as any
      await this.manager.push(job)
    }
  }

  /**
   * Checks for and triggers tasks that are due for execution.
   *
   * This method should be called periodically (e.g., via a system cron or a dedicated tick loop).
   * It scans the schedule for tasks with `nextRun <= now`, acquires a distributed lock for each,
   * pushes them to their queue, and updates the `nextRun` time.
   *
   * The distributed lock ensures that in a multi-node environment, each scheduled job is executed
   * only once per interval, even if multiple scheduler instances are running.
   *
   * @returns The number of jobs triggered in this tick.
   */
  async tick(): Promise<number> {
    const client = this.client
    if (typeof client.zrangebyscore !== 'function') {
      throw new Error('[Scheduler] Redis client does not support zrangebyscore')
    }

    const now = Date.now()
    const dueIds = await client.zrangebyscore(`${this.prefix}schedules`, 0, now)
    let fired = 0

    const lock = this.getDistributedLock()

    for (const id of dueIds) {
      // 使用分散式鎖確保只有一個 worker 處理此排程
      // 鎖的鍵包含排程 ID 和當前時間戳（精確到秒），確保每個時間窗口只執行一次
      const lockKey = `${this.prefix}lock:schedule:${id}:${Math.floor(now / 1000)}`

      const acquired = await lock.acquire(lockKey, {
        ttl: this.lockTtl,
        retryCount: this.lockRetryCount,
        retryDelay: this.lockRetryDelay,
        refreshInterval: this.lockRefreshInterval,
      })

      if (acquired) {
        try {
          const data = await client.hgetall?.(`${this.prefix}schedule:${id}`)
          if (data?.id && data.enabled === 'true') {
            try {
              const serializedJob = JSON.parse(data.job) as SerializedJob
              const connection = data.connection || this.manager.getDefaultConnection()
              const driver = this.manager.getDriver(connection)

              // 1. 直接推送到佇列（傳遞序列化的資料）
              // 這避免了在排程器程序中註冊 job 類別的需求
              await driver.push(data.queue, serializedJob)

              // 2. 排程下次執行
              const nextRun = (parser as any).parse(data.cron).next().getTime()

              if (typeof client.pipeline === 'function') {
                const pipe = client.pipeline()
                pipe.hset(`${this.prefix}schedule:${id}`, {
                  lastRun: now,
                  nextRun: nextRun,
                })
                pipe.zadd(`${this.prefix}schedules`, nextRun, id)
                await pipe.exec()
              }

              fired++
            } catch (err: unknown) {
              const error = err instanceof Error ? err : new Error(String(err))
              console.error(`[Scheduler] Failed to process schedule ${id}:`, error.message)
            }
          }
        } finally {
          // 確保鎖被釋放
          await lock.release(lockKey)
        }
      }
    }

    return fired
  }
}
