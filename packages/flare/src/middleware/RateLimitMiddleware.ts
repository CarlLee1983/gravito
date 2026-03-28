/**
 * Rate limiting middleware for notification channels.
 *
 * 此中介層使用 Token Bucket 演算法對不同的通知通道進行限流，
 * 防止短時間內發送過多通知，保護下游服務。
 *
 * @packageDocumentation
 */

import { FlareError } from '../errors/FlareError'
import { FlareErrorCodes } from '../errors/codes'
import type { Notification } from '../Notification'
import type { Notifiable } from '../types'
import { type ChannelMiddleware, MiddlewarePriority } from '../types/middleware'
import { TokenBucket } from '../utils/TokenBucket'

/**
 * 時間常數（秒）
 */
const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 3_600

/**
 * MemoryStore 清理間隔（毫秒）
 */
const DEFAULT_CLEANUP_INTERVAL_MS = 60_000 // 1 分鐘

/**
 * Rate limit configuration for a specific channel.
 *
 * 通道限流配置，支援多個時間窗口的限流。
 *
 * @public
 */
export interface ChannelRateLimitConfig {
  /**
   * Maximum requests per second.
   * 每秒最大請求數
   */
  maxPerSecond?: number

  /**
   * Maximum requests per minute.
   * 每分鐘最大請求數
   */
  maxPerMinute?: number

  /**
   * Maximum requests per hour.
   * 每小時最大請求數
   */
  maxPerHour?: number
}

/**
 * Rate limit configuration for all channels.
 *
 * 所有通道的限流配置，key 為通道名稱。
 *
 * @public
 */
export interface RateLimitConfig {
  [channel: string]: ChannelRateLimitConfig
}

/**
 * Cache store interface for rate limiting.
 *
 * 快取儲存介面，用於支援分散式限流。
 * 預設使用記憶體儲存，可替換為 Redis 等分散式快取。
 *
 * @public
 */
export interface CacheStore {
  get<T>(key: string): Promise<T | null>
  put<T>(key: string, value: T, ttl: number): Promise<void>
  forget(key: string): Promise<void>
}

/**
 * Simple in-memory cache store implementation.
 *
 * 簡單的記憶體快取實作，用於單機環境。
 * 生產環境建議使用 Redis 等分散式快取。
 *
 * @public
 */
export class MemoryStore implements CacheStore {
  private cache = new Map<string, { value: any; expiry: number }>()
  private cleanupInterval?: NodeJS.Timeout

  constructor(cleanupIntervalMs = DEFAULT_CLEANUP_INTERVAL_MS) {
    // 定期清理過期項目
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiry) {
          this.cache.delete(key)
        }
      }
    }, cleanupIntervalMs)
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key)
    if (!item) {
      return null
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }

    return item.value as T
  }

  async put<T>(key: string, value: T, ttl: number): Promise<void> {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl * 1000,
    })
  }

  async forget(key: string): Promise<void> {
    this.cache.delete(key)
  }

  /**
   * 清理所有資源，停止清理計時器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
    this.cache.clear()
  }
}

/**
 * Rate limiting middleware using Token Bucket algorithm.
 *
 * 此中介層為每個通道維護獨立的 Token Bucket，
 * 支援每秒、每分鐘、每小時三種時間窗口的限流。
 *
 * @example
 * ```typescript
 * const rateLimiter = new RateLimitMiddleware({
 *   email: {
 *     maxPerSecond: 10,
 *     maxPerMinute: 100,
 *     maxPerHour: 1000
 *   },
 *   sms: {
 *     maxPerSecond: 5,
 *     maxPerMinute: 50
 *   }
 * })
 *
 * manager.use(rateLimiter)
 * ```
 *
 * @public
 */
export class RateLimitMiddleware implements ChannelMiddleware {
  /**
   * Middleware name.
   */
  readonly name = 'rate-limit'

  /**
   * Middleware priority (high priority, executes early in the chain).
   * 中介層優先級（高優先級，在鏈中較早執行）
   */
  readonly priority = MiddlewarePriority.RATE_LIMIT

  /**
   * Token buckets for each channel and time window.
   * Key format: `{channel}:{window}` (e.g., 'email:second', 'sms:minute')
   */
  private buckets = new Map<string, TokenBucket>()

  /**
   * Cache store for distributed rate limiting.
   */
  public store: CacheStore

  /**
   * Create a new RateLimitMiddleware instance.
   *
   * @param config - Rate limit configuration for each channel
   * @param store - Optional cache store for distributed rate limiting (future use)
   *
   * @example
   * ```typescript
   * // 使用預設記憶體儲存
   * const middleware = new RateLimitMiddleware({
   *   email: { maxPerSecond: 10 }
   * })
   *
   * // 使用 Redis 儲存（分散式環境）
   * const middleware = new RateLimitMiddleware({
   *   email: { maxPerSecond: 10 }
   * }, redisStore)
   * ```
   */
  constructor(
    private config: RateLimitConfig,
    store?: CacheStore
  ) {
    this.store = store || new MemoryStore()
    this.initializeBuckets()
  }

