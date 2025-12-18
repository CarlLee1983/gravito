import { type CacheEventMode, type CacheEvents, CacheRepository } from './CacheRepository'
import type { CacheStore } from './store'
import type { CacheTtl } from './types'

export type StoreConfig =
  | { driver: 'memory'; maxItems?: number }
  | { driver: 'file'; directory: string }
  | { driver: 'null' }
  // legacy adapter: allow plugging any provider that matches old interface
  | { driver: 'provider' }

export type CacheConfig = {
  default?: string
  prefix?: string
  defaultTtl?: CacheTtl
  stores?: Record<string, StoreConfig & { provider?: CacheStore }>
}

export class CacheManager {
  private stores = new Map<string, CacheRepository>()

  constructor(
    private readonly storeFactory: (name: string) => CacheStore,
    private readonly config: CacheConfig = {},
    private readonly events?: CacheEvents,
    private readonly eventOptions?: {
      mode?: CacheEventMode
      throwOnError?: boolean
      onError?: (error: unknown, event: keyof CacheEvents, payload: { key?: string }) => void
    }
  ) {}

  store(name?: string): CacheRepository {
    const storeName = name ?? this.config.default ?? 'memory'
    const existing = this.stores.get(storeName)
    if (existing) {
      return existing
    }

    const repo = new CacheRepository(this.storeFactory(storeName), {
      prefix: this.config.prefix,
      defaultTtl: this.config.defaultTtl,
      events: this.events,
      eventsMode: this.eventOptions?.mode,
      throwOnEventError: this.eventOptions?.throwOnError,
      onEventError: this.eventOptions?.onError,
    })
    this.stores.set(storeName, repo)
    return repo
  }

  // Laravel-like proxy methods (default store)
  get<T = unknown>(key: string, defaultValue?: T | (() => T | Promise<T>)) {
    return this.store().get<T>(key, defaultValue)
  }
  has(key: string) {
    return this.store().has(key)
  }
  missing(key: string) {
    return this.store().missing(key)
  }
  put(key: string, value: unknown, ttl: CacheTtl) {
    return this.store().put(key, value, ttl)
  }
  set(key: string, value: unknown, ttl?: CacheTtl) {
    return this.store().set(key, value, ttl)
  }
  add(key: string, value: unknown, ttl?: CacheTtl) {
    return this.store().add(key, value, ttl)
  }
  forever(key: string, value: unknown) {
    return this.store().forever(key, value)
  }
  remember<T = unknown>(key: string, ttl: CacheTtl, callback: () => Promise<T> | T) {
    return this.store().remember<T>(key, ttl, callback)
  }
  rememberForever<T = unknown>(key: string, callback: () => Promise<T> | T) {
    return this.store().rememberForever<T>(key, callback)
  }
  many<T = unknown>(keys: readonly string[]) {
    return this.store().many<T>(keys)
  }
  putMany(values: Record<string, unknown>, ttl: CacheTtl) {
    return this.store().putMany(values, ttl)
  }
  flexible<T = unknown>(
    key: string,
    ttlSeconds: number,
    staleSeconds: number,
    callback: () => Promise<T> | T
  ) {
    return this.store().flexible<T>(key, ttlSeconds, staleSeconds, callback)
  }
  pull<T = unknown>(key: string, defaultValue?: T) {
    return this.store().pull<T>(key, defaultValue)
  }
  forget(key: string) {
    return this.store().forget(key)
  }
  delete(key: string) {
    return this.store().delete(key)
  }
  flush() {
    return this.store().flush()
  }
  clear() {
    return this.store().clear()
  }
  increment(key: string, value?: number) {
    return this.store().increment(key, value)
  }
  decrement(key: string, value?: number) {
    return this.store().decrement(key, value)
  }
  lock(name: string, seconds?: number) {
    return this.store().lock(name, seconds)
  }
  tags(tags: readonly string[]) {
    return this.store().tags(tags)
  }
}
