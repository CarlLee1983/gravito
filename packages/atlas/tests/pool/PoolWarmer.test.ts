/**
 * @gravito/atlas - Pool Warmer Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { ConnectionManager } from '../../src/connection/ConnectionManager'
import { DEFAULT_WARMER_CONFIG, PoolWarmer } from '../../src/pool/PoolWarmer'

describe('PoolWarmer', () => {
  let warmer: PoolWarmer
  let mockConnectionManager: ConnectionManager
  let completeCallback: (result: any) => void
  let connectionWarmedCallback: (name: string, duration: number) => void

  beforeEach(() => {
    completeCallback = () => {}
    connectionWarmedCallback = () => {}

    mockConnectionManager = {
      getConnectionNames: () => ['default', 'secondary'],
      connection: (_name: string) => ({
        getConfig: () => ({
          pool: { max: 10 },
        }),
        raw: async () => ({ rows: [], rowCount: 0 }),
      }),
    } as any

    warmer = new PoolWarmer(mockConnectionManager, {
      ...DEFAULT_WARMER_CONFIG,
      targetConnections: 2,
      concurrency: 2,
      timeout: 5000,
      onComplete: completeCallback,
      onConnectionWarmed: connectionWarmedCallback,
    })
  })

  describe('warmAll', () => {
    it('should warm all connections', async () => {
      const result = await warmer.warmAll()

      expect(result.total).toBe(2)
      expect(result.successful).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.results.default).not.toBeUndefined()
      expect(result.results.secondary).not.toBeUndefined()
    })

    it('should return correct result structure', async () => {
      const result = await warmer.warmAll()

      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('successful')
      expect(result).toHaveProperty('failed')
      expect(result).toHaveProperty('results')
      expect(result).toHaveProperty('duration')
    })

    it('should include duration', async () => {
      const result = await warmer.warmAll()

      expect(result.duration).toBeGreaterThanOrEqual(0)
      expect(typeof result.duration).toBe('number')
    })

    it('should trigger onComplete callback', async () => {
      let callbackCalled = false
      const callback = () => {
        callbackCalled = true
      }

      warmer = new PoolWarmer(mockConnectionManager, {
        ...DEFAULT_WARMER_CONFIG,
        onComplete: callback,
      })

      await warmer.warmAll()
      expect(callbackCalled).toBe(true)
    })
  })

  describe('warmConnection', () => {
    it('should warm single connection', async () => {
      const result = await warmer.warmConnection('default')

      expect(result.success).toBe(true)
      expect(result.connection).toBe('default')
      expect(result.duration).toBeGreaterThanOrEqual(0)
      expect(result.error).toBeUndefined()
    })

    it('should handle connection errors gracefully', async () => {
      const failingConnectionManager = {
        getConnectionNames: () => ['failing'],
        connection: () => ({
          getConfig: () => ({ pool: { max: 10 } }),
          raw: async () => {
            throw new Error('Connection failed')
          },
        }),
      } as any

      const failingWarmer = new PoolWarmer(failingConnectionManager, {
        ...DEFAULT_WARMER_CONFIG,
      })

      const result = await failingWarmer.warmConnection('failing')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Connection failed')
    })

    it('should trigger onConnectionWarmed callback', async () => {
      let callbackCalled = false
      let callbackName = ''

      const callback = (name: string) => {
        callbackCalled = true
        callbackName = name
      }

      warmer = new PoolWarmer(mockConnectionManager, {
        ...DEFAULT_WARMER_CONFIG,
        onConnectionWarmed: callback,
      })

      await warmer.warmConnection('default')
      expect(callbackCalled).toBe(true)
      expect(callbackName).toBe('default')
    })

    it('should include error message on failure', async () => {
      const failingConnectionManager = {
        getConnectionNames: () => ['failing'],
        connection: () => ({
          getConfig: () => ({ pool: { max: 10 } }),
          raw: async () => {
            throw new Error('Test error message')
          },
        }),
      } as any

      const failingWarmer = new PoolWarmer(failingConnectionManager, {
        ...DEFAULT_WARMER_CONFIG,
      })

      const result = await failingWarmer.warmConnection('failing')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Test error message')
    })
  })

  describe('configuration', () => {
    it('should use default config when not provided', async () => {
      const defaultWarmer = new PoolWarmer(mockConnectionManager, {})

      const result = await defaultWarmer.warmAll()
      expect(result.successful).toBe(2)
    })

    it('should respect custom target connections', async () => {
      // This is hard to test directly, but we can verify it doesn't error
      const customWarmer = new PoolWarmer(mockConnectionManager, {
        targetConnections: 5,
      })

      const result = await customWarmer.warmAll()
      expect(result.successful).toBe(2)
    })
  })

  describe('concurrency', () => {
    it('should handle concurrent warmup', async () => {
      let concurrentCount = 0
      let maxConcurrent = 0

      const concurrentMockManager = {
        getConnectionNames: () => ['conn1', 'conn2', 'conn3', 'conn4'],
        connection: () => ({
          getConfig: () => ({ pool: { max: 10 } }),
          raw: async () => {
            concurrentCount++
            maxConcurrent = Math.max(maxConcurrent, concurrentCount)
            await new Promise((resolve) => setTimeout(resolve, 10))
            concurrentCount--
            return { rows: [], rowCount: 0 }
          },
        }),
      } as any

      const concurrentWarmer = new PoolWarmer(concurrentMockManager, {
        ...DEFAULT_WARMER_CONFIG,
        concurrency: 2,
        targetConnections: 2,
      })

      await concurrentWarmer.warmAll()
      // Should have some concurrent execution
      expect(maxConcurrent).toBeGreaterThan(0)
    })
  })
})
