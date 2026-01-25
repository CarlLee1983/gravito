/**
 * Interface for token revocation via blacklist.
 * @public
 */
export interface TokenBlacklist {
  /**
   * Add a token identifier to the blacklist.
   * @param jti - The unique JWT ID
   * @param expiresAt - Date when the token would have expired
   */
  add(jti: string, expiresAt: Date): Promise<void>

  /**
   * Check if a token is in the blacklist.
   * @param jti - The unique JWT ID
   */
  has(jti: string): Promise<boolean>

  /**
   * Remove expired entries from the blacklist.
   */
  prune(): Promise<void>
}

/**
 * In-memory implementation of the token blacklist.
 * Suitable for single-instance applications.
 * @public
 */
export class InMemoryTokenBlacklist implements TokenBlacklist {
  private blacklist = new Map<string, number>()

  async add(jti: string, expiresAt: Date): Promise<void> {
    this.blacklist.set(jti, expiresAt.getTime())
  }

  async has(jti: string): Promise<boolean> {
    const expires = this.blacklist.get(jti)
    if (!expires) return false

    if (Date.now() > expires) {
      this.blacklist.delete(jti)
      return false
    }

    return true
  }

  async prune(): Promise<void> {
    const now = Date.now()
    for (const [jti, expires] of this.blacklist.entries()) {
      if (now > expires) {
        this.blacklist.delete(jti)
      }
    }
  }
}
