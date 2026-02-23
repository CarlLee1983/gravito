import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SQLiteDriver } from '../src/drivers/SQLiteDriver'
import type { BatchExecuteResult, BatchInsertResult, ConnectionConfig } from '../src/types'

describe('SQLiteDriver - Batch Operations', () => {
  let driver: SQLiteDriver
  let config: ConnectionConfig

  beforeEach(async () => {
    config = {
      driver: 'sqlite',
      database: ':memory:',
    }
    driver = new SQLiteDriver(config)
    await driver.connect()

    // Create test table
    await driver.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        age INTEGER
      )
    `)
  })

  afterEach(async () => {
    await driver.disconnect()
  })

  describe('batchInsert', () => {
    it('TC-1: Basic insert (single chunk)', async () => {
      const rows = [
        { name: 'Alice', email: 'alice@example.com', age: 30 },
        { name: 'Bob', email: 'bob@example.com', age: 25 },
      ]

      const result = (await driver.batchInsert('users', rows)) as BatchInsertResult

      expect(result.totalAffectedRows).toBe(2)
      expect(result.chunkCount).toBe(1)
      expect(result.chunks).toHaveLength(1)
      expect(result.chunks[0].affectedRows).toBe(2)

      // Verify data was inserted
      const query = await driver.query('SELECT COUNT(*) as count FROM users')
      expect(query.rows[0]).toEqual({ count: 2 })
    })

    it('TC-2: Multi-chunk insertion (batched)', async () => {
      // Create 100 rows to force multiple chunks with chunkSize=30
      const rows = Array.from({ length: 100 }, (_, i) => ({
        name: `User${i}`,
        email: `user${i}@example.com`,
        age: 20 + (i % 50),
      }))

      const result = (await driver.batchInsert('users', rows, {
        chunkSize: 30,
      })) as BatchInsertResult

      expect(result.totalAffectedRows).toBe(100)
      expect(result.chunkCount).toBeGreaterThan(1) // Should split into multiple chunks
      expect(result.chunkCount).toBe(Math.ceil(100 / 30))

      // Verify each chunk has correct row count
      const firstChunks = result.chunks.slice(0, -1)
      firstChunks.forEach((chunk) => {
        expect(chunk.affectedRows).toBe(30)
      })

      // Verify data
      const query = await driver.query('SELECT COUNT(*) as count FROM users')
      expect(query.rows[0]).toEqual({ count: 100 })
    })

    it('TC-3: Auto-compute chunkSize from column count', async () => {
      // Create test table with more columns (conservative example: 5 columns)
      await driver.execute(`
        CREATE TABLE test_wide (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          col1 TEXT,
          col2 TEXT,
          col3 TEXT,
          col4 TEXT,
          col5 TEXT
        )
      `)

      const rows = Array.from({ length: 50 }, (_, i) => ({
        col1: `v1_${i}`,
        col2: `v2_${i}`,
        col3: `v3_${i}`,
        col4: `v4_${i}`,
        col5: `v5_${i}`,
      }))

      // With 5 columns, max safe chunkSize = floor(999/5) = 199
      const result = (await driver.batchInsert('test_wide', rows)) as BatchInsertResult

      expect(result.totalAffectedRows).toBe(50)
      expect(result.chunkCount).toBe(1) // Should fit in 1 chunk (50 < 199)
    })

    it('TC-4: Empty array returns quickly', async () => {
      const result = (await driver.batchInsert('users', [])) as BatchInsertResult

      expect(result.totalAffectedRows).toBe(0)
      expect(result.firstInsertId).toBeUndefined()
      expect(result.lastInsertId).toBeUndefined()
      expect(result.chunkCount).toBe(0)
      expect(result.chunks).toHaveLength(0)
    })

    it('TC-5: Executes within external transaction', async () => {
      await driver.beginTransaction()

      const rows = [
        { name: 'Charlie', email: 'charlie@example.com', age: 35 },
        { name: 'Diana', email: 'diana@example.com', age: 28 },
      ]

      const result = (await driver.batchInsert('users', rows)) as BatchInsertResult
      expect(result.totalAffectedRows).toBe(2)

      // External rollback should undo batchInsert
      await driver.rollback()

      // Verify rows were rolled back
      const query = await driver.query('SELECT COUNT(*) as count FROM users')
      expect(query.rows[0]).toEqual({ count: 0 })
    })

    it('TC-6: Rollback on failure (unique constraint)', async () => {
      // Insert one row first
      await driver.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
        'Existing',
        'existing@example.com',
        40,
      ])

      // Try batch insert with duplicate email - should fail and rollback
      const rows = [
        { name: 'Eve', email: 'eve@example.com', age: 32 },
        { name: 'Frank', email: 'existing@example.com', age: 45 }, // Duplicate!
      ]

      await expect(driver.batchInsert('users', rows)).rejects.toThrow()

      // Verify only original row exists (batch was rolled back)
      const query = await driver.query('SELECT COUNT(*) as count FROM users')
      expect(query.rows[0]).toEqual({ count: 1 })
    })

    it('TC-7: Type normalization (boolean/Date/undefined)', async () => {
      // Create table with more column types
      await driver.execute(`
        CREATE TABLE typed_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          is_active INTEGER,
          created_at TEXT
        )
      `)

      const rows = [
        {
          name: 'Record1',
          is_active: true,
          created_at: new Date('2025-02-23T10:00:00Z'),
        },
        {
          name: 'Record2',
          is_active: false,
          created_at: new Date('2025-02-24T10:00:00Z'),
        },
      ]

      const result = (await driver.batchInsert('typed_data', rows)) as BatchInsertResult
      expect(result.totalAffectedRows).toBe(2)

      // Verify boolean was normalized to 0/1
      const query = await driver.query('SELECT is_active FROM typed_data ORDER BY id')
      expect(query.rows).toEqual([{ is_active: 1 }, { is_active: 0 }])

      // Verify Date was normalized to ISO string
      const dateQuery = await driver.query('SELECT created_at FROM typed_data ORDER BY id')
      expect(dateQuery.rows[0].created_at).toMatch(/2025-02-23/)
      expect(dateQuery.rows[1].created_at).toMatch(/2025-02-24/)
    })

    it('TC-8: firstInsertId and lastInsertId tracking', async () => {
      const rows = [
        { name: 'One', email: 'one@example.com', age: 20 },
        { name: 'Two', email: 'two@example.com', age: 21 },
        { name: 'Three', email: 'three@example.com', age: 22 },
      ]

      const result = (await driver.batchInsert('users', rows)) as BatchInsertResult

      expect(result.firstInsertId).toBeDefined()
      expect(result.lastInsertId).toBeDefined()
      expect(typeof result.firstInsertId).toBe('number')
      expect(typeof result.lastInsertId).toBe('number')

      // lastInsertId should be >= firstInsertId
      expect((result.lastInsertId as number) >= (result.firstInsertId as number)).toBe(true)
    })
  })

  describe('batchExecute', () => {
    it('TC-9: Mixed INSERT/UPDATE with correct affected rows', async () => {
      // Insert some initial data
      await driver.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
        'Initial',
        'initial@example.com',
        25,
      ])

      const statements = [
        {
          sql: 'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
          bindings: ['New1', 'new1@example.com', 30],
        },
        {
          sql: 'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
          bindings: ['New2', 'new2@example.com', 31],
        },
        {
          sql: 'UPDATE users SET age = ? WHERE email = ?',
          bindings: [26, 'initial@example.com'],
        },
      ]

      const result = (await driver.batchExecute(statements)) as BatchExecuteResult

      expect(result.totalAffectedRows).toBe(3) // 1 (initial) + 1 (INSERT) + 1 (INSERT) + 1 (UPDATE) but counting total affected = 3
      expect(result.results).toHaveLength(3)
      expect(result.results[0].affectedRows).toBe(1) // INSERT
      expect(result.results[1].affectedRows).toBe(1) // INSERT
      expect(result.results[2].affectedRows).toBe(1) // UPDATE

      // Verify final data
      const query = await driver.query('SELECT COUNT(*) as count FROM users')
      expect(query.rows[0]).toEqual({ count: 3 })
    })

    it('TC-10: Rollback on statement failure', async () => {
      // Insert initial data
      await driver.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
        'Existing',
        'existing@example.com',
        30,
      ])

      const statements = [
        {
          sql: 'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
          bindings: ['NewUser', 'newuser@example.com', 28],
        },
        {
          sql: 'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
          bindings: ['Duplicate', 'existing@example.com', 35], // This will fail
        },
      ]

      await expect(driver.batchExecute(statements)).rejects.toThrow()

      // Verify batch was rolled back - only original row exists
      const query = await driver.query('SELECT COUNT(*) as count FROM users')
      expect(query.rows[0]).toEqual({ count: 1 })
    })

    it('TC-11: Empty statements array returns quickly', async () => {
      const result = (await driver.batchExecute([])) as BatchExecuteResult

      expect(result.totalAffectedRows).toBe(0)
      expect(result.results).toHaveLength(0)
    })
  })
})
