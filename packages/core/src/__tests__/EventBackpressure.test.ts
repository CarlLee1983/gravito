import { describe, expect, it } from 'bun:test'
import { EventPriorityQueue, EventPriorityQueue as Queue } from '../events/EventPriorityQueue'
import type { ActionCallback } from '../HookManager'
import { HookManager } from '../HookManager'

describe('Event Backpressure', () => {
  describe('Strategies', () => {
    it('should reject when queue is full', async () => {
      const queue = new EventPriorityQueue({ maxSize: 1, strategy: 'reject' })
      const slowTask: ActionCallback = async () => new Promise((r) => setTimeout(r, 50))

      // 1. Initial task (Occupies processor)
      queue.enqueue('event1', {}, [slowTask], {})
      expect(queue.getDepth()).toBe(0) // Immediately dequeued for processing

      // 2. Fill buffer
      queue.enqueue('event2', {}, [slowTask], {})
      expect(queue.getDepth()).toBe(1)

      // 3. Overflow
      expect(() => {
        queue.enqueue('event3', {}, [slowTask], {})
      }).toThrow(/Queue full/)
    })

    it('should drop newest when queue is full', async () => {
      const queue = new EventPriorityQueue({ maxSize: 1, strategy: 'drop-newest' })
      const slowTask: ActionCallback = async () => new Promise((r) => setTimeout(r, 50))

      queue.enqueue('event1', {}, [slowTask], {})
      queue.enqueue('event2', {}, [slowTask], {}) // Buffer full

      const result = queue.enqueue('event3', {}, [slowTask], {})
      expect(result).toBe('dropped')
      expect(queue.getDepth()).toBe(1) // Still 1
    })

    it('should ignore when queue is full', async () => {
      const queue = new EventPriorityQueue({ maxSize: 1, strategy: 'ignore' })
      const slowTask: ActionCallback = async () => new Promise((r) => setTimeout(r, 50))

      queue.enqueue('event1', {}, [slowTask], {})
      queue.enqueue('event2', {}, [slowTask], {})

      const result = queue.enqueue('event3', {}, [slowTask], {})
      expect(result).toBe('dropped') // Implementation returns 'dropped' for ignore too (via false return)
      expect(queue.getDepth()).toBe(1)
    })

    it('should drop oldest (LOW priority) when queue is full', async () => {
      const queue = new EventPriorityQueue({ maxSize: 1, strategy: 'drop-oldest' })

      // We need: 1 processing, 1 in buffer (LOW).
      // Then we enqueue one more. It should drop the buffered LOW one.

      const slowTask: ActionCallback = async () => new Promise((r) => setTimeout(r, 50))

      queue.enqueue('running', {}, [slowTask], { priority: 'normal' })

      // Add LOW to buffer
      queue.enqueue('low-task', {}, [slowTask], { priority: 'low' })
      expect(queue.getDepth()).toBe(1)

      // Overflow
      const newId = queue.enqueue('new-task', {}, [slowTask], { priority: 'normal' })

      // Should have succeeded (not dropped itself)
      expect(newId).not.toBe('dropped')
      expect(queue.getDepth()).toBe(1) // Size maintained (1 dropped, 1 added)

      // Verify 'low-task' is gone?
      // We can't inspect queue content easily via public API except implicitly.
      // But getDepth() is consistent.
      // Ideally we'd verify WHICH one was dropped.
      // We can check getDepthByPriority
      expect(queue.getDepthByPriority('low')).toBe(0)
      expect(queue.getDepthByPriority('normal')).toBe(1) // 'new-task' is normal
    })
  })

  describe('HookManager Integration', () => {
    it('should respect HookManager queue config', async () => {
      const hooks = new HookManager({
        asyncByDefault: true,
        migrationMode: 'hybrid',
        queue: { maxSize: 1, strategy: 'reject' },
      })

      const queue = (hooks as any).eventQueue

      // Manual control to force queue saturation
      let release: () => void = () => {}
      const hold = new Promise<void>((r) => (release = r))

      hooks.addAction('test', async () => {
        await hold
      })

      // 1. Running (dequeued and processing)
      await hooks.doAction('test', {})

      // 2. Buffered (stays in queue because 1 is running)
      await hooks.doAction('test', {})
      expect(queue.getDepth()).toBe(1)

      // 3. Rejected (queue full)
      let error: Error | undefined
      try {
        await hooks.doAction('test', {})
      } catch (e) {
        error = e as Error
      }

      // Cleanup: allow tasks to finish
      release()

      expect(error).toBeDefined()
      expect(error?.message).toContain('Queue full')
    })
  })
})
