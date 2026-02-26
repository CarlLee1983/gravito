import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { EventOptions } from '@gravito/core'
import {
  DeadLetterQueue,
  type DLQEntry,
  type DLQEntrySource,
} from '../../src/dead-letter-queue/DeadLetterQueue'
import { delay } from '../helpers'

// ---------------------------------------------------------------------------
// 共用工具
// ---------------------------------------------------------------------------

const defaultOptions: EventOptions = { priority: 'normal' }

/** 快捷新增一筆 DLQ entry 並回傳 entryId */
const addEntry = (
  dlq: DeadLetterQueue,
  eventName = 'test.event',
  source: DLQEntrySource = 'retry_exhausted'
): string =>
  dlq.add(
    eventName,
    { data: 'payload' },
    defaultOptions,
    new Error('test error'),
    3,
    Date.now(),
    source
  )

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DeadLetterQueue', () => {
  let dlq: DeadLetterQueue

  beforeEach(() => {
    dlq = new DeadLetterQueue()
  })

  // =========================================================================
  // 1. add() 基本行為 (5 it)
  // =========================================================================
  describe('add() 基本行為', () => {
    it('should return a unique entry ID starting with "dlq-"', () => {
      const id = addEntry(dlq)
      expect(id).toMatch(/^dlq-\d+-\d+$/)
    })

    it('should store the entry retrievable via get()', () => {
      const id = addEntry(dlq)
      const entry = dlq.get(id)

      expect(entry).toBeDefined()
      expect(entry!.id).toBe(id)
      expect(entry!.eventName).toBe('test.event')
      expect(entry!.payload).toEqual({ data: 'payload' })
      expect(entry!.retryCount).toBe(3)
      expect(entry!.source).toBe('retry_exhausted')
    })

    it('should serialize the Error into error.message and error.stack', () => {
      const err = new Error('boom')
      const id = dlq.add('evt', {}, defaultOptions, err, 0, Date.now())
      const entry = dlq.get(id)!

      expect(entry.error.message).toBe('boom')
      expect(entry.error.stack).toContain('boom')
    })

    it('should capture error.code when present on the Error', () => {
      const err = new Error('fail') as Error & { code: string }
      err.code = 'ERR_TIMEOUT'
      const id = dlq.add('evt', {}, defaultOptions, err, 0, Date.now())
      const entry = dlq.get(id)!

      expect(entry.error.code).toBe('ERR_TIMEOUT')
    })

    it('should default source to "retry_exhausted" when omitted', () => {
      const id = dlq.add('evt', {}, defaultOptions, new Error('x'), 0, Date.now())
      const entry = dlq.get(id)!

      expect(entry.source).toBe('retry_exhausted')
    })
  })

  // =========================================================================
  // 2. maxEntries 容量管理 (5 it)
  // =========================================================================
  describe('maxEntries 容量管理', () => {
    it('should respect the maxEntries constructor limit', async () => {
      const limited = new DeadLetterQueue(2)

      addEntry(limited, 'evt-1')
      await delay(5)
      addEntry(limited, 'evt-2')
      await delay(5)
      addEntry(limited, 'evt-3')

      expect(limited.getCount()).toBe(2)
    })

    it('should evict the oldest entry when capacity is reached', async () => {
      const limited = new DeadLetterQueue(2)

      addEntry(limited, 'evt-oldest')
      await delay(5)
      addEntry(limited, 'evt-middle')
      await delay(5)
      addEntry(limited, 'evt-newest')

      const entries = limited.list()
      const names = entries.map((e) => e.eventName)

      expect(names).not.toContain('evt-oldest')
      expect(names).toContain('evt-middle')
      expect(names).toContain('evt-newest')
    })

    it('should allow unlimited entries when maxEntries is undefined', () => {
      for (let i = 0; i < 100; i++) {
        addEntry(dlq, `evt-${i}`)
      }
      expect(dlq.getCount()).toBe(100)
    })

    it('should return undefined from getMaxEntries() when no limit is set', () => {
      expect(dlq.getMaxEntries()).toBeUndefined()
    })

    it('should return the configured maxEntries value', () => {
      const limited = new DeadLetterQueue(50)
      expect(limited.getMaxEntries()).toBe(50)
    })
  })

  // =========================================================================
  // 3. list() 查詢與過濾 (6 it)
  // =========================================================================
  describe('list() 查詢與過濾', () => {
    it('should return all entries when no filter is provided', () => {
      addEntry(dlq, 'a')
      addEntry(dlq, 'b')
      addEntry(dlq, 'c')

      expect(dlq.list()).toHaveLength(3)
    })

    it('should filter by eventName', () => {
      addEntry(dlq, 'order.failed')
      addEntry(dlq, 'payment.failed')
      addEntry(dlq, 'order.failed')

      const result = dlq.list({ eventName: 'order.failed' })
      expect(result).toHaveLength(2)
      expect(result.every((e) => e.eventName === 'order.failed')).toBe(true)
    })

    it('should filter by time range (from / to)', async () => {
      addEntry(dlq, 'early')
      await delay(20)

      const midTime = Date.now()
      await delay(5)

      addEntry(dlq, 'late')

      const result = dlq.list({ from: midTime })
      expect(result).toHaveLength(1)
      expect(result[0].eventName).toBe('late')
    })

    it('should apply limit to results', () => {
      for (let i = 0; i < 10; i++) {
        addEntry(dlq, `evt-${i}`)
      }

      const result = dlq.list({ limit: 3 })
      expect(result).toHaveLength(3)
    })

    it('should sort results by failedAt descending (newest first)', async () => {
      addEntry(dlq, 'first')
      await delay(5)
      addEntry(dlq, 'second')
      await delay(5)
      addEntry(dlq, 'third')

      const result = dlq.list()
      expect(result[0].eventName).toBe('third')
      expect(result[result.length - 1].eventName).toBe('first')
    })

    it('should return empty array when no entries match the filter', () => {
      addEntry(dlq, 'order.failed')

      const result = dlq.list({ eventName: 'nonexistent' })
      expect(result).toEqual([])
    })
  })

  // =========================================================================
  // 4. delete() / deleteAll() (4 it)
  // =========================================================================
  describe('delete() / deleteAll()', () => {
    it('should delete a single entry by ID and return true', () => {
      const id = addEntry(dlq)
      expect(dlq.delete(id)).toBe(true)
      expect(dlq.get(id)).toBeUndefined()
      expect(dlq.getCount()).toBe(0)
    })

    it('should return false when deleting a non-existent entry', () => {
      expect(dlq.delete('dlq-nonexistent-999')).toBe(false)
    })

    it('should deleteAll entries matching a filter and return count', () => {
      addEntry(dlq, 'order.failed')
      addEntry(dlq, 'payment.failed')
      addEntry(dlq, 'order.failed')

      const deleted = dlq.deleteAll({ eventName: 'order.failed' })
      expect(deleted).toBe(2)
      expect(dlq.getCount()).toBe(1)
      expect(dlq.list()[0].eventName).toBe('payment.failed')
    })

    it('should clear all entries when deleteAll is called with no filter', () => {
      addEntry(dlq, 'a')
      addEntry(dlq, 'b')
      addEntry(dlq, 'c')

      const deleted = dlq.deleteAll()
      expect(deleted).toBe(3)
      expect(dlq.getCount()).toBe(0)
    })
  })

  // =========================================================================
  // 5. callbacks (4 it)
  // =========================================================================
  describe('callbacks', () => {
    it('should invoke onEntryAdded callback when an entry is added', () => {
      const added: DLQEntry[] = []
      dlq.setOnEntryAdded((entry) => added.push(entry))

      addEntry(dlq)

      expect(added).toHaveLength(1)
      expect(added[0].eventName).toBe('test.event')
    })

    it('should invoke onEntryRemoved callback when an entry is deleted', () => {
      const removed: DLQEntry[] = []
      dlq.setOnEntryRemoved((entry) => removed.push(entry))

      const id = addEntry(dlq)
      dlq.delete(id)

      expect(removed).toHaveLength(1)
      expect(removed[0].id).toBe(id)
    })

    it('should invoke onEntryRemoved for each entry when clear() is called', () => {
      const removed: DLQEntry[] = []
      dlq.setOnEntryRemoved((entry) => removed.push(entry))

      addEntry(dlq, 'a')
      addEntry(dlq, 'b')
      dlq.clear()

      expect(removed).toHaveLength(2)
    })

    it('should allow clearing callbacks by passing undefined', () => {
      const added: DLQEntry[] = []
      dlq.setOnEntryAdded((entry) => added.push(entry))
      dlq.setOnEntryAdded(undefined)

      addEntry(dlq)

      expect(added).toHaveLength(0)
    })
  })

  // =========================================================================
  // 6. 邊界：getOldestEntry / getNewestEntry (3 it)
  // =========================================================================
  describe('getOldestEntry / getNewestEntry', () => {
    it('should return undefined for both when DLQ is empty', () => {
      expect(dlq.getOldestEntry()).toBeUndefined()
      expect(dlq.getNewestEntry()).toBeUndefined()
    })

    it('should return the entry with smallest failedAt as oldest', async () => {
      addEntry(dlq, 'oldest')
      await delay(5)
      addEntry(dlq, 'middle')
      await delay(5)
      addEntry(dlq, 'newest')

      expect(dlq.getOldestEntry()!.eventName).toBe('oldest')
    })

    it('should return the entry with largest failedAt as newest', async () => {
      addEntry(dlq, 'oldest')
      await delay(5)
      addEntry(dlq, 'middle')
      await delay(5)
      addEntry(dlq, 'newest')

      expect(dlq.getNewestEntry()!.eventName).toBe('newest')
    })
  })

  // =========================================================================
  // 7. setMaxEntries() 動態縮容 (3 it)
  // =========================================================================
  describe('setMaxEntries() 動態縮容', () => {
    it('should evict excess entries when limit is reduced below current size', async () => {
      addEntry(dlq, 'a')
      await delay(5)
      addEntry(dlq, 'b')
      await delay(5)
      addEntry(dlq, 'c')
      await delay(5)
      addEntry(dlq, 'd')
      await delay(5)
      addEntry(dlq, 'e')

      dlq.setMaxEntries(2)

      expect(dlq.getCount()).toBe(2)
      expect(dlq.getMaxEntries()).toBe(2)

      // 應保留最新的兩筆
      const names = dlq.list().map((e) => e.eventName)
      expect(names).toContain('d')
      expect(names).toContain('e')
    })

    it('should remove limit when setMaxEntries(undefined) is called', () => {
      const limited = new DeadLetterQueue(5)
      limited.setMaxEntries(undefined)

      expect(limited.getMaxEntries()).toBeUndefined()

      // 無限制，應可新增任意數量
      for (let i = 0; i < 20; i++) {
        addEntry(limited, `evt-${i}`)
      }
      expect(limited.getCount()).toBe(20)
    })

    it('should not evict when new limit is greater than current size', () => {
      addEntry(dlq, 'a')
      addEntry(dlq, 'b')

      dlq.setMaxEntries(100)

      expect(dlq.getCount()).toBe(2)
      expect(dlq.getMaxEntries()).toBe(100)
    })
  })

  // =========================================================================
  // 附加覆蓋：其他方法 (額外驗證)
  // =========================================================================
  describe('其他方法覆蓋', () => {
    it('getCount() should return the total number of entries', () => {
      expect(dlq.getCount()).toBe(0)
      addEntry(dlq, 'a')
      addEntry(dlq, 'b')
      expect(dlq.getCount()).toBe(2)
    })

    it('getCountByEvent() should return count for a specific event name', () => {
      addEntry(dlq, 'order.failed')
      addEntry(dlq, 'payment.failed')
      addEntry(dlq, 'order.failed')

      expect(dlq.getCountByEvent('order.failed')).toBe(2)
      expect(dlq.getCountByEvent('payment.failed')).toBe(1)
      expect(dlq.getCountByEvent('nonexistent')).toBe(0)
    })

    it('getEntriesBySource() should filter entries by DLQ source', () => {
      addEntry(dlq, 'a', 'retry_exhausted')
      addEntry(dlq, 'b', 'circuit_breaker')
      addEntry(dlq, 'c', 'retry_exhausted')
      addEntry(dlq, 'd', 'backpressure_overflow')

      const retryEntries = dlq.getEntriesBySource('retry_exhausted')
      expect(retryEntries).toHaveLength(2)

      const cbEntries = dlq.getEntriesBySource('circuit_breaker')
      expect(cbEntries).toHaveLength(1)
      expect(cbEntries[0].eventName).toBe('b')
    })

    it('updateLastRetried() should set lastRetriedAt timestamp', () => {
      const id = addEntry(dlq)
      const before = dlq.get(id)!
      expect(before.lastRetriedAt).toBeUndefined()

      dlq.updateLastRetried(id)

      const after = dlq.get(id)!
      expect(after.lastRetriedAt).toBeDefined()
      expect(typeof after.lastRetriedAt).toBe('number')
    })

    it('clear() should remove all entries from the DLQ', () => {
      addEntry(dlq, 'a')
      addEntry(dlq, 'b')
      addEntry(dlq, 'c')

      dlq.clear()

      expect(dlq.getCount()).toBe(0)
      expect(dlq.list()).toEqual([])
    })
  })
})
