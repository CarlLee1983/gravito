import type { SerializedJob } from '../types'
import type { QueueDriver } from './QueueDriver'

/**
 * Redis driver configuration.
 */
export interface RedisDriverConfig {
  /**
   * Redis client instance (ioredis or node-redis).
   */
  client: {
    lpush: (key: string, ...values: string[]) => Promise<number>
    rpop: (key: string) => Promise<string | null>
    llen: (key: string) => Promise<number>
    del: (key: string) => Promise<number>
    lpushx?: (key: string, ...values: string[]) => Promise<number>
    rpoplpush?: (src: string, dst: string) => Promise<string | null>
    [key: string]: unknown
  }

  /**
   * Key prefix (default: `queue:`).
   */
  prefix?: string
}

/**
 * Redis Driver
 *
 * Uses Redis as the queue backend.
 * Implements FIFO via Redis Lists (LPUSH/RPOP).
 *
 * Requires `ioredis` or `redis`.
 *
 * @example
 * ```typescript
 * import Redis from 'ioredis'
 *
 * const redis = new Redis('redis://localhost:6379')
 * const driver = new RedisDriver({ client: redis })
 *
 * await driver.push('default', serializedJob)
 * ```
 */
export class RedisDriver implements QueueDriver {
  private prefix: string
  private client: RedisDriverConfig['client']

  constructor(config: RedisDriverConfig) {
    this.client = config.client
    this.prefix = config.prefix ?? 'queue:'

    if (!this.client) {
      throw new Error(
        '[RedisDriver] Redis client is required. Please install ioredis or redis package.'
      )
    }
  }

  /**
   * Get full Redis key for a queue.
   */
  private getKey(queue: string): string {
    return `${this.prefix}${queue}`
  }

  /**
   * Push a job (LPUSH).
   */
  async push(queue: string, job: SerializedJob): Promise<void> {
    const key = this.getKey(queue)
    const payload = JSON.stringify({
      id: job.id,
      type: job.type,
      data: job.data,
      className: job.className,
      createdAt: job.createdAt,
      delaySeconds: job.delaySeconds,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
    })

    // For delayed jobs, prefer Sorted Sets (ZADD) when supported
    if (job.delaySeconds && job.delaySeconds > 0) {
      const delayKey = `${key}:delayed`
      const score = Date.now() + job.delaySeconds * 1000
      // Store delayed job in ZSET
      if (typeof (this.client as { zadd: unknown }).zadd === 'function') {
        await (
          this.client as { zadd: (key: string, score: number, member: string) => Promise<number> }
        ).zadd(delayKey, score, payload)
      } else {
        // Fallback: push directly (no delay support)
        await this.client.lpush(key, payload)
      }
    } else {
      await this.client.lpush(key, payload)
    }
  }

  /**
   * Pop a job (RPOP, FIFO).
   */
  async pop(queue: string): Promise<SerializedJob | null> {
    const key = this.getKey(queue)

    // Check delayed queue first
    const delayKey = `${key}:delayed`
    if (typeof (this.client as { zrange: unknown }).zrange === 'function') {
      const now = Date.now()
      const delayedJobs = await (
        this.client as {
          zrange: (
            key: string,
            start: number,
            stop: number,
            withScores: boolean
          ) => Promise<string[]>
          zrem: (key: string, ...members: string[]) => Promise<number>
        }
      ).zrange(delayKey, 0, 0, true)

      if (delayedJobs && delayedJobs.length >= 2) {
        const score = parseFloat(delayedJobs[1]!)
        if (score <= now) {
          const payload = delayedJobs[0]!
          await (
            this.client as { zrem: (key: string, ...members: string[]) => Promise<number> }
          ).zrem(delayKey, payload)
          return this.parsePayload(payload)
        }
      }
    }

    // Pop from main queue
    const payload = await this.client.rpop(key)
    if (!payload) {
      return null
    }

    return this.parsePayload(payload)
  }

  /**
   * Parse Redis payload.
   */
  private parsePayload(payload: string): SerializedJob {
    const parsed = JSON.parse(payload)
    return {
      id: parsed.id,
      type: parsed.type,
      data: parsed.data,
      className: parsed.className,
      createdAt: parsed.createdAt,
      delaySeconds: parsed.delaySeconds,
      attempts: parsed.attempts,
      maxAttempts: parsed.maxAttempts,
    }
  }

  /**
   * Get queue size.
   */
  async size(queue: string): Promise<number> {
    const key = this.getKey(queue)
    return this.client.llen(key)
  }

  /**
   * Clear a queue.
   */
  async clear(queue: string): Promise<void> {
    const key = this.getKey(queue)
    const delayKey = `${key}:delayed`
    await this.client.del(key)
    if (typeof (this.client as { del: unknown }).del === 'function') {
      await this.client.del(delayKey)
    }
  }

  /**
   * Push multiple jobs.
   */
  async pushMany(queue: string, jobs: SerializedJob[]): Promise<void> {
    if (jobs.length === 0) {
      return
    }

    const key = this.getKey(queue)
    const payloads = jobs.map((job) =>
      JSON.stringify({
        id: job.id,
        type: job.type,
        data: job.data,
        className: job.className,
        createdAt: job.createdAt,
        delaySeconds: job.delaySeconds,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
      })
    )

    await this.client.lpush(key, ...payloads)
  }

  /**
   * Pop multiple jobs.
   */
  async popMany(queue: string, count: number): Promise<SerializedJob[]> {
    const key = this.getKey(queue)
    const results: SerializedJob[] = []

    for (let i = 0; i < count; i++) {
      const payload = await this.client.rpop(key)
      if (payload) {
        results.push(this.parsePayload(payload))
      } else {
        break
      }
    }

    return results
  }
}
