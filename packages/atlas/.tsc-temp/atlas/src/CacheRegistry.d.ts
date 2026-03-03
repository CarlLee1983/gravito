import type { CacheInterface } from './types'
/**
 * CacheRegistry - Internal storage for the global query cache.
 *
 * Separated from the DB facade to avoid circular dependencies between
 * DB and QueryBuilder.
 */
export declare class CacheRegistry {
  private static cache?
  /**
   * Sets the global cache provider.
   */
  static setCache(cache: CacheInterface): void
  /**
   * Retrieves the active global cache provider.
   */
  static getCache(): CacheInterface | undefined
}
