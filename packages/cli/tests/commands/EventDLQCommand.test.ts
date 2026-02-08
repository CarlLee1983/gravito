/**
 * @gravito/cli - EventDLQCommand 測試套件
 *
 * 測試 DLQ CLI 工具的所有功能：
 * - list() 命令
 * - show() 命令
 * - requeue() 命令
 * - stats() 命令
 * - resolve() 命令
 * - abandon() 命令
 * - delete() 命令
 */

import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import type { DeadLetterQueueManager, DLQRecord, DLQStats } from '@gravito/core'
import { EventDLQCommand } from '../../src/commands/EventDLQCommand'

// ============================================================================
// Mock 工廠函數
// ============================================================================

function createMockDLQRecord(overrides: Partial<DLQRecord> = {}): DLQRecord {
  return {
    id: 1,
    dlq_id: 'test-uuid-1234',
    event_name: 'order:created',
    event_payload: { orderId: 'ORD-123' },
    event_options: { retry: { maxRetries: 3 } },
    attempt_count: 3,
    max_retries: 3,
    next_retry_at: null,
    last_error: {
      message: 'Database connection failed',
      code: 'DB_ERROR',
      stack: 'Error: Database connection failed\n    at ...',
      timestamp: '2026-02-03T00:00:00.000Z',
    },
    status: 'pending',
    resolution_notes: null,
    failed_at: '2026-02-03T00:00:00.000Z',
    created_at: '2026-02-03T00:00:00.000Z',
    updated_at: '2026-02-03T00:00:00.000Z',
    ...overrides,
  }
}

function createMockDLQManager(
  overrides: Partial<DeadLetterQueueManager> = {}
): DeadLetterQueueManager {
  return {
    list: mock(() => Promise.resolve([])),
    getById: mock(() => Promise.resolve(undefined)),
    requeue: mock(() => Promise.resolve()),
    retryBatch: mock(() => Promise.resolve({ total: 0, succeeded: 0, failed: 0 })),
    resolve: mock(() => Promise.resolve()),
    abandon: mock(() => Promise.resolve()),
    deleteEntry: mock(() => Promise.resolve(false)),
    deleteEntries: mock(() => Promise.resolve(0)),
    getStats: mock(() => Promise.resolve({ total: 0, byEvent: {}, byStatus: {} })),
    getCountByEvent: mock(() => Promise.resolve(0)),
    clear: mock(() => Promise.resolve(0)),
    moveToDlq: mock(() => Promise.resolve('new-id')),
    updateStatus: mock(() => Promise.resolve()),
    ...overrides,
  } as unknown as DeadLetterQueueManager
}

// ============================================================================
// 測試套件
// ============================================================================

