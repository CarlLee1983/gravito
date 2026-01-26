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
    this.ttl = options.ttl || 86400 // 24 hours
  }

  private getKey(jobId: string): string {
    return `${this.keyPrefix}${jobId}`
  }

  private getListKey(): string {
    return `${this.keyPrefix}list`
  }

  /**
   * Retrieves the progress of a specific generation job from Redis.
   *
   * @param jobId - Unique identifier for the job.
   * @returns A promise resolving to the `SitemapProgress` object, or null if not found.
   */
  async get(jobId: string): Promise<SitemapProgress | null> {
    try {
      const key = this.getKey(jobId)
      const data = await this.client.get(key)
      if (!data) {
        return null
      }
      const progress = JSON.parse(data)
      // Restore Date objects
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

  /**
   * Initializes or overwrites a progress record in Redis.
   *
   * @param jobId - Unique identifier for the job.
   * @param progress - The initial or current state of the job progress.
   */
  async set(jobId: string, progress: SitemapProgress): Promise<void> {
    const key = this.getKey(jobId)
    const listKey = this.getListKey()
    const data = JSON.stringify(progress)

    await this.client.set(key, data, 'EX', this.ttl)
    // Add to list
    await this.client.zadd(listKey, Date.now(), jobId)
    // Set list TTL
    await this.client.expire(listKey, this.ttl)
  }

  /**
   * Updates specific fields of an existing progress record in Redis.
   *
   * @param jobId - Unique identifier for the job.
   * @param updates - Object containing the fields to update.
   */
  async update(jobId: string, updates: Partial<SitemapProgress>): Promise<void> {
    const existing = await this.get(jobId)
    if (existing) {
      await this.set(jobId, { ...existing, ...updates })
    }
  }

  /**
   * Deletes a progress record from Redis.
   *
   * @param jobId - Unique identifier for the job to remove.
   */
  async delete(jobId: string): Promise<void> {
    const key = this.getKey(jobId)
    const listKey = this.getListKey()
    await this.client.del(key)
    await this.client.zrem(listKey, jobId)
  }

  /**
   * Lists the most recent sitemap generation jobs from Redis.
   *
   * @param limit - Maximum number of records to return.
   * @returns A promise resolving to an array of `SitemapProgress` objects, sorted by start time.
   */
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
