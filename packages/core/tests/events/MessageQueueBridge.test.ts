/**
 * Message Queue Bridge Tests
 *
 * 集成測試：驗證 MessageQueueBridge 與 HookManager、Bull Queue、DLQ 的完整流程
 * - 事件分發到 Bull Queue
 * - Worker 處理隊列事件
 * - 失敗任務轉移至 DLQ
 * - CircuitBreaker 集成
 * - HookManager 擴展方法
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { EventBackend } from '../../src/events/EventBackend'
import { MessageQueueBridge } from '../../src/events/MessageQueueBridge'
import type { EventTask } from '../../src/events/types'
import { HookManager } from '../../src/HookManager'
import type { DeadLetterQueueManager } from '../../src/reliability/DeadLetterQueueManager'

/**
 * Mock EventBackend 實現
 */
class MockEventBackend implements EventBackend {
  enqueueCalls: Array<{ task: EventTask }> = []
  throwOnEnqueue = false

  async enqueue(task: EventTask): Promise<void> {
    if (this.throwOnEnqueue) {
      throw new Error('Backend enqueue failed')
    }
    this.enqueueCalls.push({ task })
  }

  resetCircuitBreaker(_hook: string): void {
    // Mock implementation
  }
}

/**
 * Mock DeadLetterQueueManager 實現
 */
class MockDLQManager {
  moveToDlqCalls: Array<{
    hook: string
    args: unknown
    options: unknown
    error: Error
    retryCount: number
  }> = []

  async moveToDlq(
    hook: string,
    args: unknown,
    options: unknown,
    error: Error,
    retryCount: number
  ): Promise<string> {
    this.moveToDlqCalls.push({ hook, args, options, error, retryCount })
    return `dlq-${Date.now()}`
  }

  async getById(id: string): Promise<any> {
    return { id, event_name: 'test.event' }
  }

  async requeue(_id: string): Promise<void> {
    // Mock implementation
  }
}

