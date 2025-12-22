import type { GravitoOrbit, PlanetCore } from 'gravito-core'
import { CacheManager } from './CacheManager'
import type { CacheEventMode, CacheEvents } from './CacheRepository'
import type { CacheStore } from './store'
import { FileStore } from './stores/FileStore'
import { MemoryStore } from './stores/MemoryStore'
import { NullStore } from './stores/NullStore'
import { RedisStore } from './stores/RedisStore'
import type { CacheTtl } from './types'

type OrbitCacheContext = { set: (key: string, value: unknown) => void }
type OrbitCacheNext = () => Promise<void>

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

export interface CacheProvider {
  get<T = unknown>(key: string): Promise<T | null>
  set(key: string, value: unknown, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

export interface CacheService {
  get<T = unknown>(key: string): Promise<T | null>
  set(key: string, value: unknown, ttl?: CacheTtl): Promise<void>
  delete(key: string): Promise<boolean>
  clear(): Promise<void>
  remember<T>(key: string, ttl: CacheTtl, callback: () => Promise<T> | T): Promise<T>
}

export class MemoryCacheProvider implements CacheProvider {
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

export type OrbitCacheStoreConfig =
  | { driver: 'memory'; maxItems?: number }
  | { driver: 'file'; directory: string }
  | { driver: 'redis'; connection?: string; prefix?: string }
  | { driver: 'null' }
  | { driver: 'custom'; store: CacheStore }
  | { driver: 'provider'; provider: CacheProvider }

export interface OrbitCacheOptions {
  exposeAs?: string // Default: 'cache'
  default?: string // Default store name
  prefix?: string
  defaultTtl?: CacheTtl
  stores?: Record<string, OrbitCacheStoreConfig>
  eventsMode?: CacheEventMode // Default: 'async' (low-overhead)
  throwOnEventError?: boolean // Useful for debug when using sync mode
  onEventError?: (error: unknown, event: keyof CacheEvents, payload: { key?: string }) => void

  // Legacy options
  provider?: CacheProvider
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

export class OrbitCache implements GravitoOrbit {
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

    core.adapter.use('*', async (c: OrbitCacheContext, next: OrbitCacheNext) => {
      c.set(exposeAs, manager)
      await next()
      return undefined
    })

    core.services.set(exposeAs, manager)
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
  const orbit = new OrbitCache(options)
  orbit.install(core)
  return orbit.getCache()
}

// Module augmentation for GravitoVariables (abstraction layer)
declare module 'gravito-core' {
  interface GravitoVariables {
    /** Cache manager for caching operations */
    cache?: CacheManager
  }
}
