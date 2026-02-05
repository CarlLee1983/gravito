import { describe, expect, it, mock, spyOn } from 'bun:test'
import { SQLitePersistence } from '../src/persistence/SQLitePersistence'

function createMockQueryBuilder(resolvedData: any = []) {
  const qb: any = {
    where: mock((..._args: any[]) => qb),
    whereIn: mock((..._args: any[]) => qb),
    orWhere: mock((..._args: any[]) => qb),
    orderBy: mock((..._args: any[]) => qb),
    limit: mock((..._args: any[]) => qb),
    offset: mock((..._args: any[]) => qb),
    insert: mock(() => Promise.resolve()),
    get: mock(() => Promise.resolve(resolvedData)),
    first: mock(() => Promise.resolve(resolvedData[0] ?? null)),
    count: mock(() => Promise.resolve(resolvedData.length ?? 0)),
    delete: mock(() => Promise.resolve(resolvedData.length ?? 0)),
  }
  return qb
}

function createMockDb(resolvedData: any = [], hasTransaction = false) {
  const qb = createMockQueryBuilder(resolvedData)
  const db: any = {
    table: mock((_name: string) => qb),
    _qb: qb,
  }
  if (hasTransaction) {
    db.transaction = mock(async (fn: Function) => {
      // 模擬 transaction callback，傳入一個類似 trx 的物件
      const trx = { table: mock((_name: string) => qb) }
      await fn(trx)
    })
  }
  return db
}

