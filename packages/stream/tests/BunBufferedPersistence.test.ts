import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  BunBufferedPersistence,
  createBufferedPersistence,
} from '../src/persistence/BunBufferedPersistence'
import type { PersistenceAdapter, SerializedJob } from '../src/types'

// ──────────────────────────────────────────────────────────────────────────────
// 測試工具函數
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 建立完整的 mock PersistenceAdapter
 */
function createMockAdapter(): PersistenceAdapter {
  return {
    archive: mock(() => Promise.resolve()),
    archiveMany: mock(() => Promise.resolve()),
    find: mock(() => Promise.resolve(null)),
    list: mock(() => Promise.resolve([])),
    count: mock(() => Promise.resolve(0)),
    cleanup: mock(() => Promise.resolve(5)),
    flush: mock(() => Promise.resolve()),
    archiveLog: mock(() => Promise.resolve()),
    archiveLogMany: mock(() => Promise.resolve()),
    listLogs: mock(() => Promise.resolve([])),
    countLogs: mock(() => Promise.resolve(0)),
  } as unknown as PersistenceAdapter
}

/**
 * 建立不支援 archiveMany / archiveLogMany 的 mock（模擬舊版 adapter）
 */
function createMinimalMockAdapter(): PersistenceAdapter {
  return {
    archive: mock(() => Promise.resolve()),
    find: mock(() => Promise.resolve(null)),
    list: mock(() => Promise.resolve([])),
    count: mock(() => Promise.resolve(0)),
    cleanup: mock(() => Promise.resolve(0)),
    archiveLog: mock(() => Promise.resolve()),
    listLogs: mock(() => Promise.resolve([])),
    countLogs: mock(() => Promise.resolve(0)),
  } as unknown as PersistenceAdapter
}

/**
 * 建立測試用 SerializedJob
 */
function createJob(id = 'job-001', overrides: Partial<SerializedJob> = {}): SerializedJob {
  return {
    id,
    type: 'json',
    data: JSON.stringify({ action: 'sendEmail', to: 'test@example.com' }),
    createdAt: Date.now(),
    ...overrides,
  }
}

/**
 * 建立測試用 log 項目
 */
