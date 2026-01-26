/**
 * Interface for managing a blacklist of revoked tokens.
 *
 * This is used to invalidate tokens (like JWTs or API tokens) before they
 * naturally expire, providing an immediate revocation mechanism.
 *
 * @public
 */
export interface TokenBlacklist {
  /**
   * Add a token identifier to the blacklist until it would have expired.
   *
   * @param jti - The unique token identifier (JWT ID)
   * @param expiresAt - The original expiration date of the token
   * @returns A promise that resolves when the token is blacklisted
   */
  add(jti: string, expiresAt: Date): Promise<void>

  /**
   * Check if a token identifier is present in the blacklist.
   *
   * @param jti - The unique token identifier (JWT ID)
   * @returns True if blacklisted, false otherwise
   */
  has(jti: string): Promise<boolean>

  /**
   * Remove all expired entries from the blacklist to free up memory/storage.
   *
   * @returns A promise that resolves when pruning is complete
   */
  prune(): Promise<void>
}

/**
 * In-memory implementation of the token blacklist.
 *
 * This implementation is suitable for single-instance applications where
 * token revocation state does not need to be shared across multiple processes.
 *
 * @public
 * @example
 * ```typescript
 * const blacklist = new InMemoryTokenBlacklist();
 * await blacklist.add('token-id', new Date(Date.now() + 3600000));
 * if (await blacklist.has('token-id')) {
 *   // Token is revoked
 * }
 * ```
 */
export class InMemoryTokenBlacklist implements TokenBlacklist {
  private blacklist = new Map<string, number>()

  /**
   * Add a token to the in-memory blacklist.
   */
  async add(jti: string, expiresAt: Date): Promise<void> {
    this.blacklist.set(jti, expiresAt.getTime())
  }

  /**
   * Check if a token is in the in-memory blacklist.
   */
  async has(jti: string): Promise<boolean> {
    const expires = this.blacklist.get(jti)
    if (!expires) return false

    if (Date.now() > expires) {
      this.blacklist.delete(jti)
      return false
    }

    return true
  }

  /**
   * Remove expired entries from the in-memory map.
   */
  async prune(): Promise<void> {
    const now = Date.now()
    for (const [jti, expires] of this.blacklist.entries()) {
      if (now > expires) {
        this.blacklist.delete(jti)
      }
    }
  }
}
