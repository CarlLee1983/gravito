import { describe, expect, it } from 'bun:test'
import { ShopifyProvider } from '../../../src/providers/ShopifyProvider'
import { computeHmacSha256Base64 } from '../../../src/receive/SignatureValidator'

const SECRET = 'test-secret'

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
