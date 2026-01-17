import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import { CacheManager } from './CacheManager'
import type { CacheEventMode, CacheEvents } from './CacheRepository'
import type { CacheStore } from './store'
import { FileStore } from './stores/FileStore'
import { MemoryStore } from './stores/MemoryStore'
import { NullStore } from './stores/NullStore'
import { RedisStore } from './stores/RedisStore'
import type { CacheTtl } from './types'

export * from './CacheManager'
export * from './CacheRepository'
export * from './locks'
export * from './RateLimiter'
export * from './store'
export * from './stores/FileStore'
export * from './stores/MemoryStore'
export * from './stores/NullStore'
export * from './stores/RedisStore'
export * from './types'

/**
 * Interface for a low-level cache storage provider.
 *
 * Use this to implement custom storage backends that can be plugged into Stasis.
 *
 * @public
 * @since 3.0.0
 */
export interface CacheStorageProvider {
  /**
   * Retrieve an item from the cache.
   *
   * @param key - The unique cache key.
   * @returns The cached value, or null if not found.
   */
  get<T = unknown>(key: string): Promise<T | null>

  /**
   * Store an item in the cache.
   *
   * @param key - The unique cache key.
   * @param value - The value to store.
   * @param ttl - Time-to-live in seconds.
   */
  set(key: string, value: unknown, ttl?: number): Promise<void>

  /**
   * Delete an item from the cache.
   *
   * @param key - The cache key to remove.
   */
  delete(key: string): Promise<void>

  /**
   * Clear all items from the cache storage.
   */
  clear(): Promise<void>
}

/** @deprecated Use CacheStorageProvider instead */
export type CacheProvider = CacheStorageProvider

/**
 * High-level application contract for caching operations.
 *
 * This is the public API exposed to the rest of the application via
 * the request context or service container.
 *
 * @public
 * @since 3.0.0
 */
export interface CacheService {
  /**
   * Retrieve an item from the cache.
   *
   * @param key - The unique cache key.
   * @returns The cached value, or null if not found or expired.
   */
  get<T = unknown>(key: string): Promise<T | null>

  /**
   * Store an item in the cache with an optional TTL.
   *
   * @param key - The unique cache key.
   * @param value - The value to store.
   * @param ttl - Time-to-live in seconds or an absolute Date.
   */
  set(key: string, value: unknown, ttl?: CacheTtl): Promise<void>

  /**
   * Determine if an item exists in the cache and is not expired.
   *
   * @param key - The cache key to check.
   * @returns True if the item exists and is valid.
   */
  has(key: string): Promise<boolean>

  /**
   * Store an item in the cache only if it doesn't already exist.
   *
   * @param key - The unique cache key.
   * @param value - The value to store.
   * @param ttl - Time-to-live.
   * @returns True if the item was added, false otherwise.
   */
  add(key: string, value: unknown, ttl?: CacheTtl): Promise<boolean>

  /**
   * Remove an item from the cache.
   *
   * @param key - The cache key to remove.
   * @returns True if the item existed and was removed.
   */
  delete(key: string): Promise<boolean>

  /**
   * Retrieve an item from the cache and then delete it.
   *
   * @param key - The cache key.
   * @param defaultValue - Optional value to return if not found.
   * @returns The cached value or the default.
   */
  pull<T = unknown>(key: string, defaultValue?: T): Promise<T | null>

  /**
   * Get an item from the cache, or execute the given callback and store the result.
   *
   * @param key - The cache key.
   * @param ttl - Time-to-live if the item needs to be fetched.
   * @param callback - Closure to execute if the item is missing.
   * @returns The cached or fetched value.
   */
  remember<T>(key: string, ttl: CacheTtl, callback: () => Promise<T> | T): Promise<T>

  /**
   * Store an item in the cache indefinitely.
   *
   * @param key - The unique cache key.
   * @param callback - Closure to execute if the item is missing.
   * @returns The cached or fetched value.
   */
  rememberForever<T>(key: string, callback: () => Promise<T> | T): Promise<T>

  /**
   * Clear the entire cache.
   */
  clear(): Promise<void>
}

/**
 * A standard in-memory implementation of `CacheStorageProvider`.
 *
 * @public
 * @since 3.0.0
 */
