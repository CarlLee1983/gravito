import type { SerializedJob } from '../types'
import type { QueueDriver } from './QueueDriver'

/**
 * Redis Driver 配置
 */
export interface RedisDriverConfig {
  /**
   * Redis 客戶端實例（ioredis 或 redis）
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
   * Key 前綴（預設：'queue:'）
   */
  prefix?: string
}

/**
 * Redis Driver
 *
 * 使用 Redis 作為隊列儲存。
 * 支援 List 結構，使用 LPUSH/RPOP 實現 FIFO 隊列。
 *
 * **要求**：需要安裝 `ioredis` 或 `redis` 套件。
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
   * 取得完整的 Redis key
   */
  private getKey(queue: string): string {
    return `${this.prefix}${queue}`
  }

  /**
   * 推送 Job 到隊列（LPUSH，左側插入）
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

    // 如果有延遲，使用有序集合（ZADD）或延遲隊列
    if (job.delaySeconds && job.delaySeconds > 0) {
      const delayKey = `${key}:delayed`
      const score = Date.now() + job.delaySeconds * 1000
      // 使用 ZADD 儲存延遲的 Job
      if (typeof (this.client as { zadd: unknown }).zadd === 'function') {
        await (
          this.client as { zadd: (key: string, score: number, member: string) => Promise<number> }
        ).zadd(delayKey, score, payload)
      } else {
        // 降級：直接推送到主隊列（不支援延遲）
        await this.client.lpush(key, payload)
      }
    } else {
      await this.client.lpush(key, payload)
    }
  }

  /**
   * 從隊列取出 Job（RPOP，右側取出，FIFO）
   */
  async pop(queue: string): Promise<SerializedJob | null> {
    const key = this.getKey(queue)

    // 先檢查延遲隊列
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

    // 從主隊列取出
    const payload = await this.client.rpop(key)
    if (!payload) {
      return null
    }

    return this.parsePayload(payload)
  }

  /**
   * 解析 Redis payload
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
   * 取得隊列大小
   */
  async size(queue: string): Promise<number> {
    const key = this.getKey(queue)
    return this.client.llen(key)
  }

  /**
   * 清空隊列
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
   * 批量推送 Job
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
   * 批量取出 Job
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