  /**
   * Initialize token buckets for all configured channels.
   *
   * 為所有配置的通道初始化 Token Bucket。
   *
   * @private
   */
  private initializeBuckets(): void {
    for (const [channel, limits] of Object.entries(this.config)) {
      if (limits.maxPerSecond) {
        const key = `${channel}:second`
        this.buckets.set(key, new TokenBucket(limits.maxPerSecond, limits.maxPerSecond))
      }

      if (limits.maxPerMinute) {
        const key = `${channel}:minute`
        // 每分鐘 = 每秒補充 rate/SECONDS_PER_MINUTE
        this.buckets.set(
          key,
          new TokenBucket(limits.maxPerMinute, limits.maxPerMinute / SECONDS_PER_MINUTE)
        )
      }

      if (limits.maxPerHour) {
        const key = `${channel}:hour`
        // 每小時 = 每秒補充 rate/SECONDS_PER_HOUR
        this.buckets.set(
          key,
          new TokenBucket(limits.maxPerHour, limits.maxPerHour / SECONDS_PER_HOUR)
        )
      }
    }
  }

  /**
   * Handle the notification and apply rate limiting.
   *
   * 處理通知並應用限流規則。如果超過任一時間窗口的限制，
   * 將拋出錯誤阻止通知發送。
   *
   * @param notification - The notification being sent
   * @param notifiable - The recipient
   * @param channel - The channel name
   * @param next - Continue to the next middleware or send the notification
   *
   * @throws {Error} 當超過限流時拋出錯誤
   */
  async handle(
    _notification: Notification,
    _notifiable: Notifiable,
    channel: string,
    next: () => Promise<void>
  ): Promise<void> {
    // 檢查此通道是否有配置限流
    const channelConfig = this.config[channel]
    if (!channelConfig) {
      // 沒有配置限流，直接放行
      await next()
      return
    }

    // 檢查所有時間窗口的限流
    const windows = ['second', 'minute', 'hour'] as const
    for (const window of windows) {
      const key = `${channel}:${window}`
      const bucket = this.buckets.get(key)

      if (bucket) {
        const allowed = bucket.tryConsume()
        if (!allowed) {
          throw new FlareError(
            FlareErrorCodes.RATE_LIMIT_EXCEEDED,
            `Rate limit exceeded for channel '${channel}' (${window}ly limit). ` +
              `Please try again later.`
          )
        }
      }
    }

    // 所有限流檢查都通過，繼續執行
    await next()
  }

  /**
   * Get current rate limit status for a channel.
   *
   * 獲取指定通道的當前限流狀態（用於除錯和監控）。
   *
   * @param channel - The channel name
   * @returns Current token counts for each time window
   *
   * @example
   * ```typescript
   * const status = middleware.getStatus('email')
   * console.log(`Email remaining: ${status.second}/${config.email.maxPerSecond}`)
   * ```
   */
  getStatus(channel: string): {
    second?: number
    minute?: number
    hour?: number
  } {
    const status: { second?: number; minute?: number; hour?: number } = {}

    const secondBucket = this.buckets.get(`${channel}:second`)
    if (secondBucket) {
      status.second = secondBucket.getTokens()
    }

    const minuteBucket = this.buckets.get(`${channel}:minute`)
    if (minuteBucket) {
      status.minute = minuteBucket.getTokens()
    }

    const hourBucket = this.buckets.get(`${channel}:hour`)
    if (hourBucket) {
      status.hour = hourBucket.getTokens()
    }

    return status
  }

  /**
   * Reset rate limit for a specific channel.
   *
   * 重置指定通道的限流計數（用於測試或手動重置）。
   *
   * @param channel - The channel name to reset
   *
   * @example
   * ```typescript
   * // 在測試中重置限流
   * middleware.reset('email')
   * ```
   */
  reset(channel: string): void {
    const channelConfig = this.config[channel]
    if (!channelConfig) {
      return
    }

    if (channelConfig.maxPerSecond) {
      const key = `${channel}:second`
      this.buckets.set(key, new TokenBucket(channelConfig.maxPerSecond, channelConfig.maxPerSecond))
    }

    if (channelConfig.maxPerMinute) {
      const key = `${channel}:minute`
      this.buckets.set(
        key,
        new TokenBucket(channelConfig.maxPerMinute, channelConfig.maxPerMinute / SECONDS_PER_MINUTE)
      )
    }

    if (channelConfig.maxPerHour) {
      const key = `${channel}:hour`
      this.buckets.set(
        key,
        new TokenBucket(channelConfig.maxPerHour, channelConfig.maxPerHour / SECONDS_PER_HOUR)
      )
    }
  }
}