export class MemoryCacheProvider implements CacheStorageProvider {
  private store = new MemoryStore()

  async get<T = unknown>(key: string): Promise<T | null> {
    return this.store.get<T>(key)
  }

  async set(key: string, value: unknown, ttl = 60): Promise<void> {
    await this.store.put(key, value, ttl)
  }

  async delete(key: string): Promise<void> {
    await this.store.forget(key)
  }

  async clear(): Promise<void> {
    await this.store.flush()
  }
}

/**
 * Configuration for an individual cache store instance.
 *
 * @public
 * @since 3.0.0
 */
export type OrbitCacheStoreConfig =
  /** Simple in-memory cache using a Map. */
  | { driver: 'memory'; maxItems?: number }
  /** Local file system based cache. */
  | { driver: 'file'; directory: string }
  /** Redis-backed distributed cache. */
  | { driver: 'redis'; connection?: string; prefix?: string }
  /** No-op cache that stores nothing. */
  | { driver: 'null' }
  /** Use a custom implementation of the low-level `CacheStore` interface. */
  | { driver: 'custom'; store: CacheStore }
  /** Use an implementation of the `CacheStorageProvider` interface. */
  | { driver: 'provider'; provider: CacheStorageProvider }

/**
 * Options for configuring the `OrbitStasis` cache orbit.
 *
 * @public
 * @since 3.0.0
 */
export interface OrbitCacheOptions {
  /** The key used to expose the cache manager in the request context. @default 'cache' */
  exposeAs?: string
  /** The name of the default store to use for proxy methods. @default 'memory' */
  default?: string
  /** Global prefix for all cache keys across all stores. */
  prefix?: string
  /** Default time-to-live for cache entries if not specified. @default 60 */
  defaultTtl?: CacheTtl
  /** Map of named cache stores and their configurations. */
  stores?: Record<string, OrbitCacheStoreConfig>
  /** How to handle cache events (hit/miss/etc) */
  eventsMode?: CacheEventMode
  /** Whether to throw if an event listener fails. @default false */
  throwOnEventError?: boolean
  /** Custom error handler for cache events. */
  onEventError?: (error: unknown, event: keyof CacheEvents, payload: { key?: string }) => void

  /** @deprecated Use stores mapping with 'provider' driver. */
  provider?: CacheStorageProvider
  /** @deprecated Use defaultTtl. */
  defaultTTL?: number
}

function resolveStoreConfig(core: PlanetCore, options?: OrbitCacheOptions): OrbitCacheOptions {
  if (options) {
    return options
  }
  if (core.config.has('cache')) {
    return core.config.get<OrbitCacheOptions>('cache')
  }
  return {}
}

function createStoreFactory(config: OrbitCacheOptions): (name: string) => CacheStore {
  const stores = config.stores ?? {}
  const defaultSeconds = typeof config.defaultTtl === 'number' ? config.defaultTtl : 60

  return (name: string) => {
    const storeConfig = stores[name]
    const hasExplicitStores = Object.keys(stores).length > 0

    if (!storeConfig) {
      if (name === 'memory') {
        return new MemoryStore()
      }
      if (name === 'null') {
        return new NullStore()
      }
      if (hasExplicitStores) {
        throw new Error(`Cache store '${name}' is not defined.`)
      }
      return new MemoryStore()
    }

    if (storeConfig.driver === 'memory') {
      return new MemoryStore({ maxItems: storeConfig.maxItems })
    }

    if (storeConfig.driver === 'file') {
      return new FileStore({ directory: storeConfig.directory })
    }

    if (storeConfig.driver === 'redis') {
      return new RedisStore({ connection: storeConfig.connection, prefix: storeConfig.prefix })
    }

    if (storeConfig.driver === 'null') {
      return new NullStore()
    }

    if (storeConfig.driver === 'custom') {
      return storeConfig.store
    }

    if (storeConfig.driver === 'provider') {
      const provider = storeConfig.provider
      if (!provider) {
        throw new Error(`Cache store '${name}' is missing a provider.`)
      }
      return {
        get: (key) => provider.get(key),
        put: (key, value, ttl) =>
          provider.set(key, value, typeof ttl === 'number' ? ttl : defaultSeconds),
        add: async (key, value, ttl) => {
          const existing = await provider.get(key)
          if (existing !== null) {
            return false
          }
          await provider.set(key, value, typeof ttl === 'number' ? ttl : defaultSeconds)
          return true
        },
        forget: async (key) => {
          await provider.delete(key)
          return true
        },
        flush: () => provider.clear(),
        increment: async (key, value = 1) => {
          const current = await provider.get<number>(key)
          const next = (current ?? 0) + value
          await provider.set(key, next, defaultSeconds)
          return next
        },
        decrement: async (key, value = 1) => {
          const current = await provider.get<number>(key)
          const next = (current ?? 0) - value
          await provider.set(key, next, defaultSeconds)
          return next
        },
      } satisfies CacheStore
    }

    throw new Error(`Unsupported cache driver '${(storeConfig as { driver?: string }).driver}'.`)
  }
}

