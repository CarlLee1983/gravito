import { describe, expect, it } from 'bun:test'
import {
  computeHmacSha1,
  computeHmacSha1Base64,
  computeHmacSha256,
  computeHmacSha256Base64,
  parseStripeSignature,
  timingSafeEqual,
  validateTimestamp,
} from '../../../src/receive/SignatureValidator'

describe('SignatureValidator', () => {
  describe('computeHmacSha256', () => {
    it('should compute correct HMAC-SHA256', async () => {
      const payload = 'test payload'
      const secret = 'test-secret'
      const signature = await computeHmacSha256(payload, secret)

      expect(signature).toHaveLength(64) // SHA256 hex = 64 chars
      expect(signature).toMatch(/^[a-f0-9]+$/)
    })

    it('should produce consistent signatures', async () => {
      const payload = 'consistent payload'
      const secret = 'consistent-secret'

      const sig1 = await computeHmacSha256(payload, secret)
      const sig2 = await computeHmacSha256(payload, secret)

      expect(sig1).toBe(sig2)
    })
  })

  describe('computeHmacSha256Base64', () => {
    it('should output base64 encoded signature', async () => {
      const sig = await computeHmacSha256Base64('data', 'secret')
      expect(sig).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    })
  })

  describe('computeHmacSha1', () => {
    it('should compute correct HMAC-SHA1', async () => {
      const payload = 'legacy payload'
      const secret = 'legacy-secret'
      const signature = await computeHmacSha1(payload, secret)

      expect(signature).toHaveLength(40) // SHA1 hex = 40 chars
      expect(signature).toMatch(/^[a-f0-9]+$/)
    })
  })

  describe('computeHmacSha1Base64', () => {
    it('should output base64 encoded SHA1 signature', async () => {
      const sig = await computeHmacSha1Base64('data', 'secret')
      expect(sig).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    })
  })

  describe('timingSafeEqual', () => {
    it('should return true for equal strings', () => {
      expect(timingSafeEqual('abc', 'abc')).toBe(true)
    })

    it('should return false for different strings', () => {
      expect(timingSafeEqual('abc', 'def')).toBe(false)
    })

    it('should return false for different length strings', () => {
      expect(timingSafeEqual('abc', 'abcd')).toBe(false)
    })
  })

  describe('validateTimestamp', () => {
    it('should validate current timestamp', () => {
      const now = Math.floor(Date.now() / 1000)
      expect(validateTimestamp(now)).toBe(true)
    })

    it('should reject old timestamp', () => {
      const old = Math.floor(Date.now() / 1000) - 600 // 10 minutes ago
      expect(validateTimestamp(old)).toBe(false)
    })

    it('should accept timestamp within tolerance', () => {
      const recent = Math.floor(Date.now() / 1000) - 100
      expect(validateTimestamp(recent, 300)).toBe(true)
    })
  })

  describe('parseStripeSignature', () => {
    it('should parse valid signature header', () => {
      const header = 't=1234567890,v1=abc123,v1=def456'
      const result = parseStripeSignature(header)

      expect(result).not.toBeNull()
      expect(result?.timestamp).toBe(1234567890)
      expect(result?.signatures).toEqual(['abc123', 'def456'])
    })

    it('should return null for invalid format', () => {
      expect(parseStripeSignature('invalid')).toBeNull()
      expect(parseStripeSignature('t=abc')).toBeNull() // no v1
    })
  })
})
