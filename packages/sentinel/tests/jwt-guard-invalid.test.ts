import { describe, expect, test } from 'bun:test'

const { JwtGuard } = await import('../src/guards/JwtGuard')

describe('JwtGuard invalid token', () => {
  test('returns null when token is invalid', async () => {
    const ctx = {
      req: {
        header: () => 'Bearer bad-token',
        query: () => null,
      },
    }
    const provider = {
      retrieveById: async () => ({ getAuthIdentifier: () => '1' }),
      retrieveByCredentials: async () => ({ getAuthIdentifier: () => '1' }),
      validateCredentials: async () => true,
    }

    const guard = new JwtGuard(provider as any, ctx as any, 'secret', 'HS256', false, {
      verify: async () => {
        throw new Error('invalid token')
      },
    })
    expect(await guard.user()).toBeNull()
  })
})
