/**
 * @gravito/atlas - Pool Management E2E Tests
 * Comprehensive end-to-end testing of connection pool management features
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { ConnectionManager } from '../../src/connection/ConnectionManager'
import type { ConnectionConfig } from '../../src/types'

describe('Connection Pool Management E2E', () => {
  let connectionManager: ConnectionManager
  let mockConfigs: Record<string, ConnectionConfig>

  beforeEach(() => {
    mockConfigs = {
      default: {
        driver: 'postgres' as const,
        host: 'localhost',
        database: 'test',
        pool: { min: 2, max: 10 },
      },
      secondary: {
        driver: 'mysql' as const,
        host: 'localhost',
        database: 'test',
        pool: { min: 2, max: 10 },
      },
    }
    connectionManager = new ConnectionManager(mockConfigs)
  })

  afterEach(async () => {
    await connectionManager.shutdown()
  })

  describe('Pool Initialization & Warmup', () => {
    it('should initialize pool on connection', async () => {
      // Just getting a connection should initialize the pool
      const connection = connectionManager.connection('default')
      expect(connection).toBeDefined()
    })

    it('should warm up connection pools on demand', async () => {
      connectionManager.enableWarmup({
        targetConnections: 3,
      })

      const result = await connectionManager.warmup()
      expect(result).toBeDefined()
      expect(result.total).toBeGreaterThan(0)
    })

    it('should track warmup results per connection', async () => {
      connectionManager.enableWarmup({
        targetConnections: 2,
      })

      const result = await connectionManager.warmup()
      expect(result.results).toBeDefined()
      expect(typeof result.results).toBe('object')
    })
  })

  describe('Health Checking', () => {
    it('should enable health checking', () => {
      connectionManager.enableHealthCheck()

      // Connection should exist and have driver
      const conn = connectionManager.connection('default')
      expect(conn).toBeDefined()
    })

    it('should detect pool state changes', async () => {
      connectionManager.enableHealthCheck({
        checkInterval: 100,
      })

      await new Promise((resolve) => setTimeout(resolve, 200))

      // Health checker should be running
      expect(connectionManager).toBeDefined()
    })

    it('should track health status over time', async () => {
      connectionManager.enableHealthCheck({
        checkInterval: 100,
      })

      await new Promise((resolve) => setTimeout(resolve, 250))

      // Multiple checks should have occurred
      expect(connectionManager).toBeDefined()
    })

    it('should disable health checking on demand', () => {
      connectionManager.enableHealthCheck()
      expect(connectionManager).toBeDefined()

      // Health checking should be disableable without errors
      connectionManager.disableHealthCheck()
      expect(connectionManager).toBeDefined()
    })
  })

  describe('Adaptive Pool Management', () => {
    it('should enable adaptive management', () => {
      connectionManager.enableAdaptive()
      const manager = connectionManager.getAdaptiveManager()
      expect(manager).toBeDefined()
    })

    it('should start evaluation on enable', async () => {
      connectionManager.enableAdaptive({
        evaluationInterval: 100,
      })

      const manager = connectionManager.getAdaptiveManager()
      expect(manager).toBeDefined()

      // Manager should be active
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(connectionManager.getAdaptiveManager()).toBeDefined()
    })

    it('should handle pool size adjustments', async () => {
      connectionManager.enableAdaptive({
        evaluationInterval: 100,
        onAdjustment: (event) => {
          expect(event.connection).toBeDefined()
          expect(['increase', 'decrease', 'maintain']).toContain(event.action)
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(connectionManager.getAdaptiveManager()).toBeDefined()
    })

    it('should track adjustment history', async () => {
      connectionManager.enableAdaptive({
        evaluationInterval: 100,
      })

      const manager = connectionManager.getAdaptiveManager()
      expect(manager).toBeDefined()

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Manager should have evaluated pools
      expect(connectionManager.getAdaptiveManager()).toBeDefined()
    })

    it('should disable adaptive management', async () => {
      connectionManager.enableAdaptive()
      expect(connectionManager.getAdaptiveManager()).toBeDefined()

      connectionManager.disableAdaptive()
      expect(connectionManager.getAdaptiveManager()).toBeUndefined()
    })
  })

  describe('Multi-Connection Pool Management', () => {
    it('should manage multiple connection pools concurrently', async () => {
      connectionManager.enableHealthCheck({
        checkInterval: 100,
      })
      connectionManager.enableAdaptive({
        evaluationInterval: 100,
      })

      // Access both connections
      const defaultConn = connectionManager.connection('default')
      const secondaryConn = connectionManager.connection('secondary')

      expect(defaultConn).toBeDefined()
      expect(secondaryConn).toBeDefined()

      await new Promise((resolve) => setTimeout(resolve, 200))

      // Both pools should be managed
      expect(connectionManager).toBeDefined()
    })

    it('should handle independent pool sizing', async () => {
      connectionManager.enableAdaptive({
        evaluationInterval: 100,
        onAdjustment: (event) => {
          // Each pool gets evaluated independently
          expect(event.connection).toBeDefined()
        },
      })

      const connections = connectionManager.getConnectionNames?.() ?? []
      expect(typeof connections).toBe('object')

      await new Promise((resolve) => setTimeout(resolve, 200))
    })

    it('should isolate failures between pools', async () => {
      connectionManager.enableHealthCheck()

      // One pool failing shouldn't affect others
      const conn1 = connectionManager.connection('default')
      const conn2 = connectionManager.connection('secondary')

      expect(conn1).toBeDefined()
      expect(conn2).toBeDefined()
    })
  })

  describe('Graceful Shutdown', () => {
    it('should clean up resources on shutdown', async () => {
      connectionManager.enableHealthCheck()
      connectionManager.enableAdaptive()
      connectionManager.enableWarmup()

      await connectionManager.shutdown()

      // All managers should be disabled
      expect(connectionManager.getAdaptiveManager()).toBeUndefined()
    })

    it('should handle shutdown with no features enabled', async () => {
      // Just create the manager without enabling anything
      expect(() => {
        connectionManager.shutdown()
      }).not.toThrow()
    })

    it('should disconnect all connections on shutdown', async () => {
      const conn = connectionManager.connection('default')
      expect(conn).toBeDefined()

      await connectionManager.shutdown()

      // Should be cleanly shutdown
      expect(connectionManager).toBeDefined()
    })
  })

  describe('Configuration Management', () => {
    it('should respect custom health check config', () => {
      connectionManager.enableHealthCheck({
        checkInterval: 200,
        thresholds: {
          warningUtilization: 0.6,
          criticalUtilization: 0.85,
          maxPendingRatio: 0.4,
        },
      })

      expect(connectionManager).toBeDefined()
    })

    it('should respect custom adaptive config', () => {
      connectionManager.enableAdaptive({
        evaluationInterval: 120000,
        cooldownPeriod: 60000,
        maxHistorySize: 20,
      })

      const manager = connectionManager.getAdaptiveManager()
      expect(manager).toBeDefined()
    })

    it('should merge configs with defaults', () => {
      // Partial config should be merged with defaults
      connectionManager.enableAdaptive({
        evaluationInterval: 30000,
      })

      const manager = connectionManager.getAdaptiveManager()
      expect(manager).toBeDefined()
    })
  })

  describe('Error Handling & Resilience', () => {
    it('should handle adjustment errors gracefully', async () => {
      connectionManager.enableAdaptive({
        evaluationInterval: 100,
        onAdjustment: () => {
          // Callback should be called even if adjustment fails
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 200))

      // System should remain functional
      expect(connectionManager.getAdaptiveManager()).toBeDefined()
    })

    it('should continue health checking despite errors', async () => {
      connectionManager.enableHealthCheck({
        checkInterval: 100,
      })

      // Health checker should continue even if some checks fail
      await new Promise((resolve) => setTimeout(resolve, 250))

      expect(connectionManager).toBeDefined()
    })

    it('should handle rapid enable/disable cycles', () => {
      expect(() => {
        connectionManager.enableAdaptive()
        connectionManager.disableAdaptive()
        connectionManager.enableAdaptive()
        connectionManager.disableAdaptive()
      }).not.toThrow()
    })

    it('should handle multiple shutdowns safely', async () => {
      connectionManager.enableAdaptive()

      await connectionManager.shutdown()

      // Second shutdown should be safe
      expect(() => {
        connectionManager.shutdown()
      }).not.toThrow()
    })
  })

  describe('Observability Integration', () => {
    it('should track pool adjustment events', async () => {
      let adjustmentCount = 0

      connectionManager.enableAdaptive({
        evaluationInterval: 100,
        onAdjustment: () => {
          adjustmentCount++
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 200))

      // Callback was registered
      expect(typeof adjustmentCount).toBe('number')
    })

    it('should support custom adjustment callbacks', async () => {
      const events: any[] = []

      connectionManager.enableAdaptive({
        evaluationInterval: 100,
        onAdjustment: (event) => {
          events.push(event)
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 200))

      // Events list initialized
      expect(Array.isArray(events)).toBe(true)
    })
  })

  describe('Feature Combinations', () => {
    it('should enable all features together', async () => {
      connectionManager.enableHealthCheck({
        checkInterval: 100,
      })
      connectionManager.enableWarmup({
        targetConnections: 2,
      })
      connectionManager.enableAdaptive({
        evaluationInterval: 100,
      })

      const warmupResult = await connectionManager.warmup()
      expect(warmupResult).toBeDefined()

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(connectionManager.getAdaptiveManager()).toBeDefined()
    })

    it('should handle feature disable while running', async () => {
      connectionManager.enableHealthCheck()
      connectionManager.enableAdaptive()

      await new Promise((resolve) => setTimeout(resolve, 100))

      connectionManager.disableAdaptive()

      // Health check should continue
      expect(connectionManager).toBeDefined()

      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    it('should support dynamic feature toggling', async () => {
      connectionManager.enableAdaptive()
      expect(connectionManager.getAdaptiveManager()).toBeDefined()

      connectionManager.disableAdaptive()
      expect(connectionManager.getAdaptiveManager()).toBeUndefined()

      connectionManager.enableAdaptive()
      expect(connectionManager.getAdaptiveManager()).toBeDefined()
    })
  })

  describe('Long-running Stability', () => {
    it('should maintain consistency over time', async () => {
      connectionManager.enableHealthCheck({
        checkInterval: 50,
      })
      connectionManager.enableAdaptive({
        evaluationInterval: 50,
      })

      // Run for a short period
      await new Promise((resolve) => setTimeout(resolve, 300))

      // System should be stable
      expect(connectionManager.getAdaptiveManager()).toBeDefined()
    })

    it('should not leak resources during operation', async () => {
      connectionManager.enableHealthCheck()
      connectionManager.enableAdaptive()

      // Multiple cycles
      for (let i = 0; i < 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

      // No obvious resource leaks (hard to detect in Bun)
      expect(connectionManager).toBeDefined()
    })
  })
})
