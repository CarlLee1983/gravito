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
export declare class BunHasher implements Hasher {
  make(
    value: string,
    options?: {
      algorithm?: 'bcrypt' | 'argon2id'
      cost?: number
    }
  ): Promise<string>
  check(value: string, hashedValue: string): Promise<boolean>
  needsRehash(_hashedValue: string, _options?: any): boolean
}
//# sourceMappingURL=Hasher.d.ts.map
