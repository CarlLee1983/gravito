import type { Redis } from 'ioredis'
import type { CommandResult, CommandType, QuasarCommand } from '../types'
import { BaseExecutor } from './BaseExecutor'

/**
 * Executor for DELETE_JOB command.
 * Permanently removes a job from the queue.
 *
 * Supports:
 * - Laravel Queues (redis driver)
 * - Simple Redis Lists
 */
export class DeleteJobExecutor extends BaseExecutor {
  readonly supportedType: CommandType = 'DELETE_JOB'

  async execute(command: QuasarCommand, redis: Redis): Promise<CommandResult> {
    const { queue, jobKey, driver = 'redis' } = command.payload

    if (!queue || !jobKey) {
      return this.failed(command.id, 'Missing queue or jobKey in payload')
    }

    try {
      if (driver === 'laravel') {
        return await this.deleteLaravelJob(command.id, redis, queue, jobKey)
      } else {
        return await this.deleteRedisJob(command.id, redis, queue, jobKey)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[Quasar] DELETE_JOB failed:`, err)
      return this.failed(command.id, message)
    }
  }

  /**
   * Delete a job from a simple Redis list.
   */
  private async deleteRedisJob(
    commandId: string,
    redis: Redis,
    queue: string,
    jobKey: string
  ): Promise<CommandResult> {
    // Try multiple possible locations
    const locations = [`${queue}:failed`, `${queue}:delayed`, queue]

    for (const key of locations) {
      const removed = await redis.lrem(key, 1, jobKey)
      if (removed > 0) {
        console.log(`[Quasar] Deleted job from ${key}`)
        return this.success(commandId, `Job deleted from ${key}`)
      }

      // Also try finding by partial match (if jobKey is an ID)
      const jobs = await redis.lrange(key, 0, -1)
      const matchingJob = jobs.find((j) => j.includes(jobKey))
      if (matchingJob) {
        await redis.lrem(key, 1, matchingJob)
        console.log(`[Quasar] Deleted job (partial match) from ${key}`)
        return this.success(commandId, `Job deleted from ${key}`)
      }
    }

    return this.failed(commandId, `Job not found in any queue location`)
  }

  /**
   * Delete a Laravel queue job.
   */
  private async deleteLaravelJob(
    commandId: string,
    redis: Redis,
    queue: string,
    jobKey: string
  ): Promise<CommandResult> {
    const prefix = 'queues'
    const locations = [
      `${prefix}:${queue}`, // Waiting (List)
      `${prefix}:${queue}:reserved`, // Active (ZSet)
      `${prefix}:${queue}:delayed`, // Delayed (ZSet)
    ]

    // Try List first
    const waitingRemoved = await redis.lrem(locations[0], 1, jobKey)
    if (waitingRemoved > 0) {
      console.log(`[Quasar] Deleted Laravel job from waiting queue`)
      return this.success(commandId, `Job deleted from ${locations[0]}`)
    }

    // Try ZSets (reserved/delayed)
    for (const key of locations.slice(1)) {
      const removed = await redis.zrem(key, jobKey)
      if (removed > 0) {
        console.log(`[Quasar] Deleted Laravel job from ${key}`)
        return this.success(commandId, `Job deleted from ${key}`)
      }
    }

    // Try partial match in waiting queue
    const jobs = await redis.lrange(locations[0], 0, -1)
    const matchingJob = jobs.find((j) => j.includes(jobKey))
    if (matchingJob) {
      await redis.lrem(locations[0], 1, matchingJob)
      console.log(`[Quasar] Deleted Laravel job (partial match)`)
      return this.success(commandId, `Job deleted from ${locations[0]}`)
    }

    return this.failed(commandId, `Job not found in Laravel queue`)
  }
}
