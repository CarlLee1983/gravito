import { describe, expect, it, jest } from 'bun:test'
import { MemoryDeadLetterQueue } from '../src/dlq/MemoryDeadLetterQueue'
import { WebhookReceiver } from '../src/receive/WebhookReceiver'
import { WebhookReplayService } from '../src/replay/WebhookReplayService'
import { WebhookDispatcher } from '../src/send/WebhookDispatcher'
import { MemoryWebhookStore } from '../src/storage/MemoryWebhookStore'
import type { IncomingWebhookRecord, OutgoingWebhookRecord } from '../src/storage/WebhookStore'

const SECRET = 'test-secret'

describe('Phase 3 Features', () => {
  describe('MemoryWebhookStore', () => {
    it('should save and retrieve incoming event', async () => {
      const store = new MemoryWebhookStore()
      const event: IncomingWebhookRecord = {
        provider: 'test',
        eventType: 'test',
        payload: { data: 1 },
        headers: {},
        rawBody: '{}',
        receivedAt: new Date(),
        status: 'pending',
      }
      const id = await store.saveIncomingEvent(event)
      const retrieved = await store.getEvent(id)
      expect(retrieved).not.toBeNull()
      expect((retrieved as IncomingWebhookRecord).provider).toBe('test')
    })

    it('should query events', async () => {
      const store = new MemoryWebhookStore()
      await store.saveIncomingEvent({
        provider: 'p1',
        eventType: 'e1',
        payload: {},
        headers: {},
        rawBody: '',
        receivedAt: new Date(),
        status: 'pending',
      })
      await store.saveIncomingEvent({
        provider: 'p2',
        eventType: 'e2',
        payload: {},
        headers: {},
        rawBody: '',
        receivedAt: new Date(),
        status: 'processed',
      })

      const results = await store.queryEvents({ provider: 'p1' })
      expect(results).toHaveLength(1)
      expect((results[0] as IncomingWebhookRecord).provider).toBe('p1')
    })
  })

  describe('WebhookReceiver Persistence', () => {
    it('should save event when store is configured', async () => {
      const store = new MemoryWebhookStore()
      const receiver = new WebhookReceiver()
      receiver.setStore(store)
      receiver.registerProvider('test', SECRET, { type: 'generic' })

      // Mock verify to return valid result without checking signature for simplicity in this test
      // Or just compute signature
      const payload = JSON.stringify({ type: 'test' })
      const signature = await import('../src/receive/SignatureValidator').then((m) =>
        m.computeHmacSha256(payload, SECRET)
      )

      await receiver.handle('test', payload, {
        'x-webhook-signature': signature,
      })

      const events = await store.queryEvents({ direction: 'incoming' })
      expect(events).toHaveLength(1)
      expect((events[0] as IncomingWebhookRecord).status).toBe('processed')
    })
  })

  describe('WebhookDispatcher Batch & DLQ', () => {
    it('should dispatch batch', async () => {
      const dispatcher = new WebhookDispatcher({ secret: SECRET })

      const originalFetch = globalThis.fetch
      globalThis.fetch = jest.fn(
        async () => new Response('ok', { status: 200 })
      ) as unknown as typeof fetch

      const result = await dispatcher.dispatchBatch([
        { url: 'u1', event: 'e1', data: {} },
        { url: 'u2', event: 'e2', data: {} },
      ])

      globalThis.fetch = originalFetch

      expect(result.total).toBe(2)
      expect(result.succeeded).toBe(2)
    })

    it('should send failed event to DLQ', async () => {
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
      expect(dlqEvents[0].failureReason).toContain('HTTP 500')
    })
  })

  describe('WebhookReplayService', () => {
    it('should replay events', async () => {
      const store = new MemoryWebhookStore()
      const dispatcher = new WebhookDispatcher({ secret: SECRET })
      const replayService = new WebhookReplayService(store, dispatcher)

      const event: OutgoingWebhookRecord = {
        url: 'u1',
        event: 'e1',
        payload: {},
        createdAt: new Date(),
        status: 'failed',
        attempts: [],
      }
      const id = await store.saveOutgoingEvent(event)

      const originalFetch = globalThis.fetch
      globalThis.fetch = jest.fn(
        async () => new Response('ok', { status: 200 })
      ) as unknown as typeof fetch

      const result = await replayService.replay({ eventIds: [id] })

      globalThis.fetch = originalFetch

      expect(result.replayed).toBe(1)
      expect(result.events[0].status).toBe('replayed')
    })
  })
})
