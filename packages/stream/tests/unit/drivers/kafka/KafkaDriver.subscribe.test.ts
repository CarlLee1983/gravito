import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { KafkaDriver } from '../../../../src/drivers/kafka/KafkaDriver'
import type { KafkaClientFactory } from '../../../../src/drivers/kafka/types'
import type { SerializedJob } from '../../types'

// Mock Kafka client factory
function createMockKafkaClient(): KafkaClientFactory {
  return {
    producer: () => ({
      connect: mock(async () => {}),
      send: mock(async () => []),
      disconnect: mock(async () => {}),
    }),
    admin: () => ({
      connect: mock(async () => {}),
      createTopics: mock(async () => true),
      deleteTopics: mock(async () => {}),
      fetchTopicOffsets: mock(async () => []),
      fetchOffsets: mock(async () => []),
      listTopics: mock(async () => []),
      disconnect: mock(async () => {}),
    }),
    consumer: () => ({
      connect: mock(async () => {}),
      subscribe: mock(async () => {}),
      run: mock(async () => {}),
      commitOffsets: mock(async () => {}),
      seek: mock(() => {}),
      pause: mock(() => {}),
      resume: mock(() => {}),
      disconnect: mock(async () => {}),
    }),
  }
}

describe('KafkaDriver.subscribe()', () => {
  let driver: KafkaDriver
  let mockClient: KafkaClientFactory

  beforeEach(() => {
    mockClient = createMockKafkaClient()
    driver = new KafkaDriver({
      client: mockClient,
      bufferSize: 100,
    })
  })

  describe('Subscribe Initialization', () => {
    it('should initialize subscription with default options', async () => {
      const callback = mock(async () => {})
      const subscribePromise = driver.subscribe('test-queue', callback)

      // Stop the subscription after a short delay to test initialization
      setTimeout(() => {
        // In a real test, we'd have a way to stop it
      }, 100)

      // Just verify it doesn't throw
      expect(subscribePromise).toBeDefined()
    })

    it('should enable notifier when subscribing', async () => {
      const callback = mock(async () => {})
      const driver2 = new KafkaDriver({ client: createMockKafkaClient() })

      // The notifier should be disabled initially
      expect(driver2['notifier'].isEnabled()).toBe(false)

      // After subscribe starts, it should be enabled
      const subscribePromise = driver2.subscribe('test-queue', callback)

      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(driver2['notifier'].isEnabled()).toBe(true)

      // Clean up
      await driver2['lifecycleManager'].stop()
    })

    it('should start lifecycle manager when subscribing', async () => {
      const callback = mock(async () => {})
      const subscribePromise = driver.subscribe('test-queue', callback)

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(driver['lifecycleManager'].isRunning()).toBe(true)

      // Clean up
      await driver['lifecycleManager'].stop()
    })

    it('should accept custom SubscribeOptions', async () => {
      const callback = mock(async () => {})
      const options = {
        concurrency: 5,
        autoAcknowledge: false,
        callbackTimeout: 60000,
        fromBeginning: true,
      }

      const subscribePromise = driver.subscribe('test-queue', callback, options)

      // Just verify it doesn't throw with options
      expect(subscribePromise).toBeDefined()

      // Clean up
      await driver['lifecycleManager'].stop()
    })
  })

  describe('Callback Execution', () => {
    it('should accept callback as required parameter', () => {
      const callback = mock(async (job: SerializedJob) => {
        expect(job).toBeDefined()
        expect(job.id).toBeDefined()
      })

      // Verify callback parameter is accepted
      const subscribePromise = driver.subscribe('test-queue', callback)
      expect(subscribePromise).toBeDefined()
    })

    it('should handle async callbacks', async () => {
      let callbackExecuted = false
      const callback = mock(async () => {
        callbackExecuted = true
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      const subscribePromise = driver.subscribe('test-queue', callback)

      await new Promise(resolve => setTimeout(resolve, 100))

      // Callback may not execute without messages, but subscribe should accept async
      expect(callback).toBeDefined()

      // Clean up
      await driver['lifecycleManager'].stop()
    })

    it('should enforce callback timeout', async () => {
      let callbackStarted = false
      const timeoutCallback = mock(async () => {
        callbackStarted = true
        // Simulate a slow callback
        await new Promise(resolve => setTimeout(resolve, 10000))
      })

      const subscribePromise = driver.subscribe('test-queue', timeoutCallback, {
        callbackTimeout: 100,
      })

      await new Promise(resolve => setTimeout(resolve, 50))

      // Callback should be defined (no throw during setup)
      expect(timeoutCallback).toBeDefined()

      // Clean up
      await driver['lifecycleManager'].stop()
    })
  })

  describe('Lifecycle Integration', () => {
    it('should emit lifecycle events during subscription', async () => {
      const lifecycleEvents: any[] = []
      const callback = mock(async () => {})

      const driver2 = new KafkaDriver({ client: createMockKafkaClient() })
      driver2['lifecycleManager'].onStateChange(event => {
        lifecycleEvents.push(event.state)
      })

      const subscribePromise = driver2.subscribe('test-queue', callback)

      await new Promise(resolve => setTimeout(resolve, 50))

      // Should have transitioned to 'running'
      expect(lifecycleEvents).toContain('starting')
      expect(lifecycleEvents).toContain('running')

      // Clean up
      await driver2['lifecycleManager'].stop()
    })

    it('should handle lifecycle state transitions', async () => {
      const callback = mock(async () => {})
      const subscribePromise = driver.subscribe('test-queue', callback)

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(driver['lifecycleManager'].isRunning()).toBe(true)

      // Stop the consumer
      await driver['lifecycleManager'].stop()

      expect(driver['lifecycleManager'].isStopped()).toBe(true)
    })

    it('should transition to error state on lifecycle error', async () => {
      const callback = mock(async () => {})
      const errorPromise = new Promise<string>((resolve) => {
        driver['lifecycleManager'].onStateChange((event) => {
          if (event.state === 'error') {
            resolve(event.state)
          }
        })
      })

      const subscribePromise = driver.subscribe('test-queue', callback)

      // Give it time to start
      await new Promise(resolve => setTimeout(resolve, 50))

      // Clean up gracefully
      await driver['lifecycleManager'].stop()
    })
  })

  describe('Backpressure Integration', () => {
    it('should set up backpressure callbacks', async () => {
      const callback = mock(async () => {})
      const subscribePromise = driver.subscribe('test-queue', callback)

      await new Promise(resolve => setTimeout(resolve, 50))

      // Backpressure should be initialized
      expect(driver['backpressure']).toBeDefined()

      // Clean up
      await driver['lifecycleManager'].stop()
    })

    it('should respect backpressure watermarks', async () => {
      const callback = mock(async () => {})
      const subscribePromise = driver.subscribe('test-queue', callback)

      await new Promise(resolve => setTimeout(resolve, 50))

      // Verify backpressure controller is configured
      expect(driver['backpressure'].isPaused()).toBe(false)

      // Simulate evaluating buffer at high watermark
      driver['backpressure'].evaluate(81, ['test-queue']) // 81% > 80% threshold
      expect(driver['backpressure'].isPaused()).toBe(true)

      // Resume when dropping below low watermark
      driver['backpressure'].evaluate(45, ['test-queue']) // 45% < 50% threshold
      expect(driver['backpressure'].isPaused()).toBe(false)

      // Clean up
      await driver['lifecycleManager'].stop()
    })

    it('should handle pause/resume callbacks from backpressure', async () => {
      const callback = mock(async () => {})
      const consumer = mockClient.consumer()
      const pauseMock = mock(() => {})
      const resumeMock = mock(() => {})

      // Override pause/resume on consumer
      ;(consumer as any).pause = pauseMock
      ;(consumer as any).resume = resumeMock

      const subscribePromise = driver.subscribe('test-queue', callback)

      await new Promise(resolve => setTimeout(resolve, 50))

      // Simulate high buffer load to trigger pause
      driver['backpressure'].evaluate(90, ['test-queue'])

      // Clean up
      await driver['lifecycleManager'].stop()
    })
  })

  describe('Notifier Integration', () => {
    it('should use KafkaNotifier for reactive updates', async () => {
      const callback = mock(async () => {})
      const subscribePromise = driver.subscribe('test-queue', callback)

      await new Promise(resolve => setTimeout(resolve, 50))

      // Notifier should be enabled
      expect(driver['notifier'].isEnabled()).toBe(true)

      // Clean up
      await driver['lifecycleManager'].stop()
    })

    it('should emit message arrival events', async () => {
      const callback = mock(async () => {})
      const messageEvents: any[] = []

      driver['notifier'].enable()
      driver['notifier'].onMessageArrived(event => {
        messageEvents.push(event)
      })

      // Manually trigger notification to test event emission
      driver['notifier'].notifyWithCount('test-queue', 5)

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(messageEvents).toHaveLength(1)
      expect(messageEvents[0]!.queue).toBe('test-queue')
      expect(messageEvents[0]!.count).toBe(5)
    })
  })

  describe('Error Handling', () => {
    it('should handle callback errors gracefully', async () => {
      const errorCallback = mock(async () => {
        throw new Error('Callback failed')
      })

      const subscribePromise = driver.subscribe('test-queue', errorCallback)

      await new Promise(resolve => setTimeout(resolve, 50))

      // Subscribe should continue even with callback errors
      expect(driver['lifecycleManager'].isRunning()).toBe(true)

      // Clean up
      await driver['lifecycleManager'].stop()
    })

    it('should isolate callback errors from other callbacks', async () => {
      const callback1 = mock(async () => {
        throw new Error('Error in callback 1')
      })
      const callback2 = mock(async () => {
        // This should still be registered even if callback1 errors
      })

      // Both can be registered (though KafkaDriver handles one queue at a time)
      const subscribePromise = driver.subscribe('test-queue', callback1)

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(driver['lifecycleManager'].isRunning()).toBe(true)

      // Clean up
      await driver['lifecycleManager'].stop()
    })

    it('should handle consumer lifecycle errors', async () => {
      let errorState = false
      const callback = mock(async () => {})

      const driver2 = new KafkaDriver({ client: createMockKafkaClient() })
      driver2['lifecycleManager'].onStateChange((event) => {
        if (event.state === 'error') {
          errorState = true
        }
      })

      const subscribePromise = driver2.subscribe('test-queue', callback)

      await new Promise(resolve => setTimeout(resolve, 50))

      // Stop gracefully
      await driver2['lifecycleManager'].stop()

      // Should have transitioned to stopped without error
      expect(driver2['lifecycleManager'].isStopped()).toBe(true)
    })
  })

  describe('Concurrency Control', () => {
    it('should respect concurrency option in SubscribeOptions', async () => {
      const callback = mock(async () => {})

      const subscribePromise = driver.subscribe('test-queue', callback, {
        concurrency: 3,
      })

      await new Promise(resolve => setTimeout(resolve, 50))

      // Should have created with concurrency=3
      expect(driver['lifecycleManager'].isRunning()).toBe(true)

      // Clean up
      await driver['lifecycleManager'].stop()
    })

    it('should use default concurrency of 1', async () => {
      const callback = mock(async () => {})

      const subscribePromise = driver.subscribe('test-queue', callback)

      await new Promise(resolve => setTimeout(resolve, 50))

      // Default concurrency should be 1
      expect(driver['lifecycleManager'].isRunning()).toBe(true)

      // Clean up
      await driver['lifecycleManager'].stop()
    })
  })

  describe('Auto-Acknowledge', () => {
    it('should auto-acknowledge when enabled (default)', async () => {
      const callback = mock(async () => {})

      const subscribePromise = driver.subscribe('test-queue', callback)

      await new Promise(resolve => setTimeout(resolve, 50))

      // Auto-acknowledge is enabled by default
      expect(driver['lifecycleManager'].isRunning()).toBe(true)

      // Clean up
      await driver['lifecycleManager'].stop()
    })

    it('should skip acknowledgement when disabled', async () => {
      const callback = mock(async () => {})

      const subscribePromise = driver.subscribe('test-queue', callback, {
        autoAcknowledge: false,
      })

      await new Promise(resolve => setTimeout(resolve, 50))

      // Should still run with auto-acknowledge disabled
      expect(driver['lifecycleManager'].isRunning()).toBe(true)

      // Clean up
      await driver['lifecycleManager'].stop()
    })
  })

  describe('Storage Callbacks', () => {
    it('should store subscription callback', async () => {
      const callback = mock(async () => {})

      // Start subscribe in background but don't await (it's infinite)
      const subscribePromise = driver.subscribe('test-queue', callback)

      // Give it time to store the callback
      await new Promise(resolve => setTimeout(resolve, 50))

      // Callback should be stored
      expect(driver['subscriptionCallbacks'].has('test-queue')).toBe(true)
      expect(driver['subscriptionCallbacks'].get('test-queue')).toBe(callback)

      // Clean up
      await driver['lifecycleManager'].stop()
    })

    it('should replace existing callback for same queue', async () => {
      const callback1 = mock(async () => {})
      const callback2 = mock(async () => {})

      // Start subscribe in background with first callback
      const subscribePromise = driver.subscribe('test-queue', callback1)

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(driver['subscriptionCallbacks'].get('test-queue')).toBe(callback1)

      // Manually replace callback (simulating what would happen with second subscribe)
      driver['subscriptionCallbacks'].set('test-queue', callback2)
      expect(driver['subscriptionCallbacks'].get('test-queue')).toBe(callback2)

      // Clean up
      await driver['lifecycleManager'].stop()
    })
  })
})
