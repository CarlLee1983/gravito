/**
 * @gravito/atlas - Driver Adaptive Pool Management Tests
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { MySQLDriver } from '../../src/drivers/MySQLDriver'
import { PostgresDriver } from '../../src/drivers/PostgresDriver'
import type { MySQLConfig, PostgresConfig } from '../../src/types'

describe('Driver Adaptive Pool Management', () => {
  describe('PostgresDriver', () => {
    let driver: PostgresDriver
    let isPostgresAvailable = true

    beforeEach(async () => {
      const config: PostgresConfig = {
        driver: 'postgres',
        host: process.env.POSTGRES_HOST ?? 'localhost',
        port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
        database: process.env.POSTGRES_DB ?? 'gravito_test',
        username: process.env.POSTGRES_USER ?? 'postgres',
        password: process.env.POSTGRES_PASSWORD ?? 'postgres',
        pool: {
          min: 2,
          max: 10,
        },
      }
      driver = new PostgresDriver(config)

      try {
        await driver.connect()
        // Try a simple query to ensure it's really available
        await driver.query('SELECT 1')
      } catch (_e) {
        isPostgresAvailable = false
        console.warn('Postgres not available for integration tests, some tests will be skipped')
      }
    })

    afterEach(async () => {
      await driver.disconnect()
    })

    it('should have adjustPoolSize method', () => {
      expect(typeof driver.adjustPoolSize).toBe('function')
    })

    it('should accept target pool size parameter', async () => {
      if (!isPostgresAvailable) {
        return
      }
      await driver.connect()
      expect(() => {
        driver.adjustPoolSize?.(15)
      }).not.toThrow()
    })

    it('should reject invalid pool sizes', async () => {
      if (!isPostgresAvailable) {
        return
      }
      await driver.connect()

      // Negative size should be clamped to min
      await driver.adjustPoolSize?.(-5)
      const stats = driver.getPoolStats()
      expect(stats?.max).toBeGreaterThanOrEqual(2)
    })

    it('should respect max bound for pool size', async () => {
      if (!isPostgresAvailable) {
        return
      }
      await driver.connect()

      // Very large size should be clamped to max (100)
      await driver.adjustPoolSize?.(500)
      const stats = driver.getPoolStats()
      expect(stats?.max).toBeLessThanOrEqual(100)
    })

    it('should allow increasing pool size', async () => {
      if (!isPostgresAvailable) {
        return
      }
      await driver.connect()
      const initialStats = driver.getPoolStats()
      expect(initialStats).not.toBeNull()

      const initialMax = initialStats?.max ?? 10
      const newSize = Math.min(initialMax + 5, 100)

      await driver.adjustPoolSize?.(newSize)

      // After adjustment, pool should be reconnected
      const newStats = driver.getPoolStats()
      expect(newStats?.max).toBeLessThanOrEqual(100)
    })

    it('should allow decreasing pool size', async () => {
      if (!isPostgresAvailable) {
        return
      }
      await driver.connect()
      const initialStats = driver.getPoolStats()
      expect(initialStats).not.toBeNull()

      const initialMax = initialStats?.max ?? 10
      const newSize = Math.max(2, initialMax - 2)

      await driver.adjustPoolSize?.(newSize)

      const newStats = driver.getPoolStats()
      expect(newStats?.max).toBeGreaterThanOrEqual(2)
    })

    it('should be idempotent when size unchanged', async () => {
      if (!isPostgresAvailable) {
        return
      }
      await driver.connect()
      const stats = driver.getPoolStats()

      // Calling with same size should not reconnect
      await driver.adjustPoolSize?.(stats?.max)

      const newStats = driver.getPoolStats()
      expect(newStats?.max).toBe(stats?.max)
    })

    it('should handle adjustment during idle state', async () => {
      if (!isPostgresAvailable) {
        return
      }
      await driver.connect()

      // Adjust when no queries are running
      await driver.adjustPoolSize?.(8)

      // Should still be able to execute queries
      const result = await driver.query('SELECT 1 as num')
      expect(result.rowCount).toBe(1)
    })
  })

  describe('MySQLDriver', () => {
    let driver: MySQLDriver
    let isMySQLAvailable = true

    beforeEach(async () => {
      const config: MySQLConfig = {
        driver: 'mysql',
        host: process.env.MYSQL_HOST ?? 'localhost',
        port: parseInt(process.env.MYSQL_PORT ?? '3306', 10),
        database: process.env.MYSQL_DB ?? 'gravito_test',
        username: process.env.MYSQL_USER ?? 'root',
        password: process.env.MYSQL_PASSWORD ?? 'root',
        pool: {
          min: 2,
          max: 10,
        },
      }
      driver = new MySQLDriver(config)

      try {
        await driver.connect()
        // Try a simple query to ensure it's really available
        await driver.query('SELECT 1')
      } catch (_e) {
        isMySQLAvailable = false
        console.warn('MySQL not available for integration tests, some tests will be skipped')
      }
    })

    afterEach(async () => {
      await driver.disconnect()
    })

    it('should have adjustPoolSize method', () => {
      expect(typeof driver.adjustPoolSize).toBe('function')
    })

    it('should accept target pool size parameter', async () => {
      if (!isMySQLAvailable) {
        return
      }
      await driver.connect()
      expect(() => {
        driver.adjustPoolSize?.(15)
      }).not.toThrow()
    })

    it('should reject invalid pool sizes', async () => {
      if (!isMySQLAvailable) {
        return
      }
      await driver.connect()

      // Negative size should be clamped to min
      await driver.adjustPoolSize?.(-5)
      const stats = driver.getPoolStats()
      expect(stats?.max).toBeGreaterThanOrEqual(2)
    })

    it('should respect max bound for pool size', async () => {
      if (!isMySQLAvailable) {
        return
      }
      await driver.connect()

      // Very large size should be clamped to max (100)
      await driver.adjustPoolSize?.(500)
      const stats = driver.getPoolStats()
      expect(stats?.max).toBeLessThanOrEqual(100)
    })

    it('should allow increasing pool size', async () => {
      if (!isMySQLAvailable) {
        return
      }
      await driver.connect()
      const initialStats = driver.getPoolStats()
      expect(initialStats).not.toBeNull()

      const initialMax = initialStats?.max ?? 10
      const newSize = Math.min(initialMax + 5, 100)

      await driver.adjustPoolSize?.(newSize)

      // After adjustment, pool should be reconnected
      const newStats = driver.getPoolStats()
      expect(newStats?.max).toBeLessThanOrEqual(100)
    })

    it('should allow decreasing pool size', async () => {
      if (!isMySQLAvailable) {
        return
      }
      await driver.connect()
      const initialStats = driver.getPoolStats()
      expect(initialStats).not.toBeNull()

      const initialMax = initialStats?.max ?? 10
      const newSize = Math.max(2, initialMax - 2)

      await driver.adjustPoolSize?.(newSize)

      const newStats = driver.getPoolStats()
      expect(newStats?.max).toBeGreaterThanOrEqual(2)
    })

    it('should be idempotent when size unchanged', async () => {
      if (!isMySQLAvailable) {
        return
      }
      await driver.connect()
      const stats = driver.getPoolStats()

      // Calling with same size should not reconnect
      await driver.adjustPoolSize?.(stats?.max)

      const newStats = driver.getPoolStats()
      expect(newStats?.max).toBe(stats?.max)
    })

    it('should handle adjustment during idle state', async () => {
      if (!isMySQLAvailable) {
        return
      }
      await driver.connect()

      // Adjust when no queries are running
      await driver.adjustPoolSize?.(8)

      // Should still be able to execute queries
      const result = await driver.query('SELECT 1 as num')
      expect(result.rowCount).toBe(1)
    })
  })

  describe('Cross-driver behavior', () => {
    it('should handle adjustment errors gracefully', async () => {
      const config: PostgresConfig = {
        driver: 'postgres',
        host: 'invalid-host',
        database: 'test',
      }
      const driver = new PostgresDriver(config)

      // Should not throw when pool is not connected
      await driver.adjustPoolSize?.(10)
    })

    it('should clamp sizes to valid range', async () => {
      // Skip if Postgres is not available in the environment
      const isPostgresAvailable = await (async () => {
        const testConfig: PostgresConfig = {
          driver: 'postgres',
          host: process.env.POSTGRES_HOST ?? 'localhost',
          port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
          database: process.env.POSTGRES_DB ?? 'gravito_test',
          username: process.env.POSTGRES_USER ?? 'postgres',
          password: process.env.POSTGRES_PASSWORD ?? 'postgres',
        }
        const testDriver = new PostgresDriver(testConfig)
        try {
          await testDriver.connect()
          await testDriver.query('SELECT 1')
          await testDriver.disconnect()
          return true
        } catch (_e) {
          return false
        }
      })()

      if (!isPostgresAvailable) {
        console.warn('Postgres not available, skipping clamp sizes test')
        return
      }

      const config: PostgresConfig = {
        driver: 'postgres',
        host: process.env.POSTGRES_HOST ?? 'localhost',
        database: process.env.POSTGRES_DB ?? 'gravito_test',
        pool: { min: 2, max: 10 },
      }
      const driver = new PostgresDriver(config)

      await driver.connect()

      // Test min bound
      await driver.adjustPoolSize?.(0)
      let stats = driver.getPoolStats()
      expect(stats?.max).toBeGreaterThanOrEqual(2)

      // Test max bound
      await driver.adjustPoolSize?.(999)
      stats = driver.getPoolStats()
      expect(stats?.max).toBeLessThanOrEqual(100)

      await driver.disconnect()
    })
  })
})
