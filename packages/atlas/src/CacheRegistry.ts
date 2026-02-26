import type { CacheInterface } from './types'

/**
 * CacheRegistry - Internal storage for the global query cache.
 *
 * Separated from the DB facade to avoid circular dependencies between
 * DB and QueryBuilder.
 */
export class CacheRegistry {
  private static cache?: CacheInterface

  /**
   * Sets the global cache provider.
   */
  static setCache(cache: CacheInterface): void {
    this.cache = cache
  }

  /**
   * Retrieves the active global cache provider.
   */
  static getCache(): CacheInterface | undefined {
    return this.cache
  }
}
