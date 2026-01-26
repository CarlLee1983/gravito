import { describe, expect, it } from 'bun:test'
import { computeHmacSha256 } from '../../../src/receive/SignatureValidator'
import { WebhookReceiver } from '../../../src/receive/WebhookReceiver'

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