describe('SQLitePersistence', () => {
  describe('archive', () => {
    it('should delegate to archiveMany', async () => {
      const db = createMockDb()
      const persistence = new SQLitePersistence(db as any)

      await persistence.archive(
        'default',
        { id: 'j-1', type: 'json', data: '{}', createdAt: Date.now() },
        'completed'
      )
      expect(db._qb.insert).toHaveBeenCalled()
    })
  })

  describe('archiveMany', () => {
    it('should do nothing with empty array', async () => {
      const db = createMockDb()
      const persistence = new SQLitePersistence(db as any)

      await persistence.archiveMany([])
      expect(db.table).not.toHaveBeenCalled()
    })

    it('should use transaction when available', async () => {
      const db = createMockDb([], true)
      const persistence = new SQLitePersistence(db as any)

      await persistence.archiveMany([
        {
          queue: 'default',
          job: { id: 'j-1', type: 'json', data: '{}', createdAt: Date.now() },
          status: 'completed',
        },
      ])

      expect(db.transaction).toHaveBeenCalled()
    })

    it('should fallback to direct insert when no transaction', async () => {
      const db = createMockDb()
      const persistence = new SQLitePersistence(db as any)

      await persistence.archiveMany([
        {
          queue: 'default',
          job: { id: 'j-1', type: 'json', data: '{}', createdAt: Date.now() },
          status: 'completed',
        },
      ])

      expect(db.table).toHaveBeenCalledWith('flux_job_archive')
      expect(db._qb.insert).toHaveBeenCalled()
    })

    it('should handle insert errors gracefully', async () => {
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
      const db = createMockDb()
      db._qb.insert = mock(() => Promise.reject(new Error('DB error')))
      const persistence = new SQLitePersistence(db as any)

      await persistence.archiveMany([
        {
          queue: 'default',
          job: { id: 'j-1', type: 'json', data: '{}', createdAt: Date.now() },
          status: 'failed',
        },
      ])

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle non-Error throws', async () => {
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
      const db = createMockDb()
      db._qb.insert = mock(() => Promise.reject('string error'))
      const persistence = new SQLitePersistence(db as any)

      await persistence.archiveMany([
        {
          queue: 'default',
          job: { id: 'j-1', type: 'json', data: '{}', createdAt: Date.now() },
          status: 'failed',
        },
      ])

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('flush', () => {
    it('should be a no-op', async () => {
      const db = createMockDb()
      const persistence = new SQLitePersistence(db as any)
      await persistence.flush()
    })
  })

  describe('find', () => {
    it('should return null when no row found', async () => {
      const db = createMockDb([])
      const persistence = new SQLitePersistence(db as any)
      const result = await persistence.find('default', 'missing')
      expect(result).toBeNull()
    })

    it('should parse string payload', async () => {
      const job = { id: 'j-1', type: 'json', data: '{}', createdAt: 1000 }
      const db = createMockDb([{ payload: JSON.stringify(job) }])
      const persistence = new SQLitePersistence(db as any)
      const result = await persistence.find('default', 'j-1')
      expect(result).toEqual(job)
    })

    it('should return object payload directly', async () => {
      const job = { id: 'j-1', type: 'json', data: '{}', createdAt: 1000 }
      const db = createMockDb([{ payload: job }])
      const persistence = new SQLitePersistence(db as any)
      const result = await persistence.find('default', 'j-1')
      expect(result).toEqual(job)
    })

    it('should return null for invalid JSON', async () => {
      const db = createMockDb([{ payload: '{bad' }])
      const persistence = new SQLitePersistence(db as any)
      const result = await persistence.find('default', 'j-1')
      expect(result).toBeNull()
    })
  })

  describe('list', () => {
    it('should handle array status with whereIn', async () => {
      const db = createMockDb()
      db._qb.get = mock(() => Promise.resolve([]))
      const persistence = new SQLitePersistence(db as any)

      await persistence.list('default', { status: ['completed', 'failed'] })
      expect(db._qb.whereIn).toHaveBeenCalledWith('status', ['completed', 'failed'])
    })

    it('should handle string status with where', async () => {
      const db = createMockDb()
      db._qb.get = mock(() => Promise.resolve([]))
      const persistence = new SQLitePersistence(db as any)

      await persistence.list('default', { status: 'completed' })
      expect(db._qb.where).toHaveBeenCalled()
    })

    it('should apply all filter options', async () => {
      const db = createMockDb()
      db._qb.get = mock(() => Promise.resolve([]))
      const persistence = new SQLitePersistence(db as any)

      await persistence.list('default', {
        jobId: 'j-1',
        startTime: new Date(),
        endTime: new Date(),
        limit: 10,
        offset: 5,
      })

      expect(db._qb.limit).toHaveBeenCalledWith(10)
      expect(db._qb.offset).toHaveBeenCalledWith(5)
    })

    it('should parse and filter invalid entries', async () => {
      const db = createMockDb()
      db._qb.get = mock(() =>
        Promise.resolve([
          { payload: '{invalid', status: 'completed', archived_at: new Date() },
          {
            payload: JSON.stringify({ id: 'ok', type: 'json', data: '{}', createdAt: 1 }),
            status: 'done',
            archived_at: new Date(),
          },
        ])
      )
      const persistence = new SQLitePersistence(db as any)
      const results = await persistence.list('default')
      expect(results).toHaveLength(1)
    })
  })

  describe('search', () => {
    it('should search with queue filter', async () => {
      const db = createMockDb()
      db._qb.get = mock(() => Promise.resolve([]))
      const persistence = new SQLitePersistence(db as any)

      await persistence.search('test', { queue: 'emails' })
      expect(db._qb.get).toHaveBeenCalled()
    })
  })

  describe('archiveLog and archiveLogMany', () => {
    it('should archive a single log', async () => {
      const db = createMockDb()
      const persistence = new SQLitePersistence(db as any)

      await persistence.archiveLog({
        level: 'info',
        message: 'test',
        workerId: 'w-1',
        timestamp: new Date(),
      })

      expect(db.table).toHaveBeenCalledWith('flux_system_logs')
    })

    it('should skip empty logs array', async () => {
      const db = createMockDb()
      const persistence = new SQLitePersistence(db as any)
      await persistence.archiveLogMany([])
      expect(db.table).not.toHaveBeenCalled()
    })

    it('should handle log insert errors', async () => {
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
      const db = createMockDb()
      db._qb.insert = mock(() => Promise.reject(new Error('log error')))
      const persistence = new SQLitePersistence(db as any)

      await persistence.archiveLogMany([
        { level: 'error', message: 'boom', workerId: 'w-1', timestamp: new Date() },
      ])

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('listLogs', () => {
    it('should apply all filters', async () => {
      const db = createMockDb([])
      const persistence = new SQLitePersistence(db as any)

      await persistence.listLogs({
        level: 'error',
        workerId: 'w-1',
        queue: 'default',
        search: 'keyword',
        startTime: new Date(),
        endTime: new Date(),
      })

      expect(db._qb.where).toHaveBeenCalled()
    })
  })

  describe('countLogs', () => {
    it('should apply filters and return count', async () => {
      const db = createMockDb()
      db._qb.count = mock(() => Promise.resolve(15))
      const persistence = new SQLitePersistence(db as any)

      const result = await persistence.countLogs({
        level: 'error',
        workerId: 'w-1',
        queue: 'default',
        search: 'key',
        startTime: new Date(),
        endTime: new Date(),
      })
      expect(result).toBe(15)
    })
  })

  describe('cleanup', () => {
    it('should delete old records', async () => {
      const db = createMockDb()
      db._qb.delete = mock(() => Promise.resolve(3))
      const persistence = new SQLitePersistence(db as any)

      const result = await persistence.cleanup(30)
      expect(result).toBe(6) // 3 + 3
    })
  })

  describe('count', () => {
    it('should handle array status with whereIn', async () => {
      const db = createMockDb()
      db._qb.count = mock(() => Promise.resolve(5))
      const persistence = new SQLitePersistence(db as any)

      const result = await persistence.count('default', { status: ['completed', 'failed'] })
      expect(db._qb.whereIn).toHaveBeenCalled()
      expect(result).toBe(5)
    })

    it('should handle all filter options', async () => {
      const db = createMockDb()
      db._qb.count = mock(() => Promise.resolve(2))
      const persistence = new SQLitePersistence(db as any)

      const result = await persistence.count('default', {
        status: 'failed',
        jobId: 'j-1',
        startTime: new Date(),
        endTime: new Date(),
      })
      expect(result).toBe(2)
    })
  })
})
