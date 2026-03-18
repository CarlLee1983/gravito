import { CronExpressionParser } from 'cron-parser'
import type { GroupRedisClient } from './drivers/RedisDriver'
import type { Job } from './Job'
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
 * Configuration options for the Scheduler.
 *
 * Defines behavior for scheduling tasks, including distributed lock settings.
 *
 * @public
 * @since 3.1.0
 * @example
 * ```typescript
 * const options: SchedulerOptions = {
 *   prefix: 'myapp:queue:',
 *   lockTtl: 60000,        // Lock held for 60 seconds
 *   lockRefreshInterval: 20000  // Auto-renew every 20 seconds
 * };
 * ```
 */
export interface SchedulerOptions {
  /**
   * Prefix for Redis keys.
   *
   * @default 'queue:'
   */
  prefix?: string

  /**
   * Time-to-live for the distributed lock in milliseconds.
   *
   * Setting a longer TTL ensures long-running tasks are not executed repeatedly
   * due to lock expiration. Recommended to be 2-3 times the expected execution time.
   *
   * @default 60000 (60 seconds)
   */
  lockTtl?: number

  /**
   * Interval for automatic lock renewal in milliseconds.
   *
   * If set, the lock will be automatically extended every `lockRefreshInterval`.
   * Recommended to be 1/3 of `lockTtl`.
   *
   * @default 20000 (20 seconds)
   */
  lockRefreshInterval?: number

  /**
   * Number of retries when acquiring a lock fails.
   *
   * @default 0
   */
  lockRetryCount?: number

  /**
   * Delay between lock acquisition retries in milliseconds.
   *
   * @default 100
   */
  lockRetryDelay?: number

  /**
   * The interval in milliseconds at which the scheduler checks for due tasks.
   *
   * @default 60000 (1 minute)
   */
  tickInterval?: number

  /**
   * The time-to-live for the leader lock in milliseconds.
   *
   * Ensures that only one node acts as the scheduler leader.
   * @default 30000 (30 seconds)
   */
  leaderTtl?: number
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
 * // Automatically start the scheduler loop
 * await scheduler.start();
 * ```
 */
export class Scheduler {
  private prefix: string
  private lockTtl: number
  private lockRefreshInterval?: number
  private lockRetryCount: number
  private lockRetryDelay: number
  private tickInterval: number
  private leaderTtl: number
  private distributedLock?: DistributedLock
  private running = false
  private timer: NodeJS.Timeout | null = null
  private isLeader = false

  constructor(
    private manager: QueueManager,
    options: SchedulerOptions = {}
  ) {
    this.prefix = options.prefix ?? 'queue:'
    this.lockTtl = options.lockTtl ?? 60000
    this.lockRefreshInterval = options.lockRefreshInterval ?? 20000
    this.lockRetryCount = options.lockRetryCount ?? 0
    this.lockRetryDelay = options.lockRetryDelay ?? 100
    this.tickInterval = options.tickInterval ?? 60000
    this.leaderTtl = options.leaderTtl ?? 30000
  }

  private get client(): GroupRedisClient {
    const driver = this.manager.getDriver(this.manager.getDefaultConnection())
    if (!driver || !('client' in driver)) {
      throw new Error('[Scheduler] Driver does not support Redis client access')
    }
    return (driver as { client: GroupRedisClient }).client
  }

  /**
   * Gets or creates the distributed lock instance.
   *
   * @private
   */
  private getDistributedLock(): DistributedLock {
    if (!this.distributedLock) {
      this.distributedLock = new DistributedLock(this.client)
    }
    return this.distributedLock
  }

  private getNextRunTime(cron: string): number {
    return CronExpressionParser.parse(cron).next().getTime()
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
    const nextRun = this.getNextRunTime(config.cron)
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
   * Starts the automatic scheduler loop.
   *
   * Periodically triggers `tick()` to process due jobs. Uses leader election
   * to ensure that only one node performs the scanning in a multi-node environment.
   */
  async start(): Promise<void> {
    if (this.running) {
      return
    }
    this.running = true

    const loop = async () => {
      if (!this.running) {
        return
      }

      try {
        await this.performTickWithLeaderElection()
      } catch (err) {
        console.error('[Scheduler] Loop error:', err)
      }

      this.timer = setTimeout(loop, this.tickInterval)
    }

    loop()
  }

  /**
   * Stops the automatic scheduler loop.
   */
  async stop(): Promise<void> {
    this.running = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (this.isLeader) {
      await this.releaseLeader()
    }
  }

  /**
   * Acquires the leader lock and performs a tick.
   *
   * @private
   */
  private async performTickWithLeaderElection(): Promise<void> {
    const lock = this.getDistributedLock()
    const leaderKey = `${this.prefix}scheduler:leader`

    this.isLeader = await lock.acquire(leaderKey, {
      ttl: this.leaderTtl,
      refreshInterval: Math.floor(this.leaderTtl / 3),
      retryCount: 0,
      retryDelay: 0,
    })

    if (this.isLeader) {
      await this.tick()
    }
  }

  /**
   * Releases the leader lock.
   *
   * @private
   */
  private async releaseLeader(): Promise<void> {
    const lock = this.getDistributedLock()
    const leaderKey = `${this.prefix}scheduler:leader`
    await lock.release(leaderKey)
    this.isLeader = false
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
      const serialized = JSON.parse(data.job) as SerializedJob
      const serializer = this.manager.getSerializer()
      const job: Job = serializer.deserialize(serialized)
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
      // Use distributed lock to ensure only one worker processes this schedule
      // Lock key includes ID and current timestamp (seconds) to ensure once per window
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

              // 1. Push directly to queue (pass serialized data)
              // This avoids needing to register job classes in the scheduler process
              await driver.push(data.queue, serializedJob)

              // 2. Schedule next run
              const nextRun = this.getNextRunTime(data.cron)

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
          // Ensure lock is released
          await lock.release(lockKey)
        }
      }
    }

    return fired
  }
}
