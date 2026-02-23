/**
 * Lightweight LRU cache for compiled SQL strings.
 *
 * Prevents re-compiling the same query structures over and over.
 * Uses lru-cache for O(1) eviction performance and proper LRU semantics.
 */

import { LRUCache } from 'lru-cache'

export class SQLCache {
  private cache: LRUCache<string, string>

  constructor(maxSize = 1000) {
    this.cache = new LRUCache<string, string>({
      max: maxSize,
      updateAgeOnGet: true,
    })
  }

  get(key: string): string | undefined {
    return this.cache.get(key)
  }

  set(key: string, value: string): void {
    this.cache.set(key, value)
  }

  clear(): void {
    this.cache.clear()
  }
}

export const sqlCache = new SQLCache()
