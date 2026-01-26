import { describe, expect, it, jest } from 'bun:test'
import { MemoryDeadLetterQueue } from '../../src/dlq/MemoryDeadLetterQueue'
import { WebhookReceiver } from '../../src/receive/WebhookReceiver'
import { WebhookDispatcher } from '../../src/send/WebhookDispatcher'
import { MemoryWebhookStore } from '../../src/storage/MemoryWebhookStore'

const SECRET = 'test-secret'

describe('Integration: Receiver -> Dispatcher', () => {
  it('should receive and store event', async () => {
    const store = new MemoryWebhookStore()
    const receiver = new WebhookReceiver()
    receiver.setStore(store)
    receiver.registerProvider('test', SECRET, { type: 'generic' })

    const payload = JSON.stringify({ type: 'test', data: 'hello' })
    const signature = await import('../../src/receive/SignatureValidator').then((m) =>
      m.computeHmacSha256(payload, SECRET)
    )

    await receiver.handle('test', payload, {
      'x-webhook-signature': signature,
    })

    const events = await store.queryEvents({ direction: 'incoming' })
    expect(events).toHaveLength(1)
  })

  it('should dispatch and retry to DLQ', async () => {
    const dlq = new MemoryDeadLetterQueue()
    const dispatcher = new WebhookDispatcher({
      secret: SECRET,
      retry: { maxAttempts: 1, initialDelay: 0 },
    })
    dispatcher.setDeadLetterQueue(dlq)

    const originalFetch = globalThis.fetch
    globalThis.fetch = jest.fn(
      async () => new Response('error', { status: 500 })
    ) as unknown as typeof fetch

    await dispatcher.dispatch({ url: 'u1', event: 'e1', data: {} })

    globalThis.fetch = originalFetch

    const dlqEvents = await dlq.peek()
    expect(dlqEvents).toHaveLength(1)
  })
})
