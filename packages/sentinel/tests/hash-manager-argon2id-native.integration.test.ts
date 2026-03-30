/**
 * HashManager BUN-01 Integration Test
 *
 * Confirms that HashManager.make() uses argon2id via Bun.password on Bun runtime.
 * This is the BUN-01 ROADMAP success criterion test:
 * "confirmed by integration test asserting argon2id algorithm is used, not bcryptjs".
 *
 * Full stack: HashManager -> getPasswordAdapter() -> Bun.password -> argon2id
 */

import { describe, expect, it } from 'bun:test'
import { HashManager } from '../src/HashManager'

describe('HashManager BUN-01 integration', () => {
  const manager = new HashManager({ algorithm: 'argon2id' })

  it('make() produces argon2id hash on Bun runtime', async () => {
    const hashed = await manager.make('password123')
    // argon2id hashes ALWAYS start with $argon2id$
    expect(hashed).toMatch(/^\$argon2id\$/)
  })

  it('check() verifies argon2id hash correctly', async () => {
    const hashed = await manager.make('password123')
    expect(await manager.check('password123', hashed)).toBe(true)
  })

  it('check() rejects wrong password', async () => {
    const hashed = await manager.make('password123')
    expect(await manager.check('wrong', hashed)).toBe(false)
  })
})
