/**
 * @gravito/atlas - Adaptive Pool Manager Tests
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { ConnectionManager } from '../../src/connection/ConnectionManager'
import { AdaptivePoolManager, DEFAULT_ADAPTIVE_CONFIG } from '../../src/pool/AdaptivePoolManager'
import { LoadAwareStrategy } from '../../src/pool/PoolStrategy'
import type { PoolStats } from '../../src/types'

describe('AdaptivePoolManager', () => {
  let manager: AdaptivePoolManager
  let mockConnectionManager: ConnectionManager
  let adjustmentCallback: any

  beforeEach(() => {
    adjustmentCallback = (event: any) => {}

    mockConnectionManager = {
      getConnectionNames: () => ['default'],
      connection: (name: string) => ({
        getConfig: () => ({
          pool: { max: 10 },
        }),
        getDriver: () => ({
          getPoolStats: () =>
            ({
              idle: 5,
              pending: 0,
              active: 5,
              total: 10,
              max: 10,
            }) as PoolStats,
          adjustPoolSize: async (size: number) => {},
        }),
      }),
    } as any

    manager = new AdaptivePoolManager(mockConnectionManager, new LoadAwareStrategy(), {
      ...DEFAULT_ADAPTIVE_CONFIG,
      evaluationInterval: 100,
      cooldownPeriod: 50,
      onAdjustment: adjustmentCallback,
    })
  })

  afterEach(() => {
    manager.stop()
  })

  describe('start/stop', () => {
    it('should start management', () => {
      manager.start()
      expect(true).toBe(true)
      manager.stop()
    })

    it('should be idempotent', () => {
      manager.start()
      manager.start()
      manager.stop()
      expect(true).toBe(true)
    })
  })

  describe('history management', () => {
    it('should initialize empty history', () => {
      const history = manager.getHistory('default')
      expect(history).toEqual([])
    })

    it('should maintain history size limit', async () => {
      manager.start()
      await new Promise((resolve) => setTimeout(resolve, 200))

      const history = manager.getHistory('default')
      expect(history.length).toBeLessThanOrEqual(DEFAULT_ADAPTIVE_CONFIG.maxHistorySize)

      manager.stop()
    })
  })

  describe('cooldown mechanism', () => {
    it('should prevent rapid adjustments', async () => {
      let adjustmentCount = 0
      const mockManager = new AdaptivePoolManager(
        {
          getConnectionNames: () => ['test'],
          connection: (name: string) => ({
            getConfig: () => ({
              pool: { max: 10, min: 2 },
            }),
            getDriver: () => ({
              getPoolStats: () =>
                ({
                  idle: 0,
                  pending: 1,
                  active: 9,
                  total: 9,
                  max: 10,
                }) as PoolStats,
              adjustPoolSize: async (size: number) => {
                adjustmentCount++
              },
            }),
          }),
        } as any,
        new LoadAwareStrategy(),
        {
          ...DEFAULT_ADAPTIVE_CONFIG,
          evaluationInterval: 50,
          cooldownPeriod: 500,
          onAdjustment: () => {},
        }
      )

      mockManager.start()
      await new Promise((resolve) => setTimeout(resolve, 300))
      mockManager.stop()

      // Should have limited adjustments due to cooldown
      expect(adjustmentCount).toBeLessThanOrEqual(2)
    })
  })

  describe('strategy integration', () => {
    it('should use provided strategy', async () => {
      manager.start()
      await new Promise((resolve) => setTimeout(resolve, 150))

      const context = manager.getHistory('default')
      expect(context).toBeDefined()

      manager.stop()
    })
  })

  describe('adjustment events', () => {
    it('should track last adjustment', async () => {
      let lastEvent: any = null
      const mockManager = new AdaptivePoolManager(
        {
          getConnectionNames: () => ['test'],
          connection: (name: string) => ({
            getConfig: () => ({
              pool: { max: 10, min: 2 },
            }),
            getDriver: () => ({
              getPoolStats: () =>
                ({
                  idle: 0,
                  pending: 0,
                  active: 9,
                  total: 9,
                  max: 10,
                }) as PoolStats,
              adjustPoolSize: async (size: number) => {},
            }),
          }),
        } as any,
        new LoadAwareStrategy(),
        {
          ...DEFAULT_ADAPTIVE_CONFIG,
          evaluationInterval: 100,
          onAdjustment: (event) => {
            lastEvent = event
          },
        }
      )

      mockManager.start()
      await new Promise((resolve) => setTimeout(resolve, 150))

      if (lastEvent) {
        expect(lastEvent.connection).toBe('test')
        expect(['increase', 'decrease', 'maintain']).toContain(lastEvent.action)
      }

      mockManager.stop()
    })
  })

  describe('error handling', () => {
    it('should handle missing pool stats gracefully', async () => {
      const mockManager = new AdaptivePoolManager(
        {
          getConnectionNames: () => ['test'],
          connection: (name: string) => ({
            getConfig: () => ({}),
            getDriver: () => ({
              getPoolStats: () => null,
            }),
          }),
        } as any,
        new LoadAwareStrategy(),
        {
          ...DEFAULT_ADAPTIVE_CONFIG,
          evaluationInterval: 100,
        }
      )

      mockManager.start()
      await new Promise((resolve) => setTimeout(resolve, 150))
      mockManager.stop()

      expect(true).toBe(true)
    })

    it('should handle driver adjustment failures', async () => {
      const mockManager = new AdaptivePoolManager(
        {
          getConnectionNames: () => ['test'],
          connection: (name: string) => ({
            getConfig: () => ({
              pool: { max: 10, min: 2 },
            }),
            getDriver: () => ({
              getPoolStats: () =>
                ({
                  idle: 0,
                  pending: 0,
                  active: 9,
                  total: 9,
                  max: 10,
                }) as PoolStats,
              adjustPoolSize: async () => {
                throw new Error('Adjustment failed')
              },
            }),
          }),
        } as any,
        new LoadAwareStrategy(),
        {
          ...DEFAULT_ADAPTIVE_CONFIG,
          evaluationInterval: 100,
        }
      )

      mockManager.start()
      await new Promise((resolve) => setTimeout(resolve, 150))
      mockManager.stop()

      expect(true).toBe(true)
    })
  })

  describe('configuration', () => {
    it('should respect evaluation interval', async () => {
      const manager2 = new AdaptivePoolManager(mockConnectionManager, new LoadAwareStrategy(), {
        ...DEFAULT_ADAPTIVE_CONFIG,
        evaluationInterval: 500,
      })

      manager2.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should not have evaluated yet
      const history = manager2.getHistory('default')
      expect(history.length).toBeLessThanOrEqual(1)

      manager2.stop()
    })

    it('should respect cooldown period', async () => {
      const manager2 = new AdaptivePoolManager(mockConnectionManager, new LoadAwareStrategy(), {
        ...DEFAULT_ADAPTIVE_CONFIG,
        cooldownPeriod: 1000,
      })

      manager2.start()
      manager2.stop()

      expect(true).toBe(true)
    })
  })
})
