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
 * Decorator for any UserProvider to add caching capabilities.
 * @public
 */
export class CachedUserProvider<T extends Authenticatable = Authenticatable>
  implements UserProvider<T>
{
  private cache = new Map<string | number, { user: T; expires: number }>()

  constructor(
    private readonly provider: UserProvider<T>,
    private readonly options: CacheOptions = {}
  ) {}

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

  async retrieveByToken(identifier: string | number, token: string): Promise<T | null> {
    if (this.provider.retrieveByToken) {
      return this.provider.retrieveByToken(identifier, token)
    }
    return null
  }

  async updateRememberToken(user: T, token: string): Promise<void> {
    await this.provider.updateRememberToken?.(user, token)
  }

  async retrieveByCredentials(credentials: Record<string, unknown>): Promise<T | null> {
    return this.provider.retrieveByCredentials(credentials)
  }

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
   * Invalidate cache for a specific identifier or clear all.
   * @param identifier - The user identifier to invalidate
   */
  invalidate(identifier?: string | number): void {
    if (identifier !== undefined) {
      this.cache.delete(identifier)
    } else {
      this.cache.clear()
    }
  }
}
