import type { SitemapProgress, SitemapProgressStorage } from '../types'

/**
 * Options for configuring the `RedisProgressStorage`.
 *
 * @public
 * @since 3.0.0
 */
export interface RedisProgressStorageOptions {
  /** The Redis client instance. */
  client: any
  /** Prefix for Redis keys to avoid collisions. @default 'sitemap:progress:' */
  keyPrefix?: string
  /** Time-to-live for progress records in seconds. @default 86400 (24 hours) */
  ttl?: number
}

/**
 * RedisProgressStorage persists sitemap generation progress to Redis.
 *
 * It is designed for multi-process or distributed environments where progress
 * needs to be tracked across multiple worker instances.
 *
 * @public
 * @since 3.0.0
 */
export class RedisProgressStorage implements SitemapProgressStorage {
  private client: any
  private keyPrefix: string
  private ttl: number

  constructor(options: RedisProgressStorageOptions) {
    this.client = options.client
    this.keyPrefix = options.keyPrefix || 'sitemap:progress:'
    this.ttl = options.ttl || 86400 // 24 小時
  }

  private getKey(jobId: string): string {
    return `${this.keyPrefix}${jobId}`
  }

  private getListKey(): string {
    return `${this.keyPrefix}list`
  }

  async get(jobId: string): Promise<SitemapProgress | null> {
    try {
      const key = this.getKey(jobId)
      const data = await this.client.get(key)
      if (!data) {
        return null
      }
      const progress = JSON.parse(data)
      // 還原 Date 物件
      if (progress.startTime) {
        progress.startTime = new Date(progress.startTime)
      }
      if (progress.endTime) {
        progress.endTime = new Date(progress.endTime)
      }
      return progress
    } catch {
      return null
    }
  }

  async set(jobId: string, progress: SitemapProgress): Promise<void> {
    const key = this.getKey(jobId)
    const listKey = this.getListKey()
    const data = JSON.stringify(progress)

    await this.client.set(key, data, 'EX', this.ttl)
    // 添加到列表
    await this.client.zadd(listKey, Date.now(), jobId)
    // 設定列表 TTL
    await this.client.expire(listKey, this.ttl)
  }

  async update(jobId: string, updates: Partial<SitemapProgress>): Promise<void> {
    const existing = await this.get(jobId)
    if (existing) {
      await this.set(jobId, { ...existing, ...updates })
    }
  }

  async delete(jobId: string): Promise<void> {
    const key = this.getKey(jobId)
    const listKey = this.getListKey()
    await this.client.del(key)
    await this.client.zrem(listKey, jobId)
  }

  async list(limit?: number): Promise<SitemapProgress[]> {
    try {
      const listKey = this.getListKey()
      const jobIds = await this.client.zrevrange(listKey, 0, (limit || 100) - 1)

      const results: SitemapProgress[] = []
      for (const jobId of jobIds) {
        const progress = await this.get(jobId)
        if (progress) {
          results.push(progress)
        }
      }

      return results
    } catch {
      return []
    }
  }
}
