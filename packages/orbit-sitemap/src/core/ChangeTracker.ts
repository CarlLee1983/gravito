import type { ChangeTracker, SitemapChange, SitemapEntry } from '../types'

export interface MemoryChangeTrackerOptions {
  maxChanges?: number // 最大變更記錄數，預設 100000
}

/**
 * 記憶體變更追蹤器實作
 * 適用於單一進程或開發環境
 */
export class MemoryChangeTracker implements ChangeTracker {
  private changes: SitemapChange[] = []
  private maxChanges: number

  constructor(options: MemoryChangeTrackerOptions = {}) {
    this.maxChanges = options.maxChanges || 100000
  }

  async track(change: SitemapChange): Promise<void> {
    this.changes.push(change)

    // 如果超過最大數量，移除最舊的變更
    if (this.changes.length > this.maxChanges) {
      this.changes = this.changes.slice(-this.maxChanges)
    }
  }

  async getChanges(since?: Date): Promise<SitemapChange[]> {
    if (!since) {
      return [...this.changes]
    }

    return this.changes.filter((change) => change.timestamp >= since)
  }

  async getChangesByUrl(url: string): Promise<SitemapChange[]> {
    return this.changes.filter((change) => change.url === url)
  }

  async clear(since?: Date): Promise<void> {
    if (!since) {
      this.changes = []
      return
    }

    this.changes = this.changes.filter((change) => change.timestamp < since)
  }
}

export interface RedisChangeTrackerOptions {
  client: any // Redis 客戶端
  keyPrefix?: string
  ttl?: number // TTL（秒），預設 7 天
}

/**
 * Redis 變更追蹤器實作
 * 適用於分散式環境或多進程
 */
export class RedisChangeTracker implements ChangeTracker {
  private client: any
  private keyPrefix: string
  private ttl: number

  constructor(options: RedisChangeTrackerOptions) {
    this.client = options.client
    this.keyPrefix = options.keyPrefix || 'sitemap:changes:'
    this.ttl = options.ttl || 604800 // 7 天
  }

  private getKey(url: string): string {
    return `${this.keyPrefix}${url}`
  }

  private getListKey(): string {
    return `${this.keyPrefix}list`
  }

  async track(change: SitemapChange): Promise<void> {
    const key = this.getKey(change.url)
    const listKey = this.getListKey()
    const data = JSON.stringify(change)

    // 儲存變更
    await this.client.set(key, data, 'EX', this.ttl)
    
    // 添加到時間序列列表
    const score = change.timestamp.getTime()
    await this.client.zadd(listKey, score, change.url)
    await this.client.expire(listKey, this.ttl)
  }

  async getChanges(since?: Date): Promise<SitemapChange[]> {
    try {
      const listKey = this.getListKey()
      const minScore = since ? since.getTime() : 0
      const urls = await this.client.zrangebyscore(listKey, minScore, '+inf')

      const changes: SitemapChange[] = []
      for (const url of urls) {
        const key = this.getKey(url)
        const data = await this.client.get(key)
        if (data) {
          const change = JSON.parse(data)
          change.timestamp = new Date(change.timestamp)
          changes.push(change)
        }
      }

      return changes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    } catch {
      return []
    }
  }

  async getChangesByUrl(url: string): Promise<SitemapChange[]> {
    try {
      const key = this.getKey(url)
      const data = await this.client.get(key)
      if (!data) {
        return []
      }
      const change = JSON.parse(data)
      change.timestamp = new Date(change.timestamp)
      return [change]
    } catch {
      return []
    }
  }

  async clear(since?: Date): Promise<void> {
    try {
      const listKey = this.getListKey()
      
      if (!since) {
        // 清除所有
        const urls = await this.client.zrange(listKey, 0, -1)
        for (const url of urls) {
          await this.client.del(this.getKey(url))
        }
        await this.client.del(listKey)
      } else {
        // 清除指定時間之前的
        const maxScore = since.getTime()
        const urls = await this.client.zrangebyscore(listKey, 0, maxScore)
        for (const url of urls) {
          await this.client.del(this.getKey(url))
          await this.client.zrem(listKey, url)
        }
      }
    } catch {
      // 忽略錯誤
    }
  }
}

