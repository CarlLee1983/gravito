/**
 * Hashing interface
 */
export interface Hasher {
  /**
   * Hash the given value
   */
  make(value: string, options?: any): Promise<string>

  /**
   * Check the given plain value against a hash
   */
  check(value: string, hashedValue: string): Promise<boolean>

  /**
   * Check if the given hash has been hashed using the given options
   */
  needsRehash(hashedValue: string, options?: any): boolean
}

/**
 * Bun Hasher
 * Uses Bun's native password hashing (bcrypt by default)
 */
export class BunHasher implements Hasher {
  async make(
    value: string,
    options?: { algorithm?: 'bcrypt' | 'argon2id'; cost?: number }
  ): Promise<string> {
    // Bun.password.hash(text, options)
    // algorithm defaults to bcrypt
    return await (globalThis as any).Bun.password.hash(value, options)
  }

  async check(value: string, hashedValue: string): Promise<boolean> {
    return await (globalThis as any).Bun.password.verify(value, hashedValue)
  }

  needsRehash(_hashedValue: string, _options?: any): boolean {
    return false
  }
}