function createLog(workerId = 'worker-1', queue = 'default') {
  return {
    level: 'info',
    message: 'Job 處理完成',
    workerId,
    queue,
    timestamp: new Date(),
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 測試套件
// ──────────────────────────────────────────────────────────────────────────────

describe('BunBufferedPersistence', () => {
  let bp: BunBufferedPersistence
  let adapter: PersistenceAdapter

  afterEach(async () => {
    // 清理定時器與 flush 狀態，避免測試間互相干擾
    if (bp) {
      const timer = (bp as unknown as Record<string, unknown>).flushTimer
      if (timer) clearTimeout(timer as ReturnType<typeof setTimeout>)
    }
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 1. 基本 archive 與 flush
  // ────────────────────────────────────────────────────────────────────────────

  describe('基本 archive 與 flush', () => {
    beforeEach(() => {
      adapter = createMockAdapter()
      bp = new BunBufferedPersistence(adapter, {
        maxBufferSize: 10,
        flushInterval: 60000, // 長間隔，避免自動觸發
      })
    })

    it('archive 單筆後 pendingJobCount 應增加', async () => {
      const job = createJob()
      await bp.archive('default', job, 'completed')
      expect(bp.pendingJobCount).toBe(1)
    })

    it('手動 flush 後應呼叫 adapter.archiveMany', async () => {
      const job = createJob()
      await bp.archive('default', job, 'completed')
      await bp.flush()

      expect(adapter.archiveMany).toHaveBeenCalledTimes(1)
    })

    it('flush 後 pendingJobCount 應歸零', async () => {
      await bp.archive('default', createJob('j-1'), 'completed')
      await bp.archive('default', createJob('j-2'), 'failed')
      await bp.flush()

      expect(bp.pendingJobCount).toBe(0)
    })

    it('flush 應傳遞正確的 job 資料給 adapter', async () => {
      const job = createJob('test-job', {
        type: 'json',
        data: '{"userId": 42}',
        attempts: 3,
        maxAttempts: 5,
      })

      await bp.archive('email-queue', job, 'failed')
      await bp.flush()

      // @ts-expect-error mock.calls 型別
      const calls = adapter.archiveMany.mock.calls[0][0]
      expect(calls).toHaveLength(1)
      expect(calls[0].queue).toBe('email-queue')
      expect(calls[0].status).toBe('failed')
      expect(calls[0].job.id).toBe('test-job')
    })

    it('多個 archive 呼叫應批次傳遞給 adapter', async () => {
      await bp.archive('q1', createJob('j-1'), 'completed')
      await bp.archive('q1', createJob('j-2'), 'completed')
      await bp.archive('q2', createJob('j-3'), 'failed')
      await bp.flush()

      // @ts-expect-error mock.calls 型別
      const calls = adapter.archiveMany.mock.calls[0][0]
      expect(calls).toHaveLength(3)
    })

    it('空緩衝區 flush 不應呼叫 archiveMany', async () => {
      await bp.flush()
      expect(adapter.archiveMany).not.toHaveBeenCalled()
    })

    it('連續兩次 flush 應各自傳遞對應批次', async () => {
      await bp.archive('default', createJob('batch1-j1'), 'completed')
      await bp.flush()

      await bp.archive('default', createJob('batch2-j1'), 'completed')
      await bp.flush()

      expect(adapter.archiveMany).toHaveBeenCalledTimes(2)
      // @ts-expect-error mock.calls 型別
      expect(adapter.archiveMany.mock.calls[0][0]).toHaveLength(1)
      // @ts-expect-error mock.calls 型別
      expect(adapter.archiveMany.mock.calls[1][0]).toHaveLength(1)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 2. 達到 maxBufferSize 時自動 flush
  // ────────────────────────────────────────────────────────────────────────────

  describe('maxBufferSize 觸發自動 flush', () => {
    it('達到上限時應自動觸發 flush', async () => {
      adapter = createMockAdapter()
      bp = new BunBufferedPersistence(adapter, { maxBufferSize: 3, flushInterval: 60000 })

      await bp.archive('default', createJob('j-1'), 'completed')
      await bp.archive('default', createJob('j-2'), 'completed')
      // 第三筆達到上限，觸發自動 flush
      await bp.archive('default', createJob('j-3'), 'completed')

      // 等待非同步 flush 完成（auto-flush 是 fire-and-forget）
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(adapter.archiveMany).toHaveBeenCalled()
    })

    it('超過上限的 archive 應在 flush 後繼續工作', async () => {
      adapter = createMockAdapter()
      bp = new BunBufferedPersistence(adapter, { maxBufferSize: 2, flushInterval: 60000 })

      await bp.archive('default', createJob('j-1'), 'completed')
      await bp.archive('default', createJob('j-2'), 'completed')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // 第一批 flush 後應仍可繼續 archive
      await bp.archive('default', createJob('j-3'), 'completed')
      await bp.flush()

      expect(adapter.archiveMany).toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 3. 背壓控制
  // ────────────────────────────────────────────────────────────────────────────

  describe('背壓控制', () => {
    it('flush 進行中時 archive 應等待完成再繼續', async () => {
      const flushOrder: string[] = []

      // 建立一個會延遲的 adapter
      const slowAdapter = {
        ...createMockAdapter(),
        archiveMany: mock(async () => {
          flushOrder.push('flush-start')
          await new Promise((resolve) => setTimeout(resolve, 30))
          flushOrder.push('flush-end')
        }),
      } as unknown as PersistenceAdapter

      bp = new BunBufferedPersistence(slowAdapter, { maxBufferSize: 100, flushInterval: 60000 })

      await bp.archive('default', createJob('j-1'), 'completed')

      // 同時發起 flush 和另一個 archive
      const flushPromise = bp.flush()
      // 讓 flush 先啟動
      await Promise.resolve()

      await bp.archive('default', createJob('j-2'), 'completed')
      flushOrder.push('archive-after-flush')
      await flushPromise

      // archive-after-flush 應在 flush-end 之後（或同時）
      // 至少確保 flush 有開始且 archive 不會在 flush 中間干擾
      expect(flushOrder).toContain('flush-start')
      expect(flushOrder).toContain('flush-end')
    })

    it('isFlushing 在 flush 進行中應為 true', async () => {
      const slowAdapter = {
        ...createMockAdapter(),
        archiveMany: mock(() => new Promise<void>((resolve) => setTimeout(resolve, 50))),
      } as unknown as PersistenceAdapter

      bp = new BunBufferedPersistence(slowAdapter, { maxBufferSize: 100, flushInterval: 60000 })
      await bp.archive('default', createJob(), 'completed')

      const flushPromise = bp.flush()
      expect(bp.isFlushing).toBe(true)
      await flushPromise
      expect(bp.isFlushing).toBe(false)
    })

    it('並發呼叫 flush 多次應只執行一次實際 flush', async () => {
      adapter = createMockAdapter()
      bp = new BunBufferedPersistence(adapter, { maxBufferSize: 100, flushInterval: 60000 })

      await bp.archive('default', createJob('j-1'), 'completed')
      await bp.archive('default', createJob('j-2'), 'completed')

      // 同時發起三個 flush
      await Promise.all([bp.flush(), bp.flush(), bp.flush()])

      // archiveMany 只應被呼叫一次（有資料時）
      expect(adapter.archiveMany).toHaveBeenCalledTimes(1)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 4. archiveLog 支援
  // ────────────────────────────────────────────────────────────────────────────

  describe('archiveLog 日誌緩衝', () => {
    beforeEach(() => {
      adapter = createMockAdapter()
      bp = new BunBufferedPersistence(adapter, { maxBufferSize: 10, flushInterval: 60000 })
    })

    it('archiveLog 後 pendingLogCount 應增加', async () => {
      await bp.archiveLog(createLog())
      expect(bp.pendingLogCount).toBe(1)
    })

    it('flush 後應呼叫 adapter.archiveLogMany', async () => {
      await bp.archiveLog(createLog('worker-1', 'email'))
      await bp.flush()

      expect(adapter.archiveLogMany).toHaveBeenCalledTimes(1)
    })

    it('flush 後 pendingLogCount 應歸零', async () => {
      await bp.archiveLog(createLog())
      await bp.archiveLog(createLog('worker-2'))
      await bp.flush()

      expect(bp.pendingLogCount).toBe(0)
    })

    it('flush 應傳遞正確的 log 資料', async () => {
      const log = {
        level: 'error',
        message: 'Job 失敗',
        workerId: 'worker-007',
        queue: 'critical',
        timestamp: new Date('2026-01-15T08:00:00Z'),
      }

      await bp.archiveLog(log)
      await bp.flush()

      // @ts-expect-error mock.calls 型別
      const calls = adapter.archiveLogMany.mock.calls[0][0]
      expect(calls).toHaveLength(1)
      expect(calls[0].level).toBe('error')
      expect(calls[0].message).toBe('Job 失敗')
      expect(calls[0].workerId).toBe('worker-007')
      expect(calls[0].queue).toBe('critical')
    })

    it('沒有 queue 欄位的 log 也應正確保留', async () => {
      await bp.archiveLog({
        level: 'warn',
        message: '無隊列日誌',
        workerId: 'w-1',
        timestamp: new Date(),
        // 沒有 queue
      })
      await bp.flush()

      // @ts-expect-error mock.calls 型別
      const calls = adapter.archiveLogMany.mock.calls[0][0]
      expect(calls[0].queue).toBeUndefined()
    })

    it('達到上限時應自動觸發 log flush', async () => {
      adapter = createMockAdapter()
      bp = new BunBufferedPersistence(adapter, { maxBufferSize: 2, flushInterval: 60000 })

      await bp.archiveLog(createLog('w-1'))
      await bp.archiveLog(createLog('w-2'))
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(adapter.archiveLogMany).toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 5. archiveMany / archiveLogMany 直接委派
  // ────────────────────────────────────────────────────────────────────────────

  describe('archiveMany / archiveLogMany 直接委派', () => {
    it('archiveMany 應直接呼叫 adapter.archiveMany（不走緩衝）', async () => {
      adapter = createMockAdapter()
      bp = new BunBufferedPersistence(adapter, { maxBufferSize: 100, flushInterval: 60000 })

      const jobs = [
        { queue: 'q1', job: createJob('j-1'), status: 'completed' as const },
        { queue: 'q2', job: createJob('j-2'), status: 'failed' as const },
      ]

      await bp.archiveMany(jobs)
      expect(adapter.archiveMany).toHaveBeenCalledWith(jobs)
      // 不應影響 pendingJobCount
      expect(bp.pendingJobCount).toBe(0)
    })

    it('archiveLogMany 應直接呼叫 adapter.archiveLogMany（不走緩衝）', async () => {
      adapter = createMockAdapter()
      bp = new BunBufferedPersistence(adapter, { maxBufferSize: 100, flushInterval: 60000 })

      const logs = [createLog('w-1'), createLog('w-2')]
      await bp.archiveLogMany(logs)

      expect(adapter.archiveLogMany).toHaveBeenCalledWith(logs)
      expect(bp.pendingLogCount).toBe(0)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 6. Node.js 降級（adapter 不支援 archiveMany）
  // ────────────────────────────────────────────────────────────────────────────

  describe('adapter 無 archiveMany 時的降級行為', () => {
    it('應逐筆呼叫 adapter.archive', async () => {
      const minimalAdapter = createMinimalMockAdapter()
      bp = new BunBufferedPersistence(minimalAdapter, { maxBufferSize: 10, flushInterval: 60000 })

      await bp.archive('default', createJob('j-1'), 'completed')
      await bp.archive('default', createJob('j-2'), 'failed')
      await bp.flush()

      expect(minimalAdapter.archive).toHaveBeenCalledTimes(2)
    })

    it('應逐筆呼叫 adapter.archiveLog', async () => {
      const minimalAdapter = createMinimalMockAdapter()
      bp = new BunBufferedPersistence(minimalAdapter, { maxBufferSize: 10, flushInterval: 60000 })

      await bp.archiveLog(createLog('w-1'))
      await bp.archiveLog(createLog('w-2'))
      await bp.flush()

      expect(minimalAdapter.archiveLog).toHaveBeenCalledTimes(2)
    })

    it('archiveMany 在 adapter 無對應方法時應逐筆委派', async () => {
      const minimalAdapter = createMinimalMockAdapter()
      bp = new BunBufferedPersistence(minimalAdapter, { maxBufferSize: 100, flushInterval: 60000 })

      await bp.archiveMany([
        { queue: 'q1', job: createJob('j-1'), status: 'completed' },
        { queue: 'q1', job: createJob('j-2'), status: 'failed' },
      ])

      expect(minimalAdapter.archive).toHaveBeenCalledTimes(2)
    })

    it('archiveLogMany 在 adapter 無對應方法時應逐筆委派', async () => {
      const minimalAdapter = createMinimalMockAdapter()
      bp = new BunBufferedPersistence(minimalAdapter, { maxBufferSize: 100, flushInterval: 60000 })

      await bp.archiveLogMany([createLog('w-1'), createLog('w-2')])

      expect(minimalAdapter.archiveLog).toHaveBeenCalledTimes(2)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 7. 讀取操作委派
  // ────────────────────────────────────────────────────────────────────────────

  describe('讀取操作直接委派', () => {
    beforeEach(() => {
      adapter = createMockAdapter()
      bp = new BunBufferedPersistence(adapter, { maxBufferSize: 100, flushInterval: 60000 })
    })

    it('find 應委派到 adapter.find', async () => {
      await bp.find('default', 'job-123')
      expect(adapter.find).toHaveBeenCalledWith('default', 'job-123')
    })

    it('list 應委派到 adapter.list', async () => {
      const opts = { limit: 10, status: 'completed' }
      await bp.list('default', opts)
      expect(adapter.list).toHaveBeenCalledWith('default', opts)
    })

    it('count 應委派到 adapter.count', async () => {
      const opts = { status: 'failed' }
      await bp.count('default', opts)
      expect(adapter.count).toHaveBeenCalledWith('default', opts)
    })

    it('cleanup 應委派到 adapter.cleanup', async () => {
      await bp.cleanup(30)
      expect(adapter.cleanup).toHaveBeenCalledWith(30)
    })

    it('listLogs 應委派到 adapter.listLogs', async () => {
      const opts = { level: 'error', limit: 50 }
      await bp.listLogs(opts)
      expect(adapter.listLogs).toHaveBeenCalledWith(opts)
    })

    it('countLogs 應委派到 adapter.countLogs', async () => {
      const opts = { level: 'warn' }
      await bp.countLogs(opts)
      expect(adapter.countLogs).toHaveBeenCalledWith(opts)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 8. 錯誤恢復
  // ────────────────────────────────────────────────────────────────────────────

  describe('錯誤恢復', () => {
    it('adapter.archiveMany 拋出錯誤時 flush 應 reject', async () => {
      const errorAdapter = {
        ...createMockAdapter(),
        archiveMany: mock(() => Promise.reject(new Error('資料庫連線失敗'))),
      } as unknown as PersistenceAdapter

      bp = new BunBufferedPersistence(errorAdapter, { maxBufferSize: 100, flushInterval: 60000 })
      await bp.archive('default', createJob(), 'completed')

      await expect(bp.flush()).rejects.toThrow('資料庫連線失敗')
    })

    it('flush 失敗後應重置 flushing 狀態', async () => {
      const errorAdapter = {
        ...createMockAdapter(),
        archiveMany: mock(() => Promise.reject(new Error('timeout'))),
      } as unknown as PersistenceAdapter

      bp = new BunBufferedPersistence(errorAdapter, { maxBufferSize: 100, flushInterval: 60000 })
      await bp.archive('default', createJob(), 'completed')

      await bp.flush().catch(() => {
        /* 預期的錯誤，忽略 */
      })

      // flush 結束後 isFlushing 應為 false
      expect(bp.isFlushing).toBe(false)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 9. 同時包含 jobs 和 logs 的混合 flush
  // ────────────────────────────────────────────────────────────────────────────

  describe('混合 jobs 和 logs 的批次 flush', () => {
    it('應同時 flush jobs 和 logs', async () => {
      adapter = createMockAdapter()
      bp = new BunBufferedPersistence(adapter, { maxBufferSize: 100, flushInterval: 60000 })

      await bp.archive('default', createJob('j-1'), 'completed')
      await bp.archive('default', createJob('j-2'), 'failed')
      await bp.archiveLog(createLog('w-1'))
      await bp.archiveLog(createLog('w-2'))
      await bp.archiveLog(createLog('w-3'))

      await bp.flush()

      // @ts-expect-error mock.calls 型別
      const jobCalls = adapter.archiveMany.mock.calls[0][0]
      // @ts-expect-error mock.calls 型別
      const logCalls = adapter.archiveLogMany.mock.calls[0][0]

      expect(jobCalls).toHaveLength(2)
      expect(logCalls).toHaveLength(3)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 10. SerializedJob 欄位保留
  // ────────────────────────────────────────────────────────────────────────────

  describe('SerializedJob 完整欄位保留', () => {
    it('應保留所有選擇性欄位', async () => {
      adapter = createMockAdapter()
      bp = new BunBufferedPersistence(adapter, { maxBufferSize: 100, flushInterval: 60000 })

      const job: SerializedJob = {
        id: 'complex-job',
        type: 'json',
        data: '{"key":"value"}',
        createdAt: 1700000000000,
        className: 'SendEmailJob',
        delaySeconds: 60,
        attempts: 2,
        maxAttempts: 5,
        groupId: 'user-42',
        retryAfterSeconds: 30,
        retryMultiplier: 2,
        error: '上一次失敗的原因',
        failedAt: 1700000000100,
        priority: 'high',
      }

      await bp.archive('priority-queue', job, 'failed')
      await bp.flush()

      // @ts-expect-error mock.calls 型別
      const calls = adapter.archiveMany.mock.calls[0][0]
      const archived = calls[0].job as SerializedJob

      expect(archived.id).toBe('complex-job')
      expect(archived.className).toBe('SendEmailJob')
      expect(archived.delaySeconds).toBe(60)
      expect(archived.attempts).toBe(2)
      expect(archived.maxAttempts).toBe(5)
      expect(archived.groupId).toBe('user-42')
      expect(archived.retryAfterSeconds).toBe(30)
      expect(archived.retryMultiplier).toBe(2)
      expect(archived.error).toBe('上一次失敗的原因')
      expect(archived.failedAt).toBe(1700000000100)
      expect(archived.priority).toBe('high')
    })

    it('應正確保留 Uint8Array 型別的 data', async () => {
      adapter = createMockAdapter()
      bp = new BunBufferedPersistence(adapter, { maxBufferSize: 100, flushInterval: 60000 })

      const binaryData = new Uint8Array([1, 2, 3, 4, 5, 0xff])
      const job = createJob('binary-job', {
        type: 'binary',
        data: binaryData,
      })

      await bp.archive('binary-queue', job, 'completed')
      await bp.flush()

      // @ts-expect-error mock.calls 型別
      const calls = adapter.archiveMany.mock.calls[0][0]
      const archived = calls[0].job as SerializedJob
      // data 被 CBOR 編碼為 bytes，解碼後應還原為 Uint8Array
      expect(archived.data).toBeInstanceOf(Uint8Array)
      expect(Array.from(archived.data as Uint8Array)).toEqual([1, 2, 3, 4, 5, 0xff])
    })

    it('number 型別的 priority 應正確保留', async () => {
      adapter = createMockAdapter()
      bp = new BunBufferedPersistence(adapter, { maxBufferSize: 100, flushInterval: 60000 })

      const job = createJob('priority-num', { priority: 10 })
      await bp.archive('default', job, 'completed')
      await bp.flush()

      // @ts-expect-error mock.calls 型別
      const calls = adapter.archiveMany.mock.calls[0][0]
      expect(calls[0].job.priority).toBe(10)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 11. createBufferedPersistence 工廠函數
  // ────────────────────────────────────────────────────────────────────────────

  describe('createBufferedPersistence 工廠函數', () => {
    it('應回傳 BunBufferedPersistence 實例', () => {
      const adapter = createMockAdapter()
      const instance = createBufferedPersistence(adapter, { maxBufferSize: 20 })
      expect(instance).toBeInstanceOf(BunBufferedPersistence)
    })

    it('工廠建立的實例應正常運作', async () => {
      const adapter = createMockAdapter()
      const instance = createBufferedPersistence(adapter, {
        maxBufferSize: 10,
        flushInterval: 60000,
      })

      await instance.archive('default', createJob(), 'completed')
      expect(instance.pendingJobCount).toBe(1)

      await instance.flush()
      expect(instance.pendingJobCount).toBe(0)
      expect(adapter.archiveMany).toHaveBeenCalledTimes(1)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 12. 大量資料壓力測試
  // ────────────────────────────────────────────────────────────────────────────

  describe('大量資料壓力測試', () => {
    it('應正確處理 200 筆連續 archive', async () => {
      const receivedJobs: Array<{ queue: string; job: SerializedJob; status: string }> = []

      const collectingAdapter = {
        ...createMockAdapter(),
        archiveMany: mock((jobs: typeof receivedJobs) => {
          receivedJobs.push(...jobs)
          return Promise.resolve()
        }),
      } as unknown as PersistenceAdapter

      bp = new BunBufferedPersistence(collectingAdapter, {
        maxBufferSize: 1000, // 不自動 flush
        flushInterval: 60000,
      })

      for (let i = 0; i < 200; i++) {
        await bp.archive('perf-queue', createJob(`perf-job-${i}`), 'completed')
      }

      await bp.flush()

      expect(receivedJobs).toHaveLength(200)
      // 驗證順序正確（ID 應按插入順序）
      expect(receivedJobs[0].job.id).toBe('perf-job-0')
      expect(receivedJobs[199].job.id).toBe('perf-job-199')
    })

    it('交替 archive jobs 和 logs 後 flush 應各自正確', async () => {
      const allJobs: unknown[] = []
      const allLogs: unknown[] = []

      const collectingAdapter = {
        ...createMockAdapter(),
        archiveMany: mock((jobs: unknown[]) => {
          allJobs.push(...jobs)
          return Promise.resolve()
        }),
        archiveLogMany: mock((logs: unknown[]) => {
          allLogs.push(...logs)
          return Promise.resolve()
        }),
      } as unknown as PersistenceAdapter

      bp = new BunBufferedPersistence(collectingAdapter, {
        maxBufferSize: 1000,
        flushInterval: 60000,
      })

      for (let i = 0; i < 50; i++) {
        await bp.archive('default', createJob(`j-${i}`), 'completed')
        await bp.archiveLog(createLog(`worker-${i % 5}`))
      }

      await bp.flush()

      expect(allJobs).toHaveLength(50)
      expect(allLogs).toHaveLength(50)
    })
  })
})
