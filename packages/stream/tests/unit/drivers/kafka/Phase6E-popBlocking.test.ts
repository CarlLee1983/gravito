import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { KafkaDriver } from '../../../../src/drivers/kafka/KafkaDriver'
import type {
  KafkaAdminClient,
  KafkaClientFactory,
  KafkaConsumerClient,
  KafkaMessage,
  KafkaProducerClient,
} from '../../../../src/drivers/kafka/types'
import type { SerializedJob } from '../../../../src/types'

function createTestJob(id = 'job-1'): SerializedJob {
  return {
    id,
    type: 'json',
    data: '{"test": true}',
    createdAt: Date.now(),
  }
}

function createMockKafkaClient(): {
  client: KafkaClientFactory
  simulateMessage: (topic: string, partition: number, message: KafkaMessage) => Promise<void>
} {
  let eachMessageHandler: Function | null = null

  const producer: KafkaProducerClient = {
    connect: async () => {},
    send: mock(async (args: any) =>
      args.messages.map((_: any, i: number) => ({
        topicName: args.topic,
        partition: 0,
        errorCode: 0,
        offset: String(i),
      }))
    ),
    disconnect: async () => {},
  }

  const consumer: KafkaConsumerClient = {
    connect: async () => {},
    subscribe: async () => {},
    run: async ({ eachMessage }: any) => {
      eachMessageHandler = eachMessage
    },
    commitOffsets: async () => {},
    seek: () => {},
    pause: mock(() => {}),
    resume: mock(() => {}),
    disconnect: async () => {},
  }

  const admin: KafkaAdminClient = {
    connect: async () => {},
    createTopics: async () => true,
    deleteTopics: async () => {},
    fetchTopicOffsets: async () => [],
    fetchOffsets: async () => [],
    listTopics: async () => [],
    disconnect: async () => {},
  }

  const client: KafkaClientFactory = {
    producer: () => producer,
    consumer: () => consumer,
    admin: () => admin,
  }

  const simulateMessage = async (topic: string, partition: number, message: KafkaMessage) => {
    if (eachMessageHandler) {
      await eachMessageHandler({ topic, partition, message })
    }
  }

  return { client, simulateMessage }
}

