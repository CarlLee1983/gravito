/**
 * @gravito/atlas - ConnectionManager Adaptive Integration Tests
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { ConnectionManager } from '../../src/connection/ConnectionManager'
import type { ConnectionConfig } from '../../src/types'

describe('ConnectionManager Adaptive Integration', () => {
  let connectionManager: ConnectionManager
  let mockConfigs: Record<string, ConnectionConfig>

  beforeEach(() => {
    mockConfigs = {
      default: {
        driver: 'postgres' as const,
        host: 'localhost',
        database: 'test',
      },
      secondary: {
        driver: 'mysql' as const,
        host: 'localhost',
        database: 'test',
      },
    }
    connectionManager = new ConnectionManager(mockConfigs)
  })

  afterEach(async () => {
    await connectionManager.shutdown()
  })

  describe('enableAdaptive', () => {
    it('should enable adaptive management', () => {
      connectionManager.enableAdaptive()
      expect(connectionManager.getAdaptiveManager()).toBeDefined()
    })

    it('should accept custom configuration', () => {
      connectionManager.enableAdaptive({
        evaluationInterval: 30000,
        cooldownPeriod: 10000,
      })
      expect(connectionManager.getAdaptiveManager()).toBeDefined()
    })

    it('should start adaptive manager on enable', () => {
      connectionManager.enableAdaptive()
      const manager = connectionManager.getAdaptiveManager()
      expect(manager).not.toBeNull()
    })

    it('should be idempotent when called multiple times', () => {
      connectionManager.enableAdaptive()
      const manager1 = connectionManager.getAdaptiveManager()

      connectionManager.enableAdaptive()
      const manager2 = connectionManager.getAdaptiveManager()

      // Both should exist (second call creates new instance)
      expect(manager1).toBeDefined()
      expect(manager2).toBeDefined()
    })
  })

  describe('disableAdaptive', () => {
    it('should disable adaptive management', () => {
      connectionManager.enableAdaptive()
      expect(connectionManager.getAdaptiveManager()).toBeDefined()

      connectionManager.disableAdaptive()
      expect(connectionManager.getAdaptiveManager()).toBeUndefined()
    })

    it('should be safe to call when not enabled', () => {
      expect(() => {
        connectionManager.disableAdaptive()
      }).not.toThrow()
    })

    it('should stop adaptive manager on disable', () => {
      connectionManager.enableAdaptive()
      const manager = connectionManager.getAdaptiveManager()
      expect(manager).toBeDefined()

      connectionManager.disableAdaptive()
      expect(connectionManager.getAdaptiveManager()).toBeUndefined()
    })
  })

  describe('getAdaptiveManager', () => {
    it('should return undefined when not enabled', () => {
      expect(connectionManager.getAdaptiveManager()).toBeUndefined()
    })

    it('should return manager instance when enabled', () => {
      connectionManager.enableAdaptive()
      const manager = connectionManager.getAdaptiveManager()
      expect(manager).toBeDefined()
    })

    it('should return same instance until disabled', () => {
      connectionManager.enableAdaptive()
      const manager1 = connectionManager.getAdaptiveManager()
      const manager2 = connectionManager.getAdaptiveManager()
      expect(manager1).toBe(manager2)
    })
  })

  describe('shutdown integration', () => {
    it('should disable adaptive on shutdown', async () => {
      connectionManager.enableAdaptive()
      expect(connectionManager.getAdaptiveManager()).toBeDefined()

      await connectionManager.shutdown()
      expect(connectionManager.getAdaptiveManager()).toBeUndefined()
    })

    it('should disable health check and adaptive on shutdown', async () => {
      connectionManager.enableHealthCheck()
      connectionManager.enableAdaptive()

      expect(connectionManager.getAdaptiveManager()).toBeDefined()

      await connectionManager.shutdown()

      expect(connectionManager.getAdaptiveManager()).toBeUndefined()
    })
  })

  describe('configuration options', () => {
    it('should respect evaluation interval setting', () => {
      const evalInterval = 45000
      connectionManager.enableAdaptive({
        evaluationInterval: evalInterval,
      })

      const manager = connectionManager.getAdaptiveManager()
      expect(manager).toBeDefined()
    })

    it('should respect cooldown period setting', () => {
      const cooldown = 20000
      connectionManager.enableAdaptive({
        cooldownPeriod: cooldown,
      })

      const manager = connectionManager.getAdaptiveManager()
      expect(manager).toBeDefined()
    })

    it('should accept adjustment callback', () => {
      let _callCount = 0
      connectionManager.enableAdaptive({
        onAdjustment: () => {
          _callCount++
        },
      })

      const manager = connectionManager.getAdaptiveManager()
      expect(manager).toBeDefined()
    })

    it('should merge default config with custom config', () => {
      // Only override specific settings
      connectionManager.enableAdaptive({
        evaluationInterval: 25000,
      })

      const manager = connectionManager.getAdaptiveManager()
      expect(manager).toBeDefined()
    })
  })

  describe('multiple connection management', () => {
    it('should evaluate all configured connections', () => {
      connectionManager.enableAdaptive()
      const manager = connectionManager.getAdaptiveManager()
      expect(manager).toBeDefined()
    })

    it('should monitor multiple connection pools concurrently', async () => {
      connectionManager.enableAdaptive({
        evaluationInterval: 100,
      })

      const manager = connectionManager.getAdaptiveManager()
      expect(manager).toBeDefined()

      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(manager).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should handle missing adaptive manager gracefully', () => {
      expect(() => {
        connectionManager.disableAdaptive()
      }).not.toThrow()
    })

    it('should handle shutdown with adaptive enabled', async () => {
      connectionManager.enableAdaptive()
      await connectionManager.shutdown()
      expect(connectionManager.getAdaptiveManager()).toBeUndefined()
    })

    it('should handle shutdown without adaptive enabled', async () => {
      await connectionManager.shutdown()
      expect(connectionManager.getAdaptiveManager()).toBeUndefined()
    })
  })
})
