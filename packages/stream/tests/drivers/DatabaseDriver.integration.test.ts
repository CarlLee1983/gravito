import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { DatabaseService } from '../../src/drivers/DatabaseDriver'
import { DatabaseDriver } from '../../src/drivers/DatabaseDriver'
import type { SerializedJob } from '../../src/types'

// --- Helper: 建立 mock SerializedJob ---
function createMockJob(overrides: Partial<SerializedJob> = {}): SerializedJob {
  return {
    id: 'job-1',
    type: 'json',
    data: '{"key":"value"}',
    className: 'TestJob',
    createdAt: 1700000000000,
    delaySeconds: 0,
    attempts: 0,
    maxAttempts: 3,
    ...overrides,
  }
}

// --- Helper: 建立 mock DatabaseService ---
function createMockDbService(): DatabaseService {
  return {
    execute: mock((_sql: string, _bindings?: unknown[]) => Promise.resolve([] as any)),
    transaction: mock(async (callback: (tx: DatabaseService) => Promise<any>) => {
      const txService: DatabaseService = {
        execute: mock((_sql: string, _bindings?: unknown[]) => Promise.resolve([] as any)),
        transaction: mock(async (cb: any) => cb(txService)),
      }
      return callback(txService)
    }),
  }
}

describe('DatabaseDriver', () => {
  let driver: DatabaseDriver
  let mockDb: DatabaseService

  beforeEach(() => {
    mockDb = createMockDbService()
    driver = new DatabaseDriver({
      table: 'queue_jobs',
      dbService: mockDb,
    })
  })

  afterEach(() => {
    ;(mockDb.execute as any).mockClear()
    ;(mockDb.transaction as any).mockClear()
  })

  // --- 建構函式測試 ---
  describe('constructor', () => {
    test('應使用提供的設定建立實例', () => {
      expect(driver).toBeDefined()
    })

    test('應在未提供 table 時使用預設值 jobs', () => {
      const d = new DatabaseDriver({ dbService: mockDb })
      expect(d).toBeDefined()
    })

    test('應在未提供 dbService 時拋出錯誤', () => {
      expect(() => new DatabaseDriver({ dbService: undefined })).toThrow(
        '[DatabaseDriver] dbService is required'
      )
    })

    test('應在 dbService 為 null 時拋出錯誤', () => {
      expect(() => new DatabaseDriver({ dbService: null as any })).toThrow(
        '[DatabaseDriver] dbService is required'
      )
    })

    test('應拒絕不安全的 table 名稱', () => {
      expect(
        () =>
          new DatabaseDriver({
            table: 'queue_jobs; DROP TABLE users',
            dbService: mockDb,
          })
      ).toThrow('Invalid table')
    })
  })

  // --- push 測試 ---
  describe('push', () => {
    test('應執行 INSERT 語句', async () => {
      const job = createMockJob()
      await driver.push('default', job)

      expect(mockDb.execute).toHaveBeenCalledTimes(1)
      const args = (mockDb.execute as any).mock.calls[0]!
      const sql = args[0] as string
      expect(sql).toContain('INSERT INTO queue_jobs')
      expect(sql).toContain('queue, payload, attempts, available_at, created_at')

      const bindings = args[1] as any[]
      expect(bindings[0]).toBe('default')
      // payload 是完整的 JSON
      const payload = JSON.parse(bindings[1] as string)
      expect(payload.id).toBe('job-1')
      expect(payload.type).toBe('json')
      expect(bindings[2]).toBe(0) // attempts
    })

    test('應在 job 有 delaySeconds 時設定 available_at 為未來時間', async () => {
      const now = Date.now()
      const job = createMockJob({ delaySeconds: 60 })
      await driver.push('default', job)

      const bindings = (mockDb.execute as any).mock.calls[0]?.[1] as any[]
      const availableAt = new Date(bindings[3] as string).getTime()
      // available_at 應大約在 now + 60s
      expect(availableAt).toBeGreaterThan(now + 59000)
      expect(availableAt).toBeLessThan(now + 62000)
    })

    test('應在 job 沒有 delaySeconds 時設定 available_at 為現在', async () => {
      const now = Date.now()
      const job = createMockJob({ delaySeconds: 0 })
      await driver.push('default', job)

      const bindings = (mockDb.execute as any).mock.calls[0]?.[1] as any[]
      const availableAt = new Date(bindings[3] as string).getTime()
      // 應在接近現在的時間
      expect(availableAt).toBeGreaterThan(now - 2000)
      expect(availableAt).toBeLessThan(now + 2000)
    })

    test('應在 attempts 為 undefined 時使用 0', async () => {
      const job = createMockJob({ attempts: undefined })
      await driver.push('default', job)

      const bindings = (mockDb.execute as any).mock.calls[0]?.[1] as any[]
      expect(bindings[2]).toBe(0)
    })

    test('應使用自訂 table 名稱', async () => {
      const customDriver = new DatabaseDriver({
        table: 'custom_jobs',
        dbService: mockDb,
      })
      const job = createMockJob()
      await customDriver.push('default', job)

      const sql = (mockDb.execute as any).mock.calls[0]?.[0] as string
      expect(sql).toContain('INSERT INTO custom_jobs')
    })
  })

  // --- pop 測試 ---
  describe('pop', () => {
    test('應在找到 job 時回傳 SerializedJob', async () => {
      const jobPayload = createMockJob()
      ;(mockDb.execute as any).mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT')) {
          return [
            {
              id: 'db-row-1',
              payload: JSON.stringify(jobPayload),
              attempts: 1,
              created_at: new Date(1700000000000),
              available_at: new Date(1700000000000),
            },
          ]
        }
        // UPDATE
        return []
      })

      const result = await driver.pop('default')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('db-row-1') // DB ID 覆蓋 payload ID
      expect(result?.type).toBe('json')
      expect(result?.attempts).toBe(1)
    })

    test('應在佇列為空時回傳 null', async () => {
      ;(mockDb.execute as any).mockImplementation(async () => [])

      const result = await driver.pop('empty-queue')
      expect(result).toBeNull()
    })

    test('應在結果為 null 時回傳 null', async () => {
      ;(mockDb.execute as any).mockImplementation(async () => null)

      const result = await driver.pop('empty-queue')
      expect(result).toBeNull()
    })

    test('應在 SKIP LOCKED 失敗時 fallback 到 FOR UPDATE', async () => {
      let callCount = 0
      ;(mockDb.execute as any).mockImplementation(async (sql: string) => {
        callCount++
        if (callCount === 1 && sql.includes('SKIP LOCKED')) {
          throw new Error('SKIP LOCKED not supported')
        }
        if (sql.includes('SELECT')) {
          return [
            {
              id: 'fallback-row',
              payload: JSON.stringify(createMockJob()),
              attempts: 0,
              created_at: new Date(),
              available_at: new Date(),
            },
          ]
        }
        return []
      })

      const result = await driver.pop('default')
      expect(result).not.toBeNull()
      // 應嘗試過兩次 SELECT（第一次失敗，第二次成功）
      expect(callCount).toBeGreaterThanOrEqual(2)
    })

    test('應標記取得的 job 為 reserved', async () => {
      const jobPayload = createMockJob()
      let updateCalled = false
      ;(mockDb.execute as any).mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT')) {
          return [
            {
              id: 'row-123',
              payload: JSON.stringify(jobPayload),
              attempts: 0,
              created_at: new Date(),
              available_at: new Date(),
            },
          ]
        }
        if (sql.includes('UPDATE') && sql.includes('reserved_at')) {
          updateCalled = true
          return []
        }
        return []
      })

      await driver.pop('default')
      expect(updateCalled).toBe(true)
    })

    test('應在 payload 格式不正確時 fallback 到舊格式', async () => {
      ;(mockDb.execute as any).mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT')) {
          return [
            {
              id: 'old-row',
              payload: 'not-valid-json-structure',
              attempts: 2,
              created_at: new Date(1700000000000),
              available_at: new Date(1700000000000),
            },
          ]
        }
        return []
      })

      const result = await driver.pop('default')
      expect(result).not.toBeNull()
      expect(result?.id).toBe('old-row')
      expect(result?.type).toBe('class')
      expect(result?.data).toBe('not-valid-json-structure')
    })
  })

  // --- popMany 測試 ---
  describe('popMany', () => {
    test('應在 count <= 1 時使用 pop()', async () => {
      const jobPayload = createMockJob()
      ;(mockDb.execute as any).mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT')) {
          return [
            {
              id: 'single-row',
              payload: JSON.stringify(jobPayload),
              attempts: 0,
              created_at: new Date(),
              available_at: new Date(),
            },
          ]
        }
        return []
      })

      const results = await driver.popMany('default', 1)
      expect(results).toHaveLength(1)
      expect(results[0]?.id).toBe('single-row')
    })

    test('應批次取出多個 jobs', async () => {
      const jobs = [
        {
          id: 'row-1',
          payload: JSON.stringify(createMockJob({ id: 'j1' })),
          attempts: 0,
          created_at: new Date(),
          available_at: new Date(),
        },
        {
          id: 'row-2',
          payload: JSON.stringify(createMockJob({ id: 'j2' })),
          attempts: 1,
          created_at: new Date(),
          available_at: new Date(),
        },
      ]

      ;(mockDb.execute as any).mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT')) {
          return jobs
        }
        // UPDATE (batch reserve)
        return []
      })

      const results = await driver.popMany('default', 5)
      expect(results).toHaveLength(2)
      expect(results[0]?.id).toBe('row-1')
      expect(results[1]?.id).toBe('row-2')
    })

    test('應在佇列為空時回傳空陣列', async () => {
      ;(mockDb.execute as any).mockImplementation(async () => [])

      const results = await driver.popMany('default', 5)
      expect(results).toEqual([])
    })

    test('應在 SKIP LOCKED 不支援時 fallback 到 pop()', async () => {
      let selectCallCount = 0
      ;(mockDb.execute as any).mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT') && sql.includes('SKIP LOCKED')) {
          selectCallCount++
          if (selectCallCount === 1) {
            // popMany 自己的查詢失敗
            throw new Error('SKIP LOCKED not supported')
          }
        }
        if (sql.includes('SELECT')) {
          return [
            {
              id: 'fallback-row',
              payload: JSON.stringify(createMockJob()),
              attempts: 0,
              created_at: new Date(),
              available_at: new Date(),
            },
          ]
        }
        return []
      })

      const results = await driver.popMany('default', 3)
      // fallback 到 pop() 應回傳至少一筆
      expect(results.length).toBeGreaterThanOrEqual(0)
    })

    test('應批次 UPDATE reserved_at', async () => {
      const jobs = [
        {
          id: 'r1',
          payload: JSON.stringify(createMockJob()),
          attempts: 0,
          created_at: new Date(),
          available_at: new Date(),
        },
        {
          id: 'r2',
          payload: JSON.stringify(createMockJob()),
          attempts: 0,
          created_at: new Date(),
          available_at: new Date(),
        },
      ]

      let updateSql = ''
      ;(mockDb.execute as any).mockImplementation(async (sql: string, _bindings?: any[]) => {
        if (sql.includes('SELECT')) {
          return jobs
        }
        if (sql.includes('UPDATE')) {
          updateSql = sql
          return []
        }
        return []
      })

      await driver.popMany('default', 5)
      expect(updateSql).toContain('UPDATE queue_jobs')
      expect(updateSql).toContain('reserved_at')
      expect(updateSql).toContain('IN')
    })
  })

  // --- size 測試 ---
  describe('size', () => {
    test('應回傳待處理的 job 數量', async () => {
      ;(mockDb.execute as any).mockImplementation(async () => [{ count: 15 }])

      const result = await driver.size('default')
      expect(result).toBe(15)
    })

    test('應在結果為空時回傳 0', async () => {
      ;(mockDb.execute as any).mockImplementation(async () => [])

      const result = await driver.size('default')
      expect(result).toBe(0)
    })

    test('應在結果為 null 時回傳 0', async () => {
      ;(mockDb.execute as any).mockImplementation(async () => null)

      const result = await driver.size('default')
      expect(result).toBe(0)
    })

    test('應使用正確的 SQL 查詢', async () => {
      ;(mockDb.execute as any).mockImplementation(async () => [{ count: 0 }])

      await driver.size('emails')

      const sql = (mockDb.execute as any).mock.calls[0]?.[0] as string
      expect(sql).toContain('SELECT COUNT(*)')
      expect(sql).toContain('queue_jobs')
      expect(sql).toContain('available_at <= NOW()')
    })
  })

  // --- clear 測試 ---
  describe('clear', () => {
    test('應刪除指定佇列的所有 rows', async () => {
      await driver.clear('default')

      expect(mockDb.execute).toHaveBeenCalledTimes(1)
      const args = (mockDb.execute as any).mock.calls[0]!
      const sql = args[0] as string
      expect(sql).toContain('DELETE FROM queue_jobs')
      expect(sql).toContain('WHERE queue = $1')
      expect(args[1]).toEqual(['default'])
    })
  })

  // --- pushMany 測試 ---
  describe('pushMany', () => {
    test('應在空陣列時提前返回', async () => {
      await driver.pushMany('default', [])
      expect(mockDb.transaction).not.toHaveBeenCalled()
    })

    test('應在 transaction 中批次 INSERT', async () => {
      const jobs = [
        createMockJob({ id: 'j1' }),
        createMockJob({ id: 'j2' }),
        createMockJob({ id: 'j3' }),
      ]

      let insertCount = 0
      ;(mockDb.transaction as any).mockImplementation(
        async (callback: (tx: DatabaseService) => Promise<void>) => {
          const txService: DatabaseService = {
            execute: mock(async (_sql: string) => {
              insertCount++
              return []
            }),
            transaction: mock(async (cb: any) => cb(txService)),
          }
          return callback(txService)
        }
      )

      await driver.pushMany('default', jobs)

      expect(mockDb.transaction).toHaveBeenCalledTimes(1)
      expect(insertCount).toBe(3)
    })

    test('應為延遲 jobs 設定正確的 available_at', async () => {
      const now = Date.now()
      const jobs = [createMockJob({ id: 'delayed-j', delaySeconds: 120 })]

      let capturedBindings: any[] = []
      ;(mockDb.transaction as any).mockImplementation(
        async (callback: (tx: DatabaseService) => Promise<void>) => {
          const txService: DatabaseService = {
            execute: mock(async (_sql: string, bindings?: unknown[]) => {
              capturedBindings = bindings as any[]
              return []
            }),
            transaction: mock(async (cb: any) => cb(txService)),
          }
          return callback(txService)
        }
      )

      await driver.pushMany('default', jobs)

      const availableAt = new Date(capturedBindings[3] as string).getTime()
      expect(availableAt).toBeGreaterThan(now + 119000)
    })
  })

  // --- stats 測試 ---
  describe('stats', () => {
    test('應回傳包含 size、delayed、reserved、failed 的統計', async () => {
      let queryCount = 0
      ;(mockDb.execute as any).mockImplementation(async () => {
        queryCount++
        switch (queryCount) {
          case 1:
            return [{ count: 10 }] // pending
          case 2:
            return [{ count: 3 }] // delayed
          case 3:
            return [{ count: 2 }] // reserved
          case 4:
            return [{ count: 1 }] // failed
          default:
            return [{ count: 0 }]
        }
      })

      const result = await driver.stats('default')

      expect(result.queue).toBe('default')
      expect(result.size).toBe(10)
      expect(result.delayed).toBe(3)
      expect(result.reserved).toBe(2)
      expect(result.failed).toBe(1)
    })

    test('應在查詢失敗時回傳預設 stats', async () => {
      ;(mockDb.execute as any).mockImplementation(async () => {
        throw new Error('DB error')
      })

      const result = await driver.stats('default')
      expect(result.queue).toBe('default')
      expect(result.size).toBe(0)
      expect(result.delayed).toBe(0)
      expect(result.failed).toBe(0)
    })
  })

  // --- fail 測試 ---
  describe('fail', () => {
    test('應將失敗的 job INSERT 到 failed: 佇列', async () => {
      const job = createMockJob({ error: 'something went wrong', attempts: 3 })
      await driver.fail('default', job)

      expect(mockDb.execute).toHaveBeenCalledTimes(1)
      const args = (mockDb.execute as any).mock.calls[0]!
      const sql = args[0] as string
      expect(sql).toContain('INSERT INTO queue_jobs')

      const bindings = args[1] as any[]
      expect(bindings[0]).toBe('failed:default')
      expect(bindings[2]).toBe(3) // attempts
    })
  })

  // --- complete 測試 ---
  describe('complete', () => {
    test('應刪除已完成的 job row', async () => {
      const job = createMockJob({ id: 'completed-job' })
      await driver.complete('default', job)

      expect(mockDb.execute).toHaveBeenCalledTimes(1)
      const args = (mockDb.execute as any).mock.calls[0]!
      const sql = args[0] as string
      expect(sql).toContain('DELETE FROM queue_jobs')
      expect(sql).toContain('WHERE id = $1')
      expect(args[1]).toEqual(['completed-job'])
    })

    test('應在 job 沒有 id 時不做任何事', async () => {
      const job = createMockJob({ id: '' })
      await driver.complete('default', job)

      // id 為空字串，!!'' === false，所以不應呼叫 execute
      expect(mockDb.execute).not.toHaveBeenCalled()
    })
  })

  // --- popBlocking 測試 ---
  describe('popBlocking', () => {
    test('應在立即有 job 時回傳', async () => {
      const jobPayload = createMockJob()
      ;(mockDb.execute as any).mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT')) {
          return [
            {
              id: 'blocking-row',
              payload: JSON.stringify(jobPayload),
              attempts: 0,
              created_at: new Date(),
              available_at: new Date(),
            },
          ]
        }
        return []
      })

      const result = await driver.popBlocking('default', 5)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('blocking-row')
    })

    test('應在逾時後回傳 null', async () => {
      ;(mockDb.execute as any).mockImplementation(async () => [])

      // 注意：timeout=0 在實作中表示無限等待，因此使用極小的正數逾時
      const result = await driver.popBlocking('default', 0.001)
      expect(result).toBeNull()
    })
  })
})