describe('MessageQueueBridge', () => {
  let bridge: MessageQueueBridge
  let hookManager: HookManager
  let mockBackend: MockEventBackend
  let mockDlqManager: MockDLQManager

  beforeEach(() => {
    mockBackend = new MockEventBackend()
    mockDlqManager = new MockDLQManager()
    hookManager = new HookManager()

    // 註冊一個測試 listener
    hookManager.addAction('test.event', async (_args) => {
      // Mock handler
    })

    // 創建 bridge
    bridge = new MessageQueueBridge({
      hookManager,
      eventBackend: mockBackend as unknown as EventBackend,
      dlqManager: mockDlqManager as unknown as DeadLetterQueueManager,
      enableCircuitBreaker: false,
    })
  })

  describe('事件分發 - dispatchWithQueue()', () => {
    it('應通過 Bull Queue 成功分發事件', async () => {
      const jobId = await bridge.dispatchWithQueue('test.event', { data: 'test' })

      expect(jobId).toBeTruthy()
      expect(jobId).toMatch(/^queue-\d+-/)
      expect(mockBackend.enqueueCalls).toHaveLength(1)
      expect(mockBackend.enqueueCalls[0].task.hook).toBe('test.event')
      expect(mockBackend.enqueueCalls[0].task.args).toEqual({ data: 'test' })
    })

    it('應在沒有 listeners 時拋出錯誤', async () => {
      try {
        await bridge.dispatchWithQueue('no.listeners.event', {})
        expect.unreachable()
      } catch (error: any) {
        expect(error.message).toContain('No listeners registered for event')
      }
    })

    it('應在 CircuitBreaker 打開時拒絕分發', async () => {
      bridge = new MessageQueueBridge({
        hookManager,
        eventBackend: mockBackend as unknown as EventBackend,
        dlqManager: mockDlqManager as unknown as DeadLetterQueueManager,
        enableCircuitBreaker: true,
      })

      // Mock CircuitBreaker
      ;(hookManager as any).getCircuitBreaker = () => ({
        getState: () => 'OPEN',
      })

      try {
        await bridge.dispatchWithQueue('test.event', { data: 'test' })
        expect.unreachable()
      } catch (error: any) {
        expect(error.message).toContain('Circuit breaker is OPEN')
      }
    })

    it('應正確構建 EventTask 並傳遞給 backend', async () => {
      // 註冊 listener
      hookManager.addAction('order.created', async () => {})

      const payload = { orderId: '123', amount: 999.99 }
      const options = { priority: 'high', timeout: 5000 }

      await bridge.dispatchWithQueue('order.created', payload, options)

      expect(mockBackend.enqueueCalls).toHaveLength(1)
      const task = mockBackend.enqueueCalls[0].task

      expect(task.hook).toBe('order.created')
      expect(task.args).toEqual(payload)
      expect(task.options).toEqual(options)
      expect(task.callbacks).toHaveLength(1)
      expect(task.createdAt).toBeGreaterThan(0)
      expect(task.retryCount).toBe(0)
    })
  })

  describe('事件處理 - processQueuedEvent()', () => {
    it('應在 Worker 中成功處理隊列事件', async () => {
      let callbackExecuted = false

      const task: EventTask = {
        id: 'task-123',
        hook: 'process.test',
        args: { data: 'test' },
        callbacks: [
          async () => {
            callbackExecuted = true
          },
        ],
        options: {},
        createdAt: Date.now(),
      }

      await bridge.processQueuedEvent('job-123', task)

      expect(callbackExecuted).toBe(true)
    })

    it('應在處理失敗時拋出錯誤', async () => {
      const task: EventTask = {
        id: 'task-456',
        hook: 'error.hook',
        args: {},
        callbacks: [
          async () => {
            throw new Error('Processing error')
          },
        ],
        options: {},
        createdAt: Date.now(),
      }

      try {
        await bridge.processQueuedEvent('job-456', task)
        expect.unreachable()
      } catch (error: any) {
        expect(error.message).toBe('Processing error')
      }
    })

    it('應直接執行 callbacks 而不是使用 HookManager', async () => {
      let directCallbackCalled = false

      const task: EventTask = {
        id: 'task-789',
        hook: 'test.event',
        args: { data: 'test' },
        callbacks: [
          async (args) => {
            directCallbackCalled = true
            expect(args).toEqual({ data: 'test' })
          },
        ],
        options: {},
        createdAt: Date.now(),
      }

      await bridge.processQueuedEvent('job-789', task)

      expect(directCallbackCalled).toBe(true)
    })
  })

  describe('失敗處理 - handleJobFailure()', () => {
    it('應將失敗任務移至 DLQ', async () => {
      const task: EventTask = {
        id: 'task-failed',
        hook: 'failed.event',
        args: { data: 'failed' },
        callbacks: [],
        options: {},
        createdAt: Date.now(),
        retryCount: 0,
      }

      const error = new Error('Max retries exceeded')
      await bridge.handleJobFailure('job-failed', task, error, 3)

      expect(mockDlqManager.moveToDlqCalls).toHaveLength(1)
      expect(mockDlqManager.moveToDlqCalls[0]).toEqual({
        hook: 'failed.event',
        args: { data: 'failed' },
        options: {},
        error,
        retryCount: 3,
      })
    })

    it('應正確記錄 DLQ 移動失敗而不拋出', async () => {
      const task: EventTask = {
        id: 'task-dlq-error',
        hook: 'dlq.error.event',
        args: {},
        callbacks: [],
        options: {},
        createdAt: Date.now(),
      }

      ;(mockDlqManager as any).moveToDlq = async () => {
        throw new Error('DLQ storage failed')
      }

      // 不應拋出錯誤
      await bridge.handleJobFailure('job-dlq-error', task, new Error('Original error'), 3)

      // 應該記錄錯誤但繼續
      expect(mockDlqManager.moveToDlqCalls).toHaveLength(0)
    })
  })

  describe('HookManager 集成 - dispatchQueued()', () => {
    it('應通過 HookManager.dispatchQueued 成功分發', async () => {
      const newBackend = new MockEventBackend()
      const newHookManager = new HookManager()
      newHookManager.addAction('queue.event', async () => {})

      const newBridge = new MessageQueueBridge({
        hookManager: newHookManager,
        eventBackend: newBackend as unknown as EventBackend,
        dlqManager: mockDlqManager as unknown as DeadLetterQueueManager,
      })

      // 設置 messageQueueBridge 在 HookManager
      ;(newHookManager as any).messageQueueBridge = newBridge

      const jobId = await newHookManager.dispatchQueued('queue.event', { test: true })

      expect(jobId).toBeTruthy()
      expect(jobId).toMatch(/^queue-\d+-/)
    })

    it('應在未配置 MessageQueueBridge 時拋出錯誤', async () => {
      const unconfiguredHookManager = new HookManager({})

      try {
        await unconfiguredHookManager.dispatchQueued('no.bridge', {})
        expect.unreachable()
      } catch (error: any) {
        expect(error.message).toContain('MessageQueueBridge not configured')
      }
    })

    it('應正確傳遞選項到 bridge', async () => {
      const newBackend = new MockEventBackend()
      const newHookManager = new HookManager()
      newHookManager.addAction('queue.with.options', async () => {})

      const newBridge = new MessageQueueBridge({
        hookManager: newHookManager,
        eventBackend: newBackend as unknown as EventBackend,
        dlqManager: mockDlqManager as unknown as DeadLetterQueueManager,
      })

      ;(newHookManager as any).messageQueueBridge = newBridge

      const options = { priority: 'high', timeout: 5000 }
      await newHookManager.dispatchQueued('queue.with.options', { data: 'test' }, options)

      expect(newBackend.enqueueCalls).toHaveLength(1)
      expect(newBackend.enqueueCalls[0].task.options).toEqual(options)
    })
  })

  describe('HookManager 集成 - dispatchDeferredQueued()', () => {
    it('應通過延遲分發正確設置延遲時間', async () => {
      const newBackend = new MockEventBackend()
      const newHookManager = new HookManager()
      newHookManager.addAction('deferred.event', async () => {})

      const newBridge = new MessageQueueBridge({
        hookManager: newHookManager,
        eventBackend: newBackend as unknown as EventBackend,
        dlqManager: mockDlqManager as unknown as DeadLetterQueueManager,
      })

      ;(newHookManager as any).messageQueueBridge = newBridge

      const delay = 5000
      const jobId = await newHookManager.dispatchDeferredQueued(
        'deferred.event',
        { test: true },
        delay
      )

      expect(jobId).toBeTruthy()
      expect(newBackend.enqueueCalls).toHaveLength(1)
      expect(newBackend.enqueueCalls[0].task.options).toEqual({ delay })
    })

    it('應在未配置 MessageQueueBridge 時拋出錯誤', async () => {
      const unconfiguredHookManager = new HookManager({})

      try {
        await unconfiguredHookManager.dispatchDeferredQueued('no.bridge', {}, 5000)
        expect.unreachable()
      } catch (error: any) {
        expect(error.message).toContain('MessageQueueBridge not configured')
      }
    })
  })

  describe('事件狀態查詢 - getEventStatus()', () => {
    it('應查詢事件狀態', async () => {
      const eventId = 'queue-1707000000000-abc123'
      const status = await bridge.getEventStatus(eventId)

      expect(status).toBeTruthy()
      expect(status.eventId).toBe(eventId)
      expect(status.status).toBe('pending')
      expect(status.attempts).toBe(0)
    })

    it('應通過 HookManager.getEventStatus 查詢', async () => {
      hookManager = new HookManager({
        messageQueueBridge: bridge,
      })

      const eventId = 'queue-test-event'
      const status = await hookManager.getEventStatus(eventId)

      expect(status).toBeTruthy()
      expect(status.eventId).toBe(eventId)
    })
  })

  describe('錯誤邊界情況', () => {
    it('應在缺少必要配置時拋出錯誤', async () => {
      try {
        new MessageQueueBridge({
          hookManager: null as any,
          eventBackend: mockBackend as unknown as EventBackend,
          dlqManager: mockDlqManager as unknown as DeadLetterQueueManager,
        })
        expect.unreachable()
      } catch (error: any) {
        expect(error.message).toContain('hookManager is required')
      }
    })

    it('應在缺少 eventBackend 時拋出錯誤', async () => {
      try {
        new MessageQueueBridge({
          hookManager,
          eventBackend: null as any,
          dlqManager: mockDlqManager as unknown as DeadLetterQueueManager,
        })
        expect.unreachable()
      } catch (error: any) {
        expect(error.message).toContain('eventBackend is required')
      }
    })

    it('應在缺少 dlqManager 時拋出錯誤', async () => {
      try {
        new MessageQueueBridge({
          hookManager,
          eventBackend: mockBackend as unknown as EventBackend,
          dlqManager: null as any,
        })
        expect.unreachable()
      } catch (error: any) {
        expect(error.message).toContain('dlqManager is required')
      }
    })
  })

  describe('Getter 方法', () => {
    it('應返回 EventBackend 實例', () => {
      expect(bridge.getEventBackend()).toBe(mockBackend)
    })

    it('應返回 DLQManager 實例', () => {
      expect(bridge.getDLQManager()).toBe(mockDlqManager)
    })

    it('應返回 HookManager 實例', () => {
      expect(bridge.getHookManager()).toBe(hookManager)
    })
  })
})
