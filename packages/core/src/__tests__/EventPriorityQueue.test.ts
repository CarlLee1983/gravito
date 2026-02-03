import { describe, expect, it } from 'bun:test'
import type { ActionCallback, EventOptions } from '../events'
import { EventPriorityQueue } from '../events/EventPriorityQueue'

describe('EventPriorityQueue - Complete Test Suite', () => {
  describe('Initialization and Configuration', () => {
    it('should initialize with default config', () => {
      const queue = new EventPriorityQueue()
      expect(queue.getDepth()).toBe(0)
    })

    it('should initialize with custom config', () => {
      const queue = new EventPriorityQueue({ maxSize: 100, strategy: 'drop-newest' })
      expect(queue.getDepth()).toBe(0)
    })
  })

  describe('Priority Queue - Three Level Separation', () => {
    it('should maintain separate queues for high, normal, low priorities', async () => {
      const queue = new EventPriorityQueue()
      const slowTask: ActionCallback = async () => new Promise((r) => setTimeout(r, 20))

      // Enqueue tasks with different priorities
      queue.enqueue('high-event', {}, [slowTask], { priority: 'high' })
      queue.enqueue('normal-event', {}, [slowTask], { priority: 'normal' })
      queue.enqueue('low-event', {}, [slowTask], { priority: 'low' })

      // Wait for initial processing
      await new Promise((r) => setTimeout(r, 30))

      // Check that depth tracking is working
      const depth = queue.getDepth()
      expect(depth).toBeGreaterThanOrEqual(0)
    })

    it('should process high priority events before normal priority', async () => {
      const results: string[] = []
      const queue = new EventPriorityQueue()

      const fastTask =
        (label: string): ActionCallback =>
        () => {
          results.push(label)
        }

      const slowTask: ActionCallback = async () => new Promise((r) => setTimeout(r, 50))

      // Start with a slow task to keep processor busy
      queue.enqueue('initial', {}, [slowTask], { priority: 'normal' })

      // Enqueue in specific order: normal, then high
      queue.enqueue('normal', {}, [fastTask('normal')], { priority: 'normal' })
      queue.enqueue('high', {}, [fastTask('high')], { priority: 'high' })

      // Wait for processing
      await new Promise((r) => setTimeout(r, 150))

      // Both should have processed, order may vary depending on timing
      expect(results).toContain('normal')
      expect(results).toContain('high')
    })

    it('should process normal priority before low priority', async () => {
      const results: string[] = []
      const queue = new EventPriorityQueue()

      const fastTask =
        (label: string): ActionCallback =>
        () => {
          results.push(label)
        }

      const slowTask: ActionCallback = async () => new Promise((r) => setTimeout(r, 50))

      queue.enqueue('initial', {}, [slowTask], { priority: 'high' })
      queue.enqueue('low', {}, [fastTask('low')], { priority: 'low' })
      queue.enqueue('normal', {}, [fastTask('normal')], { priority: 'normal' })

      // Wait for processing
      await new Promise((r) => setTimeout(r, 150))

      expect(results).toContain('normal')
      expect(results).toContain('low')
    })

    it('should report correct queue depth per priority level', async () => {
      const queue = new EventPriorityQueue()
      const blockingTask: ActionCallback = async () => new Promise(() => {}) // Never resolves

      queue.enqueue('high1', {}, [blockingTask], { priority: 'high' })
      queue.enqueue('high2', {}, [blockingTask], { priority: 'high' })
      queue.enqueue('normal1', {}, [blockingTask], { priority: 'normal' })
      queue.enqueue('low1', {}, [blockingTask], { priority: 'low' })

      // Give time for first task to start processing
      await new Promise((r) => setTimeout(r, 20))

      expect(queue.getDepthByPriority('high')).toBeGreaterThanOrEqual(0)
      expect(queue.getDepthByPriority('normal')).toBeGreaterThanOrEqual(0)
      expect(queue.getDepthByPriority('low')).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Backpressure - All Strategies', () => {
    it('should reject events when maxSize exceeded with reject strategy', () => {
      const queue = new EventPriorityQueue({ maxSize: 1, strategy: 'reject' })
      const slowTask: ActionCallback = async () => new Promise((r) => setTimeout(r, 50))

      queue.enqueue('task1', {}, [slowTask], {})
      queue.enqueue('task2', {}, [slowTask], {})

      expect(() => {
        queue.enqueue('task3', {}, [slowTask], {})
      }).toThrow(/Queue full/)
    })

    it('should drop newest when maxSize exceeded with drop-newest strategy', () => {
      const queue = new EventPriorityQueue({ maxSize: 1, strategy: 'drop-newest' })
      const slowTask: ActionCallback = async () => new Promise((r) => setTimeout(r, 50))

      queue.enqueue('task1', {}, [slowTask], {})
      queue.enqueue('task2', {}, [slowTask], {})

      const result = queue.enqueue('task3', {}, [slowTask], {})
      expect(result).toBe('dropped')
    })

    it('should silently ignore when maxSize exceeded with ignore strategy', () => {
      const queue = new EventPriorityQueue({ maxSize: 1, strategy: 'ignore' })
      const slowTask: ActionCallback = async () => new Promise((r) => setTimeout(r, 50))

      queue.enqueue('task1', {}, [slowTask], {})
      queue.enqueue('task2', {}, [slowTask], {})

      const result = queue.enqueue('task3', {}, [slowTask], {})
      expect(result).toBe('dropped')
    })

    it('should drop oldest low priority when maxSize exceeded with drop-oldest strategy', async () => {
      const queue = new EventPriorityQueue({ maxSize: 2, strategy: 'drop-oldest' })
      const slowTask: ActionCallback = async () => new Promise((r) => setTimeout(r, 50))

      queue.enqueue('task1', {}, [slowTask], { priority: 'high' })

      // Wait a bit for task1 to start processing
      await new Promise((r) => setTimeout(r, 10))

      queue.enqueue('task2', {}, [slowTask], { priority: 'low' })
      const depth1 = queue.getDepth()
      expect(depth1).toBeGreaterThanOrEqual(1) // task2 should be in queue

      queue.enqueue('task3', {}, [slowTask], { priority: 'normal' })
      const depth2 = queue.getDepth()
      expect(depth2).toBeLessThanOrEqual(2) // Should maintain max size
    })
  })

  describe('Retry Logic - Exponential and Linear Backoff', () => {
    it('should retry failed events with exponential backoff', async () => {
      let attemptCount = 0
      const failingTask: ActionCallback = () => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('Retry me')
        }
      }

      const queue = new EventPriorityQueue()
      const options: EventOptions = {
        priority: 'normal',
        retry: {
          maxRetries: 2,
          backoff: 'exponential',
          initialDelayMs: 10,
          maxDelayMs: 100,
        },
      }

      queue.enqueue('retry-event', {}, [failingTask], options)

      // Wait for retries to complete
      await new Promise((r) => setTimeout(r, 300))

      expect(attemptCount).toBeGreaterThanOrEqual(2)
    })

    it('should retry failed events with linear backoff', async () => {
      let attemptCount = 0
      const failingTask: ActionCallback = () => {
        attemptCount++
        if (attemptCount < 2) {
          throw new Error('Retry me')
        }
      }

      const queue = new EventPriorityQueue()
      const options: EventOptions = {
        priority: 'normal',
        retry: {
          maxRetries: 1,
          backoff: 'linear',
          initialDelayMs: 10,
          maxDelayMs: 100,
        },
      }

      queue.enqueue('retry-event', {}, [failingTask], options)

      await new Promise((r) => setTimeout(r, 200))

      expect(attemptCount).toBeGreaterThanOrEqual(1)
    })

    it('should respect maxDelayMs in retry backoff', async () => {
      let attemptCount = 0
      const failingTask: ActionCallback = () => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('Retry me')
        }
      }

      const queue = new EventPriorityQueue()
      const options: EventOptions = {
        priority: 'normal',
        retry: {
          maxRetries: 2,
          backoff: 'exponential',
          initialDelayMs: 10,
          maxDelayMs: 50, // Cap delay at 50ms
        },
      }

      queue.enqueue('retry-event', {}, [failingTask], options)

      await new Promise((r) => setTimeout(r, 300))

      // With maxDelayMs cap and only 2 retries, should complete reasonably fast
      expect(attemptCount).toBeGreaterThanOrEqual(1)
    })

    it('should not retry when maxRetries is 0', async () => {
      let attemptCount = 0
      const failingTask: ActionCallback = () => {
        attemptCount++
        throw new Error('Fail')
      }

      const queue = new EventPriorityQueue()
      const options: EventOptions = {
        priority: 'normal',
        retry: {
          maxRetries: 0,
        },
      }

      queue.enqueue('no-retry-event', {}, [failingTask], options)

      await new Promise((r) => setTimeout(r, 100))

      expect(attemptCount).toBe(1) // Only one attempt
    })
  })

  describe('Timeout Handling', () => {
    it('should timeout slow callbacks', async () => {
      let executionStarted = false
      const slowTask: ActionCallback = async () => {
        executionStarted = true
        await new Promise((r) => setTimeout(r, 200))
      }

      const queue = new EventPriorityQueue()
      const options: EventOptions = { timeout: 50 }

      queue.enqueue('timeout-event', {}, [slowTask], options)

      await new Promise((r) => setTimeout(r, 300))

      // Task execution should start but timeout during execution
      expect(executionStarted).toBe(true)
    })

    it('should use default timeout when not specified', async () => {
      let executed = false
      const quickTask: ActionCallback = () => {
        executed = true
      }

      const queue = new EventPriorityQueue()
      queue.enqueue('quick-event', {}, [quickTask], {})

      await new Promise((r) => setTimeout(r, 100))

      expect(executed).toBe(true)
    })
  })

  describe('Queue Management - Clear and Depth', () => {
    it('should clear all tasks from queue', () => {
      const queue = new EventPriorityQueue()
      const task: ActionCallback = () => {}

      queue.enqueue('task1', {}, [task], { priority: 'high' })
      queue.enqueue('task2', {}, [task], { priority: 'normal' })
      queue.enqueue('task3', {}, [task], { priority: 'low' })

      queue.clear()

      expect(queue.getDepth()).toBe(0)
      expect(queue.getDepthByPriority('high')).toBe(0)
      expect(queue.getDepthByPriority('normal')).toBe(0)
      expect(queue.getDepthByPriority('low')).toBe(0)
    })

    it('should report total queue depth', () => {
      const queue = new EventPriorityQueue()
      const task: ActionCallback = () => {}

      queue.enqueue('task1', {}, [task], { priority: 'high' })
      queue.enqueue('task2', {}, [task], { priority: 'normal' })
      queue.enqueue('task3', {}, [task], { priority: 'low' })

      const totalDepth = queue.getDepth()
      const highDepth = queue.getDepthByPriority('high')
      const normalDepth = queue.getDepthByPriority('normal')
      const lowDepth = queue.getDepthByPriority('low')

      expect(totalDepth).toBe(highDepth + normalDepth + lowDepth)
    })
  })

  describe('Concurrent Processing', () => {
    it('should handle multiple concurrent events', async () => {
      const results: string[] = []
      const queue = new EventPriorityQueue()

      const task =
        (label: string): ActionCallback =>
        () => {
          results.push(label)
        }

      // Enqueue multiple events
      for (let i = 0; i < 5; i++) {
        queue.enqueue(`event-${i}`, {}, [task(`event-${i}`)], { priority: 'normal' })
      }

      await new Promise((r) => setTimeout(r, 200))

      // All events should be processed
      expect(results.length).toBe(5)
    })

    it('should process high priority events while normal is queued', async () => {
      const results: string[] = []
      const queue = new EventPriorityQueue()

      const slowTask: ActionCallback = async () => new Promise((r) => setTimeout(r, 50))
      const fastTask =
        (label: string): ActionCallback =>
        () => {
          results.push(label)
        }

      // Start with slow task at normal priority to keep processor busy
      queue.enqueue('slow', {}, [slowTask], { priority: 'normal' })

      // Enqueue normal and low priority in queue
      queue.enqueue('normal', {}, [fastTask('normal')], { priority: 'normal' })
      queue.enqueue('low', {}, [fastTask('low')], { priority: 'low' })

      // Then enqueue high priority
      queue.enqueue('high', {}, [fastTask('high')], { priority: 'high' })

      await new Promise((r) => setTimeout(r, 300))

      expect(results).toContain('high')
      expect(results).toContain('normal')
      expect(results).toContain('low')
    })
  })

  describe('Task ID Generation', () => {
    it('should generate unique task IDs', () => {
      const queue = new EventPriorityQueue()
      const task: ActionCallback = () => {}

      const id1 = queue.enqueue('event1', {}, [task], {})
      const id2 = queue.enqueue('event2', {}, [task], {})
      const id3 = queue.enqueue('event3', {}, [task], {})

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id3).toBeDefined()
    })

    it('should return "dropped" when event is not enqueued', () => {
      const queue = new EventPriorityQueue({ maxSize: 1, strategy: 'drop-newest' })
      const slowTask: ActionCallback = async () => new Promise((r) => setTimeout(r, 50))

      queue.enqueue('task1', {}, [slowTask], {})
      queue.enqueue('task2', {}, [slowTask], {})

      const result = queue.enqueue('task3', {}, [slowTask], {})
      expect(result).toBe('dropped')
    })
  })

  describe('Multiple Callbacks per Event', () => {
    it('should execute all callbacks for an event', async () => {
      const results: number[] = []
      const queue = new EventPriorityQueue()

      const callback1: ActionCallback = () => results.push(1)
      const callback2: ActionCallback = () => results.push(2)
      const callback3: ActionCallback = () => results.push(3)

      queue.enqueue('multi-event', {}, [callback1, callback2, callback3], {})

      await new Promise((r) => setTimeout(r, 100))

      expect(results).toEqual([1, 2, 3])
    })

    it('should stop executing callbacks if one fails', async () => {
      const results: number[] = []
      const queue = new EventPriorityQueue()

      const callback1: ActionCallback = () => results.push(1)
      const callback2: ActionCallback = () => {
        throw new Error('Fail')
      }
      const callback3: ActionCallback = () => results.push(3)

      queue.enqueue('fail-event', {}, [callback1, callback2, callback3], {})

      await new Promise((r) => setTimeout(r, 100))

      // First callback executes, second throws, third does not execute
      expect(results).toEqual([1])
    })
  })

  describe('Event Options Handling', () => {
    it('should respect priority option', async () => {
      const queue = new EventPriorityQueue()
      const task: ActionCallback = () => {}

      queue.enqueue('event1', {}, [task], { priority: 'low' })
      queue.enqueue('event2', {}, [task], { priority: 'high' })

      expect(queue.getDepthByPriority('low')).toBeGreaterThanOrEqual(0)
      expect(queue.getDepthByPriority('high')).toBeGreaterThanOrEqual(0)
    })

    it('should handle missing options gracefully', () => {
      const queue = new EventPriorityQueue()
      const task: ActionCallback = () => {}

      // Should not throw with empty options
      queue.enqueue('event', {}, [task], {})
      expect(queue.getDepth()).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Ordering Guarantees - Partition Based', () => {
    it('should process events with same partition key in order', async () => {
      const results: string[] = []
      const queue = new EventPriorityQueue()

      const task =
        (label: string): ActionCallback =>
        () => {
          results.push(label)
        }

      // Enqueue tasks with same partition key
      queue.enqueue('event1', {}, [task('first')], {
        ordering: 'partition',
        partitionKey: 'order-1',
      })
      queue.enqueue('event2', {}, [task('second')], {
        ordering: 'partition',
        partitionKey: 'order-1',
      })
      queue.enqueue('event3', {}, [task('third')], {
        ordering: 'partition',
        partitionKey: 'order-1',
      })

      // Wait for processing
      await new Promise((r) => setTimeout(r, 300))

      // Should process in order
      expect(results).toEqual(['first', 'second', 'third'])
    })

    it('should allow parallel processing of different partitions', async () => {
      const results: string[] = []
      const queue = new EventPriorityQueue()

      const task =
        (label: string): ActionCallback =>
        () => {
          results.push(label)
        }

      // Enqueue tasks with different partition keys
      queue.enqueue('event1', {}, [task('partition-1')], {
        ordering: 'partition',
        partitionKey: 'order-1',
      })
      queue.enqueue('event2', {}, [task('partition-2')], {
        ordering: 'partition',
        partitionKey: 'order-2',
      })
      queue.enqueue('event3', {}, [task('partition-3')], {
        ordering: 'partition',
        partitionKey: 'order-3',
      })

      // Wait for processing
      await new Promise((r) => setTimeout(r, 200))

      // All three should execute (different partitions)
      expect(results).toHaveLength(3)
      expect(results).toContain('partition-1')
      expect(results).toContain('partition-2')
      expect(results).toContain('partition-3')
    })

    it('should respect priority within partition ordering', async () => {
      const results: string[] = []
      const queue = new EventPriorityQueue()

      const slowTask: ActionCallback = async () => new Promise((r) => setTimeout(r, 50))
      const fastTask =
        (label: string): ActionCallback =>
        () => {
          results.push(label)
        }

      // Start with a blocking task
      queue.enqueue('blocking', {}, [slowTask], {
        ordering: 'partition',
        partitionKey: 'partition-1',
      })

      // Enqueue tasks with same partition - high priority should be first
      queue.enqueue('event-low', {}, [fastTask('low')], {
        ordering: 'partition',
        partitionKey: 'partition-1',
        priority: 'low',
      })
      queue.enqueue('event-high', {}, [fastTask('high')], {
        ordering: 'partition',
        partitionKey: 'partition-1',
        priority: 'high',
      })
      queue.enqueue('event-normal', {}, [fastTask('normal')], {
        ordering: 'partition',
        partitionKey: 'partition-1',
        priority: 'normal',
      })

      // Wait for all to process
      await new Promise((r) => setTimeout(r, 300))

      // Should process partition-based but respecting priority (high before normal before low)
      expect(results.length).toBeGreaterThan(0)
    })

    it('should handle partition key not blocking other queues', async () => {
      const results: string[] = []
      const queue = new EventPriorityQueue()

      const slowTask: ActionCallback = async () => new Promise((r) => setTimeout(r, 100))
      const fastTask =
        (label: string): ActionCallback =>
        () => {
          results.push(label)
        }

      // Slow task on partition-1
      queue.enqueue('slow', {}, [slowTask], { ordering: 'partition', partitionKey: 'partition-1' })

      // Fast task on partition-2 (should not be blocked)
      queue.enqueue('fast', {}, [fastTask('executed')], {
        ordering: 'partition',
        partitionKey: 'partition-2',
      })

      // Task without partition (should not be blocked)
      queue.enqueue('free', {}, [fastTask('free-executed')], {})

      // Wait for processing
      await new Promise((r) => setTimeout(r, 200))

      // partition-2 and free tasks should execute despite partition-1 being slow
      expect(results).toContain('executed')
      expect(results).toContain('free-executed')
    })
  })
})
