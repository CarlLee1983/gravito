/**
 * Lightweight LRU cache for compiled SQL strings.
 *
 * Prevents re-compiling the same query structures over and over.
 * Uses lru-cache for O(1) eviction performance and proper LRU semantics.
 */
export declare class SQLCache {
  private cache
  constructor(maxSize?: number)
  get(key: string): string | undefined
  set(key: string, value: string): void
  clear(): void
}
export declare const sqlCache: SQLCache
