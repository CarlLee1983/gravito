import { beforeEach, describe, expect, it } from 'bun:test'
import type { DeadLetterQueue } from '../../src/dead-letter-queue/DeadLetterQueue'
import { EventPriorityQueue } from '../../src/priority/EventPriorityQueue'
import { makeEventTask, makeTasks, resetTaskCounter } from '../helpers'

// ---------------------------------------------------------------------------
// 最小 Mock：DeadLetterQueue
// ---------------------------------------------------------------------------
function createMockDLQ(): DeadLetterQueue & { entries: unknown[] } {
  const entries: unknown[] = []
  return {
    entries,
    add(...args: unknown[]) {
      entries.push(args)
      return `dlq-mock-${entries.length}`
    },
  } as unknown as DeadLetterQueue & { entries: unknown[] }
}

/**
 * 建立帶有持續執行 callback 的任務，用於阻止 processNext 完成並防止任務被 dequeue。
 * 呼叫傳回的 release() 解除阻塞。
 */
function makeBlockingTask(hook: string, priority = 'normal') {
  let release: () => void
  const blocker = new Promise<void>((resolve) => {
    release = resolve
  })
  const task = makeEventTask(hook, priority, {
    callbacks: [() => blocker],
  })
  return { task, release: release! }
}

// ---------------------------------------------------------------------------
// 測試開始
// ---------------------------------------------------------------------------
describe('EventPriorityQueue', () => {
  let queue: EventPriorityQueue

  beforeEach(() => {
    resetTaskCounter()
    queue = new EventPriorityQueue()
  })

  // =========================================================================
  // 1. getDepth() - 4 it
  // =========================================================================
  describe('getDepth()', () => {
    it('returns 0 for a freshly constructed queue', () => {
      expect(queue.getDepth()).toBe(0)
    })

    it('returns 1 after enqueueing a single critical task', () => {
      // critical 使用 setImmediate，任務在同步執行期間留在佇列中
      queue.enqueue(makeEventTask('evt-a', 'critical'))
      expect(queue.getDepth()).toBe(1)
    })

    it('accumulates depth across all priority levels', () => {
      // 先 enqueue 一個 blocking 任務讓 processing=true，後續 enqueue 不會 dequeue
      const { task: blocker, release } = makeBlockingTask('blocker', 'normal')
      queue.enqueue(blocker)
      // blocker 被 dequeued 但 processing=true，後續任務留在佇列
      queue.enqueue(makeEventTask('a', 'critical'))
      queue.enqueue(makeEventTask('b', 'high'))
      queue.enqueue(makeEventTask('c', 'normal'))
      queue.enqueue(makeEventTask('d', 'low'))
      expect(queue.getDepth()).toBe(4)
      release()
    })

    it('reports per-priority depth via getDepthByPriority()', () => {
      const { task: blocker, release } = makeBlockingTask('blocker', 'normal')
      queue.enqueue(blocker)
      queue.enqueue(makeEventTask('a', 'critical'))
      queue.enqueue(makeEventTask('b', 'critical'))
      queue.enqueue(makeEventTask('c', 'high'))
      queue.enqueue(makeEventTask('d', 'normal'))

      expect(queue.getDepthByPriority('critical')).toBe(2)
      expect(queue.getDepthByPriority('high')).toBe(1)
      expect(queue.getDepthByPriority('normal')).toBe(1)
      expect(queue.getDepthByPriority('low')).toBe(0)
      release()
    })
  })

  // =========================================================================
  // 2. enqueue() 優先級分流 - 4 it
  // =========================================================================
  describe('enqueue() priority routing', () => {
    it('routes critical priority to criticalPriority bucket', () => {
      // critical 使用 setImmediate，同步期間不會被 dequeue
      queue.enqueue(makeEventTask('evt', 'critical'))
      expect(queue.getDepthByPriority('critical')).toBe(1)
      expect(queue.getDepthByPriority('high')).toBe(0)
    })

    it('routes high priority to highPriority bucket', () => {
      // 先用 blocking task 佔用 processing
      const { task: blocker, release } = makeBlockingTask('blocker', 'normal')
      queue.enqueue(blocker)
      queue.enqueue(makeEventTask('evt', 'high'))
      expect(queue.getDepthByPriority('high')).toBe(1)
      expect(queue.getDepthByPriority('normal')).toBe(0)
      release()
    })

    it('routes normal priority to normalPriority bucket (default)', () => {
      const { task: blocker, release } = makeBlockingTask('blocker', 'high')
      queue.enqueue(blocker)
      queue.enqueue(makeEventTask('evt', 'normal'))
      expect(queue.getDepthByPriority('normal')).toBe(1)
      release()
    })

    it('routes low priority to lowPriority bucket', () => {
      const { task: blocker, release } = makeBlockingTask('blocker', 'normal')
      queue.enqueue(blocker)
      queue.enqueue(makeEventTask('evt', 'low'))
      expect(queue.getDepthByPriority('low')).toBe(1)
      expect(queue.getDepthByPriority('normal')).toBe(0)
      release()
    })
  })

  // =========================================================================
  // 3. maxSize 簡單背壓策略 - 4 it
  // =========================================================================
  describe('maxSize simple backpressure', () => {
    it('throws when strategy is "reject" and queue is full', () => {
      // 使用 critical 優先級（setImmediate），任務留在佇列中
      const q = new EventPriorityQueue({ maxSize: 2, strategy: 'reject' })
      q.enqueue(makeEventTask('a', 'critical'))
      q.enqueue(makeEventTask('b', 'critical'))

      expect(() => q.enqueue(makeEventTask('c', 'critical'))).toThrow(/Queue full/)
    })

    it('drops newest event silently with "drop-newest" strategy', () => {
      const q = new EventPriorityQueue({ maxSize: 2, strategy: 'drop-newest' })
      q.enqueue(makeEventTask('a', 'critical'))
      q.enqueue(makeEventTask('b', 'critical'))

      const id = q.enqueue(makeEventTask('c', 'critical'))
      expect(id).toBe('dropped')
      expect(q.getDepth()).toBe(2)
    })

    it('drops oldest low-priority event with "drop-oldest" strategy', () => {
      const q = new EventPriorityQueue({ maxSize: 2, strategy: 'drop-oldest' })
      q.enqueue(makeEventTask('a', 'critical'))

      // 使用 blocking task 佔住 processing
      const { task: blocker, release } = makeBlockingTask('b', 'normal')
      q.enqueue(blocker)
      // blocker 被 dequeued（processing=true），佇列中只有 critical(a)
      // depth = 1，但 maxSize=2 不觸發

      // 再放兩個 critical 讓 depth = 2 → 觸發 drop-oldest
      q.enqueue(makeEventTask('c', 'critical'))
      // depth=2 now
      q.enqueue(makeEventTask('d', 'critical'))
      // getDepth >= maxSize(2) → dropOldest → 移除 critical a → push d
      // 最終：c(critical) + d(critical) = 2
      expect(q.getDepth()).toBe(2)
      release()
    })

    it('silently drops with "ignore" strategy', () => {
      const q = new EventPriorityQueue({ maxSize: 1, strategy: 'ignore' })
      q.enqueue(makeEventTask('a', 'critical'))

      const id = q.enqueue(makeEventTask('b', 'critical'))
      expect(id).toBe('dropped')
      expect(q.getDepth()).toBe(1)
    })
  })

  // =========================================================================
  // 4. clear() Bug 驗證 - 2 it
  // =========================================================================
  describe('clear() bug verification', () => {
    it('clears high, normal, and low priority queues', () => {
      // 先用 blocking task 佔住 processing
      const { task: blocker, release } = makeBlockingTask('blocker', 'critical')
      queue.enqueue(blocker)
      // blocker 用 setImmediate，還在佇列裡
      // 但 processing 仍為 false（setImmediate 尚未觸發）
      // 所以後續 high 會觸發 processNext 並 dequeue...
      // 改用 blocking normal 先
      release() // 先清除

      const q = new EventPriorityQueue()
      const { task: block, release: rel } = makeBlockingTask('block', 'normal')
      q.enqueue(block)
      // block 被 dequeued，processing=true
      q.enqueue(makeEventTask('a', 'high'))
      q.enqueue(makeEventTask('b', 'normal'))
      q.enqueue(makeEventTask('c', 'low'))
      expect(q.getDepth()).toBe(3)

      q.clear()
      expect(q.getDepthByPriority('high')).toBe(0)
      expect(q.getDepthByPriority('normal')).toBe(0)
      expect(q.getDepthByPriority('low')).toBe(0)
      rel()
    })

    it('should clear criticalPriority queue', () => {
      // critical 使用 setImmediate，任務留在佇列中
      queue.enqueue(makeEventTask('a', 'critical'))
      queue.enqueue(makeEventTask('b', 'critical'))
      expect(queue.getDepthByPriority('critical')).toBe(2)

      queue.clear()

      // 驗證 clear() 已清除所有優先級
      expect(queue.getDepthByPriority('critical')).toBe(0)
      expect(queue.getDepth()).toBe(0)
    })
  })

  // =========================================================================
  // 5. enqueueBatch() - 3 it
  // =========================================================================
  describe('enqueueBatch()', () => {
    it('enqueues multiple tasks and returns their IDs', () => {
      // 使用 critical 優先級，任務不會立即被 dequeue
      const tasks = makeTasks(3, 'batch', 'critical')
      const ids = queue.enqueueBatch(tasks)

      expect(ids).toHaveLength(3)
      expect(queue.getDepth()).toBe(3)
    })

    it('distributes batched tasks to correct priority buckets', () => {
      // 先用 blocking task 佔住 processing
      const { task: blocker, release } = makeBlockingTask('blocker', 'normal')
      queue.enqueue(blocker)

      const tasks = [
        makeEventTask('a', 'critical'),
        makeEventTask('b', 'high'),
        makeEventTask('c', 'low'),
      ]
      queue.enqueueBatch(tasks)

      expect(queue.getDepthByPriority('critical')).toBe(1)
      expect(queue.getDepthByPriority('high')).toBe(1)
      expect(queue.getDepthByPriority('low')).toBe(1)
      release()
    })

    it('returns empty array for empty input', () => {
      const ids = queue.enqueueBatch([])
      expect(ids).toEqual([])
      expect(queue.getDepth()).toBe(0)
    })
  })

  // =========================================================================
  // 6. 電路斷路器建立 - 4 it
  // =========================================================================
  describe('circuit breaker creation', () => {
    it('does not create a circuit breaker when options.circuitBreaker is undefined', async () => {
      queue.enqueue(
        makeEventTask('evt', 'normal', {
          callbacks: [() => Promise.resolve()],
        })
      )
      // 等待 processNext 完成
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(queue.getCircuitBreaker('evt')).toBeUndefined()
    })

    it('creates a circuit breaker lazily during task execution', async () => {
      const task = makeEventTask('evt-cb', 'normal', {
        options: {
          priority: 'normal',
          escalation: { enabled: false },
          circuitBreaker: { failureThreshold: 3, resetTimeout: 1000 },
        },
        callbacks: [() => Promise.resolve()],
      })
      queue.enqueue(task)

      // 等待 processNext → executeTask 完成，CB 在 executeTask 中建立
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(queue.getCircuitBreaker('evt-cb')).toBeDefined()
      expect(queue.getCircuitBreakers().size).toBe(1)
    })

    it('stores circuit breaker in the map after task execution', async () => {
      const task = makeEventTask('evt-exec', 'normal', {
        options: {
          priority: 'normal',
          escalation: { enabled: false },
          circuitBreaker: { failureThreshold: 5, resetTimeout: 5000 },
        },
        callbacks: [() => Promise.resolve()],
      })
      queue.enqueue(task)

      await new Promise((resolve) => setTimeout(resolve, 50))

      const breaker = queue.getCircuitBreaker('evt-exec')
      expect(breaker).toBeDefined()
      expect(breaker!.getState()).toBe('CLOSED')
    })

    it('reuses existing circuit breaker for the same hook', async () => {
      const makeTask = (id: string) =>
        makeEventTask(id, 'normal', {
          hook: 'shared-hook',
          options: {
            priority: 'normal',
            escalation: { enabled: false },
            circuitBreaker: { failureThreshold: 5, resetTimeout: 5000 },
          },
          callbacks: [() => Promise.resolve()],
        })

      queue.enqueue(makeTask('t1'))
      await new Promise((resolve) => setTimeout(resolve, 50))

      const firstBreaker = queue.getCircuitBreaker('shared-hook')
      expect(firstBreaker).toBeDefined()

      queue.enqueue(makeTask('t2'))
      await new Promise((resolve) => setTimeout(resolve, 50))

      const secondBreaker = queue.getCircuitBreaker('shared-hook')
      expect(secondBreaker).toBe(firstBreaker)
    })
  })

  // =========================================================================
  // 7. 背壓整合 - 5 it
  // =========================================================================
  describe('backpressure integration', () => {
    it('creates BackpressureManager when backpressure config is provided', () => {
      const q = new EventPriorityQueue({
        backpressure: {
          enabled: true,
          maxQueueSize: 100,
        },
      })
      expect(q.getBackpressureManager()).toBeDefined()
    })

    it('does not create BackpressureManager when backpressure is not configured', () => {
      const q = new EventPriorityQueue({})
      expect(q.getBackpressureManager()).toBeUndefined()
    })

    it('does not create BackpressureManager when backpressure.enabled is false', () => {
      const q = new EventPriorityQueue({
        backpressure: { enabled: false },
      })
      expect(q.getBackpressureManager()).toBeUndefined()
    })

    it('rejects events when backpressure evaluates to overflow with throw policy', () => {
      // 使用小 maxQueueSize 和 critical 優先級（留在佇列）來觸發 overflow
      const q = new EventPriorityQueue({
        backpressure: {
          enabled: true,
          maxQueueSize: 2,
          thresholds: { warning: 0.3, critical: 0.6, overflow: 1.0 },
          rejectionPolicy: 'throw',
        },
      })

      q.enqueue(makeEventTask('a', 'critical'))
      q.enqueue(makeEventTask('b', 'critical'))

      // 第三個事件：佇列已有 2 個（depth=2, maxQueueSize=2, 100% → overflow）
      // 背壓管理器應拒絕 low 優先級
      expect(() => q.enqueue(makeEventTask('c', 'low'))).toThrow(/rejected/)
    })

    it('routes rejected overflow events to DLQ when dlqOnOverflow is enabled', () => {
      const mockDLQ = createMockDLQ()
      const q = new EventPriorityQueue({
        backpressure: {
          enabled: true,
          maxQueueSize: 1,
          thresholds: { warning: 0.3, critical: 0.6, overflow: 1.0 },
          dlqOnOverflow: true,
        },
      })
      q.setDeadLetterQueue(mockDLQ)

      // 放入一個 critical 任務（留在佇列）
      q.enqueue(makeEventTask('a', 'critical'))
      // depth=1 = maxQueueSize=1 → 100% → OVERFLOW

      // 第二個事件應該被背壓拒絕且路由至 DLQ
      q.enqueue(makeEventTask('b', 'low'))

      expect(mockDLQ.entries.length).toBeGreaterThanOrEqual(1)
    })
  })

  // =========================================================================
  // 8. getBackpressureManager() - 2 it
  // =========================================================================
  describe('getBackpressureManager()', () => {
    it('returns undefined when no backpressure config', () => {
      expect(queue.getBackpressureManager()).toBeUndefined()
    })

    it('returns BackpressureManager instance when configured', () => {
      const q = new EventPriorityQueue({
        backpressure: { enabled: true, maxQueueSize: 50 },
      })
      const bpm = q.getBackpressureManager()
      expect(bpm).toBeDefined()
      expect(bpm!.getState()).toBeDefined()
    })
  })

  // =========================================================================
  // 9. 斷路器重用與重置 - 4 it
  // =========================================================================
  describe('circuit breaker reuse and reset', () => {
    it('getCircuitBreaker returns undefined for unknown hook', () => {
      expect(queue.getCircuitBreaker('nonexistent')).toBeUndefined()
    })

    it('getCircuitBreakers returns empty map initially', () => {
      expect(queue.getCircuitBreakers().size).toBe(0)
    })

    it('resetCircuitBreaker returns false for unknown hook', () => {
      expect(queue.resetCircuitBreaker('unknown')).toBe(false)
    })

    it('resetCircuitBreaker returns true and resets an existing breaker', async () => {
      const task = makeEventTask('reset-test', 'normal', {
        options: {
          priority: 'normal',
          escalation: { enabled: false },
          circuitBreaker: { failureThreshold: 3, resetTimeout: 1000 },
        },
        callbacks: [() => Promise.resolve()],
      })
      queue.enqueue(task)

      // 等待執行完成以建立斷路器
      await new Promise((resolve) => setTimeout(resolve, 50))

      const breaker = queue.getCircuitBreaker('reset-test')
      expect(breaker).toBeDefined()

      const result = queue.resetCircuitBreaker('reset-test')
      expect(result).toBe(true)

      // 驗證重置後斷路器狀態為 CLOSED
      expect(breaker!.getState()).toBe('CLOSED')
    })
  })

  // =========================================================================
  // 10. setDeadLetterQueue() - 3 it
  // =========================================================================
  describe('setDeadLetterQueue()', () => {
    it('accepts a DLQ instance without throwing', () => {
      const mockDLQ = createMockDLQ()
      expect(() => queue.setDeadLetterQueue(mockDLQ)).not.toThrow()
    })

    it('replaces previously set DLQ without error', () => {
      const dlq1 = createMockDLQ()
      const dlq2 = createMockDLQ()

      queue.setDeadLetterQueue(dlq1)
      queue.setDeadLetterQueue(dlq2)

      // 無法直接讀取 private dlq，但可驗證設定不會報錯
      expect(() => queue.setDeadLetterQueue(dlq2)).not.toThrow()
    })

    it('integrates DLQ with backpressure overflow routing', () => {
      const mockDLQ = createMockDLQ()
      const q = new EventPriorityQueue({
        backpressure: {
          enabled: true,
          maxQueueSize: 1,
          thresholds: { warning: 0.3, critical: 0.6, overflow: 1.0 },
          dlqOnOverflow: true,
        },
      })
      q.setDeadLetterQueue(mockDLQ)

      // 用 critical 填滿佇列（留在佇列中）
      q.enqueue(makeEventTask('first', 'critical'))
      // depth=1 → overflow at 100%

      // 第二個 low 事件觸發 overflow → DLQ 路由
      q.enqueue(makeEventTask('overflow', 'low'))

      expect(mockDLQ.entries.length).toBeGreaterThanOrEqual(1)
    })
  })
})
