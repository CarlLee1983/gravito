/**
 * Unit tests for BunWorker implementation.
 *
 * Note: These tests require Bun runtime. They will be skipped on Node.js.
 */

import { afterEach, describe, expect, it } from 'bun:test'
import { BunWorker } from '../../src/workers/BunWorker'

describe('BunWorker', () => {
  let worker: BunWorker

  afterEach(async () => {
    if (worker) {
      await worker.terminate()
    }
  })

  describe('constructor', () => {
    it('should use default config values', () => {
      worker = new BunWorker()
      const config = (worker as any).config
      expect(config.maxExecutionTime).toBe(30000)
      expect(config.maxMemory).toBe(0)
      expect(config.isolateContexts).toBe(false)
      expect(config.idleTimeout).toBe(60000)
      expect(config.smol).toBe(false)
    })

    it('should accept custom config', () => {
      worker = new BunWorker({
        maxExecutionTime: 5000,
        maxMemory: 256,
        isolateContexts: true,
        idleTimeout: 10000,
        smol: true,
      })
      const config = (worker as any).config
      expect(config.maxExecutionTime).toBe(5000)
      expect(config.maxMemory).toBe(256)
      expect(config.isolateContexts).toBe(true)
      expect(config.idleTimeout).toBe(10000)
      expect(config.smol).toBe(true)
    })

    it('should start in initializing state', () => {
      worker = new BunWorker()
      expect(worker.getState()).toBe('initializing')
    })
  })

  describe('getState', () => {
    it('should return current state string', () => {
      worker = new BunWorker()
      expect(worker.getState()).toBe('initializing')
    })
  })

  describe('isReady/isBusy', () => {
    it('should report ready state correctly', () => {
      worker = new BunWorker()
      expect(worker.isReady()).toBe(false)
      expect(worker.isBusy()).toBe(false)

      // Manually set state for testing
      ;(worker as any).state = 'ready'
      expect(worker.isReady()).toBe(true)
      expect(worker.isBusy()).toBe(false)
    })

    it('should report busy state correctly', () => {
      worker = new BunWorker()

      ;(worker as any).state = 'busy'
      expect(worker.isReady()).toBe(false)
      expect(worker.isBusy()).toBe(true)
    })
  })

  describe('terminate', () => {
    it('should terminate without error', async () => {
      worker = new BunWorker()
      // No need to initialize, terminate should handle uninitialized workers
      await worker.terminate()
      expect(worker).toBeDefined()
    })

    it('should be safe to call terminate multiple times', async () => {
      worker = new BunWorker()
      await worker.terminate()
      await worker.terminate()
      // Should not throw
      expect(worker).toBeDefined()
    })

    it('should clean up timers on terminate', async () => {
      worker = new BunWorker({
        idleTimeout: 5000,
        maxExecutionTime: 5000,
      })

      // Set some internal timers
      ;(worker as any).idleTimer = setTimeout(() => {}, 1000)
      ;(worker as any).executionTimer = setTimeout(() => {}, 1000)

      await worker.terminate()

      expect((worker as any).idleTimer).toBe(null)
      expect((worker as any).executionTimer).toBe(null)
    })
  })

  describe('ref/unref', () => {
    it('should support ref/unref for process lifetime management', async () => {
      worker = new BunWorker()

      // These should not throw
      worker.unref()
      worker.ref()

      await worker.terminate()
    })
  })

  describe('configuration variations', () => {
    it('should support smol mode', () => {
      worker = new BunWorker({
        smol: true,
      })
      const config = (worker as any).config
      expect(config.smol).toBe(true)
    })

    it('should support single preload module', () => {
      worker = new BunWorker({
        preload: './module.ts',
      })
      const config = (worker as any).config
      expect(config.preload).toBe('./module.ts')
    })

    it('should support multiple preload modules', () => {
      worker = new BunWorker({
        preload: ['./module1.ts', './module2.ts'],
      })
      const config = (worker as any).config
      expect(Array.isArray(config.preload)).toBe(true)
      expect(config.preload).toEqual(['./module1.ts', './module2.ts'])
    })

    it('should support context isolation', () => {
      worker = new BunWorker({
        isolateContexts: true,
      })
      const config = (worker as any).config
      expect(config.isolateContexts).toBe(true)
    })

    it('should support custom timeouts', () => {
      worker = new BunWorker({
        maxExecutionTime: 1000,
        idleTimeout: 2000,
      })
      const config = (worker as any).config
      expect(config.maxExecutionTime).toBe(1000)
      expect(config.idleTimeout).toBe(2000)
    })
  })
})
