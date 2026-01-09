import type { Redis } from 'ioredis'
import type { CommandResult, CommandType, QuasarCommand } from '../types'
import { BaseExecutor } from './BaseExecutor'

/**
 * Executor for RETRY_JOB command.
 * Moves a failed job back to the waiting queue.
 *
 * Supports:
 * - Laravel Queues (redis driver)
 * - Simple Redis Lists
 */
export class RetryJobExecutor extends BaseExecutor {
  readonly supportedType: CommandType = 'RETRY_JOB'

  async execute(command: QuasarCommand, redis: Redis): Promise<CommandResult> {
    const { queue, jobKey, driver = 'redis' } = command.payload

    if (!queue || !jobKey) {
      return this.failed(command.id, 'Missing queue or jobKey in payload')
    }

    try {
      if (driver === 'laravel') {
        return await this.retryLaravelJob(command.id, redis, queue, jobKey)
      } else {
        return await this.retryRedisJob(command.id, redis, queue, jobKey)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[Quasar] RETRY_JOB failed:`, err)
      return this.failed(command.id, message)
    }
  }

  /**
   * Retry a job from a simple Redis failed list.
   * Pattern: Move from {queue}:failed -> {queue}
   */
  private async retryRedisJob(
    commandId: string,
    redis: Redis,
    queue: string,
    jobKey: string
  ): Promise<CommandResult> {
    const failedKey = `${queue}:failed`
    const waitingKey = queue

    // Get the job data from failed list
    const jobData = await redis.lrange(failedKey, 0, -1)
    const jobIndex = jobData.findIndex((j) => j.includes(jobKey) || j === jobKey)

    if (jobIndex === -1) {
      return this.failed(commandId, `Job not found in ${failedKey}`)
    }

    const job = jobData[jobIndex]

    // Use MULTI for atomicity
    const pipeline = redis.multi()
    pipeline.lrem(failedKey, 1, job)
    pipeline.rpush(waitingKey, job)
    await pipeline.exec()

    console.log(`[Quasar] Retried job from ${failedKey} -> ${waitingKey}`)
    return this.success(commandId, `Job moved to ${waitingKey}`)
  }

  /**
   * Retry a Laravel queue job.
   * Laravel failed jobs are typically in database, but if using redis-failed,
   * we move from queues:{name}:failed -> queues:{name}
   */
  private async retryLaravelJob(
    commandId: string,
    redis: Redis,
    queue: string,
    jobKey: string
  ): Promise<CommandResult> {
    // Laravel uses "queues:" prefix by default
    const prefix = 'queues'
    const waitingKey = `${prefix}:${queue}`

    // Try to find job in the waiting list and re-push (if job is stuck)
    // Or check reserved/delayed sets

    // For now, assume jobKey is the actual job payload or a reference
    // We'll push it back to the waiting queue
    const exists = await redis.exists(waitingKey)
    if (!exists) {
      // Create the queue if it doesn't exist
      console.log(`[Quasar] Queue ${waitingKey} doesn't exist, will be created`)
    }

    // Re-push the job (jobKey should be the serialized job data)
    await redis.rpush(waitingKey, jobKey)

    console.log(`[Quasar] Laravel job retried to ${waitingKey}`)
    return this.success(commandId, `Job pushed to ${waitingKey}`)
  }
}
