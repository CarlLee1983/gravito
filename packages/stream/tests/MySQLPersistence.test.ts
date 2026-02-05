import { describe, expect, it, mock, spyOn } from 'bun:test'
import { MySQLPersistence } from '../src/persistence/MySQLPersistence'

/**
 * 建立模擬的 QueryBuilder chain
 */
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

function createMockDb(resolvedData: any = []) {
  const qb = createMockQueryBuilder(resolvedData)
  return {
    table: mock((_name: string) => qb),
    _qb: qb,
  }
}

describe('MySQLPersistence', () => {
  describe('archive', () => {
    it('should delegate to archiveMany', async () => {
      const db = createMockDb()
      const persistence = new MySQLPersistence(db as any)
      const job = { id: 'j-1', type: 'json', data: '{}', createdAt: Date.now() }

      await persistence.archive('default', job, 'completed')
      expect(db.table).toHaveBeenCalledWith('flux_job_archive')
      expect(db._qb.insert).toHaveBeenCalled()
    })
  })

  describe('archiveMany', () => {
    it('should do nothing with empty array', async () => {
      const db = createMockDb()
      const persistence = new MySQLPersistence(db as any)

      await persistence.archiveMany([])
      expect(db.table).not.toHaveBeenCalled()
    })

    it('should batch insert jobs', async () => {
      const db = createMockDb()
      const persistence = new MySQLPersistence(db as any)
      const jobs = Array.from({ length: 3 }, (_, i) => ({
        queue: 'default',
        job: { id: `j-${i}`, type: 'json' as const, data: '{}', createdAt: Date.now() },
        status: 'completed' as const,
      }))

      await persistence.archiveMany(jobs)
      expect(db._qb.insert).toHaveBeenCalled()
    })

    it('should handle insert errors gracefully', async () => {
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
      const db = createMockDb()
      db._qb.insert = mock(() => Promise.reject(new Error('DB error')))
      const persistence = new MySQLPersistence(db as any)

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

    it('should include error field from job', async () => {
      const db = createMockDb()
      const persistence = new MySQLPersistence(db as any)

      await persistence.archiveMany([
        {
          queue: 'default',
          job: { id: 'j-1', type: 'json', data: '{}', createdAt: Date.now(), error: 'boom' },
          status: 'failed',
        },
      ])

      const insertArg = db._qb.insert.mock.calls[0][0]
      expect(insertArg[0].error).toBe('boom')
    })
  })

  describe('flush', () => {
    it('should be a no-op', async () => {
      const db = createMockDb()
      const persistence = new MySQLPersistence(db as any)
      await persistence.flush()
    })
  })

  describe('find', () => {
    it('should return null when no row found', async () => {
      const db = createMockDb([])
      const persistence = new MySQLPersistence(db as any)

      const result = await persistence.find('default', 'missing')
      expect(result).toBeNull()
    })

    it('should parse string payload', async () => {
      const job = { id: 'j-1', type: 'json', data: '{}', createdAt: 1000 }
      const db = createMockDb([{ payload: JSON.stringify(job) }])
      const persistence = new MySQLPersistence(db as any)

      const result = await persistence.find('default', 'j-1')
      expect(result).toEqual(job)
    })

    it('should return object payload directly', async () => {
      const job = { id: 'j-1', type: 'json', data: '{}', createdAt: 1000 }
      const db = createMockDb([{ payload: job }])
      const persistence = new MySQLPersistence(db as any)

      const result = await persistence.find('default', 'j-1')
      expect(result).toEqual(job)
    })

    it('should return null for invalid JSON', async () => {
      const db = createMockDb([{ payload: '{invalid' }])
      const persistence = new MySQLPersistence(db as any)

      const result = await persistence.find('default', 'j-1')
      expect(result).toBeNull()
    })
  })

  describe('list', () => {
    it('should apply all filter options', async () => {
      const db = createMockDb([])
      const persistence = new MySQLPersistence(db as any)

      await persistence.list('default', {
        status: 'completed',
        jobId: 'j-1',
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-12-31'),
        limit: 10,
        offset: 5,
      })

      expect(db._qb.where).toHaveBeenCalled()
      expect(db._qb.orderBy).toHaveBeenCalledWith('archived_at', 'desc')
      expect(db._qb.limit).toHaveBeenCalledWith(10)
      expect(db._qb.offset).toHaveBeenCalledWith(5)
    })

    it('should use defaults for limit and offset', async () => {
      const db = createMockDb([])
      const persistence = new MySQLPersistence(db as any)

      await persistence.list('default')
      expect(db._qb.limit).toHaveBeenCalledWith(50)
      expect(db._qb.offset).toHaveBeenCalledWith(0)
    })

    it('should parse and return jobs', async () => {
      const job = { id: 'j-1', type: 'json', data: '{}', createdAt: 1000 }
      const db = createMockDb()
      db._qb.get = mock(() =>
        Promise.resolve([
          { payload: JSON.stringify(job), status: 'completed', archived_at: new Date() },
        ])
      )
      const persistence = new MySQLPersistence(db as any)

      const results = await persistence.list('default')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('j-1')
    })

    it('should filter out invalid JSON entries', async () => {
      const db = createMockDb()
      db._qb.get = mock(() =>
        Promise.resolve([
          { payload: '{invalid', status: 'completed', archived_at: new Date() },
          {
            payload: JSON.stringify({ id: 'ok', type: 'json', data: '{}', createdAt: 1 }),
            status: 'completed',
            archived_at: new Date(),
          },
        ])
      )
      const persistence = new MySQLPersistence(db as any)

      const results = await persistence.list('default')
      expect(results).toHaveLength(1)
    })
  })

  describe('search', () => {
    it('should search with queue filter', async () => {
      const db = createMockDb()
      db._qb.get = mock(() => Promise.resolve([]))
      const persistence = new MySQLPersistence(db as any)

      await persistence.search('test-query', { queue: 'emails' })
      expect(db._qb.where).toHaveBeenCalled()
    })

    it('should search without queue filter', async () => {
      const db = createMockDb()
      db._qb.get = mock(() => Promise.resolve([]))
      const persistence = new MySQLPersistence(db as any)

      await persistence.search('test-query')
      expect(db._qb.get).toHaveBeenCalled()
    })
  })

  describe('archiveLog', () => {
    it('should delegate to archiveLogMany', async () => {
      const db = createMockDb()
      const persistence = new MySQLPersistence(db as any)

      await persistence.archiveLog({
        level: 'info',
        message: 'test',
        workerId: 'w-1',
        queue: 'default',
        timestamp: new Date(),
      })

      expect(db.table).toHaveBeenCalledWith('flux_system_logs')
      expect(db._qb.insert).toHaveBeenCalled()
    })
  })

  describe('archiveLogMany', () => {
    it('should do nothing with empty array', async () => {
      const db = createMockDb()
      const persistence = new MySQLPersistence(db as any)

      await persistence.archiveLogMany([])
      expect(db.table).not.toHaveBeenCalled()
    })

    it('should handle insert errors gracefully', async () => {
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
      const db = createMockDb()
      db._qb.insert = mock(() => Promise.reject(new Error('log insert error')))
      const persistence = new MySQLPersistence(db as any)

      await persistence.archiveLogMany([
        { level: 'error', message: 'boom', workerId: 'w-1', timestamp: new Date() },
      ])

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle non-Error throws', async () => {
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
      const db = createMockDb()
      db._qb.insert = mock(() => Promise.reject('string error'))
      const persistence = new MySQLPersistence(db as any)

      await persistence.archiveLogMany([
        { level: 'error', message: 'boom', workerId: 'w-1', timestamp: new Date() },
      ])

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('listLogs', () => {
    it('should apply all filter options', async () => {
      const db = createMockDb([])
      const persistence = new MySQLPersistence(db as any)

      await persistence.listLogs({
        level: 'error',
        workerId: 'w-1',
        queue: 'default',
        search: 'keyword',
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-12-31'),
        limit: 20,
        offset: 10,
      })

      expect(db._qb.where).toHaveBeenCalled()
      expect(db._qb.orderBy).toHaveBeenCalledWith('timestamp', 'desc')
    })

    it('should use defaults', async () => {
      const db = createMockDb([])
      const persistence = new MySQLPersistence(db as any)

      await persistence.listLogs()
      expect(db._qb.limit).toHaveBeenCalledWith(50)
      expect(db._qb.offset).toHaveBeenCalledWith(0)
    })
  })

  describe('countLogs', () => {
    it('should apply all filter options', async () => {
      const db = createMockDb()
      db._qb.count = mock(() => Promise.resolve(42))
      const persistence = new MySQLPersistence(db as any)

      const result = await persistence.countLogs({
        level: 'error',
        workerId: 'w-1',
        queue: 'default',
        search: 'keyword',
        startTime: new Date(),
        endTime: new Date(),
      })

      expect(result).toBe(42)
    })

    it('should return 0 for non-numeric result', async () => {
      const db = createMockDb()
      db._qb.count = mock(() => Promise.resolve(null))
      const persistence = new MySQLPersistence(db as any)

      const result = await persistence.countLogs()
      expect(result).toBe(0)
    })
  })

  describe('cleanup', () => {
    it('should delete old records from both tables', async () => {
      const db = createMockDb()
      db._qb.delete = mock(() => Promise.resolve(5))
      const persistence = new MySQLPersistence(db as any)

      const result = await persistence.cleanup(30)
      expect(result).toBe(10) // 5 jobs + 5 logs
      expect(db.table).toHaveBeenCalledWith('flux_job_archive')
      expect(db.table).toHaveBeenCalledWith('flux_system_logs')
    })
  })

  describe('count', () => {
    it('should apply all filter options', async () => {
      const db = createMockDb()
      db._qb.count = mock(() => Promise.resolve(7))
      const persistence = new MySQLPersistence(db as any)

      const result = await persistence.count('default', {
        status: 'failed',
        jobId: 'j-1',
        startTime: new Date(),
        endTime: new Date(),
      })

      expect(result).toBe(7)
    })

    it('should return 0 for non-numeric result', async () => {
      const db = createMockDb()
      db._qb.count = mock(() => Promise.resolve(undefined))
      const persistence = new MySQLPersistence(db as any)

      const result = await persistence.count('default')
      expect(result).toBe(0)
    })
  })

  describe('constructor', () => {
    it('should use custom table names', async () => {
      const db = createMockDb()
      const persistence = new MySQLPersistence(db as any, 'custom_jobs', 'custom_logs')

      await persistence.archiveLog({
        level: 'info',
        message: 'test',
        workerId: 'w-1',
        timestamp: new Date(),
      })

      expect(db.table).toHaveBeenCalledWith('custom_logs')
    })
  })
})
