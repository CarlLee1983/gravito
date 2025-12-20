import type { RedirectManager, RedirectRule } from '../types'

export interface MemoryRedirectManagerOptions {
  maxRules?: number // 最大規則數，預設 100000
}

/**
 * 記憶體轉址管理器實作
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

export interface RedisRedirectManagerOptions {
  client: any // Redis 客戶端
  keyPrefix?: string
  ttl?: number // TTL（秒），預設永久
}

/**
 * Redis 轉址管理器實作
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

