import type { RedirectManager, RedirectRule } from '../types'

/**
 * Options for configuring the `MemoryRedirectManager`.
 *
 * @public
 * @since 3.0.0
 */
export interface MemoryRedirectManagerOptions {
  /** Maximum number of rules to keep in memory. @default 100000 */
  maxRules?: number
}

/**
 * MemoryRedirectManager is a fast, in-memory implementation of the `RedirectManager`.
 *
 * It is suitable for development environments or small sites where redirect
 * rules do not need to persist across application restarts.
 *
 * @public
 * @since 3.0.0
 */
export class MemoryRedirectManager implements RedirectManager {
  private rules = new Map<string, RedirectRule>()
  private maxRules: number

  constructor(options: MemoryRedirectManagerOptions = {}) {
    this.maxRules = options.maxRules || 100000
  }

  async register(redirect: RedirectRule): Promise<void> {
    this.rules.set(redirect.from, redirect)

    // 如果超過最大數量，移除最舊的規則（簡化實作）
    if (this.rules.size > this.maxRules) {
      const firstKey = this.rules.keys().next().value
      if (firstKey) {
        this.rules.delete(firstKey)
      }
    }
  }

  async registerBatch(redirects: RedirectRule[]): Promise<void> {
    for (const redirect of redirects) {
      await this.register(redirect)
    }
  }

  async get(from: string): Promise<RedirectRule | null> {
    return this.rules.get(from) || null
  }

  async getAll(): Promise<RedirectRule[]> {
    return Array.from(this.rules.values())
  }

  async resolve(url: string, followChains = false, maxChainLength = 5): Promise<string | null> {
    let current = url
    let chainLength = 0

    while (chainLength < maxChainLength) {
      const rule = await this.get(current)
      if (!rule) {
        return current
      }

      current = rule.to
      chainLength++

      if (!followChains) {
        return current
      }
    }

    return current
  }
}

/**
 * Options for configuring the `RedisRedirectManager`.
 *
 * @public
 * @since 3.0.0
 */
export interface RedisRedirectManagerOptions {
  /** The Redis client instance. */
  client: any
  /** Prefix for Redis keys to avoid collisions. @default 'sitemap:redirects:' */
  keyPrefix?: string
  /** Time-to-live for redirect rules in seconds. If not set, rules are permanent. */
  ttl?: number
}

/**
 * RedisRedirectManager provides a persistent, distributed implementation of the `RedirectManager`.
 *
 * It uses Redis to store redirect rules, making it suitable for production
 * environments where multiple application instances need to share the same
 * redirect configuration.
 *
 * @public
 * @since 3.0.0
 */
export class RedisRedirectManager implements RedirectManager {
  private client: any
  private keyPrefix: string
  private ttl: number | undefined

  constructor(options: RedisRedirectManagerOptions) {
    this.client = options.client
    this.keyPrefix = options.keyPrefix || 'sitemap:redirects:'
    this.ttl = options.ttl
  }

  private getKey(from: string): string {
    return `${this.keyPrefix}${from}`
  }

  private getListKey(): string {
    return `${this.keyPrefix}list`
  }

  async register(redirect: RedirectRule): Promise<void> {
    const key = this.getKey(redirect.from)
    const listKey = this.getListKey()
    const data = JSON.stringify(redirect)

    if (this.ttl) {
      await this.client.set(key, data, 'EX', this.ttl)
    } else {
      await this.client.set(key, data)
    }

    // 添加到列表
    await this.client.sadd(listKey, redirect.from)
  }

  async registerBatch(redirects: RedirectRule[]): Promise<void> {
    for (const redirect of redirects) {
      await this.register(redirect)
    }
  }

  async get(from: string): Promise<RedirectRule | null> {
    try {
      const key = this.getKey(from)
      const data = await this.client.get(key)
      if (!data) {
        return null
      }
      const rule = JSON.parse(data)
      if (rule.createdAt) {
        rule.createdAt = new Date(rule.createdAt)
      }
      return rule
    } catch {
      return null
    }
  }

  async getAll(): Promise<RedirectRule[]> {
    try {
      const listKey = this.getListKey()
      const froms = await this.client.smembers(listKey)

      const rules: RedirectRule[] = []
      for (const from of froms) {
        const rule = await this.get(from)
        if (rule) {
          rules.push(rule)
        }
      }

      return rules
    } catch {
      return []
    }
  }

  async resolve(url: string, followChains = false, maxChainLength = 5): Promise<string | null> {
    let current = url
    let chainLength = 0

    while (chainLength < maxChainLength) {
      const rule = await this.get(current)
      if (!rule) {
        return current
      }

      current = rule.to
      chainLength++

      if (!followChains) {
        return current
      }
    }

    return current
  }
}
