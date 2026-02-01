import type { CacheLock } from '../locks'
import { type AccessPredictor, MarkovPredictor } from '../prediction/AccessPredictor'
import type { CacheStore } from '../store'
import type { CacheKey, CacheTtl, CacheValue } from '../types'

/**
 * A CacheStore wrapper that predicts usage patterns and prefetches data.
 *
 * This store observes access patterns (A -> B) and when A is requested,
 * automatically attempts to 'touch' B in the underlying store.
 *
 * If the underlying store is a TieredStore, this effectively promotes B
 * from the remote core (e.g. Redis) to the local cache (e.g. Memory)
 * before it is explicitly requested, reducing latency.
 */
export class PredictiveStore implements CacheStore {
  private predictor: AccessPredictor

  constructor(
    private store: CacheStore,
    options: { predictor?: AccessPredictor } = {}
  ) {
    this.predictor = options.predictor ?? new MarkovPredictor()
  }

  async get<T = unknown>(key: CacheKey): Promise<CacheValue<T>> {
    // 1. Record the access to learn patterns
    this.predictor.record(key)

    // 2. Predict likely next keys
    const candidates = this.predictor.predict(key)

    // 3. Prefetch candidates in background
    if (candidates.length > 0) {
      // We use 'void' to explicitly ignore the promise (fire-and-forget)
      // This triggers the underlying store's get(), which for TieredStore
      // will cause L2 -> L1 promotion if found.
      void Promise.all(candidates.map((k) => this.store.get(k).catch(() => {})))
    }

    // 4. Return the requested value
    return this.store.get<T>(key)
  }

  async put(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<void> {
    return this.store.put(key, value, ttl)
  }

  async add(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<boolean> {
    return this.store.add(key, value, ttl)
  }

  async forget(key: CacheKey): Promise<boolean> {
    return this.store.forget(key)
  }

  async flush(): Promise<void> {
    if (typeof this.predictor.reset === 'function') {
      this.predictor.reset()
    }
    return this.store.flush()
  }

  async increment(key: CacheKey, value?: number): Promise<number> {
    return this.store.increment(key, value)
  }

  async decrement(key: CacheKey, value?: number): Promise<number> {
    return this.store.decrement(key, value)
  }

  lock(name: string, seconds?: number): CacheLock | undefined {
    return this.store.lock ? this.store.lock(name, seconds) : undefined
  }

  async ttl(key: CacheKey): Promise<number | null> {
    return this.store.ttl ? this.store.ttl(key) : null
  }
}
