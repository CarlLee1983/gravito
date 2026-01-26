import { describe, expect, it } from 'bun:test'
import { MemoryWebhookStore } from '../../../src/storage/MemoryWebhookStore'
import type { IncomingWebhookRecord } from '../../../src/storage/WebhookStore'

describe('MemoryWebhookStore', () => {
  describe('saveIncomingEvent', () => {
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
  })

  describe('queryEvents', () => {
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
})
