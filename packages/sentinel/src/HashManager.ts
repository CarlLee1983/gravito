import { getPasswordAdapter } from '@gravito/core'

/**
 * Supported hashing algorithms.
 * @public
 */
export type HashAlgorithm = 'bcrypt' | 'argon2id'

/**
 * Configuration for hashing.
 * @public
 */
export interface HashConfig {
  algorithm?: HashAlgorithm
  bcrypt?: {
    cost?: number
  }
  argon2id?: {
    memoryCost?: number
    timeCost?: number
    parallelism?: number
  }
}

/**
 * Manager class for password hashing and verification.
 *
 * This class provides a unified interface for various hashing algorithms
 * (bcrypt, argon2id) via the PlanetCore password adapter. It handles
 * configuration-based hashing and provides utilities for re-hashing
 * passwords when security requirements change.
 *
 * @public
 * @example
 * ```typescript
 * const manager = new HashManager({ algorithm: 'bcrypt' });
 * const hashed = await manager.make('password');
 * const isValid = await manager.check('password', hashed);
 * ```
 */
export class HashManager {
  /**
   * Create a new hash manager instance.
   *
   * @param config - Hashing configuration options
   */
  constructor(private readonly config: HashConfig = {}) {}

  /**
   * Create a hash for the given plain text value.
   *
   * @param value - The plain text string to hash
   * @returns A promise resolving to the hashed string
   */
  async make(value: string): Promise<string> {
    const algorithm = this.config.algorithm ?? 'bcrypt'
    const password = getPasswordAdapter()

    if (algorithm === 'bcrypt') {
      const cost = this.config.bcrypt?.cost ?? 12
      return await password.hash(value, { algorithm: 'bcrypt', cost })
    }

    const memoryCost = this.config.argon2id?.memoryCost
    const timeCost = this.config.argon2id?.timeCost
    const parallelism = this.config.argon2id?.parallelism

    return await password.hash(value, {
      algorithm: 'argon2id',
      ...(memoryCost !== undefined ? { memoryCost } : {}),
      ...(timeCost !== undefined ? { timeCost } : {}),
      ...(parallelism !== undefined ? { parallelism } : {}),
    })
  }

  /**
   * Verify a plain text value against a hashed string.
   *
   * @param value - The plain text string to check
   * @param hashed - The hashed string to verify against
   * @returns True if the value is correct
   */
  async check(value: string, hashed: string): Promise<boolean> {
    const password = getPasswordAdapter()
    return await password.verify(value, hashed)
  }

  /**
   * Determine if a hashed string needs to be re-hashed based on current config.
   *
   * @param hashed - The hashed string to check
   * @returns True if re-hashing is required
   */
  needsRehash(hashed: string): boolean {
    const algorithm = this.config.algorithm ?? 'bcrypt'

    if (algorithm === 'bcrypt') {
      // $2a$12$...
      const match = hashed.match(/^\$2[abxy]?\$(\d+)\$/)
      if (!match) {
        return true
      }
      const currentCost = Number(match[1])
      const desiredCost = this.config.bcrypt?.cost ?? 12
      return currentCost !== desiredCost
    }

    if (!hashed.startsWith('$argon2id$')) {
      return true
    }

    // $argon2id$v=19$m=65536,t=3,p=4$...
    const params = hashed.split('$')[3] ?? ''
    const map = new Map(params.split(',').map((kv) => kv.split('=') as [string, string]))

    const desiredMemory = this.config.argon2id?.memoryCost
    const desiredTime = this.config.argon2id?.timeCost
    const desiredParallelism = this.config.argon2id?.parallelism

    if (desiredMemory !== undefined && Number(map.get('m')) !== desiredMemory) {
      return true
    }
    if (desiredTime !== undefined && Number(map.get('t')) !== desiredTime) {
      return true
    }
    if (desiredParallelism !== undefined && Number(map.get('p')) !== desiredParallelism) {
      return true
    }

    return false
  }
}
