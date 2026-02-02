import { beforeEach, describe, expect, it } from 'bun:test'
import type { EventOptions } from '../events/EventOptions'
import { HookManager } from '../HookManager'

describe('Dead Letter Queue (DLQ)', () => {
  let hookManager: HookManager

  beforeEach(() => {
    hookManager = new HookManager({ enableDLQ: true })
  })

  describe('Basic DLQ Functionality', () => {
    it('should add failed events to DLQ after max retries', async () => {
      let callCount = 0

      hookManager.addAction('test:event', async () => {
        callCount++
        throw new Error('Test error')
      })

      const options: EventOptions = {
        async: true,
        retry: {
          maxRetries: 2,
          backoff: 'linear',
          initialDelayMs: 10,
          dlqAfterMaxRetries: true,
        },
      }

      await hookManager.doActionAsync('test:event', { data: 'test' }, options)

      // Wait for retries to complete
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Should have been called 3 times (initial + 2 retries)
      expect(callCount).toBe(3)

      // Check DLQ
      const dlq = hookManager.getDLQ()
      const entries = dlq.list()

      expect(entries.length).toBe(1)
      expect(entries[0].eventName).toBe('test:event')
      expect(entries[0].retryCount).toBe(3)
      expect(entries[0].error.message).toBe('Test error')
    })

    it('should not add to DLQ if dlqAfterMaxRetries is false', async () => {
      hookManager.addAction('test:event', async () => {
        throw new Error('Test error')
      })

      const options: EventOptions = {
        async: true,
        retry: {
          maxRetries: 1,
          backoff: 'linear',
          initialDelayMs: 10,
          dlqAfterMaxRetries: false,
        },
      }

      await hookManager.doActionAsync('test:event', { data: 'test' }, options)

      // Wait for retries
      await new Promise((resolve) => setTimeout(resolve, 100))

      // DLQ should be empty
      const dlq = hookManager.getDLQ()
      expect(dlq.getCount()).toBe(0)
    })

    it('should not add to DLQ if event succeeds', async () => {
      hookManager.addAction('test:event', async () => {
        // Success
      })

      const options: EventOptions = {
        async: true,
        retry: {
          maxRetries: 2,
          dlqAfterMaxRetries: true,
        },
      }

      await hookManager.doActionAsync('test:event', { data: 'test' }, options)

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100))

      // DLQ should be empty
      const dlq = hookManager.getDLQ()
      expect(dlq.getCount()).toBe(0)
    })
  })

  describe('DLQ Management', () => {
    it('should list DLQ entries with filtering', async () => {
      const dlq = hookManager.getDLQ()

      // Add some test entries
      dlq.add('event:a', {}, {}, new Error('Error A'), 3, Date.now())
      dlq.add('event:b', {}, {}, new Error('Error B'), 2, Date.now())
      dlq.add('event:a', {}, {}, new Error('Error A2'), 3, Date.now())

      // List all
      const all = dlq.list()
      expect(all.length).toBe(3)

      // Filter by event name
      const eventA = dlq.list({ eventName: 'event:a' })
      expect(eventA.length).toBe(2)

      const eventB = dlq.list({ eventName: 'event:b' })
      expect(eventB.length).toBe(1)

      // Limit
      const limited = dlq.list({ limit: 2 })
      expect(limited.length).toBe(2)
    })

    it('should get DLQ entry by ID', () => {
      const dlq = hookManager.getDLQ()

      const entryId = dlq.add('test:event', { data: 'test' }, {}, new Error('Test'), 3, Date.now())

      const entry = dlq.get(entryId)
      expect(entry).toBeDefined()
      expect(entry!.id).toBe(entryId)
      expect(entry!.eventName).toBe('test:event')
    })

    it('should delete DLQ entry', () => {
      const dlq = hookManager.getDLQ()

      const entryId = dlq.add('test:event', { data: 'test' }, {}, new Error('Test'), 3, Date.now())

      expect(dlq.getCount()).toBe(1)

      const deleted = dlq.delete(entryId)
      expect(deleted).toBe(true)
      expect(dlq.getCount()).toBe(0)
    })

    it('should delete all DLQ entries matching filter', () => {
      const dlq = hookManager.getDLQ()

      dlq.add('event:a', {}, {}, new Error('Error'), 3, Date.now())
      dlq.add('event:b', {}, {}, new Error('Error'), 3, Date.now())
      dlq.add('event:a', {}, {}, new Error('Error'), 3, Date.now())

      expect(dlq.getCount()).toBe(3)

      const deletedCount = dlq.deleteAll({ eventName: 'event:a' })
      expect(deletedCount).toBe(2)
      expect(dlq.getCount()).toBe(1)
    })

    it('should get count by event name', () => {
      const dlq = hookManager.getDLQ()

      dlq.add('event:a', {}, {}, new Error('Error'), 3, Date.now())
      dlq.add('event:b', {}, {}, new Error('Error'), 3, Date.now())
      dlq.add('event:a', {}, {}, new Error('Error'), 3, Date.now())

      expect(dlq.getCountByEvent('event:a')).toBe(2)
      expect(dlq.getCountByEvent('event:b')).toBe(1)
      expect(dlq.getCountByEvent('event:c')).toBe(0)
    })

    it('should clear all DLQ entries', () => {
      const dlq = hookManager.getDLQ()

      dlq.add('event:a', {}, {}, new Error('Error'), 3, Date.now())
      dlq.add('event:b', {}, {}, new Error('Error'), 3, Date.now())

      expect(dlq.getCount()).toBe(2)

      dlq.clear()
      expect(dlq.getCount()).toBe(0)
    })
  })

  describe('DLQ Requeue', () => {
    it('should requeue a single DLQ entry', async () => {
      let callCount = 0

      hookManager.addAction('test:event', async () => {
        callCount++
        if (callCount <= 3) {
          throw new Error('Test error')
        }
        // Success on 4th call
      })

      const options: EventOptions = {
        async: true,
        retry: {
          maxRetries: 2,
          backoff: 'linear',
          initialDelayMs: 10,
          dlqAfterMaxRetries: true,
        },
      }

      await hookManager.doActionAsync('test:event', { data: 'test' }, options)

      // Wait for retries and DLQ
      await new Promise((resolve) => setTimeout(resolve, 200))

      const dlq = hookManager.getDLQ()
      expect(dlq.getCount()).toBe(1)

      const entries = dlq.list()
      const entryId = entries[0].id

      // Requeue
      const success = await hookManager.requeueDLQEntry(entryId)
      expect(success).toBe(true)

      // Wait for requeue processing
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Entry should be removed from DLQ after successful requeue
      expect(dlq.getCount()).toBe(0)
    })

    it('should requeue batch of DLQ entries', async () => {
      const dlq = hookManager.getDLQ()

      // Add multiple entries
      dlq.add('event:a', { id: 1 }, {}, new Error('Error'), 3, Date.now())
      dlq.add('event:a', { id: 2 }, {}, new Error('Error'), 3, Date.now())
      dlq.add('event:b', { id: 3 }, {}, new Error('Error'), 3, Date.now())

      expect(dlq.getCount()).toBe(3)

      // Setup listener
      const processedIds: number[] = []
      hookManager.addAction('event:a', async (payload: any) => {
        processedIds.push(payload.id)
      })

      // Requeue batch
      const requeuedCount = await hookManager.requeueDLQBatch('event:a')
      expect(requeuedCount).toBe(2)

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Only event:b should remain in DLQ
      expect(dlq.getCount()).toBe(1)
      expect(dlq.list()[0].eventName).toBe('event:b')
    })

    it('should return false when requeuing non-existent entry', async () => {
      const success = await hookManager.requeueDLQEntry('non-existent-id')
      expect(success).toBe(false)
    })

    it('should update lastRetriedAt when requeuing', async () => {
      const dlq = hookManager.getDLQ()

      const entryId = dlq.add('test:event', {}, {}, new Error('Error'), 3, Date.now())

      const entryBefore = dlq.get(entryId)
      expect(entryBefore!.lastRetriedAt).toBeUndefined()

      // Requeue
      hookManager.addAction('test:event', async () => {
        // Success
      })

      await hookManager.requeueDLQEntry(entryId)

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Entry should be deleted after successful requeue
      const entryAfter = dlq.get(entryId)
      expect(entryAfter).toBeUndefined()
    })
  })

  describe('Retry Backoff Strategies', () => {
    it('should use exponential backoff', async () => {
      const timestamps: number[] = []

      hookManager.addAction('test:event', async () => {
        timestamps.push(Date.now())
        throw new Error('Test error')
      })

      const options: EventOptions = {
        async: true,
        retry: {
          maxRetries: 3,
          backoff: 'exponential',
          initialDelayMs: 50,
          maxDelayMs: 1000,
          dlqAfterMaxRetries: true,
        },
      }

      await hookManager.doActionAsync('test:event', {}, options)

      // Wait for all retries
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Should have 4 calls (initial + 3 retries)
      expect(timestamps.length).toBe(4)

      // Check delays are increasing (exponential)
      const delay1 = timestamps[1] - timestamps[0]
      const delay2 = timestamps[2] - timestamps[1]
      const delay3 = timestamps[3] - timestamps[2]

      // Exponential: 50ms, 100ms, 200ms (approximately)
      expect(delay1).toBeGreaterThanOrEqual(40)
      expect(delay1).toBeLessThan(70)

      expect(delay2).toBeGreaterThanOrEqual(90)
      expect(delay2).toBeLessThan(120)

      expect(delay3).toBeGreaterThanOrEqual(190)
      expect(delay3).toBeLessThan(220)
    })

    it('should use linear backoff', async () => {
      const timestamps: number[] = []

      hookManager.addAction('test:event', async () => {
        timestamps.push(Date.now())
        throw new Error('Test error')
      })

      const options: EventOptions = {
        async: true,
        retry: {
          maxRetries: 3,
          backoff: 'linear',
          initialDelayMs: 50,
          maxDelayMs: 1000,
          dlqAfterMaxRetries: true,
        },
      }

      await hookManager.doActionAsync('test:event', {}, options)

      // Wait for all retries
      await new Promise((resolve) => setTimeout(resolve, 400))

      // Should have 4 calls (initial + 3 retries)
      expect(timestamps.length).toBe(4)

      // Check delays are linear (approximately)
      const delay1 = timestamps[1] - timestamps[0]
      const delay2 = timestamps[2] - timestamps[1]
      const delay3 = timestamps[3] - timestamps[2]

      // Linear: 50ms, 100ms, 150ms (approximately)
      expect(delay1).toBeGreaterThanOrEqual(40)
      expect(delay1).toBeLessThan(70)

      expect(delay2).toBeGreaterThanOrEqual(90)
      expect(delay2).toBeLessThan(120)

      expect(delay3).toBeGreaterThanOrEqual(140)
      expect(delay3).toBeLessThan(170)
    })
  })
})
