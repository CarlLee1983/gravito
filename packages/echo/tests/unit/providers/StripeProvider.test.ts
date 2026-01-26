import { describe, expect, it } from 'bun:test'
import { StripeProvider } from '../../../src/providers/StripeProvider'

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
