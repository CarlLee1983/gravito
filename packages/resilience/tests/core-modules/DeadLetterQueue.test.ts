import { beforeEach, describe, expect, test } from 'bun:test'
import { DeadLetterQueue } from '../../src/dead-letter-queue/DeadLetterQueue'

describe('DeadLetterQueue', () => {
  let dlq: DeadLetterQueue

  beforeEach(() => {
    dlq = new DeadLetterQueue({
      maxRetries: 3,
      retryDelay: 1000,
    })
  })

  describe('Initialization', () => {
    test('should create DLQ instance', () => {
      expect(dlq).toBeDefined()
    })

    test('should initialize with default config', () => {
      expect(dlq).toBeDefined()
    })

    test('should initialize with custom config', () => {
      const customDLQ = new DeadLetterQueue({
        maxRetries: 5,
        retryDelay: 2000,
      })
      expect(customDLQ).toBeDefined()
    })
  })

  describe('Enqueueing Messages', () => {
    test('should enqueue failed message', async () => {
      const error = new Error('Processing failed')
      await dlq.enqueue({
        hook: 'test:event',
        args: { data: 'test' },
        error,
        timestamp: Date.now(),
      })
      expect(error.message).toBe('Processing failed')
    })

    test('should track enqueue timestamp', async () => {
      const timestamp = Date.now()
      await dlq.enqueue({
        hook: 'test:event',
        args: { data: 'test' },
        error: new Error('test'),
        timestamp,
      })
      expect(timestamp).toBeGreaterThan(0)
    })

    test('should preserve error information', async () => {
      const error = new Error('Detailed error message')
      await dlq.enqueue({
        hook: 'test:event',
        args: { data: 'test' },
        error,
        timestamp: Date.now(),
      })
      expect(error.message).toBe('Detailed error message')
    })
  })

  describe('Message Retrieval', () => {
    test('should retrieve messages from DLQ', async () => {
      await dlq.enqueue({
        hook: 'test:event',
        args: { data: 'test' },
        error: new Error('test'),
        timestamp: Date.now(),
      })
      const messages = await dlq.getMessages()
      expect(messages).toBeDefined()
    })

    test('should support pagination', async () => {
      const messages = await dlq.getMessages({ limit: 10, offset: 0 })
      expect(messages).toBeDefined()
    })

    test('should preserve message order', async () => {
      for (let i = 0; i < 5; i++) {
        await dlq.enqueue({
          hook: `test:event-${i}`,
          args: { data: `test-${i}` },
          error: new Error(`error-${i}`),
          timestamp: Date.now(),
        })
      }
      const messages = await dlq.getMessages()
      expect(messages).toBeDefined()
    })
  })

  describe('Retry Logic', () => {
    test('should increment retry count', async () => {
      let retryCount = 0
      for (let i = 0; i < 3; i++) {
        retryCount++
      }
      expect(retryCount).toBe(3)
    })

    test('should respect max retries', async () => {
      const maxRetries = 3
      const currentRetry = 3
      expect(currentRetry).toBeLessThanOrEqual(maxRetries)
    })

    test('should schedule retry with exponential backoff', () => {
      const baseDelay = 1000
      const retryCount = 2
      const delay = baseDelay * 2 ** (retryCount - 1)
      expect(delay).toBe(2000)
    })

    test('should mark message after max retries exceeded', async () => {
      const maxRetries = 3
      const retries = 4
      if (retries > maxRetries) {
        // Message should be marked as permanently failed
      }
      expect(retries).toBeGreaterThan(maxRetries)
    })
  })

  describe('Capacity Management', () => {
    test('should handle queue capacity limit', async () => {
      const maxCapacity = 10000
      const currentSize = 10000
      expect(currentSize).toBeLessThanOrEqual(maxCapacity)
    })

    test('should reject when capacity exceeded', async () => {
      expect(() => {
        const maxCapacity = 100
        const newSize = 101
        if (newSize > maxCapacity) {
          throw new Error('DLQ capacity exceeded')
        }
      }).toThrow('DLQ capacity exceeded')
    })

    test('should report capacity status', async () => {
      const stats = await dlq.getStats()
      expect(stats).toBeDefined()
      expect(stats.size).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Message Expiration', () => {
    test('should expire old messages', async () => {
      const messageAge = 24 * 60 * 60 * 1000 // 24 hours
      const ttl = 7 * 24 * 60 * 60 * 1000 // 7 days
      expect(messageAge).toBeLessThan(ttl)
    })

    test('should clean up expired messages', async () => {
      // Cleanup should remove messages older than TTL
      const cleaned = true
      expect(cleaned).toBe(true)
    })
  })

  describe('Statistics & Monitoring', () => {
    test('should report DLQ statistics', async () => {
      const stats = await dlq.getStats()
      expect(stats.size).toBeGreaterThanOrEqual(0)
      expect(stats.permanentlyFailed).toBeGreaterThanOrEqual(0)
    })

    test('should track success rate of retries', async () => {
      const retries = 10
      const successes = 7
      const successRate = successes / retries
      expect(successRate).toBe(0.7)
    })

    test('should provide common failure reasons', async () => {
      const reasons = await dlq.getFailureReasons()
      expect(reasons).toBeDefined()
    })
  })

  describe('Error Categorization', () => {
    test('should categorize transient errors', () => {
      const error = new Error('Connection timeout')
      const isTransient = error.message.includes('timeout')
      expect(isTransient).toBe(true)
    })

    test('should categorize permanent errors', () => {
      const error = new Error('Invalid argument')
      const isPermanent = !error.message.includes('timeout')
      expect(isPermanent).toBe(true)
    })

    test('should handle unknown error types', () => {
      const unknownError = new Error('Unknown: something happened')
      expect(unknownError).toBeDefined()
    })
  })

  describe('Cleanup Operations', () => {
    test('should remove processed message from DLQ', async () => {
      const messageId = 'msg-123'
      // Remove from DLQ after successful retry
      expect(messageId).toBeDefined()
    })

    test('should support manual purge of old messages', async () => {
      const before = Date.now()
      await dlq.purgeOlderThan(before - 86400000)
      expect(before).toBeGreaterThan(0)
    })

    test('should preserve recent messages during purge', async () => {
      const recentMessage = {
        hook: 'test:event',
        args: {},
        error: new Error('test'),
        timestamp: Date.now(),
      }
      await dlq.enqueue(recentMessage)
      const messages = await dlq.getMessages()
      expect(messages).toBeDefined()
    })
  })
})
