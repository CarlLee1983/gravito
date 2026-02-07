/**
 * @gravito/atlas - PostgreSQL Driver Pool Statistics Tests
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { PostgresDriver } from '../../src/drivers/PostgresDriver'
import type { PostgresConfig } from '../../src/types'

describe('PostgresDriver - Pool Statistics', () => {
  let driver: PostgresDriver
  let config: PostgresConfig

  beforeEach(() => {
    config = {
      driver: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'test',
      username: 'test',
      password: 'test',
      pool: {
        min: 2,
        max: 10,
      },
    }
    driver = new PostgresDriver(config)
  })

  afterEach(async () => {
    if (driver) {
      try {
        await driver.disconnect()
      } catch {
        // Ignore disconnect errors in tests
      }
    }
  })

  describe('getPoolStats', () => {
    it('should return null when not connected', () => {
      const stats = driver.getPoolStats()
      expect(stats).toBeNull()
    })

    it('should return pool statistics with all fields', async () => {
      // Create a mock pool
      const mockPool = {
        idleCount: 5,
        totalCount: 8,
        waitingCount: 2,
        connect: async () => ({ query: async () => ({ rows: [], rowCount: 0 }) }),
        end: async () => {},
      }

      // Inject mock pool
      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const stats = driver.getPoolStats()

      expect(stats).not.toBeNull()
      expect(stats?.idle).toBe(5)
      expect(stats?.total).toBe(8)
      expect(stats?.pending).toBe(2)
      expect(stats?.active).toBe(3) // 8 - 5
      expect(stats?.max).toBe(10)
    })

    it('should calculate active connections correctly', async () => {
      const mockPool = {
        idleCount: 2,
        totalCount: 7,
        waitingCount: 0,
        connect: async () => ({}),
        end: async () => {},
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const stats = driver.getPoolStats()

      expect(stats?.active).toBe(5) // 7 - 2
    })

    it('should handle missing pool properties gracefully', async () => {
      const mockPool = {
        connect: async () => ({}),
        end: async () => {},
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const stats = driver.getPoolStats()

      expect(stats).not.toBeNull()
      expect(stats?.idle).toBe(0)
      expect(stats?.total).toBe(0)
      expect(stats?.pending).toBe(0)
      expect(stats?.active).toBe(0)
    })

    it('should use custom max from config', async () => {
      const customConfig: PostgresConfig = {
        ...config,
        pool: { max: 20 },
      }

      driver = new PostgresDriver(customConfig)

      const mockPool = {
        idleCount: 10,
        totalCount: 15,
        waitingCount: 1,
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const stats = driver.getPoolStats()
      expect(stats?.max).toBe(20)
    })
  })

  describe('getPoolHealth', () => {
    it('should return disconnected status when not connected', () => {
      const health = driver.getPoolHealth()

      expect(health.status).toBe('disconnected')
      expect(health.message).toContain('not initialized')
      expect(health.stats).toBeUndefined()
    })

    it('should return healthy status when utilization is low', () => {
      const mockPool = {
        idleCount: 8,
        totalCount: 10,
        waitingCount: 0,
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const health = driver.getPoolHealth()

      expect(health.status).toBe('healthy')
      expect(health.message).toContain('normally')
      expect(health.stats?.active).toBe(2)
      expect(health.lastCheck).toBeInstanceOf(Date)
    })

    it('should return warning status when utilization is 70-89%', () => {
      const mockPool = {
        idleCount: 1,
        totalCount: 8,
        waitingCount: 0, // 7/10 = 70%
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const health = driver.getPoolHealth()

      expect(health.status).toBe('warning')
      expect(health.message).toContain('high')
      expect(health.message).toContain('70')
    })

    it('should return critical status when utilization is >= 90%', () => {
      const mockPool = {
        idleCount: 1,
        totalCount: 10,
        waitingCount: 0, // 9/10 = 90%
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const health = driver.getPoolHealth()

      expect(health.status).toBe('critical')
      expect(health.message).toContain('critical')
      expect(health.message).toContain('90')
    })

    it('should return warning status when pending ratio is high', () => {
      const mockPool = {
        idleCount: 7,
        totalCount: 7,
        waitingCount: 6, // 6/10 = 60% > 50%
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const health = driver.getPoolHealth()

      expect(health.status).toBe('warning')
      expect(health.message).toContain('high')
    })

    it('should include stats in health response', () => {
      const mockPool = {
        idleCount: 5,
        totalCount: 8,
        waitingCount: 1,
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const health = driver.getPoolHealth()

      expect(health.stats).not.toBeUndefined()
      expect(health.stats?.idle).toBe(5)
      expect(health.stats?.total).toBe(8)
      expect(health.stats?.pending).toBe(1)
    })

    it('should have valid timestamp', () => {
      const mockPool = {
        idleCount: 10,
        totalCount: 10,
        waitingCount: 0,
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const health = driver.getPoolHealth()

      expect(health.lastCheck).toBeInstanceOf(Date)
      expect(health.lastCheck?.getTime()).toBeLessThanOrEqual(Date.now())
      expect(health.lastCheck?.getTime()).toBeGreaterThan(Date.now() - 1000)
    })
  })
})
