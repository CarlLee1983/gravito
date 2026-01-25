import type { Authenticatable } from '../contracts/Authenticatable'
import type { UserProvider } from '../contracts/UserProvider'

/**
 * Options for user query caching.
 * @public
 */
export interface CacheOptions {
  ttlSeconds?: number
  maxSize?: number
}

/**
 * Decorator for UserProvider that adds an in-memory caching layer.
 *
 * This provider wraps any other UserProvider implementation and caches the
 * results of `retrieveById` to improve performance by reducing the number
 * of database or external API calls. It supports TTL-based expiration and
 * LRU (Least Recently Used) eviction.
 *
 * @public
 * @example
 * ```typescript
 * const innerProvider = new DatabaseUserProvider();
 * const provider = new CachedUserProvider(innerProvider, { ttlSeconds: 60 });
 * ```
 */
export class CachedUserProvider<T extends Authenticatable = Authenticatable>
  implements UserProvider<T>
{
  private cache = new Map<string | number, { user: T; expires: number }>()

  /**
   * Create a new cached user provider.
   *
   * @param provider - The underlying user provider to delegate to
   * @param options - Cache configuration options
   */
  constructor(
    private readonly provider: UserProvider<T>,
    private readonly options: CacheOptions = {}
  ) {}

  /**
   * Retrieve a user by ID, using the cache if available.
   *
   * @param identifier - The user identifier
   * @returns The user instance or null
   */
  async retrieveById(identifier: string | number): Promise<T | null> {
    const cached = this.cache.get(identifier)
    if (cached && cached.expires > Date.now()) {
      return cached.user
    }

    const user = await this.provider.retrieveById(identifier)
    if (user) {
      this.cacheUser(identifier, user)
    }
    return user
  }

  /**
   * Retrieve a user by token (always delegated to the inner provider).
   */
  async retrieveByToken(identifier: string | number, token: string): Promise<T | null> {
    if (this.provider.retrieveByToken) {
      return this.provider.retrieveByToken(identifier, token)
    }
    return null
  }

  /**
   * Update a user's remember token.
   */
  async updateRememberToken(user: T, token: string): Promise<void> {
    await this.provider.updateRememberToken?.(user, token)
  }

  /**
   * Retrieve a user by credentials (always delegated to the inner provider).
   */
  async retrieveByCredentials(credentials: Record<string, unknown>): Promise<T | null> {
    return this.provider.retrieveByCredentials(credentials)
  }

  /**
   * Validate user credentials (always delegated to the inner provider).
   */
  async validateCredentials(user: T, credentials: Record<string, unknown>): Promise<boolean> {
    return this.provider.validateCredentials(user, credentials)
  }

  private cacheUser(identifier: string | number, user: T): void {
    const ttl = (this.options.ttlSeconds ?? 60) * 1000

    if (this.cache.size >= (this.options.maxSize ?? 100)) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(identifier, {
      user,
      expires: Date.now() + ttl,
    })
  }

  /**
   * Invalidate the cache for a specific user or clear the entire cache.
   *
   * @param identifier - The user identifier to remove from cache
   */
  invalidate(identifier?: string | number): void {
    if (identifier !== undefined) {
      this.cache.delete(identifier)
    } else {
      this.cache.clear()
    }
  }
}
