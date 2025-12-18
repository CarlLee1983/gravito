import { describe, expect, it } from 'bun:test'
import { EmailVerificationService } from '../src/EmailVerification'
import { HashManager } from '../src/HashManager'
import { InMemoryPasswordResetTokenRepository, PasswordBroker } from '../src/PasswordBroker'

describe('OrbitAuth Security Utilities', () => {
  it('HashManager should hash and verify', async () => {
    const hash = new HashManager({ algorithm: 'bcrypt', bcrypt: { cost: 4 } })
    const hashed = await hash.make('secret')

    expect(await hash.check('secret', hashed)).toBe(true)
    expect(await hash.check('wrong', hashed)).toBe(false)
  })

  it('HashManager should detect bcrypt rehash need when cost differs', async () => {
    const hash4 = new HashManager({ algorithm: 'bcrypt', bcrypt: { cost: 4 } })
    const hashed = await hash4.make('secret')

    const hash5 = new HashManager({ algorithm: 'bcrypt', bcrypt: { cost: 5 } })
    expect(hash5.needsRehash(hashed)).toBe(true)
  })

  it('PasswordBroker should create and verify tokens', async () => {
    const hash = new HashManager({ algorithm: 'bcrypt', bcrypt: { cost: 4 } })
    const repo = new InMemoryPasswordResetTokenRepository()
    const broker = new PasswordBroker(repo, hash, { ttlSeconds: 60 })

    const token = await broker.createToken('user@example.com')
    expect(await broker.verifyToken('user@example.com', token)).toBe(true)

    // Invalidate-on-success default: token should no longer work
    expect(await broker.verifyToken('user@example.com', token)).toBe(false)
  })

  it('EmailVerificationService should create and verify signed tokens', async () => {
    const service = new EmailVerificationService(
      'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      {
        ttlSeconds: 60,
      }
    )

    const token = service.createToken({ id: '1', email: 'user@example.com' })
    const payload = service.verifyToken(token)

    expect(payload).not.toBeNull()
    expect(payload!.id).toBe('1')
    expect(payload!.email).toBe('user@example.com')
  })

  it('EmailVerificationService should reject tampered tokens', () => {
    const service = new EmailVerificationService(
      'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      {
        ttlSeconds: 60,
      }
    )

    const token = service.createToken({ id: '1', email: 'user@example.com' })
    const [encoded, sig] = token.split('.', 2)
    const last = encoded.slice(-1)
    const tamperedEncoded = `${encoded.slice(0, -1)}${last === 'A' ? 'B' : 'A'}`
    const tampered = `${tamperedEncoded}.${sig}`
    expect(service.verifyToken(tampered)).toBeNull()
  })

  it('EmailVerificationService should reject expired tokens', async () => {
    const service = new EmailVerificationService(
      'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      {
        ttlSeconds: 0,
      }
    )

    const token = service.createToken({ id: '1', email: 'user@example.com' })
    await new Promise((r) => setTimeout(r, 2))
    expect(service.verifyToken(token)).toBeNull()
  })
})