/**
 * OrbitStasis is the core caching module for Gravito.
 *
 * It provides a robust, multi-store cache management system with support for:
 * - Pluggable backends (Memory, File, Redis).
 * - Advanced features like tags, distributed locks, and atomic increments.
 * - Stale-while-revalidate (flexible) caching strategy.
 * - Integrated rate limiting.
 *
 * @example
 * ```typescript
 * const stasis = new OrbitStasis({
 *   default: 'redis',
 *   stores: {
 *     redis: { driver: 'redis', connection: 'default' }
 *   }
 * });
 * core.addOrbit(stasis);
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class OrbitStasis implements GravitoOrbit {
  private manager: CacheManager | undefined

  constructor(private options?: OrbitCacheOptions) { }

  install(core: PlanetCore): void {
    const resolvedConfig = resolveStoreConfig(core, this.options)
    const exposeAs = resolvedConfig.exposeAs ?? 'cache'
    const defaultStore = resolvedConfig.default ?? (resolvedConfig.provider ? 'default' : 'memory')
    const defaultTtl =
      resolvedConfig.defaultTtl ??
      (typeof resolvedConfig.defaultTTL === 'number' ? resolvedConfig.defaultTTL : undefined) ??
      60
    const prefix = resolvedConfig.prefix ?? ''

    const logger = core.logger
    logger.info(`[OrbitCache] Initializing Cache (Exposed as: ${exposeAs})`)

    const events: CacheEvents = {
      hit: (key) => core.hooks.doAction('cache:hit', { key }),
      miss: (key) => core.hooks.doAction('cache:miss', { key }),
      write: (key) => core.hooks.doAction('cache:write', { key }),
      forget: (key) => core.hooks.doAction('cache:forget', { key }),
      flush: () => core.hooks.doAction('cache:flush', {}),
    }

    const onEventError =
      resolvedConfig.onEventError ??
      ((error: unknown, event: keyof CacheEvents, payload: { key?: string }) => {
        const key = payload.key ? ` (key: ${payload.key})` : ''
        logger.error(`[OrbitCache] cache event '${event}' failed${key}`, error)
      })

    const stores =
      resolvedConfig.stores ??
      (resolvedConfig.provider
        ? { default: { driver: 'provider' as const, provider: resolvedConfig.provider } }
        : undefined)

    const manager = new CacheManager(
      createStoreFactory({ ...resolvedConfig, stores }),
      {
        default: defaultStore,
        prefix,
        defaultTtl,
      },
      events,
      {
        mode: resolvedConfig.eventsMode ?? 'async',
        throwOnError: resolvedConfig.throwOnEventError,
        onError: onEventError,
      }
    )

    this.manager = manager

    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      c.set(exposeAs, manager)
      return await next()
    })

    core.container.instance(exposeAs, manager)
    core.hooks.doAction('cache:init', manager)
  }

  getCache(): CacheManager {
    if (!this.manager) {
      throw new Error('OrbitCache not installed yet.')
    }
    return this.manager
  }
}

export default function orbitCache(
  core: PlanetCore,
  options: OrbitCacheOptions = {}
): CacheManager {
  const orbit = new OrbitStasis(options)
  orbit.install(core)
  return orbit.getCache()
}

/** @deprecated Use OrbitStasis instead */
export const OrbitCache = OrbitStasis

// Module augmentation for GravitoVariables (abstraction layer)
declare module '@gravito/core' {
  interface GravitoVariables {
    /** Cache manager for caching operations */
    cache?: CacheManager
  }
}
