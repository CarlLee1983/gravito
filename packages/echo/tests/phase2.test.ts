import { describe, expect, it } from 'bun:test'
import { LinearProvider } from '../src/providers/LinearProvider'
import { PaddleProvider } from '../src/providers/PaddleProvider'
import { ShopifyProvider } from '../src/providers/ShopifyProvider'
import { SlackProvider } from '../src/providers/SlackProvider'
import { TwilioProvider } from '../src/providers/TwilioProvider'
import {
  computeHmacSha1Base64,
  computeHmacSha256,
  computeHmacSha256Base64,
} from '../src/receive/SignatureValidator'
import { WebhookReceiver } from '../src/receive/WebhookReceiver'

const SECRET = 'test-secret'

describe('SignatureValidator Utils', () => {
  it('should compute HMAC-SHA256 Base64', async () => {
    const sig = await computeHmacSha256Base64('data', SECRET)
    expect(sig).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
  })

  it('should compute HMAC-SHA1 Base64', async () => {
    const sig = await computeHmacSha1Base64('data', SECRET)
    expect(sig).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
  })
})

describe('Phase 2 Providers', () => {
  describe('ShopifyProvider', () => {
    it('should verify valid signature', async () => {
      const provider = new ShopifyProvider()
      const payload = JSON.stringify({ id: 123 })
      const signature = await computeHmacSha256Base64(payload, SECRET)

      const result = await provider.verify(
        payload,
        {
          'x-shopify-hmac-sha256': signature,
          'x-shopify-topic': 'orders/create',
          'x-shopify-webhook-id': 'hook-1',
        },
        SECRET
      )

      expect(result.valid).toBe(true)
      expect(result.eventType).toBe('orders/create')
      expect(result.webhookId).toBe('hook-1')
    })
  })

  describe('TwilioProvider', () => {
    it('should verify valid signature', async () => {
      const provider = new TwilioProvider({ baseUrl: 'https://example.com/webhook' })
      const params = new URLSearchParams({ Body: 'hello', From: '+123' })
      const payload = params.toString()

      // url + sorted params
      const sigPayload = 'https://example.com/webhook' + 'BodyhelloFrom+123'
      const signature = await computeHmacSha1Base64(sigPayload, SECRET)

      const result = await provider.verify(
        payload,
        {
          'x-twilio-signature': signature,
        },
        SECRET
      )

      expect(result.valid).toBe(true)
      expect((result.payload as any).Body).toBe('hello')
    })
  })

  describe('SlackProvider', () => {
    it('should verify valid signature', async () => {
      const provider = new SlackProvider()
      const timestamp = Math.floor(Date.now() / 1000)
      const payload = '{"type":"url_verification"}'

      const sigBase = `v0:${timestamp}:${payload}`
      const sigHex = await computeHmacSha256(sigBase, SECRET)
      const signature = `v0=${sigHex}`

      const result = await provider.verify(
        payload,
        {
          'x-slack-signature': signature,
          'x-slack-request-timestamp': timestamp.toString(),
        },
        SECRET
      )

      expect(result.valid).toBe(true)
    })
  })

  describe('PaddleProvider', () => {
    it('should verify valid signature', async () => {
      const provider = new PaddleProvider()
      const timestamp = Math.floor(Date.now() / 1000)
      const payload = JSON.stringify({ event_type: 'subscription.created' })

      const signedPayload = `${timestamp}:${payload}`
      const signature = await computeHmacSha256(signedPayload, SECRET)
      const header = `ts=${timestamp};h1=${signature}`

      const result = await provider.verify(
        payload,
        {
          'paddle-signature': header,
        },
        SECRET
      )

      expect(result.valid).toBe(true)
      expect(result.eventType).toBe('subscription.created')
    })
  })

  describe('LinearProvider', () => {
    it('should verify valid signature', async () => {
      const provider = new LinearProvider()
      const payload = JSON.stringify({ action: 'create', type: 'Issue' })
      const signature = await computeHmacSha256(payload, SECRET)

      const result = await provider.verify(
        payload,
        {
          'linear-signature': signature,
          'linear-delivery': 'del-1',
        },
        SECRET
      )

      expect(result.valid).toBe(true)
      expect(result.webhookId).toBe('del-1')
    })
  })
})

describe('WebhookReceiver Integration', () => {
  it('should have all new providers registered', () => {
    const receiver = new WebhookReceiver()
    // We can't easily check private map, but we can try to register with them
    // and see if it throws "Unknown provider type"

    const providers = ['shopify', 'twilio', 'slack', 'paddle', 'linear']

    for (const type of providers) {
      expect(() => {
        receiver.registerProvider(type, 'secret', { type })
      }).not.toThrow()
    }
  })
})
