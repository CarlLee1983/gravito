import type { CacheLock } from './locks'
import type { CacheStore } from './store'
import { type CacheKey, type CacheTtl, normalizeCacheKey } from './types'

/**
 * A CacheStore wrapper that prefixes keys with tag-based namespacing.
 *
 * Used internally by CacheRepository.tags() to create isolated key spaces
 * for collective cache operations (e.g., flushing all keys with a given tag).
 *
 * @internal
 */
export class TaggedStore implements CacheStore {
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
