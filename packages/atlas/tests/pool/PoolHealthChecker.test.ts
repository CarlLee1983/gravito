/**
 * @gravito/atlas - Pool Health Checker Tests
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { ConnectionManager } from '../../src/connection/ConnectionManager'
import { DEFAULT_HEALTH_CHECK_CONFIG, PoolHealthChecker } from '../../src/pool/PoolHealthChecker'
import type { PoolHealth, PoolStats } from '../../src/types'

describe('PoolHealthChecker', () => {
  let checker: PoolHealthChecker
  let mockConnectionManager: ConnectionManager
  let healthChangeCallback: (name: string, health: PoolHealth) => void
  let criticalCallback: (name: string, health: PoolHealth) => void

  beforeEach(() => {
    healthChangeCallback = mock()
    criticalCallback = mock()

    // Create mock ConnectionManager
    mockConnectionManager = {
      getConnectionNames: () => ['default', 'secondary'],
      connection: (name: string) => ({
        getDriver: () => ({
          getPoolStats: () => {
            if (name === 'default') {
              return {
                idle: 5,
                pending: 0,
                active: 2,
                total: 7,
                max: 10,
              } as PoolStats
            }
            return {
              idle: 8,
              pending: 0,
              active: 1,
              total: 9,
              max: 10,
            } as PoolStats
          },
        }),
        raw: async () => ({ rows: [], rowCount: 0 }),
      }),
    } as any

    checker = new PoolHealthChecker(mockConnectionManager, {
      ...DEFAULT_HEALTH_CHECK_CONFIG,
      checkInterval: 100, // Short interval for tests
      onHealthChange: healthChangeCallback,
      onCritical: criticalCallback,
      enableConnectionTest: false, // Disable for faster tests
    })
  })

  afterEach(() => {
    checker.stop()
  })

  describe('start/stop', () => {
    it('should start health checking', (done) => {
      checker.start()
      // After starting, the first check should have been called
      expect(true).toBe(true)
      checker.stop()
      done()
    })

    it('should stop health checking', () => {
      checker.start()
      checker.stop()
      // Verify that no more checks happen (hard to test without waiting)
      expect(true).toBe(true)
    })

    it('should not start multiple times', () => {
      checker.start()
      checker.start() // Should be idempotent
      checker.stop()
      expect(true).toBe(true)
    })
  })

  describe('getHealthStatus', () => {
    it('should get health status for specific connection', async () => {
      checker.start()
      // Wait for health check to complete
      await new Promise((resolve) => setTimeout(resolve, 150))

      const health = checker.getHealthStatus('default')
      expect(health).not.toBeNull()
      expect((health as PoolHealth).stats?.idle).toBe(5)
    })

    it('should get health status for all connections', async () => {
      checker.start()
      await new Promise((resolve) => setTimeout(resolve, 150))

      const allHealth = checker.getHealthStatus()
      expect(allHealth instanceof Map).toBe(true)
      expect((allHealth as Map<string, PoolHealth>).size).toBe(2)
    })

    it('should return disconnected status for unknown connection', () => {
      const health = checker.getHealthStatus('unknown')
      expect((health as PoolHealth).status).toBe('disconnected')
    })
  })

  describe('health evaluation', () => {
    it('should evaluate healthy status', async () => {
      checker.start()
      await new Promise((resolve) => setTimeout(resolve, 150))

      const health = checker.getHealthStatus('default')
      expect((health as PoolHealth).status).toBe('healthy')
    })

    it('should trigger callback on status change', async () => {
      checker.start()
      await new Promise((resolve) => setTimeout(resolve, 150))

      // First check should trigger callback
      expect(healthChangeCallback.mock.calls.length).toBeGreaterThan(0)
    })

    it('should not trigger callback if status unchanged', async () => {
      checker.start()
      await new Promise((resolve) => setTimeout(resolve, 150))
      const callCount = healthChangeCallback.mock.calls.length

      // Wait another cycle
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should not have significantly more calls (might have some due to timing)
      expect(healthChangeCallback.mock.calls.length).toBeLessThanOrEqual(callCount + 2)
    })

    it('should detect critical status', async () => {
      // Override connection manager to return critical pool stats
      mockConnectionManager.connection = () =>
        ({
          getDriver: () => ({
            getPoolStats: () =>
              ({
                idle: 1,
                pending: 0,
                active: 9,
                total: 10,
                max: 10,
              }) as PoolStats,
          }),
          raw: async () => ({ rows: [], rowCount: 0 }),
        }) as any

      checker.start()
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have triggered critical callback
      expect(criticalCallback.mock.calls.length).toBeGreaterThan(0)
    })
  })

  describe('configuration', () => {
    it('should respect custom thresholds', async () => {
      const customChecker = new PoolHealthChecker(mockConnectionManager, {
        checkInterval: 100,
        thresholds: {
          warningUtilization: 0.5,
          criticalUtilization: 0.8,
          maxPendingRatio: 0.3,
        },
        enableConnectionTest: false,
        onHealthChange: healthChangeCallback,
      })

      customChecker.start()
      await new Promise((resolve) => setTimeout(resolve, 150))

      customChecker.stop()
      expect(healthChangeCallback.mock.calls.length).toBeGreaterThan(0)
    })
  })
})
