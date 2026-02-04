import { describe, expect, it } from 'bun:test'
import { MemoryWebhookStore } from '../../../src/storage/MemoryWebhookStore'
import type {
  DeliveryAttempt,
  IncomingWebhookRecord,
  OutgoingWebhookRecord,
} from '../../../src/storage/WebhookStore'

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

    it('should use provided id if available', async () => {
      const store = new MemoryWebhookStore()
      const event: IncomingWebhookRecord = {
        id: 'custom-id-123',
        provider: 'test',
        eventType: 'test',
        payload: {},
        headers: {},
        rawBody: '{}',
        receivedAt: new Date(),
        status: 'pending',
      }
      const id = await store.saveIncomingEvent(event)
      expect(id).toBe('custom-id-123')
    })
  })

  describe('saveOutgoingEvent', () => {
    it('should save and retrieve outgoing event', async () => {
      const store = new MemoryWebhookStore()
      const event: OutgoingWebhookRecord = {
        url: 'https://example.com/webhook',
        event: 'order.created',
        payload: { orderId: 123 },
        createdAt: new Date(),
        status: 'pending',
        attempts: [],
      }
      const id = await store.saveOutgoingEvent(event)
      const retrieved = await store.getEvent(id)
      expect(retrieved).not.toBeNull()
      expect((retrieved as OutgoingWebhookRecord).url).toBe('https://example.com/webhook')
      expect((retrieved as OutgoingWebhookRecord).direction).toBe('outgoing')
    })

    it('should use provided id if available', async () => {
      const store = new MemoryWebhookStore()
      const event: OutgoingWebhookRecord = {
        id: 'outgoing-id-456',
        url: 'https://example.com/webhook',
        event: 'test.event',
        payload: {},
        createdAt: new Date(),
        status: 'pending',
        attempts: [],
      }
      const id = await store.saveOutgoingEvent(event)
      expect(id).toBe('outgoing-id-456')
    })
  })

  describe('updateDeliveryAttempt', () => {
    it('should add delivery attempt to outgoing event', async () => {
      const store = new MemoryWebhookStore()
      const event: OutgoingWebhookRecord = {
        url: 'https://example.com/webhook',
        event: 'order.created',
        payload: {},
        createdAt: new Date(),
        status: 'pending',
        attempts: [],
      }
      const id = await store.saveOutgoingEvent(event)

      const attempt: DeliveryAttempt = {
        attemptNumber: 1,
        timestamp: new Date(),
        statusCode: 200,
        duration: 150,
      }
      await store.updateDeliveryAttempt(id, attempt)

      const retrieved = (await store.getEvent(id)) as OutgoingWebhookRecord
      expect(retrieved.attempts).toHaveLength(1)
      expect(retrieved.attempts[0].statusCode).toBe(200)
    })

    it('should not throw for non-existent event', async () => {
      const store = new MemoryWebhookStore()
      const attempt: DeliveryAttempt = {
        attemptNumber: 1,
        timestamp: new Date(),
        duration: 100,
      }
      await store.updateDeliveryAttempt('non-existent-id', attempt)
    })

    it('should not update incoming event', async () => {
      const store = new MemoryWebhookStore()
      const event: IncomingWebhookRecord = {
        provider: 'test',
        eventType: 'test',
        payload: {},
        headers: {},
        rawBody: '{}',
        receivedAt: new Date(),
        status: 'pending',
      }
      const id = await store.saveIncomingEvent(event)

      const attempt: DeliveryAttempt = {
        attemptNumber: 1,
        timestamp: new Date(),
        duration: 100,
      }
      await store.updateDeliveryAttempt(id, attempt)

      const retrieved = await store.getEvent(id)
      expect('attempts' in retrieved!).toBe(false)
    })
  })

  describe('queryEvents', () => {
    it('should query events by provider', async () => {
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

    it('should query events by direction', async () => {
      const store = new MemoryWebhookStore()
      await store.saveIncomingEvent({
        provider: 'test',
        eventType: 'test',
        payload: {},
        headers: {},
        rawBody: '',
        receivedAt: new Date(),
        status: 'pending',
      })
      await store.saveOutgoingEvent({
        url: 'https://example.com',
        event: 'test',
        payload: {},
        createdAt: new Date(),
        status: 'pending',
        attempts: [],
      })

      const incomingResults = await store.queryEvents({ direction: 'incoming' })
      expect(incomingResults).toHaveLength(1)

      const outgoingResults = await store.queryEvents({ direction: 'outgoing' })
      expect(outgoingResults).toHaveLength(1)
    })

    it('should query events by status', async () => {
      const store = new MemoryWebhookStore()
      await store.saveIncomingEvent({
        provider: 'test',
        eventType: 'test',
        payload: {},
        headers: {},
        rawBody: '',
        receivedAt: new Date(),
        status: 'pending',
      })
      await store.saveIncomingEvent({
        provider: 'test',
        eventType: 'test',
        payload: {},
        headers: {},
        rawBody: '',
        receivedAt: new Date(),
        status: 'processed',
      })

      const results = await store.queryEvents({ status: 'processed' })
      expect(results).toHaveLength(1)
      expect(results[0].status).toBe('processed')
    })

    it('should query events by date range (from)', async () => {
      const store = new MemoryWebhookStore()
      const oldDate = new Date('2020-01-01')
      const newDate = new Date('2024-01-01')

      await store.saveIncomingEvent({
        provider: 'test',
        eventType: 'old',
        payload: {},
        headers: {},
        rawBody: '',
        receivedAt: oldDate,
        status: 'pending',
      })
      await store.saveIncomingEvent({
        provider: 'test',
        eventType: 'new',
        payload: {},
        headers: {},
        rawBody: '',
        receivedAt: newDate,
        status: 'pending',
      })

      const results = await store.queryEvents({ from: new Date('2023-01-01') })
      expect(results).toHaveLength(1)
      expect((results[0] as IncomingWebhookRecord).eventType).toBe('new')
    })

    it('should query events by date range (to)', async () => {
      const store = new MemoryWebhookStore()
      const oldDate = new Date('2020-01-01')
      const newDate = new Date('2024-01-01')

      await store.saveIncomingEvent({
        provider: 'test',
        eventType: 'old',
        payload: {},
        headers: {},
        rawBody: '',
        receivedAt: oldDate,
        status: 'pending',
      })
      await store.saveIncomingEvent({
        provider: 'test',
        eventType: 'new',
        payload: {},
        headers: {},
        rawBody: '',
        receivedAt: newDate,
        status: 'pending',
      })

      const results = await store.queryEvents({ to: new Date('2021-01-01') })
      expect(results).toHaveLength(1)
      expect((results[0] as IncomingWebhookRecord).eventType).toBe('old')
    })

    it('should query outgoing events by date range using createdAt', async () => {
      const store = new MemoryWebhookStore()
      const oldDate = new Date('2020-01-01')
      const newDate = new Date('2024-01-01')

      await store.saveOutgoingEvent({
        url: 'https://old.example.com',
        event: 'old.event',
        payload: {},
        createdAt: oldDate,
        status: 'pending',
        attempts: [],
      })
      await store.saveOutgoingEvent({
        url: 'https://new.example.com',
        event: 'new.event',
        payload: {},
        createdAt: newDate,
        status: 'pending',
        attempts: [],
      })

      const fromResults = await store.queryEvents({ from: new Date('2023-01-01') })
      expect(fromResults).toHaveLength(1)
      expect((fromResults[0] as OutgoingWebhookRecord).event).toBe('new.event')

      const toResults = await store.queryEvents({ to: new Date('2021-01-01') })
      expect(toResults).toHaveLength(1)
      expect((toResults[0] as OutgoingWebhookRecord).event).toBe('old.event')
    })

    it('should sort results by date descending', async () => {
      const store = new MemoryWebhookStore()
      await store.saveIncomingEvent({
        provider: 'test',
        eventType: 'first',
        payload: {},
        headers: {},
        rawBody: '',
        receivedAt: new Date('2020-01-01'),
        status: 'pending',
      })
      await store.saveIncomingEvent({
        provider: 'test',
        eventType: 'second',
        payload: {},
        headers: {},
        rawBody: '',
        receivedAt: new Date('2024-01-01'),
        status: 'pending',
      })

      const results = await store.queryEvents({})
      expect(results).toHaveLength(2)
      expect((results[0] as IncomingWebhookRecord).eventType).toBe('second')
      expect((results[1] as IncomingWebhookRecord).eventType).toBe('first')
    })

    it('should apply limit and offset', async () => {
      const store = new MemoryWebhookStore()
      for (let i = 0; i < 5; i++) {
        await store.saveIncomingEvent({
          provider: 'test',
          eventType: `event-${i}`,
          payload: {},
          headers: {},
          rawBody: '',
          receivedAt: new Date(2020 + i, 0, 1),
          status: 'pending',
        })
      }

      const results = await store.queryEvents({ limit: 2, offset: 1 })
      expect(results).toHaveLength(2)
    })
  })

  describe('markProcessed', () => {
    it('should mark event as processed', async () => {
      const store = new MemoryWebhookStore()
      const id = await store.saveIncomingEvent({
        provider: 'test',
        eventType: 'test',
        payload: {},
        headers: {},
        rawBody: '',
        receivedAt: new Date(),
        status: 'pending',
      })

      await store.markProcessed(id)

      const retrieved = await store.getEvent(id)
      expect(retrieved?.status).toBe('processed')
    })

    it('should not throw for non-existent event', async () => {
      const store = new MemoryWebhookStore()
      await store.markProcessed('non-existent-id')
    })
  })

  describe('markFailed', () => {
    it('should mark event as failed with error when processingError exists', async () => {
      const store = new MemoryWebhookStore()
      const id = await store.saveIncomingEvent({
        provider: 'test',
        eventType: 'test',
        payload: {},
        headers: {},
        rawBody: '',
        receivedAt: new Date(),
        status: 'pending',
        processingError: '',
      })

      await store.markFailed(id, 'Processing error occurred')

      const retrieved = (await store.getEvent(id)) as IncomingWebhookRecord
      expect(retrieved.status).toBe('failed')
      expect(retrieved.processingError).toBe('Processing error occurred')
    })

    it('should mark event as failed without setting processingError if not present', async () => {
      const store = new MemoryWebhookStore()
      const id = await store.saveIncomingEvent({
        provider: 'test',
        eventType: 'test',
        payload: {},
        headers: {},
        rawBody: '',
        receivedAt: new Date(),
        status: 'pending',
      })

      await store.markFailed(id, 'Processing error occurred')

      const retrieved = (await store.getEvent(id)) as IncomingWebhookRecord
      expect(retrieved.status).toBe('failed')
    })

    it('should not throw for non-existent event', async () => {
      const store = new MemoryWebhookStore()
      await store.markFailed('non-existent-id', 'error')
    })

    it('should mark outgoing event as failed', async () => {
      const store = new MemoryWebhookStore()
      const id = await store.saveOutgoingEvent({
        url: 'https://example.com',
        event: 'test',
        payload: {},
        createdAt: new Date(),
        status: 'pending',
        attempts: [],
      })

      await store.markFailed(id, 'Delivery failed')

      const retrieved = await store.getEvent(id)
      expect(retrieved?.status).toBe('failed')
    })
  })

  describe('getEvent', () => {
    it('should return null for non-existent event', async () => {
      const store = new MemoryWebhookStore()
      const result = await store.getEvent('non-existent-id')
      expect(result).toBeNull()
    })
  })
})
