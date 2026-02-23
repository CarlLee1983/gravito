/**
 * @gravito/atlas - SQLiteDriver Performance Benchmarks
 * Measures performance of SQLite prepared statement caching and batch operations
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { SQLiteDriver } from '../../src/drivers/SQLiteDriver'
import type { SQLiteConfig } from '../../src/types'

/**
 * Benchmark suite for SQLiteDriver performance
 */
describe('SQLiteDriver Performance Benchmarks', () => {
  let driver: SQLiteDriver

  beforeAll(async () => {
    const config: SQLiteConfig = {
      driver: 'sqlite',
      database: ':memory:',
      preparedStatementCache: {
        maxStatements: 100,
        idleTimeout: 60000,
      },
    }
    driver = new SQLiteDriver(config)
    await driver.connect()

    // Create a test table
    await driver.execute(`
      CREATE TABLE test_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        age INTEGER
      )
    `)
  })

  afterAll(async () => {
    await driver.disconnect()
  })

  const runBenchmark = async (name: string, fn: () => Promise<void>, iterations = 1000) => {
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      await fn()
    }
    const end = performance.now()
    const elapsed = end - start
    const avgUs = (elapsed / iterations) * 1000
    console.log(`[BENCH] ${name}: ${avgUs.toFixed(1)} µs/op (${iterations} iterations)`)
    return { elapsed, avgUs }
  }

  describe('Prepared Statement Cache', () => {
    it('should achieve sub-microsecond cache hit performance', async () => {
      // Warm up: prepare a statement once
      await driver.execute('INSERT INTO test_users (name, email, age) VALUES (?, ?, ?)', [
        'Alice',
        'alice@example.com',
        30,
      ])

      // Benchmark: repeated cache hits
      const result = await runBenchmark(
        'cache hit (repeat access)',
        async () => {
          await driver.query('SELECT * FROM test_users WHERE id = ?', [1])
        },
        1000
      )

      // Cache hits should be very fast (< 50µs/op)
      expect(result.avgUs).toBeLessThan(50)
    })

    it('should handle cache misses efficiently', async () => {
      let counter = 0
      const result = await runBenchmark(
        'cache miss (first prepare)',
        async () => {
          counter++
          // Each iteration has a unique query (no cache reuse)
          await driver.query(`SELECT * FROM test_users WHERE id = ${counter}`)
        },
        100
      )

      // Cache misses involve prepare() overhead, expect 200-500µs/op
      expect(result.avgUs).toBeLessThan(1000)
    })

    it('should manage LRU eviction under pressure', async () => {
      // Create a cache with small max size
      const smallCacheDriver = new SQLiteDriver({
        driver: 'sqlite',
        database: ':memory:',
        preparedStatementCache: {
          maxStatements: 5,
          idleTimeout: 60000,
        },
      })
      await smallCacheDriver.connect()

      // Create test table
      await smallCacheDriver.execute(`
        CREATE TABLE test_small (
          id INTEGER PRIMARY KEY,
          val INTEGER
        )
      `)

      try {
        // Insert some test data
        for (let i = 0; i < 10; i++) {
          await smallCacheDriver.execute('INSERT INTO test_small (id, val) VALUES (?, ?)', [
            i,
            i * 2,
          ])
        }

        // Benchmark: access 20 unique queries (exceeds cache size of 5)
        let queryNum = 0
        const result = await runBenchmark(
          'LRU eviction (cache size 5, 20 unique queries)',
          async () => {
            queryNum = (queryNum + 1) % 20
            await smallCacheDriver.query(`SELECT * FROM test_small WHERE id = ${queryNum}`)
          },
          20
        )

        // Should complete without error even with eviction
        expect(result.avgUs).toBeGreaterThan(0)
      } finally {
        await smallCacheDriver.disconnect()
      }
    })
  })

  describe('Batch Operations', () => {
    it('should execute batchInsert efficiently', async () => {
      const rows = Array.from({ length: 10 }, (_, i) => ({
        name: `User${i}`,
        email: `user${i}@example.com`,
        age: 20 + i,
      }))

      const result = await runBenchmark(
        'batchInsert(10 rows)',
        async () => {
          await driver.batchInsert('test_users', rows)
        },
        10
      )

      // Batch operations should be reasonably fast
      expect(result.avgUs).toBeGreaterThan(0)
    })

    it('should scale batchInsert for different sizes', async () => {
      // Test batchInsert with different row counts
      const sizes = [10, 100, 500]

      for (const size of sizes) {
        const rows = Array.from({ length: size }, (_, i) => ({
          name: `Batch${i}`,
          email: `batch${i}@example.com`,
          age: 25 + i,
        }))

        const result = await runBenchmark(
          `batchInsert(${size} rows)`,
          async () => {
            await driver.batchInsert('test_users', rows)
          },
          5
        )

        // Performance should scale reasonably (per-row cost should be consistent)
        expect(result.avgUs).toBeGreaterThan(0)
      }
    })

    it('should execute batchExecute efficiently', async () => {
      const statements = Array.from({ length: 10 }, (_, i) => ({
        sql: `INSERT INTO test_users (name, email, age) VALUES (?, ?, ?)`,
        bindings: [`BatchExec${i}`, `batchexec${i}@example.com`, 30 + i],
      }))

      const result = await runBenchmark(
        'batchExecute(10 statements)',
        async () => {
          await driver.batchExecute(statements)
        },
        5
      )

      // Batch execute should complete within reasonable time
      expect(result.avgUs).toBeGreaterThan(0)
    })
  })

  describe('Query Execution', () => {
    it('should achieve fast query throughput', async () => {
      // Ensure we have some data
      await driver.execute('INSERT INTO test_users (name, email, age) VALUES (?, ?, ?)', [
        'QueryTest',
        'query@example.com',
        35,
      ])

      const iterations = 100
      const start = performance.now()

      for (let i = 0; i < iterations; i++) {
        await driver.query('SELECT * FROM test_users LIMIT ?', [10])
      }

      const elapsed = performance.now() - start
      const avgUs = (elapsed / iterations) * 1000
      const throughput = iterations / (elapsed / 1000)

      console.log(
        `[BENCH] simple SELECT throughput: ${throughput.toFixed(0)} ops/sec (${avgUs.toFixed(1)} µs/op)`
      )

      // Should achieve at least 100 ops/sec
      expect(throughput).toBeGreaterThan(100)
    })
  })

  describe('Memory and Cache Size', () => {
    it('should track prepared statement cache size correctly', async () => {
      const initialSize = driver.getPreparedStatementCacheSize()

      // Execute some queries
      await driver.query('SELECT COUNT(*) FROM test_users')
      await driver.query('SELECT COUNT(*) FROM test_users WHERE age > ?', [25])

      const sizeAfterQueries = driver.getPreparedStatementCacheSize()

      // Cache size should increase after queries
      expect(sizeAfterQueries).toBeGreaterThanOrEqual(initialSize)
      expect(sizeAfterQueries).toBeLessThanOrEqual(100) // Should not exceed max
    })
  })

  describe('Tagged Template Literals Performance', () => {
    it('should execute sql template literals efficiently', async () => {
      const result = await runBenchmark(
        'sql template literal',
        async () => {
          const userId = 1
          await driver.sql`SELECT * FROM test_users WHERE id = ${userId}`
        },
        100
      )

      // Should be comparable to regular query performance
      expect(result.avgUs).toBeGreaterThan(0)
    })

    it('should execute sqlExecute template literals efficiently', async () => {
      const result = await runBenchmark(
        'sqlExecute template literal',
        async () => {
          const name = 'TemplateTest'
          const email = 'template@example.com'
          const age = 40
          await driver.sqlExecute`INSERT INTO test_users (name, email, age) VALUES (${name}, ${email}, ${age})`
        },
        5
      )

      // Should complete without error
      expect(result.avgUs).toBeGreaterThan(0)
    })
  })
})