describe('Phase 6E-4: popBlocking Optimization', () => {
  let driver: KafkaDriver
  let mockClient: ReturnType<typeof createMockKafkaClient>

  beforeEach(() => {
    mockClient = createMockKafkaClient()
    driver = new KafkaDriver({
      client: mockClient.client,
      bufferSize: 100,
    })
  })

  describe('Event-Driven popBlocking', () => {
    it('should return immediately when buffer has data', async () => {
      const job = createTestJob('immediate-job')

      // Initialize consumer first
      await driver.pop('test-queue')

      // Simulate a message arriving in the buffer
      await mockClient.simulateMessage('test-queue', 0, {
        value: Buffer.from(JSON.stringify(job)),
        offset: '0',
      })

      const start = Date.now()
      const result = await driver.popBlocking('test-queue', 5)
      const elapsed = Date.now() - start

      expect(result).not.toBeNull()
      expect(result?.id).toBe('immediate-job')
      // Should be near-instant (< 50ms), not waiting for polling
      expect(elapsed).toBeLessThan(50)
    })

    it('should wait for message arrival via event', async () => {
      // Initialize consumer
      await driver.pop('test-queue')

      const job = createTestJob('event-job')

      // Start popBlocking in background
      const popPromise = driver.popBlocking('test-queue', 5)

      // Simulate message arriving after 50ms
      setTimeout(async () => {
        await mockClient.simulateMessage('test-queue', 0, {
          value: Buffer.from(JSON.stringify(job)),
          offset: '0',
        })
      }, 50)

      const start = Date.now()
      const result = await popPromise
      const elapsed = Date.now() - start

      expect(result).not.toBeNull()
      expect(result?.id).toBe('event-job')
      // Should resolve quickly after event (< 200ms), not polling at 100ms intervals
      expect(elapsed).toBeLessThan(200)
    })

    it('should return null on timeout', async () => {
      const start = Date.now()
      const result = await driver.popBlocking('test-queue', 0.1) // 100ms timeout
      const elapsed = Date.now() - start

      expect(result).toBeNull()
      // Should timeout around 100ms
      expect(elapsed).toBeGreaterThanOrEqual(90)
      expect(elapsed).toBeLessThan(300)
    })

    it('should handle multiple queues and return from first available', async () => {
      // Initialize consumers
      await driver.pop('queue-a')
      await driver.pop('queue-b')

      const job = createTestJob('multi-queue-job')

      const popPromise = driver.popBlocking(['queue-a', 'queue-b'], 5)

      // Send to queue-b first
      setTimeout(async () => {
        await mockClient.simulateMessage('queue-b', 0, {
          value: Buffer.from(JSON.stringify(job)),
          offset: '0',
        })
      }, 30)

      const result = await popPromise
      expect(result).not.toBeNull()
      expect(result?.id).toBe('multi-queue-job')
    })

    it('should ignore events for unrelated queues', async () => {
      // Initialize consumers
      await driver.pop('target-queue')
      await driver.pop('other-queue')

      const otherJob = createTestJob('other-job')
      const targetJob = createTestJob('target-job')

      const popPromise = driver.popBlocking('target-queue', 2)

      // Send to unrelated queue first
      setTimeout(async () => {
        await mockClient.simulateMessage('other-queue', 0, {
          value: Buffer.from(JSON.stringify(otherJob)),
          offset: '0',
        })
      }, 20)

      // Then send to target queue
      setTimeout(async () => {
        await mockClient.simulateMessage('target-queue', 0, {
          value: Buffer.from(JSON.stringify(targetJob)),
          offset: '1',
        })
      }, 60)

      const result = await popPromise
      expect(result).not.toBeNull()
      expect(result?.id).toBe('target-job')
    })

    it('should handle string queue parameter', async () => {
      await driver.pop('single-queue')

      const job = createTestJob('string-param-job')

      const popPromise = driver.popBlocking('single-queue', 5)

      setTimeout(async () => {
        await mockClient.simulateMessage('single-queue', 0, {
          value: Buffer.from(JSON.stringify(job)),
          offset: '0',
        })
      }, 20)

      const result = await popPromise
      expect(result).not.toBeNull()
      expect(result?.id).toBe('string-param-job')
    })
  })

  describe('Reverse Index (clear optimization)', () => {
    it('should maintain reverse index on message arrival', async () => {
      await driver.pop('test-queue')

      const job1 = createTestJob('job-1')
      const job2 = createTestJob('job-2')

      await mockClient.simulateMessage('test-queue', 0, {
        value: Buffer.from(JSON.stringify(job1)),
        offset: '0',
      })
      await mockClient.simulateMessage('test-queue', 0, {
        value: Buffer.from(JSON.stringify(job2)),
        offset: '1',
      })

      // Reverse index should have both IDs
      const topicIds = driver.topicToMessageIds.get('test-queue')
      expect(topicIds).toBeDefined()
      expect(topicIds?.has('job-1')).toBe(true)
      expect(topicIds?.has('job-2')).toBe(true)
    })

    it('should clear messageIdToMeta via reverse index in O(1)', async () => {
      await driver.pop('test-queue')

      // Add multiple messages
      for (let i = 0; i < 10; i++) {
        const job = createTestJob(`job-${i}`)
        await mockClient.simulateMessage('test-queue', 0, {
          value: Buffer.from(JSON.stringify(job)),
          offset: String(i),
        })
      }

      expect(driver.messageIdToMeta.size).toBe(10)
      expect(driver.topicToMessageIds.get('test-queue')?.size).toBe(10)

      // Clear should remove all entries for this topic
      await driver.clear('test-queue')

      expect(driver.messageIdToMeta.size).toBe(0)
      expect(driver.topicToMessageIds.has('test-queue')).toBe(false)
    })

    it('should only clear entries for the specified queue', async () => {
      await driver.pop('queue-a')
      await driver.pop('queue-b')

      // Add messages to both queues
      for (let i = 0; i < 5; i++) {
        await mockClient.simulateMessage('queue-a', 0, {
          value: Buffer.from(JSON.stringify(createTestJob(`a-${i}`))),
          offset: String(i),
        })
        await mockClient.simulateMessage('queue-b', 0, {
          value: Buffer.from(JSON.stringify(createTestJob(`b-${i}`))),
          offset: String(i),
        })
      }

      expect(driver.messageIdToMeta.size).toBe(10)

      // Clear only queue-a
      await driver.clear('queue-a')

      // queue-a entries should be gone
      expect(driver.topicToMessageIds.has('queue-a')).toBe(false)

      // queue-b entries should remain
      expect(driver.topicToMessageIds.get('queue-b')?.size).toBe(5)
      expect(driver.messageIdToMeta.size).toBe(5)
    })

    it('should update reverse index on complete()', async () => {
      await driver.pop('test-queue')

      const job = createTestJob('complete-job')
      await mockClient.simulateMessage('test-queue', 0, {
        value: Buffer.from(JSON.stringify(job)),
        offset: '0',
      })

      expect(driver.topicToMessageIds.get('test-queue')?.has('complete-job')).toBe(true)

      await driver.complete('test-queue', job)

      // Should be removed from reverse index
      const topicIds = driver.topicToMessageIds.get('test-queue')
      expect(topicIds === undefined || !topicIds.has('complete-job')).toBe(true)
    })

    it('should update reverse index on acknowledge()', async () => {
      await driver.pop('test-queue')

      const job = createTestJob('ack-job')
      await mockClient.simulateMessage('test-queue', 0, {
        value: Buffer.from(JSON.stringify(job)),
        offset: '0',
      })

      expect(driver.topicToMessageIds.get('test-queue')?.has('ack-job')).toBe(true)

      await driver.acknowledge('ack-job')

      const topicIds = driver.topicToMessageIds.get('test-queue')
      expect(topicIds === undefined || !topicIds.has('ack-job')).toBe(true)
    })

    it('should clean up empty topic sets from reverse index', async () => {
      await driver.pop('test-queue')

      const job = createTestJob('only-job')
      await mockClient.simulateMessage('test-queue', 0, {
        value: Buffer.from(JSON.stringify(job)),
        offset: '0',
      })

      expect(driver.topicToMessageIds.has('test-queue')).toBe(true)

      await driver.complete('test-queue', job)

      // When the last message is removed, the topic entry should be cleaned up
      expect(driver.topicToMessageIds.has('test-queue')).toBe(false)
    })
  })

  describe('Serialization Cache (WeakMap)', () => {
    it('should cache serialized payload for same job object reference', async () => {
      const job = createTestJob('cached-job')

      await driver.push('test-queue', job)
      await driver.push('test-queue', job) // Same object reference

      // WeakMap caches by object reference; verify via send calls
      const sendMock = mockClient.client.producer().send as any
      const calls = sendMock.mock.calls
      // Both calls should have identical serialized payload (same string reference from cache)
      expect(calls[0][0].messages[0].value).toBe(calls[1][0].messages[0].value)
    })

    it('should not share cache between different job objects', async () => {
      const job1 = createTestJob('job-1')
      const job2 = createTestJob('job-2')

      await driver.push('test-queue', job1)
      await driver.push('test-queue', job2)

      const sendMock = mockClient.client.producer().send as any
      const calls = sendMock.mock.calls
      // Different objects produce different payloads
      expect(calls[0][0].messages[0].value).not.toBe(calls[1][0].messages[0].value)
    })

    it('should produce correct serialization output', async () => {
      const job = createTestJob('correct-job')
      const expected = JSON.stringify(job)

      await driver.push('test-queue', job)

      const sendMock = mockClient.client.producer().send as any
      const payload = sendMock.mock.calls[0][0].messages[0].value
      expect(payload).toBe(expected)
    })

    it('should use cache in pushMany()', async () => {
      const job = createTestJob('batch-cached')
      const jobs = [job, job, job] // Same object reference 3 times

      await driver.pushMany('test-queue', jobs)

      const sendMock = mockClient.client.producer().send as any
      const messages = sendMock.mock.calls[0][0].messages
      // All three should share the same string reference from cache
      expect(messages[0].value).toBe(messages[1].value)
      expect(messages[1].value).toBe(messages[2].value)
    })

    it('should be a WeakMap for automatic GC', () => {
      // WeakMap keys are weakly held - no manual eviction needed
      const cache = driver.serializationCache
      expect(cache instanceof WeakMap).toBe(true)
    })
  })

  describe('Latency Improvement Verification', () => {
    it('should resolve popBlocking within 10ms when message arrives', async () => {
      await driver.pop('latency-queue')

      const job = createTestJob('latency-job')

      // Pre-buffer the message
      await mockClient.simulateMessage('latency-queue', 0, {
        value: Buffer.from(JSON.stringify(job)),
        offset: '0',
      })

      const start = performance.now()
      const result = await driver.popBlocking('latency-queue', 5)
      const elapsed = performance.now() - start

      expect(result).not.toBeNull()
      // Event-driven should be much faster than 100ms polling
      expect(elapsed).toBeLessThan(10)
    })

    it('should handle rapid successive popBlocking calls efficiently', async () => {
      await driver.pop('rapid-queue')

      // Pre-buffer 5 messages
      for (let i = 0; i < 5; i++) {
        await mockClient.simulateMessage('rapid-queue', 0, {
          value: Buffer.from(JSON.stringify(createTestJob(`rapid-${i}`))),
          offset: String(i),
        })
      }

      const start = performance.now()
      const results: SerializedJob[] = []

      for (let i = 0; i < 5; i++) {
        const result = await driver.popBlocking('rapid-queue', 1)
        if (result) {
          results.push(result)
        }
      }

      const elapsed = performance.now() - start

      expect(results).toHaveLength(5)
      // All 5 should resolve near-instantly (< 50ms total)
      expect(elapsed).toBeLessThan(50)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero timeout', async () => {
      const result = await driver.popBlocking('test-queue', 0)
      expect(result).toBeNull()
    })

    it('should handle concurrent popBlocking on same queue', async () => {
      await driver.pop('concurrent-queue')

      const job = createTestJob('concurrent-job')

      // Start two concurrent popBlocking calls
      const pop1 = driver.popBlocking('concurrent-queue', 2)
      const pop2 = driver.popBlocking('concurrent-queue', 2)

      // Only one message arrives
      setTimeout(async () => {
        await mockClient.simulateMessage('concurrent-queue', 0, {
          value: Buffer.from(JSON.stringify(job)),
          offset: '0',
        })
      }, 30)

      const [result1, result2] = await Promise.all([pop1, pop2])

      // One should get the message, the other should timeout or get null
      const gotJob = [result1, result2].filter((r) => r !== null)
      expect(gotJob).toHaveLength(1)
      expect(gotJob[0]?.id).toBe('concurrent-job')
    })

    it('should handle disconnect during popBlocking', async () => {
      await driver.pop('disconnect-queue')

      const popPromise = driver.popBlocking('disconnect-queue', 5)

      // Disconnect while waiting
      setTimeout(async () => {
        await driver.disconnect()
      }, 50)

      const result = await popPromise
      // Should resolve to null when buffer is destroyed
      expect(result).toBeNull()
    })
  })

  describe('Reverse Index + Disconnect Integration', () => {
    it('should clear all indexes on disconnect', async () => {
      await driver.pop('test-queue')

      for (let i = 0; i < 5; i++) {
        await mockClient.simulateMessage('test-queue', 0, {
          value: Buffer.from(JSON.stringify(createTestJob(`cleanup-${i}`))),
          offset: String(i),
        })
      }

      expect(driver.messageIdToMeta.size).toBe(5)
      expect(driver.topicToMessageIds.size).toBeGreaterThan(0)

      await driver.disconnect()

      expect(driver.messageIdToMeta.size).toBe(0)
      expect(driver.topicToMessageIds.size).toBe(0)
      // serializationCache is WeakMap - auto GC, no manual clear needed
    })

    it('should handle large message map efficiently in clear()', async () => {
      await driver.pop('large-queue')
      await driver.pop('other-queue')

      // Add 1000 messages to large-queue
      for (let i = 0; i < 1000; i++) {
        await mockClient.simulateMessage('large-queue', 0, {
          value: Buffer.from(JSON.stringify(createTestJob(`large-${i}`))),
          offset: String(i),
        })
      }

      // Add 100 messages to other-queue
      for (let i = 0; i < 100; i++) {
        await mockClient.simulateMessage('other-queue', 0, {
          value: Buffer.from(JSON.stringify(createTestJob(`other-${i}`))),
          offset: String(i),
        })
      }

      expect(driver.messageIdToMeta.size).toBe(1100)

      const start = performance.now()
      await driver.clear('large-queue')
      const elapsed = performance.now() - start

      // Should be fast (reverse index avoids O(1100) scan)
      expect(elapsed).toBeLessThan(50)
      expect(driver.messageIdToMeta.size).toBe(100) // Only other-queue remains
      expect(driver.topicToMessageIds.has('large-queue')).toBe(false)
      expect(driver.topicToMessageIds.get('other-queue')?.size).toBe(100)
    })
  })
})
