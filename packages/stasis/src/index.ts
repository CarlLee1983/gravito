import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import { CacheManager } from './CacheManager'
import type { CacheEventMode, CacheEvents } from './CacheRepository'

type HealthRegistry = {
  register: (name: string, fn: () => Promise<{ status: string; details?: Record<string, unknown> }>) => void
}
import { MarkovPredictor } from './prediction/AccessPredictor'
import type { CacheStore } from './store'
import { CircuitBreakerStore } from './stores/CircuitBreakerStore'
import { FileStore } from './stores/FileStore'
import { MemoryStore } from './stores/MemoryStore'
import { NullStore } from './stores/NullStore'
import { PredictiveStore } from './stores/PredictiveStore'
import { RedisStore } from './stores/RedisStore'
import { TieredStore } from './stores/TieredStore'
import type { CacheTtl } from './types'
import { StasisError } from './errors/StasisError'
import { StasisErrorCodes } from './errors/codes'

export * from './CacheManager'
export * from './CacheRepository'
export * from './locks'
export * from './prediction/AccessPredictor'
export * from './RateLimiter'
export * from './store'
export * from './stores/CircuitBreakerStore'
export * from './stores/FileStore'
export * from './stores/MemoryStore'
export * from './stores/NullStore'
export * from './stores/PredictiveStore'
export * from './stores/RedisStore'
export * from './stores/TieredStore'
export { StasisError } from './errors/StasisError'
export { StasisErrorCodes, type StasisErrorCode } from './errors/codes'
export * from './types'

/**
 * Interface for a low-level cache storage provider.
 *
 * Use this to implement custom storage backends that can be plugged into Stasis.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * class MyProvider implements CacheStorageProvider {
 *   async get(key) { ... }
 *   async set(key, value, ttl) { ... }
 *   async delete(key) { ... }
 *   async clear() { ... }
 * }
 * ```
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
   * Retrieves an item from the cache.
   *
   * @param key - The unique identifier for the cached item.
   * @returns The cached value, or `null` if the item is missing or has expired.
   *
   * @example
   * const user = await cache.get<User>('user:123');
   */
  get<T = unknown>(key: string): Promise<T | null>

  /**
   * Stores an item in the cache with an optional time-to-live.
   *
   * @param key - The unique identifier for the item.
   * @param value - The value to store (must be serializable).
   * @param ttl - Time-to-live in seconds or as a `Date` object. If omitted, uses the default TTL.
   *
   * @example
   * await cache.set('key', 'value', 60);
   */
  set(key: string, value: unknown, ttl?: CacheTtl): Promise<void>

  /**
   * Checks if an item exists in the cache and has not expired.
   *
   * @param key - The cache key to check.
   * @returns `true` if the item exists and is valid, `false` otherwise.
   *
   * @example
   * if (await cache.has('lock:processing')) {
   *   return;
   * }
   */
  has(key: string): Promise<boolean>

  /**
   * Stores an item in the cache only if it does not already exist.
   *
   * @param key - The unique identifier for the item.
   * @param value - The value to store.
   * @param ttl - Time-to-live in seconds or as a `Date` object.
   * @returns `true` if the item was added, `false` if it already existed.
   *
   * @example
   * const acquired = await cache.add('lock:job:1', true, 60);
   */
  add(key: string, value: unknown, ttl?: CacheTtl): Promise<boolean>

  /**
   * Removes an item from the cache.
   *
   * @param key - The cache key to remove.
   * @returns `true` if the item was successfully removed, `false` otherwise.
   *
   * @example
   * await cache.delete('user:session:1');
   */
  delete(key: string): Promise<boolean>

  /**
   * Retrieves an item from the cache and then removes it.
   *
   * This operation is atomic depending on the underlying driver support.
   *
   * @param key - The cache key to pull.
   * @param defaultValue - Optional value to return if the item is missing.
   * @returns The cached value (before deletion) or the default value.
   *
   * @example
   * const otp = await cache.pull('otp:user:1');
   */
  pull<T = unknown>(key: string, defaultValue?: T): Promise<T | null>

  /**
   * Retrieves an item from the cache, or executes the callback and stores the result.
   *
   * This is a "read-through" cache pattern.
   *
   * @param key - The cache key.
   * @param ttl - Time-to-live to use if the item is fetched from the callback.
   * @param callback - Function to retrieve the value if missing. Can be async.
   * @returns The cached or newly fetched value.
   *
   * @example
   * const user = await cache.remember('user:1', 300, async () => {
   *   return await db.findUser(1);
   * });
   */
  remember<T>(key: string, ttl: CacheTtl, callback: () => Promise<T> | T): Promise<T>

  /**
   * Stores an item in the cache indefinitely (or until manually removed).
   *
   * @param key - The unique cache key.
   * @param callback - Function to retrieve the value if missing.
   * @returns The cached or fetched value.
   *
   * @example
   * const settings = await cache.rememberForever('app:settings', () => loadSettings());
   */
  rememberForever<T>(key: string, callback: () => Promise<T> | T): Promise<T>

  /**
   * Clears all items from the cache.
   *
   * @warning This will wipe the entire cache storage for the current context.
   *
   * @example
   * await cache.clear();
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
  /** Multi-level cache. */
  | { driver: 'tiered'; local: string; remote: string }
  /** Predictive cache that prefetches keys based on usage patterns. */
  | { driver: 'predictive'; inner: string; maxNodes?: number }
  /** Fault tolerance layer. */
  | {
      driver: 'circuit-breaker'
      primary: string
      maxFailures?: number
      resetTimeout?: number
      fallback?: string
    }

