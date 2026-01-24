import type { CacheLock } from './locks'
import type { CacheStore } from './store'
import { isTaggableStore } from './store'
import { type CacheKey, type CacheTtl, normalizeCacheKey } from './types'

/**
 * Supported modes for emitting cache events.
 *
 * @public
 * @since 3.0.0
 */
export type CacheEventMode = 'sync' | 'async' | 'off'

/**
 * Event handlers for cache lifecycle events.
 *
 * @public
 * @since 3.0.0
 */
export type CacheEvents = {
  /** Triggered on a cache hit. */
  hit?: (key: string) => void | Promise<void>
  /** Triggered on a cache miss. */
  miss?: (key: string) => void | Promise<void>
  /** Triggered when a value is written to the cache. */
  write?: (key: string) => void | Promise<void>
  /** Triggered when a value is removed from the cache. */
  forget?: (key: string) => void | Promise<void>
  /** Triggered when the entire cache is flushed. */
  flush?: () => void | Promise<void>
}

/**
 * Options for configuring the `CacheRepository`.
 *
 * @public
 * @since 3.0.0
 */
export type CacheRepositoryOptions = {
  /** Optional prefix for all cache keys. */
  prefix?: string
  /** Default time-to-live for cache entries. */
  defaultTtl?: CacheTtl
  /** Event handlers for cache operations. */
  events?: CacheEvents
  /** Mode for emitting events (sync, async, or off). @default 'async' */
  eventsMode?: CacheEventMode
  /** Whether to throw an error if an event handler fails. @default false */
  throwOnEventError?: boolean
  /** Callback triggered when an event handler encounters an error. */
  onEventError?: (error: unknown, event: keyof CacheEvents, payload: { key?: string }) => void
  /** Timeout for background flexible refresh in milliseconds. @default 30000 */
  refreshTimeout?: number
}

/**
 * Statistics for flexible cache operations.
 *
 * @public
 * @since 3.0.0
 */
export type FlexibleStats = {
  refreshCount: number
  refreshFailures: number
  avgRefreshTime: number
}

