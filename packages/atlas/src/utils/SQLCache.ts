/**
 * Lightweight LRU-like cache for compiled SQL strings.
 *
 * Prevents re-compiling the same query structures over and over.
 */
export class SQLCache {
  private cache = new Map<string, string>()
  private maxSize: number

  constructor(maxSize = 1000) {
    this.maxSize = maxSize
  }

  get(key: string): string | undefined {
    const value = this.cache.get(key)
    if (value) {
      // Refresh order
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: string, value: string): void {
    if (this.cache.size >= this.maxSize) {
      // Simple eviction: remove the first (oldest) entry
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }

  clear(): void {
    this.cache.clear()
  }
}

export const sqlCache = new SQLCache()