/**
 * Options for configuring the `OrbitStasis` cache orbit.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const options: OrbitCacheOptions = {
 *   default: 'redis',
 *   stores: {
 *     redis: { driver: 'redis', connection: 'default' }
 *   }
 * };
 * ```
 */
export interface OrbitCacheOptions {
  /** The key used to expose the cache manager in the request context. @defaultValue 'cache' */
  exposeAs?: string
  /** The name of the default store to use for proxy methods. @defaultValue 'memory' */
  default?: string
  /** Global prefix for all cache keys across all stores. */
  prefix?: string
  /** Default time-to-live for cache entries if not specified. @defaultValue 60 */
  defaultTtl?: CacheTtl
  /** Map of named cache stores and their configurations. */
  stores?: Record<string, OrbitCacheStoreConfig>
  /** How to handle cache events (hit/miss/etc) */
  eventsMode?: CacheEventMode
  /** Whether to throw if an event listener fails. @defaultValue false */
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
        throw new StasisError(404, StasisErrorCodes.STORE_NOT_FOUND, {
          message: `Cache store '${name}' is not defined.`,
        })
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
        throw new StasisError(500, StasisErrorCodes.STORE_MISSING_PROVIDER, {
          message: `Cache store '${name}' is missing a provider.`,
        })
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

    if (storeConfig.driver === 'tiered') {
      const factory = createStoreFactory(config)
      return new TieredStore(factory(storeConfig.local), factory(storeConfig.remote))
    }

    if (storeConfig.driver === 'predictive') {
      const factory = createStoreFactory(config)
      return new PredictiveStore(factory(storeConfig.inner), {
        predictor: new MarkovPredictor({ maxNodes: storeConfig.maxNodes }),
      })
    }

    if (storeConfig.driver === 'circuit-breaker') {
      const factory = createStoreFactory(config)
      const primary = factory(storeConfig.primary)
      const fallback = storeConfig.fallback ? factory(storeConfig.fallback) : undefined
      return new CircuitBreakerStore(primary, {
        maxFailures: storeConfig.maxFailures,
        resetTimeout: storeConfig.resetTimeout,
        fallback,
      })
    }

    throw new StasisError(400, StasisErrorCodes.UNSUPPORTED_DRIVER, {
      message: `Unsupported cache driver '${(storeConfig as { driver?: string }).driver}'.`,
    })
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

  constructor(private options?: OrbitCacheOptions) {}

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

    // Health check registration (INTG-04)
    const health = core.container.make('health') as HealthRegistry | null | undefined
    if (health) {
      const cacheManager = manager
      health.register('stasis', async () => ({
        status: cacheManager ? 'healthy' : 'unhealthy',
        details: {
          driver: resolvedConfig.default ?? 'memory',
        },
      }))
    }

    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      c.set(exposeAs, manager)
      return await next()
    })

    core.container.instance(exposeAs, manager)
    core.hooks.doAction('cache:init', manager)
  }

  getCache(): CacheManager {
    if (!this.manager) {
      throw new StasisError(500, StasisErrorCodes.ORBIT_NOT_INSTALLED, {
        message: 'OrbitCache not installed yet.',
      })
    }
    return this.manager
  }
}

/**
 * Helper function to create and install the OrbitStasis orbit.
 *
 * @param core - Gravito PlanetCore instance.
 * @param options - Cache configuration options.
 * @returns Initialized CacheManager.
 *
 * @example
 * ```typescript
 * const cache = orbitCache(core, { default: 'memory' });
 * ```
 */
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