/**
 * CacheRepository provides a high-level, developer-friendly API for cache operations.
 *
 * It wraps a low-level `CacheStore` and adds features like:
 * - Key prefixing.
 * - Event emission (hit, miss, write, etc.).
 * - Automatic serialization/deserialization.
 * - Higher-level helpers like `remember`, `flexible`, and `pull`.
 * - Support for tagged cache entries (if the store supports it).
 *
 * @example
 * ```typescript
 * const cache = new CacheRepository(redisStore, { prefix: 'app:' });
 * const user = await cache.remember('user:1', 3600, () => fetchUser(1));
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class CacheRepository {
  private refreshSemaphore = new Map<string, Promise<void>>()
  private flexibleStats = { refreshCount: 0, refreshFailures: 0, totalTime: 0 }

  constructor(
    protected readonly store: CacheStore,
    protected readonly options: CacheRepositoryOptions = {}
  ) {}

  /**
   * Get statistics about flexible cache operations.
   */
  getFlexibleStats(): FlexibleStats {
    return {
      refreshCount: this.flexibleStats.refreshCount,
      refreshFailures: this.flexibleStats.refreshFailures,
      avgRefreshTime:
        this.flexibleStats.refreshCount > 0
          ? this.flexibleStats.totalTime / this.flexibleStats.refreshCount
          : 0,
    }
  }

  private emit(event: keyof CacheEvents, payload: { key?: string } = {}): void | Promise<void> {
    const mode = this.options.eventsMode ?? 'async'
    if (mode === 'off') {
      return
    }

    const fn = this.options.events?.[event]
    if (!fn) {
      return
    }

    const invoke = (): void | Promise<void> => {
      if (event === 'flush') {
        return (fn as NonNullable<CacheEvents['flush']>)()
      }
      const key = payload.key ?? ''
      return (
        fn as NonNullable<
          CacheEvents['hit'] | CacheEvents['miss'] | CacheEvents['write'] | CacheEvents['forget']
        >
      )(key)
    }

    const reportError = (error: unknown): void => {
      try {
        this.options.onEventError?.(error, event, payload)
      } catch {
        // ignore to keep cache ops safe
      }
    }

    if (mode === 'sync') {
      try {
        return Promise.resolve(invoke()).catch((error) => {
          reportError(error)
          if (this.options.throwOnEventError) {
            throw error
          }
        })
      } catch (error) {
        reportError(error)
        if (this.options.throwOnEventError) {
          throw error
        }
      }
      return
    }

    queueMicrotask(() => {
      try {
        const result = invoke()
        if (result && typeof (result as Promise<void>).catch === 'function') {
          void (result as Promise<void>).catch(reportError)
        }
      } catch (error) {
        reportError(error)
      }
    })
  }

  protected key(key: CacheKey): string {
    const normalized = normalizeCacheKey(key)
    const prefix = this.options.prefix ?? ''
    return prefix ? `${prefix}${normalized}` : normalized
  }

  protected flexibleFreshUntilKey(fullKey: string): string {
    return `__gravito:flexible:freshUntil:${fullKey}`
  }

  protected async putMetaKey(metaKey: string, value: unknown, ttl: CacheTtl): Promise<void> {
    await this.store.put(metaKey, value, ttl)
  }

  protected async forgetMetaKey(metaKey: string): Promise<void> {
    await this.store.forget(metaKey)
  }

  async get<T = unknown>(
    key: CacheKey,
    defaultValue?: T | (() => T | Promise<T>)
  ): Promise<T | null> {
    const fullKey = this.key(key)
    const value = await this.store.get<T>(fullKey)
    if (value !== null) {
      const e = this.emit('hit', { key: fullKey })
      if (e) {
        await e
      }
      return value
    }

    const e = this.emit('miss', { key: fullKey })
    if (e) {
      await e
    }
    if (defaultValue === undefined) {
      return null
    }
    if (typeof defaultValue === 'function') {
      return (defaultValue as () => T | Promise<T>)()
    }
    return defaultValue
  }

  async has(key: CacheKey): Promise<boolean> {
    return (await this.get(key)) !== null
  }

  async missing(key: CacheKey): Promise<boolean> {
    return !(await this.has(key))
  }

  async put(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<void> {
    const fullKey = this.key(key)
    await this.store.put(fullKey, value, ttl)
    const e = this.emit('write', { key: fullKey })
    if (e) {
      await e
    }
  }

  async set(key: CacheKey, value: unknown, ttl?: CacheTtl): Promise<void> {
    const resolved = ttl ?? this.options.defaultTtl
    await this.put(key, value, resolved)
  }

  async add(key: CacheKey, value: unknown, ttl?: CacheTtl): Promise<boolean> {
    const fullKey = this.key(key)
    const resolved = ttl ?? this.options.defaultTtl
    const ok = await this.store.add(fullKey, value, resolved)
    if (ok) {
      const e = this.emit('write', { key: fullKey })
      if (e) {
        await e
      }
    }
    return ok
  }

  async forever(key: CacheKey, value: unknown): Promise<void> {
    await this.put(key, value, null)
  }

  async remember<T = unknown>(
    key: CacheKey,
    ttl: CacheTtl,
    callback: () => Promise<T> | T
  ): Promise<T> {
    const existing = await this.get<T>(key)
    if (existing !== null) {
      return existing
    }

    const value = await callback()
    await this.put(key, value, ttl)
    return value
  }

  async rememberForever<T = unknown>(key: CacheKey, callback: () => Promise<T> | T): Promise<T> {
    return this.remember(key, null, callback)
  }

  async many<T = unknown>(keys: readonly CacheKey[]): Promise<Record<string, T | null>> {
    const out: Record<string, T | null> = {}
    for (const key of keys) {
      out[String(key)] = await this.get<T>(key)
    }
    return out
  }

  async putMany(values: Record<string, unknown>, ttl: CacheTtl): Promise<void> {
    await Promise.all(Object.entries(values).map(([k, v]) => this.put(k, v, ttl)))
  }

  /**
   * Laravel-like flexible cache (stale-while-revalidate).
   *
   * - `ttlSeconds`: how long the value is considered fresh
   * - `staleSeconds`: how long the stale value may be served while a refresh happens
   */
  async flexible<T = unknown>(
    key: CacheKey,
    ttlSeconds: number,
    staleSeconds: number,
    callback: () => Promise<T> | T
  ): Promise<T> {
    const fullKey = this.key(key)
    const metaKey = this.flexibleFreshUntilKey(fullKey)
    const now = Date.now()
    const ttlMillis = Math.max(0, ttlSeconds) * 1000
    const staleMillis = Math.max(0, staleSeconds) * 1000

    const [freshUntil, cachedValue] = await Promise.all([
      this.store.get<number>(metaKey),
      this.store.get<T>(fullKey),
    ])

    if (freshUntil !== null && cachedValue !== null) {
      if (now <= freshUntil) {
        const e = this.emit('hit', { key: fullKey })
        if (e) {
          await e
        }
        return cachedValue
      }

      if (now <= freshUntil + staleMillis) {
        const e = this.emit('hit', { key: fullKey })
        if (e) {
          await e
        }
        void this.refreshFlexible(fullKey, metaKey, ttlSeconds, staleSeconds, callback)
        return cachedValue
      }
    }

    const e = this.emit('miss', { key: fullKey })
    if (e) {
      await e
    }
    const value = await callback()
    const totalTtl = ttlSeconds + staleSeconds
    await this.store.put(fullKey, value, totalTtl)
    await this.putMetaKey(metaKey, now + ttlMillis, totalTtl)
    {
      const e = this.emit('write', { key: fullKey })
      if (e) {
        await e
      }
    }
    return value
  }

  private async refreshFlexible<T>(
    fullKey: string,
    metaKey: string,
    ttlSeconds: number,
    staleSeconds: number,
    callback: () => Promise<T> | T
  ): Promise<void> {
    if (this.refreshSemaphore.has(fullKey)) {
      return
    }

    const refreshPromise = this.doRefresh(fullKey, metaKey, ttlSeconds, staleSeconds, callback)
    this.refreshSemaphore.set(fullKey, refreshPromise)

    try {
      await refreshPromise
    } finally {
      this.refreshSemaphore.delete(fullKey)
    }
  }

  private async doRefresh<T>(
    fullKey: string,
    metaKey: string,
    ttlSeconds: number,
    staleSeconds: number,
    callback: () => Promise<T> | T
  ): Promise<void> {
    if (!this.store.lock) {
      return
    }

    const lock = this.store.lock(`flexible:${metaKey}`, Math.max(1, ttlSeconds))
    if (!lock || !(await lock.acquire())) {
      return
    }

    const startTime = Date.now()
    try {
      const timeoutMillis = this.options.refreshTimeout ?? 30000

      const value = await Promise.race([
        Promise.resolve(callback()),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Refresh timeout')), timeoutMillis)
        ),
      ])

      const totalTtl = ttlSeconds + staleSeconds
      const now = Date.now()
      await this.store.put(fullKey, value, totalTtl)
      await this.putMetaKey(metaKey, now + Math.max(0, ttlSeconds) * 1000, totalTtl)
      const e = this.emit('write', { key: fullKey })
      if (e) {
        await e
      }

      this.flexibleStats.refreshCount++
      this.flexibleStats.totalTime += Date.now() - startTime
    } catch {
      this.flexibleStats.refreshFailures++
    } finally {
      await lock.release()
    }
  }

  async pull<T = unknown>(key: CacheKey, defaultValue?: T): Promise<T | null> {
    const value = await this.get<T>(key, defaultValue as T)
    await this.forget(key)
    return value
  }

  async forget(key: CacheKey): Promise<boolean> {
    const fullKey = this.key(key)
    const metaKey = this.flexibleFreshUntilKey(fullKey)
    const ok = await this.store.forget(fullKey)
    await this.forgetMetaKey(metaKey)
    if (ok) {
      const e = this.emit('forget', { key: fullKey })
      if (e) {
        await e
      }
    }
    return ok
  }

  async delete(key: CacheKey): Promise<boolean> {
    return this.forget(key)
  }

  async flush(): Promise<void> {
    await this.store.flush()
    const e = this.emit('flush')
    if (e) {
      await e
    }
  }

  async clear(): Promise<void> {
    return this.flush()
  }

  increment(key: string, value?: number) {
    return this.store.increment(this.key(key), value)
  }

  decrement(key: string, value?: number) {
    return this.store.decrement(this.key(key), value)
  }

  lock(name: string, seconds?: number) {
    return this.store.lock ? this.store.lock(this.key(name), seconds) : undefined
  }

  tags(tags: readonly string[]) {
    if (!isTaggableStore(this.store)) {
      throw new Error('This cache store does not support tags.')
    }
    return new CacheRepository(new TaggedStore(this.store, tags), this.options)
  }

  /**
   * Get the underlying store
   */
  getStore(): CacheStore {
    return this.store
  }
}

