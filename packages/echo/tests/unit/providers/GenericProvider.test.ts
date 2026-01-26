import { describe, expect, it } from 'bun:test'
import { GenericProvider } from '../../../src/providers/GenericProvider'
import { computeHmacSha256 } from '../../../src/receive/SignatureValidator'

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
