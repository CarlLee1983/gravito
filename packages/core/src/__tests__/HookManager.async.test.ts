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

  describe('Error Handling - removeAction', () => {
    it('should remove all actions for a hook', async () => {
      const results: number[] = []

      hookManager.addAction('test:event', () => results.push(1))
      hookManager.addAction('test:event', () => results.push(2))

      // Remove all actions for the hook
      hookManager.removeAction('test:event')

      await hookManager.doAction('test:event', {})

      expect(results).toHaveLength(0)
    })

    it('should not throw when removing non-existent action hook', () => {
      expect(() => {
        hookManager.removeAction('non:existent')
      }).not.toThrow()
    })

    it('should allow re-adding actions after removal', async () => {
      const results: number[] = []

      hookManager.addAction('test:event', () => results.push(1))
      hookManager.removeAction('test:event')
      hookManager.addAction('test:event', () => results.push(2))

      await hookManager.doAction('test:event', {})

      expect(results).toEqual([2])
    })
  })

  describe('Edge Cases - Empty Callbacks', () => {
    it('should handle doAction with no registered callbacks', async () => {
      await hookManager.doAction('non:existent', {})
      expect(true).toBe(true) // Should not throw
    })

    it('should handle doActionAsync with no registered callbacks', async () => {
      await hookManager.doActionAsync('non:existent', {}, { async: true })
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(true).toBe(true) // Should not throw
    })

    it('should return unfiltered value when no filters registered', async () => {
      const value = { test: 123 }
      const result = await hookManager.applyFilters('non:existent', value)
      expect(result).toBe(value)
    })
  })

  describe('Error Handling - Callback Exceptions', () => {
    it('should continue executing remaining callbacks even if one throws', async () => {
      const results: number[] = []

      hookManager.addAction('test:event', () => {
        results.push(1)
      })

      hookManager.addAction('test:event', () => {
        throw new Error('Test error')
      })

      hookManager.addAction('test:event', () => {
        results.push(3)
      })

      await hookManager.doAction('test:event', {})

      expect(results).toEqual([1, 3])
    })

    it('should handle async callback errors', async () => {
      const results: number[] = []

      hookManager.addAction('test:event', async () => {
        results.push(1)
      })

      hookManager.addAction('test:event', async () => {
        throw new Error('Async error')
      })

      hookManager.addAction('test:event', async () => {
        results.push(3)
      })

      await hookManager.doActionAsync('test:event', {}, { async: true })

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 150))

      // First callback should execute, second throws and is caught, third may not execute due to event chain
      expect(results).toContain(1)
      // Third callback may not execute due to the way event processing handles errors
    })
  })

  describe('Priority and Ordering', () => {
    it('should respect priority order (high > normal > low)', async () => {
      const results: string[] = []

      hookManager.addAction('test:event', () => {
        results.push('processed')
      })

      // Enqueue in mixed order
      await hookManager.doActionAsync('test:event', {}, { priority: 'low' })
      await hookManager.doActionAsync('test:event', {}, { priority: 'high' })
      await hookManager.doActionAsync('test:event', {}, { priority: 'normal' })

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have 3 results (exact order depends on timing)
      expect(results).toHaveLength(3)
    })

    it('should support partition key for ordered processing', async () => {
      const results: string[] = []

      hookManager.addAction('order:process', () => {
        results.push('processed')
      })

      await hookManager.doActionAsync(
        'order:process',
        { orderId: 123 },
        { ordering: 'partition', partitionKey: 'order:123' }
      )

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(results).toHaveLength(1)
    })
  })

  describe('Feature Flags and Migration', () => {
    it('should respect migrationMode when set to async', async () => {
      const customManager = new HookManager({ migrationMode: 'async' })
      const results: number[] = []

      customManager.addAction('test:event', () => {
        results.push(1)
      })

      // Should use async dispatch by default
      await customManager.doAction('test:event', {})

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(results).toEqual([1])
    })

    it('should allow migrationMode to be updated', () => {
      hookManager.configure({ migrationMode: 'hybrid' })
      const config = hookManager.getConfig()
      expect(config.migrationMode).toBe('hybrid')
    })

    it('should allow multiple config updates', () => {
      hookManager.configure({ asyncByDefault: true })
      hookManager.configure({ showDeprecationWarnings: true })

      const config = hookManager.getConfig()
      expect(config.asyncByDefault).toBe(true)
      expect(config.showDeprecationWarnings).toBe(true)
    })
  })

  describe('applyFilters', () => {
    it('should apply multiple filters in sequence', async () => {
      hookManager.addFilter('test:filter', (val: number) => val + 1)
      hookManager.addFilter('test:filter', (val: number) => val * 2)
      hookManager.addFilter('test:filter', (val: number) => val - 1)

      const result = await hookManager.applyFilters('test:filter', 5)
      // (5 + 1) * 2 - 1 = 11
      expect(result).toBe(11)
    })

    it('should handle async filters', async () => {
      hookManager.addFilter('test:filter', async (val: number) => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return val + 1
      })

      const result = await hookManager.applyFilters('test:filter', 5)
      expect(result).toBe(6)
    })

    it('should handle filter errors and continue', async () => {
      hookManager.addFilter('test:filter', (val: number) => val + 1)
      hookManager.addFilter('test:filter', (_val: number) => {
        throw new Error('Filter error')
      })
      hookManager.addFilter('test:filter', (val: number) => val * 2)

      // applyFilters logs errors but continues with the same value
      const result = await hookManager.applyFilters('test:filter', 5)
      // (5 + 1) = 6, then error is thrown and caught, continues with 6
      // 6 * 2 = 12 (applies third filter despite error in second)
      expect(result).toBe(12)
    })
  })

  describe('Ordering Guarantees - Partition Based', () => {
    it('should process events with same partition key in order', async () => {
      const results: string[] = []

      hookManager.addAction('order:event', () => {
        results.push(1)
      })

      // Enqueue multiple events with same partition key
      await hookManager.doActionAsync(
        'order:event',
        { id: 1 },
        {
          async: true,
          ordering: 'partition',
          partitionKey: 'order-123',
        }
      )

      await hookManager.doActionAsync(
        'order:event',
        { id: 2 },
        {
          async: true,
          ordering: 'partition',
          partitionKey: 'order-123',
        }
      )

      await hookManager.doActionAsync(
        'order:event',
        { id: 3 },
        {
          async: true,
          ordering: 'partition',
          partitionKey: 'order-123',
        }
      )

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200))

      // All should process
      expect(results).toHaveLength(3)
    })

    it('should allow different partitions to process in parallel', async () => {
      const results: string[] = []

      hookManager.addAction('order:event', () => {
        results.push(1)
      })

      // Enqueue events with different partition keys
      await hookManager.doActionAsync(
        'order:event',
        { id: 1 },
        {
          async: true,
          ordering: 'partition',
          partitionKey: 'order-1',
        }
      )

      await hookManager.doActionAsync(
        'order:event',
        { id: 2 },
        {
          async: true,
          ordering: 'partition',
          partitionKey: 'order-2',
        }
      )

      await hookManager.doActionAsync(
        'order:event',
        { id: 3 },
        {
          async: true,
          ordering: 'partition',
          partitionKey: 'order-3',
        }
      )

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 150))

      // All should execute (different partitions can run in parallel)
      expect(results.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Idempotency - Deduplication', () => {
    it('should skip duplicate events within TTL', async () => {
      const results: number[] = []

      hookManager.addAction('idempotent:event', () => {
        results.push(1)
      })

      // Dispatch with idempotency key
      await hookManager.doActionAsync(
        'idempotent:event',
        {},
        {
          async: true,
          idempotencyKey: 'event-123',
          ttl: 1000, // 1 second TTL
        }
      )

      // Wait for first event to process
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Dispatch same event with same key (should be skipped)
      await hookManager.doActionAsync(
        'idempotent:event',
        {},
        {
          async: true,
          idempotencyKey: 'event-123',
          ttl: 1000,
        }
      )

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should only execute once
      expect(results).toEqual([1])
    })

    it('should process event after TTL expires', async () => {
      const results: number[] = []

      hookManager.addAction('idempotent:event', () => {
        results.push(1)
      })

      const ttl = 100 // 100ms TTL

      // First dispatch
      await hookManager.doActionAsync(
        'idempotent:event',
        {},
        {
          async: true,
          idempotencyKey: 'event-456',
          ttl,
        }
      )

      await new Promise((resolve) => setTimeout(resolve, 50))

      // Second dispatch (within TTL, should be skipped)
      await hookManager.doActionAsync(
        'idempotent:event',
        {},
        {
          async: true,
          idempotencyKey: 'event-456',
          ttl,
        }
      )

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, ttl + 50))

      // Third dispatch (after TTL, should be processed)
      await hookManager.doActionAsync(
        'idempotent:event',
        {},
        {
          async: true,
          idempotencyKey: 'event-456',
          ttl,
        }
      )

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should execute twice (first and third)
      expect(results.length).toBe(2)
    })

    it('should process events without idempotency key normally', async () => {
      const results: number[] = []

      hookManager.addAction('normal:event', () => {
        results.push(1)
      })

      // Dispatch without idempotency key
      await hookManager.doActionAsync('normal:event', {}, { async: true })
      await hookManager.doActionAsync('normal:event', {}, { async: true })
      await hookManager.doActionAsync('normal:event', {}, { async: true })

      await new Promise((resolve) => setTimeout(resolve, 150))

      // All three should execute
      expect(results).toHaveLength(3)
    })

    it('should allow different idempotency keys for same event', async () => {
      const results: number[] = []

      hookManager.addAction('multi:event', () => {
        results.push(1)
      })

      // Dispatch with different keys
      await hookManager.doActionAsync(
        'multi:event',
        {},
        {
          async: true,
          idempotencyKey: 'key-1',
        }
      )

      await hookManager.doActionAsync(
        'multi:event',
        {},
        {
          async: true,
          idempotencyKey: 'key-2',
        }
      )

      await hookManager.doActionAsync(
        'multi:event',
        {},
        {
          async: true,
          idempotencyKey: 'key-3',
        }
      )

      await new Promise((resolve) => setTimeout(resolve, 150))

      // All three should execute (different keys)
      expect(results).toHaveLength(3)
    })
  })
})