class TaggedStore implements CacheStore {
  constructor(
    private readonly store: CacheStore & {
      flushTags: (tags: readonly string[]) => Promise<void>
      tagKey: (key: string, tags: readonly string[]) => string
      tagIndexAdd: (tags: readonly string[], taggedKey: string) => void
    },
    private readonly tags: readonly string[]
  ) {}

  private tagged(key: CacheKey): string {
    return this.store.tagKey(normalizeCacheKey(key), this.tags)
  }

  async get<T = unknown>(key: CacheKey) {
    return this.store.get<T>(this.tagged(key))
  }

  async put(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<void> {
    const taggedKey = this.tagged(key)
    await this.store.put(taggedKey, value, ttl)
    this.store.tagIndexAdd(this.tags, taggedKey)
  }

  async add(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<boolean> {
    const taggedKey = this.tagged(key)
    const ok = await this.store.add(taggedKey, value, ttl)
    if (ok) {
      this.store.tagIndexAdd(this.tags, taggedKey)
    }
    return ok
  }

  async forget(key: CacheKey): Promise<boolean> {
    return this.store.forget(this.tagged(key))
  }

  async flush(): Promise<void> {
    return this.store.flushTags(this.tags)
  }

  async increment(key: CacheKey, value?: number): Promise<number> {
    const taggedKey = this.tagged(key)
    const next = await this.store.increment(taggedKey, value)
    this.store.tagIndexAdd(this.tags, taggedKey)
    return next
  }

  async decrement(key: CacheKey, value?: number): Promise<number> {
    const taggedKey = this.tagged(key)
    const next = await this.store.decrement(taggedKey, value)
    this.store.tagIndexAdd(this.tags, taggedKey)
    return next
  }

  lock(name: string, seconds?: number): CacheLock | undefined {
    return this.store.lock ? this.store.lock(this.tagged(name), seconds) : undefined
  }
}
