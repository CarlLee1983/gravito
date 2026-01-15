import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { BunSQLDriver } from '../src/drivers/BunSQLDriver'
import { ConnectionError } from '../src/errors'

// Mock Bun.sql if not available
// biome-ignore lint/suspicious/noExplicitAny: Mocking global
const originalBunSql = (globalThis as any).Bun?.sql

describe('BunSQLDriver', () => {
  let mockSql: any
  let mockQuery: any

  beforeEach(() => {
    mockQuery = mock(() => Promise.resolve({ rows: [], rowCount: 0 }))
    mockSql = mock(() => ({
      query: mockQuery,
      close: mock(() => Promise.resolve()),
    }))

    // Inject mock into global Bun object
    // biome-ignore lint/suspicious/noExplicitAny: Mocking global
    if (!(globalThis as any).Bun) {
      // biome-ignore lint/suspicious/noExplicitAny: Mocking global
      ;(globalThis as any).Bun = {}
    }
    // biome-ignore lint/suspicious/noExplicitAny: Mocking global
    ;(globalThis as any).Bun.sql = mockSql
  })

  afterEach(() => {
    // Restore original Bun.sql
    if (originalBunSql) {
      // biome-ignore lint/suspicious/noExplicitAny: Mocking global
      ;(globalThis as any).Bun.sql = originalBunSql
    } else {
      // biome-ignore lint/suspicious/noExplicitAny: Mocking global
      delete (globalThis as any).Bun.sql
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

    expect(mockSql).toHaveBeenCalled()
    // Check if called with correct connection string
    // postgres://user:password@localhost:5432/test_db
    const url = mockSql.mock.calls[0][0]
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

    const url = mockSql.mock.calls[0][0]
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

    const url = mockSql.mock.calls[0][0]
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

    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users', [])
    expect(result.rows).toEqual(mockResult.rows)
    expect(result.rowCount).toBe(1)
  })

  test('handles execution results (INSERT/UPDATE)', async () => {
    const config = { driver: 'postgres' as const, database: 'test' }
    const driver = new BunSQLDriver(config)

    mockQuery.mockResolvedValue({
      affectedRows: 1,
      insertId: 100,
    })

    await driver.connect()
    const result = await driver.execute('INSERT INTO users VALUES (?)', ['Alice'])

    expect(mockQuery).toHaveBeenCalledWith('INSERT INTO users VALUES (?)', ['Alice'])
    expect(result.affectedRows).toBe(1)
    expect(result.insertId).toBe(100)
  })

  test('handles transactions', async () => {
    const config = { driver: 'postgres' as const, database: 'test' }
    const driver = new BunSQLDriver(config)
    await driver.connect()

    await driver.beginTransaction()
    expect(mockQuery).toHaveBeenCalledWith('BEGIN')
    expect(driver.inTransaction()).toBe(true)

    await driver.commit()
    expect(mockQuery).toHaveBeenCalledWith('COMMIT')
    expect(driver.inTransaction()).toBe(false)

    await driver.beginTransaction()
    await driver.rollback()
    expect(mockQuery).toHaveBeenCalledWith('ROLLBACK')
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

    mockSql.mockImplementation(() => {
      throw new Error('Failed to load')
    })

    try {
      await driver.connect()
    } catch (e: any) {
      expect(e).toBeInstanceOf(ConnectionError)
    }
  })
})
