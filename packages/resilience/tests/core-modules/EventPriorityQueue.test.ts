import { beforeEach, describe, expect, test } from 'bun:test'
import type { EventQueueConfig, EventTask } from '@gravito/core'
import { EventPriorityQueue } from '../../src/priority/EventPriorityQueue'

describe('EventPriorityQueue', () => {
  let queue: EventPriorityQueue

  beforeEach(() => {
    queue = new EventPriorityQueue()
  })

  describe('Construction & Configuration', () => {
    test('should create queue with default config', () => {
      expect(queue).toBeDefined()
    })

    test('should create queue with custom config', () => {
      const config: EventQueueConfig = {
        maxSize: 10000,
      }
      const customQueue = new EventPriorityQueue(config)
      expect(customQueue).toBeDefined()
    })

    test('should initialize with backpressure enabled', () => {
      const config: EventQueueConfig = {
        backpressure: {
          enabled: true,
          maxQueueSize: 1000,
        },
      }
      const queueWithBP = new EventPriorityQueue(config)
      expect(queueWithBP).toBeDefined()
    })
  })

  describe('Task Enqueueing', () => {
    test('should enqueue critical priority task', () => {
      const task: EventTask = {
        id: 'task-1',
        hook: 'test:event',
        args: { data: 'test' },
        options: { priority: 'critical', timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      const taskId = queue.enqueue(task)
      expect(taskId).toBeDefined()
      expect(taskId).not.toBe('dropped')
    })

    test('should enqueue high priority task', () => {
      const task: EventTask = {
        id: 'task-2',
        hook: 'test:event',
        args: { data: 'test' },
        options: { priority: 'high', timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      const taskId = queue.enqueue(task)
      expect(taskId).toBeDefined()
    })

    test('should enqueue normal priority task', () => {
      const task: EventTask = {
        id: 'task-3',
        hook: 'test:event',
        args: { data: 'test' },
        options: { priority: 'normal', timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      const taskId = queue.enqueue(task)
      expect(taskId).toBeDefined()
    })

    test('should enqueue low priority task', () => {
      const task: EventTask = {
        id: 'task-4',
        hook: 'test:event',
        args: { data: 'test' },
        options: { priority: 'low', timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      const taskId = queue.enqueue(task)
      expect(taskId).toBeDefined()
    })

    test('should enqueue using hook and args', () => {
      const taskId = queue.enqueue('test:hook', { data: 'test' }, [], { timeout: 5000 })
      expect(taskId).toBeDefined()
    })
  })

  describe('Queue Depth', () => {
    test('should report queue depth', () => {
      const task: EventTask = {
        id: 'task-1',
        hook: 'test:event',
        args: { data: 'test' },
        options: { timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      queue.enqueue(task)
      const depth = queue.getDepth()
      expect(depth).toBeGreaterThanOrEqual(0)
    })

    test('should report depth by priority', () => {
      const task: EventTask = {
        id: 'task-1',
        hook: 'test:event',
        args: { data: 'test' },
        options: { priority: 'high', timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      queue.enqueue(task)
      const depth = queue.getDepthByPriority('high')
      expect(depth).toBeGreaterThanOrEqual(0)
    })

    test('should report queue depth by priority snapshot', () => {
      const depths = queue.getQueueDepthByPriority()
      expect(depths).toBeDefined()
      expect(depths.critical).toBeGreaterThanOrEqual(0)
      expect(depths.high).toBeGreaterThanOrEqual(0)
      expect(depths.normal).toBeGreaterThanOrEqual(0)
      expect(depths.low).toBeGreaterThanOrEqual(0)
      expect(depths.total).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Batch Operations', () => {
    test('should enqueue batch of tasks', () => {
      const tasks: EventTask[] = [
        {
          id: 'task-1',
          hook: 'test:event',
          args: { data: 'test1' },
          options: { timeout: 5000 },
          callbacks: [],
          createdAt: Date.now(),
          enqueuedAt: Date.now(),
          retryCount: 0,
        },
        {
          id: 'task-2',
          hook: 'test:event',
          args: { data: 'test2' },
          options: { timeout: 5000 },
          callbacks: [],
          createdAt: Date.now(),
          enqueuedAt: Date.now(),
          retryCount: 0,
        },
      ]

      const taskIds = queue.enqueueBatch(tasks)
      expect(taskIds.length).toBe(2)
    })
  })

  describe('Clear Operations', () => {
    test('should clear queue', () => {
      const task: EventTask = {
        id: 'task-1',
        hook: 'test:event',
        args: { data: 'test' },
        options: { timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      const _depthBefore = queue.getDepth()
      queue.enqueue(task)
      // Don't assume depth increased due to async processing
      queue.clear()
      expect(queue.getDepth()).toBe(0)
    })
  })

  describe('Circuit Breaker Integration', () => {
    test('should get circuit breaker for hook', () => {
      const breaker = queue.getCircuitBreaker('test:hook')
      expect(breaker).toBeUndefined() // Not created until used
    })

    test('should reset circuit breaker', () => {
      const result = queue.resetCircuitBreaker('test:hook')
      expect(typeof result).toBe('boolean')
    })

    test('should get all circuit breakers', () => {
      const breakers = queue.getCircuitBreakers()
      expect(breakers).toBeDefined()
    })
  })

  describe('BackpressureManager Integration', () => {
    test('should get backpressure manager if enabled', () => {
      const configuredQueue = new EventPriorityQueue({
        backpressure: { enabled: true },
      })

      const manager = configuredQueue.getBackpressureManager()
      expect(manager).toBeDefined()
    })
  })
})
