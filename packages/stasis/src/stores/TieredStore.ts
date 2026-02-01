import type { CacheStore } from '../store'
import type { CacheKey, CacheTtl } from '../types'

/**
 * A multi-level cache store that coordinates access between a fast local L1 cache
 * and a persistent remote L2 cache.
 *
 * It implements the read-through and write-through patterns to ensure that the
 * most frequently accessed data remains in the fastest storage tier.
 *
 * @public
 * @since 3.2.0
 *
 * @example
 * ```typescript
 * const store = new TieredStore(new MemoryStore(), new RedisStore());
 * await store.put('key', 'value', 3600);
 * ```
 */
export class TieredStore implements CacheStore {
  /**
   * Initializes a new TieredStore.
   *
   * @param local - The L1 cache store (usually MemoryStore).
   * @param remote - The L2 cache store (usually RedisStore or FileStore).
   */
  constructor(
    private readonly local: CacheStore,
    private readonly remote: CacheStore
  ) {}

  async get<T = unknown>(key: CacheKey): Promise<T | null> {
    const localValue = await this.local.get<T>(key)
    if (localValue !== null) {
      return localValue
    }

    const remoteValue = await this.remote.get<T>(key)
    if (remoteValue !== null) {
      // Backfill L1
      const ttl = this.remote.ttl ? await this.remote.ttl(key) : null
      await this.local.put(key, remoteValue, ttl)
    }

    return remoteValue
  }

  async put(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<void> {
    await Promise.all([this.local.put(key, value, ttl), this.remote.put(key, value, ttl)])
  }

  async add(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<boolean> {
    // We prioritize remote for 'add' as it's the source of truth for atomicity
    const ok = await this.remote.add(key, value, ttl)
    if (ok) {
      await this.local.put(key, value, ttl)
    }
    return ok
  }

  async forget(key: CacheKey): Promise<boolean> {
    const [localOk, remoteOk] = await Promise.all([this.local.forget(key), this.remote.forget(key)])
    return localOk || remoteOk
  }

  async flush(): Promise<void> {
    await Promise.all([this.local.flush(), this.remote.flush()])
  }

  async increment(key: CacheKey, value = 1): Promise<number> {
    const next = await this.remote.increment(key, value)
    // Sync to local
    const ttl = this.remote.ttl ? await this.remote.ttl(key) : null
    await this.local.put(key, next, ttl)
    return next
  }

  async decrement(key: CacheKey, value = 1): Promise<number> {
    return this.increment(key, -value)
  }

  async ttl(key: CacheKey): Promise<number | null> {
    if (this.remote.ttl) {
      return this.remote.ttl(key)
    }
    return this.local.ttl ? this.local.ttl(key) : null
  }
}
