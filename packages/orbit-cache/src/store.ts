import type { CacheLock } from './locks'
import type { CacheKey, CacheTtl, CacheValue } from './types'

export interface CacheStore {
  get<T = unknown>(key: CacheKey): Promise<CacheValue<T>>
  put(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<void>
  add(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<boolean>
  forget(key: CacheKey): Promise<boolean>
  flush(): Promise<void>

  increment(key: CacheKey, value?: number): Promise<number>
  decrement(key: CacheKey, value?: number): Promise<number>

  lock?(name: string, seconds?: number): CacheLock
}

export interface TaggableStore {
  flushTags(tags: readonly string[]): Promise<void>
  tagKey(key: string, tags: readonly string[]): string
  tagIndexAdd(tags: readonly string[], taggedKey: string): void
  tagIndexRemove(taggedKey: string): void
}

export function isTaggableStore(store: CacheStore): store is CacheStore & TaggableStore {
  return (
    typeof (store as Partial<TaggableStore>).flushTags === 'function' &&
    typeof (store as Partial<TaggableStore>).tagKey === 'function' &&
    typeof (store as Partial<TaggableStore>).tagIndexAdd === 'function' &&
    typeof (store as Partial<TaggableStore>).tagIndexRemove === 'function'
  )
}
