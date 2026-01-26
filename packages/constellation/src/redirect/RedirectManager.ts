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

  /**
   * Registers a single redirect rule in memory.
   *
   * @param redirect - The redirect rule to add.
   */
  async register(redirect: RedirectRule): Promise<void> {
    this.rules.set(redirect.from, redirect)

    // If limit exceeded, remove the oldest rule (FIFO)
    if (this.rules.size > this.maxRules) {
      const firstKey = this.rules.keys().next().value
      if (firstKey) {
        this.rules.delete(firstKey)
      }
    }
  }

  /**
   * Registers multiple redirect rules in memory.
   *
   * @param redirects - An array of redirect rules.
   */
  async registerBatch(redirects: RedirectRule[]): Promise<void> {
    for (const redirect of redirects) {
      await this.register(redirect)
    }
  }

  /**
   * Retrieves a specific redirect rule by its source path from memory.
   *
   * @param from - The source path.
   * @returns A promise resolving to the redirect rule, or null if not found.
   */
  async get(from: string): Promise<RedirectRule | null> {
    return this.rules.get(from) || null
  }

  /**
   * Retrieves all registered redirect rules from memory.
   *
   * @returns A promise resolving to an array of all redirect rules.
   */
  async getAll(): Promise<RedirectRule[]> {
    return Array.from(this.rules.values())
  }

  /**
   * Resolves a URL to its final destination through the redirect table.
   *
   * @param url - The URL to resolve.
   * @param followChains - Whether to recursively resolve chained redirects.
   * @param maxChainLength - Maximum depth for chain resolution.
   * @returns A promise resolving to the final destination URL.
   */
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

  /**
   * Registers a single redirect rule in Redis.
   *
   * @param redirect - The redirect rule to add.
   */
  async register(redirect: RedirectRule): Promise<void> {
    const key = this.getKey(redirect.from)
    const listKey = this.getListKey()
    const data = JSON.stringify(redirect)

    if (this.ttl) {
      await this.client.set(key, data, 'EX', this.ttl)
    } else {
      await this.client.set(key, data)
    }

    // Add to list
    await this.client.sadd(listKey, redirect.from)
  }

  /**
   * Registers multiple redirect rules in Redis.
   *
   * @param redirects - An array of redirect rules.
   */
  async registerBatch(redirects: RedirectRule[]): Promise<void> {
    for (const redirect of redirects) {
      await this.register(redirect)
    }
  }

  /**
   * Retrieves a specific redirect rule by its source path from Redis.
   *
   * @param from - The source path.
   * @returns A promise resolving to the redirect rule, or null if not found.
   */
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

  /**
   * Retrieves all registered redirect rules from Redis.
   *
   * @returns A promise resolving to an array of all redirect rules.
   */
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

  /**
   * Resolves a URL to its final destination through the Redis redirect table.
   *
   * @param url - The URL to resolve.
   * @param followChains - Whether to recursively resolve chained redirects.
   * @param maxChainLength - Maximum depth for chain resolution.
   * @returns A promise resolving to the final destination URL.
   */
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
