/**
 * @gravito/atlas - MySQL Driver Pool Statistics Tests
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { MySQLDriver } from '../../src/drivers/MySQLDriver'
import type { MySQLConfig } from '../../src/types'

describe('MySQLDriver - Pool Statistics', () => {
  let driver: MySQLDriver
  let config: MySQLConfig

  beforeEach(() => {
    config = {
      driver: 'mysql',
      host: 'localhost',
      port: 3306,
      database: 'test',
      username: 'test',
      password: 'test',
      pool: {
        min: 2,
        max: 10,
      },
    }
    driver = new MySQLDriver(config)
  })

  afterEach(async () => {
    if (driver) {
      try {
        await driver.disconnect()
      } catch {
        // Ignore disconnect errors
      }
    }
  })

  describe('getPoolStats', () => {
    it('should return null when not connected', () => {
      const stats = driver.getPoolStats()
      expect(stats).toBeNull()
    })

    it('should return pool statistics with all fields', () => {
      const mockPool = {
        _allConnections: [{}, {}, {}, {}],
        _freeConnections: [{}, {}],
        _acquiringConnections: [{}],
        getConnection: async () => ({}),
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const stats = driver.getPoolStats()

      expect(stats).not.toBeNull()
      expect(stats?.idle).toBe(2)
      expect(stats?.total).toBe(4)
      expect(stats?.pending).toBe(1)
      expect(stats?.active).toBe(2) // 4 - 2
      expect(stats?.max).toBe(10)
    })

    it('should calculate active connections correctly', () => {
      const mockPool = {
        _allConnections: new Array(7).fill({}),
        _freeConnections: new Array(2).fill({}),
        _acquiringConnections: [],
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const stats = driver.getPoolStats()

      expect(stats?.active).toBe(5) // 7 - 2
      expect(stats?.pending).toBe(0)
    })

    it('should handle missing pool properties gracefully', () => {
      const mockPool = {
        getConnection: async () => ({}),
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

    it('should use custom max from config', () => {
      const customConfig: MySQLConfig = {
        ...config,
        pool: { max: 25 },
      }

      driver = new MySQLDriver(customConfig)

      const mockPool = {
        _allConnections: new Array(15).fill({}),
        _freeConnections: new Array(10).fill({}),
        _acquiringConnections: new Array(2).fill({}),
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const stats = driver.getPoolStats()
      expect(stats?.max).toBe(25)
      expect(stats?.total).toBe(15)
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
        _allConnections: new Array(2).fill({}),
        _freeConnections: new Array(2).fill({}),
        _acquiringConnections: [],
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const health = driver.getPoolHealth()

      expect(health.status).toBe('healthy')
      expect(health.message).toContain('normally')
      expect(health.stats?.active).toBe(0)
    })

    it('should return warning status when utilization is 70-89%', () => {
      const mockPool = {
        _allConnections: new Array(8).fill({}),
        _freeConnections: new Array(1).fill({}),
        _acquiringConnections: [], // 7/10 = 70%
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const health = driver.getPoolHealth()

      expect(health.status).toBe('warning')
      expect(health.message).toContain('high')
    })

    it('should return critical status when utilization >= 90%', () => {
      const mockPool = {
        _allConnections: new Array(10).fill({}),
        _freeConnections: new Array(1).fill({}),
        _acquiringConnections: [], // 9/10 = 90%
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const health = driver.getPoolHealth()

      expect(health.status).toBe('critical')
      expect(health.message).toContain('critical')
    })

    it('should return warning status when pending ratio is high', () => {
      const mockPool = {
        _allConnections: new Array(7).fill({}),
        _freeConnections: new Array(7).fill({}),
        _acquiringConnections: new Array(6).fill({}), // 6/10 = 60% > 50%
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const health = driver.getPoolHealth()

      expect(health.status).toBe('warning')
    })

    it('should include stats in response', () => {
      const mockPool = {
        _allConnections: new Array(8).fill({}),
        _freeConnections: new Array(5).fill({}),
        _acquiringConnections: new Array(1).fill({}),
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const health = driver.getPoolHealth()

      expect(health.stats).not.toBeUndefined()
      expect(health.stats?.idle).toBe(5)
      expect(health.stats?.total).toBe(8)
      expect(health.stats?.pending).toBe(1)
      expect(health.stats?.active).toBe(3)
    })

    it('should have valid timestamp', () => {
      const mockPool = {
        _allConnections: new Array(5).fill({}),
        _freeConnections: new Array(5).fill({}),
        _acquiringConnections: [],
      }

      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true

      const health = driver.getPoolHealth()

      expect(health.lastCheck).toBeInstanceOf(Date)
      expect(health.lastCheck?.getTime()).toBeLessThanOrEqual(Date.now())
    })
  })
})
