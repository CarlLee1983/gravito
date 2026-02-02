import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { EventOptions } from '../events/EventOptions'
import { HookManager, type HookManagerConfig } from '../HookManager'

describe('HookManager - Async Event Dispatch', () => {
  let hookManager: HookManager

  beforeEach(() => {
    hookManager = new HookManager()
  })

  afterEach(() => {
    // Clean up
  })

  describe('Configuration', () => {
    it('should initialize with default config', () => {
      const config = hookManager.getConfig()
      expect(config.asyncByDefault).toBe(false)
      expect(config.migrationMode).toBe('sync')
      expect(config.showDeprecationWarnings).toBe(false)
    })

    it('should accept custom config', () => {
      const customConfig: HookManagerConfig = {
        asyncByDefault: true,
        migrationMode: 'hybrid',
        showDeprecationWarnings: true,
      }
      const manager = new HookManager(customConfig)
      const config = manager.getConfig()
      expect(config.asyncByDefault).toBe(true)
      expect(config.migrationMode).toBe('hybrid')
      expect(config.showDeprecationWarnings).toBe(true)
    })

    it('should update config via configure()', () => {
      hookManager.configure({ asyncByDefault: true })
      const config = hookManager.getConfig()
      expect(config.asyncByDefault).toBe(true)
    })
  })

  describe('Synchronous Dispatch (Legacy)', () => {
    it('should execute actions synchronously in sync mode', async () => {
      const results: number[] = []

      hookManager.addAction('test:event', () => {
        results.push(1)
      })

      hookManager.addAction('test:event', () => {
        results.push(2)
      })

      await hookManager.doAction('test:event', {})

      expect(results).toEqual([1, 2])
    })

    it('should handle errors in sync mode', async () => {
      const results: number[] = []

      hookManager.addAction('test:event', () => {
        throw new Error('Test error')
      })

      hookManager.addAction('test:event', () => {
        results.push(1)
      })

      // Should not throw, should continue with next callback
      await hookManager.doAction('test:event', {})

      expect(results).toEqual([1])
    })
  })

  describe('Asynchronous Dispatch', () => {
    it('should dispatch events asynchronously with explicit async option', async () => {
      const results: number[] = []

      hookManager.addAction('test:event', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        results.push(1)
      })

      const options: EventOptions = { async: true }
      await hookManager.doActionAsync('test:event', {}, options)

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(results).toEqual([1])
    })

    it('should enqueue events by priority', async () => {
      const results: string[] = []

      hookManager.addAction('test:event', () => {
        results.push('processed')
      })

      // Enqueue events with different priorities
      await hookManager.doActionAsync('test:event', {}, { priority: 'low' })
      await hookManager.doActionAsync('test:event', {}, { priority: 'high' })
      await hookManager.doActionAsync('test:event', {}, { priority: 'normal' })

      // Check queue depth immediately (before processing)
      const totalDepth = hookManager.getQueueDepth()
      expect(totalDepth).toBeGreaterThan(0)

      // Wait for all events to be processed
      await new Promise((resolve) => setTimeout(resolve, 200))

      // All events should be processed
      expect(results.length).toBe(3)
    })

    it('should handle timeout', async () => {
      let executed = false

      hookManager.addAction('test:event', async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        executed = true
      })

      await hookManager.doActionAsync('test:event', {}, { timeout: 50 })

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should not have executed due to timeout
      expect(executed).toBe(false)
    })
  })

  describe('Hybrid Mode (Auto-detect)', () => {
    beforeEach(() => {
      hookManager.configure({ migrationMode: 'hybrid' })
    })

    it('should auto-detect async listeners and use async dispatch', async () => {
      const results: number[] = []

      hookManager.addAction('test:event', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        results.push(1)
      })

      // Should automatically use async dispatch
      await hookManager.doAction('test:event', {})

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(results).toEqual([1])
    })

    it('should use sync dispatch for sync listeners', async () => {
      const results: number[] = []

      hookManager.addAction('test:event', () => {
        results.push(1)
      })

      await hookManager.doAction('test:event', {})

      // Should execute immediately (sync)
      expect(results).toEqual([1])
    })
  })

  describe('Queue Depth Monitoring', () => {
    it('should track queue depth', async () => {
      hookManager.addAction('test:event', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })

      // Dispatch multiple events
      await hookManager.doActionAsync('test:event', {}, { priority: 'high' })
      await hookManager.doActionAsync('test:event', {}, { priority: 'normal' })
      await hookManager.doActionAsync('test:event', {}, { priority: 'low' })

      const totalDepth = hookManager.getQueueDepth()
      expect(totalDepth).toBeGreaterThan(0)

      const highDepth = hookManager.getQueueDepthByPriority('high')
      expect(highDepth).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain backward compatibility with existing code', async () => {
      const results: number[] = []

      hookManager.addAction('test:event', () => {
        results.push(1)
      })

      // Old API should still work
      await hookManager.doAction('test:event', {})

      expect(results).toEqual([1])
    })

    it('should support explicit sync option', async () => {
      const results: number[] = []

      hookManager.addAction('test:event', async () => {
        results.push(1)
      })

      // Force sync dispatch even with async listener
      await hookManager.doAction('test:event', {}, { async: false })

      // Should execute immediately (sync)
      expect(results).toEqual([1])
    })
  })

  describe('getListeners()', () => {
    it('should return registered listeners for a hook', () => {
      const callback1 = () => {}
      const callback2 = () => {}

      hookManager.addAction('test:event', callback1)
      hookManager.addAction('test:event', callback2)

      const listeners = hookManager.getListeners('test:event')
      expect(listeners).toHaveLength(2)
    })

    it('should return empty array for non-existent hook', () => {
      const listeners = hookManager.getListeners('non:existent')
      expect(listeners).toEqual([])
    })
  })
})
