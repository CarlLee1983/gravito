import parser from 'cron-parser'
import type { QueueManager } from './QueueManager'
import type { SerializedJob } from './types'

export interface ScheduledJobConfig {
  id: string
  cron: string
  queue: string
  job: SerializedJob
  lastRun?: number
  nextRun?: number
  enabled: boolean
}

/**
 * Scheduler
 *
 * Manages recurring (cron) jobs.
 */
export class Scheduler {
  private prefix: string

  constructor(
    private manager: QueueManager,
    options: { prefix?: string } = {}
  ) {
    this.prefix = options.prefix ?? 'queue:'
  }

  private get client(): any {
    const driver = this.manager.getDriver(this.manager.getDefaultConnection())
    return (driver as any).client
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

    const pipe = this.client.pipeline()
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
    const pipe = this.client.pipeline()
    pipe.del(`${this.prefix}schedule:${id}`)
    pipe.zrem(`${this.prefix}schedules`, id)
    await pipe.exec()
  }

  /**
   * List all scheduled jobs.
   */
  async list(): Promise<ScheduledJobConfig[]> {
    const ids = await this.client.zrange(`${this.prefix}schedules`, 0, -1)
    const configs: ScheduledJobConfig[] = []

    for (const id of ids) {
      const data = await this.client.hgetall(`${this.prefix}schedule:${id}`)
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
    const data = await this.client.hgetall(`${this.prefix}schedule:${id}`)
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
    const now = Date.now()
    const dueIds = await this.client.zrangebyscore(`${this.prefix}schedules`, 0, now)
    let fired = 0

    for (const id of dueIds) {
      // Use a lock to ensure only one worker processes this tick for this schedule
      const lockKey = `${this.prefix}lock:schedule:${id}:${Math.floor(now / 1000)}`
      const lock = await this.client.set(lockKey, '1', 'EX', 10, 'NX')

      if (lock === 'OK') {
        const data = await this.client.hgetall(`${this.prefix}schedule:${id}`)
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

            const pipe = this.client.pipeline()
            pipe.hset(`${this.prefix}schedule:${id}`, {
              lastRun: now,
              nextRun: nextRun,
            })
            pipe.zadd(`${this.prefix}schedules`, nextRun, id)
            await pipe.exec()

            fired++
          } catch (err) {
            console.error(`[Scheduler] Failed to process schedule ${id}:`, err)
          }
        }
      }
    }

    return fired
  }
}
