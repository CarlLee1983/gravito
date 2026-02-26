import { beforeEach, describe, expect, test } from 'bun:test'
import { DeadLetterQueue } from '../../src/dead-letter-queue/DeadLetterQueue'

describe('DeadLetterQueue', () => {
  let dlq: DeadLetterQueue

  beforeEach(() => {
    dlq = new DeadLetterQueue(100) // maxEntries
  })

  describe('Initialization', () => {
    test('should create DLQ instance', () => {
      expect(dlq).toBeDefined()
    })

    test('should initialize with default config', () => {
      const defaultDLQ = new DeadLetterQueue()
      expect(defaultDLQ).toBeDefined()
    })

    test('should initialize with custom maxEntries', () => {
      const customDLQ = new DeadLetterQueue(50)
      expect(customDLQ).toBeDefined()
    })

    test('should have empty DLQ on creation', () => {
      expect(dlq.getCount()).toBe(0)
    })
  })

  describe('Adding Entries', () => {
    test('should add a DLQ entry', () => {
      const entryId = dlq.add(
        'test:event',
        { data: 'test' },
        { timeout: 5000 },
        new Error('Processing failed'),
        0,
        Date.now(),
        'retry_exhausted'
      )
      expect(entryId).toBeDefined()
      expect(entryId.startsWith('dlq-')).toBe(true)
    })

    test('should increment count after adding', () => {
      dlq.add(
        'test:event',
        { data: 'test' },
        { timeout: 5000 },
        new Error('test error'),
        0,
        Date.now(),
        'retry_exhausted'
      )
      expect(dlq.getCount()).toBe(1)
    })

    test('should preserve error information', () => {
      const error = new Error('Detailed error message')
      const entryId = dlq.add(
        'test:event',
        { data: 'test' },
        { timeout: 5000 },
        error,
        2,
        Date.now(),
        'retry_exhausted'
      )

      const entry = dlq.get(entryId)
      expect(entry).toBeDefined()
      expect(entry?.error.message).toBe('Detailed error message')
    })

    test('should track retry count', () => {
      const entryId = dlq.add(
        'test:event',
        { data: 'test' },
        { timeout: 5000 },
        new Error('test'),
        3,
        Date.now(),
        'retry_exhausted'
      )

      const entry = dlq.get(entryId)
      expect(entry?.retryCount).toBe(3)
    })
  })

  describe('Retrieving Entries', () => {
    test('should get entry by ID', () => {
      const entryId = dlq.add(
        'test:event',
        { data: 'test' },
        { timeout: 5000 },
        new Error('test'),
        0,
        Date.now(),
        'retry_exhausted'
      )

      const entry = dlq.get(entryId)
      expect(entry).toBeDefined()
      expect(entry?.eventName).toBe('test:event')
      expect(entry?.id).toBe(entryId)
    })

    test('should return undefined for non-existent ID', () => {
      const entry = dlq.get('non-existent-id')
      expect(entry).toBeUndefined()
    })

    test('should list all entries', () => {
      dlq.add('event1', {}, { timeout: 5000 }, new Error('err1'), 0, Date.now(), 'retry_exhausted')
      dlq.add('event2', {}, { timeout: 5000 }, new Error('err2'), 0, Date.now(), 'retry_exhausted')

      const entries = dlq.list()
      expect(entries.length).toBe(2)
    })

    test('should support filtering by event name', () => {
      dlq.add('event1', {}, { timeout: 5000 }, new Error('err1'), 0, Date.now(), 'retry_exhausted')
      dlq.add('event2', {}, { timeout: 5000 }, new Error('err2'), 0, Date.now(), 'retry_exhausted')

      const entries = dlq.list({ eventName: 'event1' })
      expect(entries.length).toBe(1)
      expect(entries[0].eventName).toBe('event1')
    })

    test('should support limiting result count', () => {
      for (let i = 0; i < 5; i++) {
        dlq.add(
          'test:event',
          {},
          { timeout: 5000 },
          new Error('test'),
          0,
          Date.now(),
          'retry_exhausted'
        )
      }

      const entries = dlq.list({ limit: 2 })
      expect(entries.length).toBe(2)
    })

    test('should support time range filtering', () => {
      const now = Date.now()
      dlq.add('event1', {}, { timeout: 5000 }, new Error('err'), 0, now, 'retry_exhausted')
      dlq.add('event2', {}, { timeout: 5000 }, new Error('err'), 0, now, 'retry_exhausted')

      const entries = dlq.list({ from: now - 5000, to: now + 5000 })
      expect(entries.length).toBe(2)
    })
  })

  describe('Deleting Entries', () => {
    test('should delete entry by ID', () => {
      const entryId = dlq.add(
        'test:event',
        {},
        { timeout: 5000 },
        new Error('test'),
        0,
        Date.now(),
        'retry_exhausted'
      )

      expect(dlq.delete(entryId)).toBe(true)
      expect(dlq.get(entryId)).toBeUndefined()
    })

    test('should return false when deleting non-existent ID', () => {
      expect(dlq.delete('non-existent')).toBe(false)
    })

    test('should delete all matching entries', () => {
      dlq.add('event1', {}, { timeout: 5000 }, new Error('err'), 0, Date.now(), 'retry_exhausted')
      dlq.add('event1', {}, { timeout: 5000 }, new Error('err'), 0, Date.now(), 'retry_exhausted')
      dlq.add('event2', {}, { timeout: 5000 }, new Error('err'), 0, Date.now(), 'retry_exhausted')

      const deleted = dlq.deleteAll({ eventName: 'event1' })
      expect(deleted).toBe(2)
      expect(dlq.getCount()).toBe(1)
    })

    test('should clear all entries', () => {
      dlq.add('event1', {}, { timeout: 5000 }, new Error('err'), 0, Date.now(), 'retry_exhausted')
      dlq.add('event2', {}, { timeout: 5000 }, new Error('err'), 0, Date.now(), 'retry_exhausted')

      dlq.clear()
      expect(dlq.getCount()).toBe(0)
    })
  })

  describe('Capacity Management', () => {
    test('should evict oldest when capacity exceeded', () => {
      const smallDLQ = new DeadLetterQueue(2)

      const now = Date.now()
      const id1 = smallDLQ.add(
        'event1',
        {},
        { timeout: 5000 },
        new Error('err'),
        0,
        now,
        'retry_exhausted'
      )

      // Wait a tiny bit to ensure different timestamps
      const _id2 = smallDLQ.add(
        'event2',
        {},
        { timeout: 5000 },
        new Error('err'),
        0,
        now + 1,
        'retry_exhausted'
      )

      smallDLQ.add('event3', {}, { timeout: 5000 }, new Error('err'), 0, now + 2, 'retry_exhausted')

      expect(smallDLQ.getCount()).toBe(2)
      expect(smallDLQ.get(id1)).toBeUndefined() // oldest was evicted
    })

    test('should report max entries', () => {
      expect(dlq.getMaxEntries()).toBe(100)
    })

    test('should allow setting max entries', () => {
      dlq.setMaxEntries(50)
      expect(dlq.getMaxEntries()).toBe(50)
    })
  })

  describe('Statistics', () => {
    test('should count entries by event', () => {
      dlq.add('event1', {}, { timeout: 5000 }, new Error('err'), 0, Date.now(), 'retry_exhausted')
      dlq.add('event1', {}, { timeout: 5000 }, new Error('err'), 0, Date.now(), 'retry_exhausted')
      dlq.add('event2', {}, { timeout: 5000 }, new Error('err'), 0, Date.now(), 'retry_exhausted')

      expect(dlq.getCountByEvent('event1')).toBe(2)
      expect(dlq.getCountByEvent('event2')).toBe(1)
    })

    test('should get oldest entry', () => {
      dlq.add('event1', {}, { timeout: 5000 }, new Error('err'), 0, Date.now(), 'retry_exhausted')
      dlq.add('event2', {}, { timeout: 5000 }, new Error('err'), 0, Date.now(), 'retry_exhausted')

      const oldest = dlq.getOldestEntry()
      expect(oldest).toBeDefined()
      expect(oldest?.id).toBeDefined()
    })

    test('should get newest entry', () => {
      dlq.add('event1', {}, { timeout: 5000 }, new Error('err'), 0, Date.now(), 'retry_exhausted')
      dlq.add('event2', {}, { timeout: 5000 }, new Error('err'), 0, Date.now(), 'retry_exhausted')

      const newest = dlq.getNewestEntry()
      expect(newest).toBeDefined()
      expect(newest?.id).toBeDefined()
    })
  })

  describe('Entry Sources', () => {
    test('should get entries by source', () => {
      dlq.add('event1', {}, { timeout: 5000 }, new Error('err'), 0, Date.now(), 'retry_exhausted')
      dlq.add('event2', {}, { timeout: 5000 }, new Error('err'), 0, Date.now(), 'circuit_breaker')

      const retryExhausted = dlq.getEntriesBySource('retry_exhausted')
      const circuitBreakerEntries = dlq.getEntriesBySource('circuit_breaker')

      expect(retryExhausted.length).toBe(1)
      expect(circuitBreakerEntries.length).toBe(1)
    })
  })

  describe('Callbacks', () => {
    test('should call onEntryAdded callback', () => {
      let callbackCalled = false
      dlq.setOnEntryAdded(() => {
        callbackCalled = true
      })

      dlq.add(
        'test:event',
        {},
        { timeout: 5000 },
        new Error('err'),
        0,
        Date.now(),
        'retry_exhausted'
      )
      expect(callbackCalled).toBe(true)
    })

    test('should call onEntryRemoved callback', () => {
      let callbackCalled = false
      dlq.setOnEntryRemoved(() => {
        callbackCalled = true
      })

      const entryId = dlq.add(
        'test:event',
        {},
        { timeout: 5000 },
        new Error('err'),
        0,
        Date.now(),
        'retry_exhausted'
      )
      dlq.delete(entryId)
      expect(callbackCalled).toBe(true)
    })
  })

  describe('Update Operations', () => {
    test('should update last retried timestamp', () => {
      const entryId = dlq.add(
        'test:event',
        {},
        { timeout: 5000 },
        new Error('err'),
        0,
        Date.now(),
        'retry_exhausted'
      )

      let entry = dlq.get(entryId)
      expect(entry?.lastRetriedAt).toBeUndefined()

      dlq.updateLastRetried(entryId)
      entry = dlq.get(entryId)
      expect(entry?.lastRetriedAt).toBeDefined()
    })
  })
})
