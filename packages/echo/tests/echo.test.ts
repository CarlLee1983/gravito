/**
 * @fileoverview Tests for @gravito/echo
 */

import { describe, expect, it, jest } from 'bun:test'
import { OrbitEcho } from '../src/OrbitEcho'
import { GenericProvider } from '../src/providers/GenericProvider'
import { GitHubProvider } from '../src/providers/GitHubProvider'
import { StripeProvider } from '../src/providers/StripeProvider'
import {
  computeHmacSha1,
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

  describe('computeHmacSha1', () => {
    it('should compute correct HMAC-SHA1', async () => {
      const payload = 'legacy payload'
      const secret = 'legacy-secret'
      const signature = await computeHmacSha1(payload, secret)

      expect(signature).toHaveLength(40) // SHA1 hex = 40 chars
      expect(signature).toMatch(/^[a-f0-9]+$/)
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

  it('should call global handlers', async () => {
    const receiver = new WebhookReceiver()
    receiver.registerProvider('test', 'secret', { type: 'generic' })

    let handlerCalled = false
    receiver.onAll('test', () => {
      handlerCalled = true
    })

    const payload = JSON.stringify({ type: 'test.event', data: 'hello' })
    const signature = await computeHmacSha256(payload, 'secret')

    await receiver.handle('test', payload, {
      'x-webhook-signature': signature,
    })

    expect(handlerCalled).toBe(true)
  })

  it('should throw for unknown provider type', () => {
    const receiver = new WebhookReceiver()
    expect(() => receiver.registerProvider('test', 'secret', { type: 'missing' })).toThrow(
      'Unknown provider type'
    )
  })

  it('should verify without handling', async () => {
    const receiver = new WebhookReceiver()
    receiver.registerProvider('test', 'secret', { type: 'generic' })

    const payload = JSON.stringify({ type: 'test.event', data: 'hello' })
    const signature = await computeHmacSha256(payload, 'secret')

    const result = await receiver.verify('test', payload, {
      'x-webhook-signature': signature,
    })

    expect(result.valid).toBe(true)
    expect(result.eventType).toBe('test.event')
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

  it('should dispatch a webhook successfully', async () => {
    const originalFetch = globalThis.fetch
    const fetchMock = jest.fn(async () => new Response('ok', { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    try {
      const dispatcher = new WebhookDispatcher({
        secret: 'test-secret',
        retry: { maxAttempts: 1 },
      })

      const result = await dispatcher.dispatch({
        url: 'https://example.com/webhook',
        event: 'order.created',
        data: { orderId: 123 },
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(result.success).toBe(true)
      expect(result.statusCode).toBe(200)
      expect(result.body).toBe('ok')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('should not retry on non-retryable status', async () => {
    const originalFetch = globalThis.fetch
    const fetchMock = jest.fn(async () => new Response('bad', { status: 400 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    try {
      const dispatcher = new WebhookDispatcher({
        secret: 'test-secret',
        retry: { maxAttempts: 2, initialDelay: 0 },
      })

      const result = await dispatcher.dispatch({
        url: 'https://example.com/webhook',
        event: 'order.failed',
        data: { orderId: 456 },
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(400)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('should retry on network error and then succeed', async () => {
    const originalFetch = globalThis.fetch
    let callCount = 0
    const fetchMock = jest.fn(async () => {
      callCount++
      if (callCount === 1) {
        throw new Error('network down')
      }
      return new Response('ok', { status: 200 })
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    try {
      const dispatcher = new WebhookDispatcher({
        secret: 'test-secret',
        retry: { maxAttempts: 2, initialDelay: 0 },
      })

      const result = await dispatcher.dispatch({
        url: 'https://example.com/webhook',
        event: 'order.retry',
        data: { orderId: 789 },
      })

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(result.success).toBe(true)
    } finally {
      globalThis.fetch = originalFetch
    }
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

  it('should bind instances on install', () => {
    const echo = new OrbitEcho({
      dispatcher: { secret: 'test' },
    })
    const core = {
      container: {
        instance: jest.fn(),
      },
    }

    echo.install(core as any)

    expect(core.container.instance).toHaveBeenCalledWith('echo', echo)
    expect(core.container.instance).toHaveBeenCalledWith('echo.receiver', echo.getReceiver())
    expect(core.container.instance).toHaveBeenCalledWith('echo.dispatcher', echo.getDispatcher())
  })
})
