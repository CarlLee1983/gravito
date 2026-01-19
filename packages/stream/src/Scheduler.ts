import parser from 'cron-parser'
import type { GroupRedisClient } from './drivers/RedisDriver'
import type { QueueManager } from './QueueManager'
import type { SerializedJob } from './types'

/**
 * Configuration for a recurring scheduled job.
 *
 * @public
 * @since 3.0.0
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
 * Scheduler manages recurring (cron) jobs in Gravito.
 *
 * It uses Redis to store schedule metadata and coordinates distributed
 * execution using locks to ensure jobs are triggered exactly once per interval.
 *
 * @example
 * ```typescript
 * const scheduler = new Scheduler(queueManager);
 * await scheduler.register({
 *   id: 'daily-cleanup',
 *   cron: '0 0 * * *',
 *   queue: 'default',
 *   job: myJob.serialize()
 * });
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class Scheduler {
  private prefix: string

  constructor(
    private manager: QueueManager,
    options: { prefix?: string } = {}
  ) {
    this.prefix = options.prefix ?? 'queue:'
  }

  private get client(): GroupRedisClient {
    const driver = this.manager.getDriver(this.manager.getDefaultConnection())
    if (!driver || !('client' in driver)) {
      throw new Error('[Scheduler] Driver does not support Redis client access')
    }
    return (driver as { client: GroupRedisClient }).client
  }

  /**
   * Register a scheduled job.
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
   * Remove a scheduled job.
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
   * List all scheduled jobs.
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
   * Run a scheduled job immediately (out of schedule).
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
   * Process due tasks (TICK).
   * This should be called periodically (e.g. every minute).
   */
  async tick(): Promise<number> {
    const client = this.client
    if (typeof client.zrangebyscore !== 'function') {
      throw new Error('[Scheduler] Redis client does not support zrangebyscore')
    }

    const now = Date.now()
    const dueIds = await client.zrangebyscore(`${this.prefix}schedules`, 0, now)
    let fired = 0

    for (const id of dueIds) {
      // Use a lock to ensure only one worker processes this tick for this schedule
      const lockKey = `${this.prefix}lock:schedule:${id}:${Math.floor(now / 1000)}`

      if (typeof client.set !== 'function') {
        continue // Skip if SET not supported
      }

      const lock = await client.set(lockKey, '1', 'EX', 10, 'NX')

      if (lock === 'OK') {
        const data = await client.hgetall?.(`${this.prefix}schedule:${id}`)
        if (data?.id && data.enabled === 'true') {
          try {
            const serializedJob = JSON.parse(data.job) as SerializedJob
            const connection = data.connection || this.manager.getDefaultConnection()
            const driver = this.manager.getDriver(connection)

            // 1. Push to queue directly (relaying the serialized blob)
            // This avoids the need to have job classes registered in the scheduler process
            await driver.push(data.queue, serializedJob)

            // 2. Schedule next run
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
      }
    }

    return fired
  }
}
