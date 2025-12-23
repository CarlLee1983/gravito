/**
 * @fileoverview Tests for @gravito/echo
 */

import { describe, expect, it } from 'bun:test'
import { OrbitEcho } from '../src/OrbitEcho'
import { GenericProvider } from '../src/providers/GenericProvider'
import { GitHubProvider } from '../src/providers/GitHubProvider'
import { StripeProvider } from '../src/providers/StripeProvider'
import {
  computeHmacSha256,
  parseStripeSignature,
  timingSafeEqual,
  validateTimestamp,
} from '../src/receive/SignatureValidator'
import { WebhookReceiver } from '../src/receive/WebhookReceiver'
import { WebhookDispatcher } from '../src/send/WebhookDispatcher'

// ─────────────────────────────────────────────────────────────
// Signature Validator Tests
// ─────────────────────────────────────────────────────────────

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
      expect(result!.timestamp).toBe(1234567890)
      expect(result!.signatures).toEqual(['abc123', 'def456'])
    })

    it('should return null for invalid format', () => {
      expect(parseStripeSignature('invalid')).toBeNull()
      expect(parseStripeSignature('t=abc')).toBeNull() // no v1
    })
  })
})

// ─────────────────────────────────────────────────────────────
// Provider Tests
// ─────────────────────────────────────────────────────────────

describe('Providers', () => {
  describe('GenericProvider', () => {
    it('should have correct name', () => {
      const provider = new GenericProvider()
      expect(provider.name).toBe('generic')
    })

    it('should verify valid signature', async () => {
      const provider = new GenericProvider()
      const payload = JSON.stringify({ type: 'test', data: 'hello' })
      const secret = 'test-secret'

      const signature = await computeHmacSha256(payload, secret)

      const result = await provider.verify(payload, { 'x-webhook-signature': signature }, secret)

      expect(result.valid).toBe(true)
      expect(result.eventType).toBe('test')
    })

    it('should reject missing signature', async () => {
      const provider = new GenericProvider()
      const result = await provider.verify('{}', {}, 'secret')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Missing signature')
    })
  })

  describe('StripeProvider', () => {
    it('should have correct name', () => {
      const provider = new StripeProvider()
      expect(provider.name).toBe('stripe')
    })

    it('should reject missing signature header', async () => {
      const provider = new StripeProvider()
      const result = await provider.verify('{}', {}, 'secret')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Missing Stripe-Signature')
    })
  })

  describe('GitHubProvider', () => {
    it('should have correct name', () => {
      const provider = new GitHubProvider()
      expect(provider.name).toBe('github')
    })

    it('should verify valid GitHub signature', async () => {
      const provider = new GitHubProvider()
      const payload = JSON.stringify({ action: 'opened' })
      const secret = 'github-secret'

      const signature = await computeHmacSha256(payload, secret)

      const result = await provider.verify(
        payload,
        {
          'x-hub-signature-256': `sha256=${signature}`,
          'x-github-event': 'pull_request',
          'x-github-delivery': 'delivery-id',
        },
        secret
      )

      expect(result.valid).toBe(true)
      expect(result.eventType).toBe('pull_request')
      expect(result.webhookId).toBe('delivery-id')
    })
  })
})

// ─────────────────────────────────────────────────────────────
// WebhookReceiver Tests
// ─────────────────────────────────────────────────────────────

describe('WebhookReceiver', () => {
  it('should register providers', () => {
    const receiver = new WebhookReceiver()
    receiver.registerProvider('test', 'secret', { type: 'generic' })

    // Should not throw
    expect(true).toBe(true)
  })

  it('should reject unregistered provider', async () => {
    const receiver = new WebhookReceiver()
    const result = await receiver.handle('unknown', '{}', {})

    expect(result.valid).toBe(false)
    expect(result.error).toContain('not registered')
  })

  it('should call event handlers', async () => {
    const receiver = new WebhookReceiver()
    receiver.registerProvider('test', 'secret', { type: 'generic' })

    let handlerCalled = false
    receiver.on('test', 'test.event', () => {
      handlerCalled = true
    })

    const payload = JSON.stringify({ type: 'test.event', data: 'hello' })
    const signature = await computeHmacSha256(payload, 'secret')

    await receiver.handle('test', payload, {
      'x-webhook-signature': signature,
    })

    expect(handlerCalled).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────
// WebhookDispatcher Tests
// ─────────────────────────────────────────────────────────────

describe('WebhookDispatcher', () => {
  it('should create with config', () => {
    const dispatcher = new WebhookDispatcher({
      secret: 'test-secret',
      retry: { maxAttempts: 5 },
    })

    expect(dispatcher).toBeDefined()
  })
})

// ─────────────────────────────────────────────────────────────
// OrbitEcho Tests
// ─────────────────────────────────────────────────────────────

describe('OrbitEcho', () => {
  it('should create with default config', () => {
    const echo = new OrbitEcho()
    expect(echo.getReceiver()).toBeDefined()
    expect(echo.getDispatcher()).toBeUndefined()
  })

  it('should create dispatcher when config provided', () => {
    const echo = new OrbitEcho({
      dispatcher: { secret: 'test' },
    })
    expect(echo.getDispatcher()).toBeDefined()
  })

  it('should register providers from config', () => {
    const echo = new OrbitEcho({
      providers: {
        stripe: { name: 'stripe', secret: 'stripe-secret' },
        github: { name: 'github', secret: 'github-secret' },
      },
    })

    const receiver = echo.getReceiver()
    expect(receiver).toBeDefined()
  })
})
