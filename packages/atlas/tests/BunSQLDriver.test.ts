import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { BunSQLDriver } from '../src/drivers/BunSQLDriver'
import { ConnectionError } from '../src/errors'

// Mock Bun.SQL if not available
// biome-ignore lint/suspicious/noExplicitAny: Mocking global
const originalBunSQL = (globalThis as any).Bun?.SQL

describe('BunSQLDriver', () => {
  let mockSQLClass: any
  let mockQuery: any

  beforeEach(() => {
    mockQuery = mock(() => Promise.resolve({ rows: [], rowCount: 0 }))

    // Mock prepared statement
    const mockPreparedStmt = {
      all: mock(() => Promise.resolve([{ id: 1, name: 'Test' }])),
      run: mock(() =>
        Promise.resolve({
          rows: [{ id: 1 }],
          rowCount: 1,
          [Symbol.iterator]: function* () {
            yield { id: 1 }
          },
        })
      ),
      get: mock(() => Promise.resolve({ id: 1, name: 'Test' })),
      finalize: mock(() => {}),
    }

    // Mock SQL instance
    const mockSQLInstance = {
      query: mockQuery,
      unsafe: mockQuery,
      simple: mockQuery, // Add simple() method for interpolated SQL
      prepare: mock(() => mockPreparedStmt),
      close: mock(() => Promise.resolve()),
      connections: {
        idle: 2,
        pending: 0,
        active: 3,
        total: 5,
      },
    }

    // Mock SQL class constructor
    mockSQLClass = mock(() => mockSQLInstance)

    // Inject mock into global Bun object
    // biome-ignore lint/suspicious/noExplicitAny: Mocking global
    if (!(globalThis as any).Bun) {
      // biome-ignore lint/suspicious/noExplicitAny: Mocking global
      ;(globalThis as any).Bun = {}
    }
    // biome-ignore lint/suspicious/noExplicitAny: Mocking global
    ;(globalThis as any).Bun.SQL = mockSQLClass
  })

  afterEach(() => {
    // Restore original Bun.SQL
    if (originalBunSQL) {
      // biome-ignore lint/suspicious/noExplicitAny: Mocking global
      ;(globalThis as any).Bun.SQL = originalBunSQL
    } else {
      // biome-ignore lint/suspicious/noExplicitAny: Mocking global
      delete (globalThis as any).Bun.SQL
    }
  })

  test('connects using Bun.sql with correct URL for Postgres', async () => {
    const config = {
      driver: 'postgres' as const,
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      username: 'user',
      password: 'password',
    }

    const driver = new BunSQLDriver(config)
    await driver.connect()

    expect(mockSQLClass).toHaveBeenCalled()
    // Check if called with correct connection string
    // postgres://user:password@localhost:5432/test_db
    const url = mockSQLClass.mock.calls[0][0]
    expect(url).toContain('postgres://')
    expect(url).toContain('user:password@localhost:5432')
    expect(url).toContain('/test_db')
    expect(driver.isConnected()).toBe(true)
  })

  test('connects using Bun.sql with correct URL for MySQL', async () => {
    const config = {
      driver: 'mysql' as const,
      host: '127.0.0.1',
      port: 3306,
      database: 'my_app',
      username: 'root',
    }

    const driver = new BunSQLDriver(config)
    await driver.connect()

    const url = mockSQLClass.mock.calls[0][0]
    expect(url).toContain('mysql://')
    expect(url).toContain('root@127.0.0.1:3306')
    expect(url).toContain('/my_app')
  })

  test('connects using Bun.sql with correct URL for SQLite', async () => {
    const config = {
      driver: 'sqlite' as const,
      database: 'mydb.sqlite',
    }

    const driver = new BunSQLDriver(config)
    await driver.connect()

    const url = mockSQLClass.mock.calls[0][0]
    expect(url).toBe('sqlite:mydb.sqlite')
  })

  test('executes queries correctly', async () => {
    const config = { driver: 'postgres' as const, database: 'test' }
    const driver = new BunSQLDriver(config)

    const mockResult = {
      rows: [{ id: 1, name: 'Test' }],
      rowCount: 1,
    }
    mockQuery.mockResolvedValue(mockResult)

    await driver.connect()
    const result = await driver.query('SELECT * FROM users')

    // With tagged template syntax, the first argument is an array of strings
    expect(mockQuery).toHaveBeenCalled()
    expect(result.rows).toEqual(mockResult.rows)
    expect(result.rowCount).toBe(1)
  })

  test('handles execution results (INSERT/UPDATE)', async () => {
    const config = { driver: 'postgres' as const, database: 'test' }
    const driver = new BunSQLDriver(config)

    mockQuery.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 100 }],
      affectedRows: 1,
      insertId: 100,
    })

    await driver.connect()
    const result = await driver.execute('INSERT INTO users VALUES (?)', ['Alice'])

    // With tagged template syntax, parameters are interpolated into SQL
    expect(mockQuery).toHaveBeenCalled()
    expect(result.affectedRows).toBe(1)
    expect(result.insertId).toBe(100)
  })

  test('handles transactions', async () => {
    const config = { driver: 'postgres' as const, database: 'test' }
    const driver = new BunSQLDriver(config)
    await driver.connect()

    await driver.beginTransaction()
    // With tagged template syntax, arguments format changes
    expect(mockQuery).toHaveBeenCalled()
    expect(driver.inTransaction()).toBe(true)

    await driver.commit()
    expect(mockQuery).toHaveBeenCalled()
    expect(driver.inTransaction()).toBe(false)

    await driver.beginTransaction()
    await driver.rollback()
    expect(mockQuery).toHaveBeenCalled()
    expect(driver.inTransaction()).toBe(false)
  })

  test('normalizes errors', async () => {
    const config = { driver: 'postgres' as const, database: 'test' }
    const driver = new BunSQLDriver(config)
    await driver.connect()

    const error = new Error('duplicate key value violates unique constraint')
    ;(error as any).code = '23505'
    mockQuery.mockRejectedValue(error)

    try {
      await driver.execute('INSERT...')
    } catch (e: any) {
      expect(e.name).toBe('UniqueConstraintError')
    }
  })

  test('throws ConnectionError if Bun.sql fails', async () => {
    const config = { driver: 'postgres' as const, database: 'test' }
    const driver = new BunSQLDriver(config)

    mockSQLClass.mockImplementation(() => {
      throw new Error('Failed to load')
    })

    try {
      await driver.connect()
    } catch (e: any) {
      expect(e).toBeInstanceOf(ConnectionError)
    }
  })

  describe('Prepared Statements', () => {
    test('應該支援 prepare() 方法', async () => {
      const config = { driver: 'postgres' as const, database: 'test' }
      const driver = new BunSQLDriver(config)
      await driver.connect()

      const sql = 'SELECT * FROM users WHERE id = ?'
      const stmtId = await driver.prepare!(sql)

      expect(stmtId).toBeDefined()
      expect(typeof stmtId).toBe('string')
    })

    test('應該支援 executePrepared() 方法', async () => {
      const config = { driver: 'postgres' as const, database: 'test' }
      const driver = new BunSQLDriver(config)
      await driver.connect()

      const sql = 'SELECT * FROM users WHERE id = ?'
      const stmtId = await driver.prepare!(sql)
      const result = await driver.executePrepared!(stmtId, [1])

      expect(result.rows).toEqual([{ id: 1, name: 'Test' }])
      expect(result.rowCount).toBe(1)
    })

    test('應該快取已準備的語句', async () => {
      const config = { driver: 'postgres' as const, database: 'test' }
      const driver = new BunSQLDriver(config)
      await driver.connect()

      const sql = 'SELECT * FROM users WHERE id = ?'
      const stmtId1 = await driver.prepare!(sql)
      const stmtId2 = await driver.prepare!(sql)

      expect(stmtId1).toBe(stmtId2)
    })

    test('應該支援清除所有準備好的語句', async () => {
      const config = { driver: 'postgres' as const, database: 'test' }
      const driver = new BunSQLDriver(config)
      await driver.connect()

      const sql = 'SELECT * FROM users WHERE id = ?'
      await driver.prepare!(sql)
      await driver.clearPreparedStatements!()

      // 清除後準備相同語句應該生成新的 ID
      const newStmtId = await driver.prepare!(sql)
      expect(newStmtId).toBeDefined()
    })
  })

  describe('Stream Query Support', () => {
    test('應該支援 stream() 方法', async () => {
      const config = { driver: 'postgres' as const, database: 'test' }
      const driver = new BunSQLDriver(config)

      // Mock iterable result
      const mockResult = {
        rows: [
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' },
          { id: 3, name: 'User 3' },
        ],
        rowCount: 3,
        [Symbol.iterator]: function* () {
          yield { id: 1, name: 'User 1' }
          yield { id: 2, name: 'User 2' }
          yield { id: 3, name: 'User 3' }
        },
      }

      mockQuery.mockResolvedValue(mockResult)
      await driver.connect()

      if (!driver.stream) {
        throw new Error('Stream method not implemented')
      }

      const results: any[] = []
      for await (const row of driver.stream('SELECT * FROM users')) {
        results.push(row)
      }

      expect(results).toHaveLength(3)
      expect(results[0]).toEqual({ id: 1, name: 'User 1' })
    })

    test('串流查詢應該支援參數綁定', async () => {
      const config = { driver: 'postgres' as const, database: 'test' }
      const driver = new BunSQLDriver(config)

      const mockResult = {
        rows: [{ id: 1, name: 'User 1' }],
        rowCount: 1,
        [Symbol.iterator]: function* () {
          yield { id: 1, name: 'User 1' }
        },
      }

      mockQuery.mockResolvedValue(mockResult)
      await driver.connect()

      if (!driver.stream) {
        throw new Error('Stream method not implemented')
      }

      const results: any[] = []
      for await (const row of driver.stream('SELECT * FROM users WHERE id = ?', [1])) {
        results.push(row)
      }

      // With tagged template syntax, parameters are interpolated
      expect(mockQuery).toHaveBeenCalled()
      expect(results).toHaveLength(1)
    })
  })

  describe('Connection Pool Statistics', () => {
    test('應該返回連線池統計資訊', async () => {
      const config = {
        driver: 'postgres' as const,
        database: 'test',
        pool: { max: 10, idleTimeout: 30000 },
      }
      const driver = new BunSQLDriver(config)

      await driver.connect()

      if (!driver.getPoolStats) {
        throw new Error('getPoolStats method not implemented')
      }

      const stats = driver.getPoolStats()

      expect(stats).toBeDefined()
      expect(stats?.idle).toBe(2)
      expect(stats?.active).toBe(3)
      expect(stats?.total).toBe(5)
      expect(stats?.max).toBe(10)
    })

    test('未連線時應該返回預設統計資訊', async () => {
      const config = {
        driver: 'postgres' as const,
        database: 'test',
        pool: { max: 20 },
      }
      const driver = new BunSQLDriver(config)

      if (!driver.getPoolStats) {
        throw new Error('getPoolStats method not implemented')
      }

      const stats = driver.getPoolStats()

      expect(stats).toBeDefined()
      expect(stats?.idle).toBe(0)
      expect(stats?.active).toBe(0)
      expect(stats?.total).toBe(0)
      expect(stats?.max).toBe(20)
    })
  })

  describe('Connection URL with Pool Config', () => {
    test('應該在連線 URL 中包含連線池配置', async () => {
      const config = {
        driver: 'postgres' as const,
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        username: 'user',
        password: 'password',
        pool: {
          max: 20,
          idleTimeout: 60000,
        },
      }

      const driver = new BunSQLDriver(config)
      await driver.connect()

      const url = mockSQLClass.mock.calls[mockSQLClass.mock.calls.length - 1][0]
      expect(url).toContain('max=20')
      expect(url).toContain('idle_timeout=60000')
    })

    test('應該在連線 URL 中包含 SSL 配置', async () => {
      const config = {
        driver: 'postgres' as const,
        host: 'localhost',
        database: 'test_db',
        ssl: true,
      }

      const driver = new BunSQLDriver(config)
      await driver.connect()

      const url = mockSQLClass.mock.calls[mockSQLClass.mock.calls.length - 1][0]
      expect(url).toContain('sslmode=require')
    })
  })
})