describe('EventDLQCommand', () => {
  let command: EventDLQCommand
  let mockManager: DeadLetterQueueManager
  let consoleLogSpy: ReturnType<typeof spyOn>
  let _consoleErrorSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    mockManager = createMockDLQManager()
    command = new EventDLQCommand(mockManager)

    // 捕獲 console 輸出
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {})
    _consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {})
  })

  // ==========================================================================
  // list() 命令測試
  // ==========================================================================

  describe('list()', () => {
    it('returns empty message when no entries found', async () => {
      await command.list({})

      expect(mockManager.list).toHaveBeenCalledWith({})
      expect(consoleLogSpy).toHaveBeenCalled()
      // 應該顯示「無條目」的訊息
      const calls = consoleLogSpy.mock.calls.flat().join(' ')
      expect(calls).toContain('No DLQ entries found')
    })

    it('displays entries in table format', async () => {
      const records = [
        createMockDLQRecord({ dlq_id: 'uuid-1', event_name: 'order:created' }),
        createMockDLQRecord({ dlq_id: 'uuid-2', event_name: 'payment:failed' }),
      ]
      mockManager.list = mock(() => Promise.resolve(records))

      await command.list({})

      expect(mockManager.list).toHaveBeenCalledWith({})
      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('Dead Letter Queue Entries')
      expect(output).toContain('Total: 2 entries')
    })

    it('supports filtering by eventName', async () => {
      await command.list({ eventName: 'order:created' })

      expect(mockManager.list).toHaveBeenCalledWith({ eventName: 'order:created' })
    })

    it('supports filtering by status', async () => {
      await command.list({ status: 'pending' })

      expect(mockManager.list).toHaveBeenCalledWith({ status: 'pending' })
    })

    it('supports date range filtering', async () => {
      const from = new Date('2026-02-01')
      const to = new Date('2026-02-03')

      await command.list({ from, to })

      expect(mockManager.list).toHaveBeenCalledWith({ from, to })
    })

    it('supports pagination with limit and offset', async () => {
      await command.list({ limit: 50, offset: 100 })

      expect(mockManager.list).toHaveBeenCalledWith({ limit: 50, offset: 100 })
    })

    it('outputs JSON format when --json flag is set', async () => {
      const records = [createMockDLQRecord()]
      mockManager.list = mock(() => Promise.resolve(records))

      // 重置 spy 來獲取乾淨的輸出
      consoleLogSpy.mockClear()

      await command.list({}, { json: true })

      const output = consoleLogSpy.mock.calls.flat().join('')
      expect(() => JSON.parse(output)).not.toThrow()
      const parsed = JSON.parse(output)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].dlq_id).toBe('test-uuid-1234')
    })
  })

  // ==========================================================================
  // show() 命令測試
  // ==========================================================================

  describe('show()', () => {
    it('displays entry details when found', async () => {
      const record = createMockDLQRecord()
      mockManager.getById = mock(() => Promise.resolve(record))

      await command.show('test-uuid-1234')

      expect(mockManager.getById).toHaveBeenCalledWith('test-uuid-1234')
      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('DLQ Entry Details')
      expect(output).toContain('order:created')
    })

    it('shows error when entry not found', async () => {
      mockManager.getById = mock(() => Promise.resolve(undefined))

      await command.show('non-existent-id')

      expect(mockManager.getById).toHaveBeenCalledWith('non-existent-id')
      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('Entry not found')
    })

    it('displays payload in JSON format', async () => {
      const record = createMockDLQRecord({
        event_payload: { orderId: 'ORD-123', items: [1, 2, 3] },
      })
      mockManager.getById = mock(() => Promise.resolve(record))

      await command.show('test-uuid-1234')

      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('Payload')
      expect(output).toContain('orderId')
    })

    it('displays stack trace when available', async () => {
      const record = createMockDLQRecord({
        last_error: {
          message: 'Test error',
          stack: 'Error: Test error\n    at test.ts:10:5',
          timestamp: '2026-02-03T00:00:00.000Z',
        },
      })
      mockManager.getById = mock(() => Promise.resolve(record))

      await command.show('test-uuid-1234')

      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('Stack Trace')
    })

    it('outputs JSON format when --json flag is set', async () => {
      const record = createMockDLQRecord()
      mockManager.getById = mock(() => Promise.resolve(record))

      // 重置 spy 來獲取乾淨的輸出
      consoleLogSpy.mockClear()

      await command.show('test-uuid-1234', { json: true })

      const output = consoleLogSpy.mock.calls.flat().join('')
      expect(() => JSON.parse(output)).not.toThrow()
    })
  })

  // ==========================================================================
  // requeue() 命令測試
  // ==========================================================================

  describe('requeue()', () => {
    it('requeues a single event successfully', async () => {
      const record = createMockDLQRecord()
      mockManager.getById = mock(() => Promise.resolve(record))
      mockManager.requeue = mock(() => Promise.resolve())

      await command.requeue('test-uuid-1234')

      expect(mockManager.requeue).toHaveBeenCalledWith('test-uuid-1234')
      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('Successfully requeued')
    })

    it('shows error when entry not found', async () => {
      mockManager.getById = mock(() => Promise.resolve(undefined))
      mockManager.requeue = mock(() => Promise.reject(new Error('DLQ event not found')))

      await command.requeue('non-existent-id')

      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('not found')
    })

    it('handles requeue failure gracefully', async () => {
      mockManager.requeue = mock(() => Promise.reject(new Error('Requeue failed')))

      // 重置 spy 來獲取乾淨的輸出
      consoleLogSpy.mockClear()

      await command.requeue('test-uuid-1234')

      const output = consoleLogSpy.mock.calls.flat().join('\n')
      // 錯誤訊息包含 "failed" (小寫)
      expect(output.toLowerCase()).toContain('failed')
    })
  })

  // ==========================================================================
  // requeueAll() 批量重新入隊測試
  // ==========================================================================

  describe('requeueAll()', () => {
    it('requeues multiple events matching filter', async () => {
      mockManager.retryBatch = mock(() => Promise.resolve({ total: 5, succeeded: 4, failed: 1 }))

      await command.requeueAll({ eventName: 'order:created' })

      expect(mockManager.retryBatch).toHaveBeenCalledWith({ eventName: 'order:created' })
      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('4')
      expect(output).toContain('1')
    })

    it('shows message when no entries found', async () => {
      mockManager.retryBatch = mock(() => Promise.resolve({ total: 0, succeeded: 0, failed: 0 }))

      await command.requeueAll({})

      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('No entries found')
    })
  })

  // ==========================================================================
  // stats() 命令測試
  // ==========================================================================

  describe('stats()', () => {
    it('displays statistics when entries exist', async () => {
      const stats: DLQStats = {
        total: 150,
        byEvent: {
          'order:created': 100,
          'payment:failed': 50,
        },
        byStatus: {
          pending: 120,
          requeued: 20,
          resolved: 8,
          abandoned: 2,
        },
      }
      mockManager.getStats = mock(() => Promise.resolve(stats))

      await command.stats()

      expect(mockManager.getStats).toHaveBeenCalled()
      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('DLQ Statistics')
      expect(output).toContain('150')
      expect(output).toContain('order:created')
      expect(output).toContain('payment:failed')
    })

    it('shows empty message when DLQ is empty', async () => {
      mockManager.getStats = mock(() => Promise.resolve({ total: 0, byEvent: {}, byStatus: {} }))

      await command.stats()

      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('empty')
    })

    it('outputs JSON format when --json flag is set', async () => {
      const stats: DLQStats = {
        total: 10,
        byEvent: { 'test:event': 10 },
        byStatus: { pending: 10 },
      }
      mockManager.getStats = mock(() => Promise.resolve(stats))

      // 重置 spy 來獲取乾淨的輸出
      consoleLogSpy.mockClear()

      await command.stats({ json: true })

      const output = consoleLogSpy.mock.calls.flat().join('')
      expect(() => JSON.parse(output)).not.toThrow()
      const parsed = JSON.parse(output)
      expect(parsed.total).toBe(10)
    })
  })

  // ==========================================================================
  // resolve() 命令測試
  // ==========================================================================

  describe('resolve()', () => {
    it('marks entry as resolved', async () => {
      const record = createMockDLQRecord()
      mockManager.getById = mock(() => Promise.resolve(record))
      mockManager.resolve = mock(() => Promise.resolve())

      await command.resolve('test-uuid-1234', 'Manual fix applied')

      expect(mockManager.resolve).toHaveBeenCalledWith('test-uuid-1234', 'Manual fix applied')
      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('resolved')
    })

    it('shows error when entry not found', async () => {
      mockManager.resolve = mock(() => Promise.reject(new Error('DLQ event not found')))

      await command.resolve('non-existent-id')

      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('not found')
    })
  })

  // ==========================================================================
  // abandon() 命令測試
  // ==========================================================================

  describe('abandon()', () => {
    it('marks entry as abandoned', async () => {
      const record = createMockDLQRecord()
      mockManager.getById = mock(() => Promise.resolve(record))
      mockManager.abandon = mock(() => Promise.resolve())

      await command.abandon('test-uuid-1234', 'Data corrupted')

      expect(mockManager.abandon).toHaveBeenCalledWith('test-uuid-1234', 'Data corrupted')
      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('abandoned')
    })

    it('shows error when entry not found', async () => {
      mockManager.abandon = mock(() => Promise.reject(new Error('DLQ event not found')))

      await command.abandon('non-existent-id')

      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('not found')
    })
  })

  // ==========================================================================
  // delete() 命令測試
  // ==========================================================================

  describe('delete()', () => {
    it('deletes entry successfully', async () => {
      mockManager.deleteEntry = mock(() => Promise.resolve(true))

      await command.delete('test-uuid-1234')

      expect(mockManager.deleteEntry).toHaveBeenCalledWith('test-uuid-1234')
      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('Deleted')
    })

    it('shows error when entry not found', async () => {
      mockManager.deleteEntry = mock(() => Promise.resolve(false))

      await command.delete('non-existent-id')

      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('not found')
    })
  })

  // ==========================================================================
  // deleteAll() 命令測試
  // ==========================================================================

  describe('deleteAll()', () => {
    it('requires confirmation flag', async () => {
      mockManager.getStats = mock(() => Promise.resolve({ total: 10, byEvent: {}, byStatus: {} }))

      await command.deleteAll({}, false)

      expect(mockManager.deleteEntries).not.toHaveBeenCalled()
      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('--force')
    })

    it('deletes all entries with confirmation', async () => {
      // 必須先 mock getStats 返回非零值，否則 deleteAll 會提前返回
      mockManager.getStats = mock(() => Promise.resolve({ total: 10, byEvent: {}, byStatus: {} }))
      mockManager.clear = mock(() => Promise.resolve(10))

      await command.deleteAll({}, true)

      expect(mockManager.clear).toHaveBeenCalled()
      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('Deleted')
      expect(output).toContain('10')
    })

    it('shows message when no entries to delete', async () => {
      mockManager.getStats = mock(() => Promise.resolve({ total: 0, byEvent: {}, byStatus: {} }))

      await command.deleteAll({}, true)

      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('No entries')
    })
  })

  // ==========================================================================
  // 錯誤處理測試
  // ==========================================================================

  describe('Error Handling', () => {
    it('handles database connection errors gracefully', async () => {
      mockManager.list = mock(() => Promise.reject(new Error('Database connection failed')))

      await command.list({})

      const output = consoleLogSpy.mock.calls.flat().join('\n')
      expect(output).toContain('Error')
    })

    it('handles invalid filter parameters', async () => {
      // 傳入無效的 filter 類型
      mockManager.list = mock(() => Promise.resolve([]))

      await command.list({ eventName: '' })

      expect(mockManager.list).toHaveBeenCalled()
    })
  })
})
