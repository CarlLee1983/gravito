import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { SQLiteDriver } from '../src/drivers/SQLiteDriver'

describe('SQLiteDriver Prepared Statement Cache', () => {
  let driver: SQLiteDriver

  beforeEach(async () => {
    driver = new SQLiteDriver({
      driver: 'sqlite',
      database: ':memory:',
    })
    await driver.connect()

    // Create test table through the driver
    await driver.execute(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      )
    `)
  })

  afterEach(async () => {
    await driver.disconnect()
  })

  it('should cache prepared statements and reuse them', async () => {
    // Insert test data
    await driver.execute('INSERT INTO users (name, email) VALUES (?, ?)', [
      'Alice',
      'alice@example.com',
    ])
    await driver.execute('INSERT INTO users (name, email) VALUES (?, ?)', [
      'Bob',
      'bob@example.com',
    ])

    // First query - should prepare and cache
    const result1 = await driver.query('SELECT * FROM users WHERE id = ?', [1])
    expect(result1.rows).toHaveLength(1)
    expect((result1.rows[0] as any).name).toBe('Alice')

    // Check cache size after first query (should include CREATE TABLE, INSERT, last_insert_rowid, and SELECT)
    const cacheSize1 = driver.getPreparedStatementCacheSize()
    expect(cacheSize1).toBeGreaterThan(0)

    // Second query with same SQL - should use cache
    const result2 = await driver.query('SELECT * FROM users WHERE id = ?', [2])
    expect(result2.rows).toHaveLength(1)
    expect((result2.rows[0] as any).name).toBe('Bob')

    // Cache size should not increase for same SELECT query (reuses prepared statement)
    const cacheSize2 = driver.getPreparedStatementCacheSize()
    expect(cacheSize2).toBe(cacheSize1)
  })

  it('should cache multiple different queries', async () => {
    await driver.execute('INSERT INTO users (name, email) VALUES (?, ?)', [
      'Charlie',
      'charlie@example.com',
    ])

    // Execute different queries
    await driver.query('SELECT * FROM users WHERE id = ?', [1])
    const cacheSize1 = driver.getPreparedStatementCacheSize()
    expect(cacheSize1).toBeGreaterThan(0)

    await driver.query('SELECT * FROM users WHERE name = ?', ['Charlie'])
    const cacheSize2 = driver.getPreparedStatementCacheSize()
    expect(cacheSize2).toBeGreaterThan(cacheSize1)

    // New SQL query should increase cache size
    expect(cacheSize2).toBeGreaterThanOrEqual(cacheSize1 + 1)
  })

  it('should support clearing the cache', async () => {
    await driver.execute('INSERT INTO users (name, email) VALUES (?, ?)', [
      'David',
      'david@example.com',
    ])

    // Cache some queries
    await driver.query('SELECT * FROM users WHERE id = ?', [1])
    const cacheSize1 = driver.getPreparedStatementCacheSize()
    expect(cacheSize1).toBeGreaterThan(0)

    // Clear cache
    driver.clearPreparedStatementCache()
    const cacheSize2 = driver.getPreparedStatementCacheSize()
    expect(cacheSize2).toBe(0)
  })

  it('should execute queries correctly after cache operations', async () => {
    // Insert multiple records
    for (let i = 0; i < 5; i++) {
      await driver.execute('INSERT INTO users (name, email) VALUES (?, ?)', [
        `User${i}`,
        `user${i}@example.com`,
      ])
    }

    // Query multiple times with cache
    for (let i = 0; i < 5; i++) {
      const result = await driver.query('SELECT * FROM users WHERE id = ?', [i + 1])
      expect(result.rows).toHaveLength(1)
      expect((result.rows[0] as any).name).toBe(`User${i}`)
    }

    // Verify cache contains same size (all reused same SELECT SQL, other queries are from before)
    const initialCacheSize = driver.getPreparedStatementCacheSize()
    expect(initialCacheSize).toBeGreaterThan(0)
  })

  it('should work with execute() method and cache', async () => {
    // Execute inserts using cache
    await driver.execute('INSERT INTO users (name, email) VALUES (?, ?)', [
      'Eve',
      'eve@example.com',
    ])
    const cacheSize = driver.getPreparedStatementCacheSize()
    expect(cacheSize).toBeGreaterThan(0)

    // Verify the insert worked
    const result = await driver.query('SELECT * FROM users WHERE name = ?', ['Eve'])
    expect(result.rows).toHaveLength(1)
  })

  it('should handle transactions correctly with cache', async () => {
    await driver.beginTransaction()

    await driver.execute('INSERT INTO users (name, email) VALUES (?, ?)', [
      'Frank',
      'frank@example.com',
    ])

    const result = await driver.query('SELECT * FROM users WHERE id = ?', [1])
    expect(result.rows).toHaveLength(1)

    await driver.commit()

    // Verify data persisted
    const finalResult = await driver.query('SELECT COUNT(*) as count FROM users')
    expect((finalResult.rows[0] as any).count).toBe(1)
  })
})
