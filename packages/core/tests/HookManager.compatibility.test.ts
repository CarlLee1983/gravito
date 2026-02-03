import { beforeEach, describe, expect, it } from 'bun:test'
import { HookManager, type HookManagerConfig } from '../src/HookManager'

/**
 * Helper function to introduce delays in tests
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('HookManager - Backward Compatibility', () => {
  let hookManager: HookManager

  beforeEach(() => {
    hookManager = new HookManager()
  })

  describe('Sync listeners (backward compatible)', () => {
    it('should execute sync listener with legacy API', async () => {
      const results: string[] = []

      hookManager.addAction('test:event', () => {
        results.push('sync')
      })

      // Use legacy API (sync)
      await hookManager.doAction('test:event', {})

      expect(results).toEqual(['sync'])
    })

    it('should execute multiple sync listeners in order', async () => {
      const results: string[] = []

      hookManager.addAction('test:event', () => results.push('listener1'))
      hookManager.addAction('test:event', () => results.push('listener2'))
      hookManager.addAction('test:event', () => results.push('listener3'))

      await hookManager.doAction('test:event', {})

      expect(results).toEqual(['listener1', 'listener2', 'listener3'])
    })

    it('should preserve sync listener execution order across multiple calls', async () => {
      const results: string[] = []

      hookManager.addAction('test:multi', () => results.push('a'))
      hookManager.addAction('test:multi', () => results.push('b'))

      await hookManager.doAction('test:multi', {})
      await hookManager.doAction('test:multi', {})

      expect(results).toEqual(['a', 'b', 'a', 'b'])
    })

    it('should handle sync listeners with payload', async () => {
      const results: Record<string, unknown>[] = []

      hookManager.addAction('test:payload', (payload) => {
        results.push(payload)
      })

      const testPayload = { id: 1, name: 'test' }
      await hookManager.doAction('test:payload', testPayload)

      expect(results).toEqual([testPayload])
    })

    it('should handle sync listener errors gracefully', async () => {
      const results: string[] = []

      hookManager.addAction('test:error', () => {
        throw new Error('Expected error')
      })

      hookManager.addAction('test:error', () => {
        results.push('should execute after error')
      })

      // Should not throw, errors should be caught
      await expect(async () => {
        await hookManager.doAction('test:error', {})
      }).not.toThrow()

      // Next listener should still execute
      expect(results).toEqual(['should execute after error'])
    })
  })

  describe('Async listeners (auto-detection)', () => {
    it('should execute async listener with auto-detection', async () => {
      const results: string[] = []

      hookManager.addAction('test:async', async () => {
        await delay(50)
        results.push('async')
      })

      // Should auto-detect and handle async listener
      await hookManager.doAction('test:async', {})

      // Wait for async completion
      await delay(100)
      expect(results).toEqual(['async'])
    })

    it('should auto-detect when async listener is present (hybrid mode)', async () => {
      const config: HookManagerConfig = {
        migrationMode: 'hybrid',
      }
      const manager = new HookManager(config)

      manager.addAction('test:event', () => 'sync')
      manager.addAction('test:event', async () => {
        await delay(0)
        return 'async'
      })

      // Should use async dispatch due to async listener
      const startTime = Date.now()
      await manager.doAction('test:event', {})
      const duration = Date.now() - startTime

      // Should return quickly (async dispatch)
      expect(duration).toBeLessThan(100)
    })

    it('should execute multiple async listeners', async () => {
      const results: string[] = []

      hookManager.addAction('test:multi', async () => {
        await delay(10)
        results.push('async1')
      })

      hookManager.addAction('test:multi', async () => {
        await delay(10)
        results.push('async2')
      })

      await hookManager.doAction('test:multi', {})

      // Wait for async completion
      await delay(100)
      expect(results.length).toBe(2)
    })

    it('should handle async listener errors', async () => {
      const results: string[] = []

      hookManager.addAction('test:async-error', async () => {
        throw new Error('Async error')
      })

      hookManager.addAction('test:async-error', async () => {
        results.push('should execute after error')
      })

      // Should not throw
      await expect(async () => {
        await hookManager.doAction('test:async-error', {})
      }).not.toThrow()

      await delay(100)
      expect(results).toContain('should execute after error')
    })
  })

  describe('Mixed listeners (automatic detection)', () => {
    it('should use async mode when listener is async', async () => {
      const results: string[] = []

      hookManager.addAction('test:mixed', () => {
        results.push('sync')
      })

      hookManager.addAction('test:mixed', async () => {
        await delay(20)
        results.push('async')
      })

      const startTime = Date.now()
      await hookManager.doAction('test:mixed', {})
      const duration = Date.now() - startTime

      // Should return quickly (async dispatch)
      expect(duration).toBeLessThan(100)

      // Wait for completion
      await delay(100)
      expect(results.length).toBe(2)
    })

    it('should detect mixed listeners in hybrid mode', async () => {
      const config: HookManagerConfig = {
        migrationMode: 'hybrid',
      }
      const manager = new HookManager(config)

      const results: string[] = []

      manager.addAction('test:mixed', () => {
        results.push('sync-first')
      })

      manager.addAction('test:mixed', async () => {
        await delay(10)
        results.push('async')
      })

      await manager.doAction('test:mixed', {})
      await delay(100)

      expect(results.length).toBe(2)
    })
  })

  describe('Explicit async dispatch options', () => {
    it('should work with explicit async option', async () => {
      const results: string[] = []

      hookManager.addAction('test:explicit', (payload) => {
        results.push(payload)
      })

      await hookManager.doActionAsync('test:explicit', 'explicit-async', {
        priority: 'normal',
      })

      // Wait for async completion
      await delay(100)
      expect(results).toEqual(['explicit-async'])
    })

    it('should force sync dispatch with explicit async=false', async () => {
      const results: string[] = []

      // Register async listener
      hookManager.addAction('test:force-sync', async () => {
        await delay(50)
        results.push('async')
      })

      // But force sync dispatch
      await hookManager.doAction('test:force-sync', {}, { async: false })

      // Should complete immediately since we forced sync
      expect(results).toEqual(['async'])
    })

    it('should force async dispatch with explicit async=true', async () => {
      const results: string[] = []

      // Synchronous listener
      hookManager.addAction('test:force-async', () => {
        results.push('forced-async')
      })

      // But force async dispatch
      await hookManager.doAction('test:force-async', {}, { async: true })

      // Wait for async completion
      await delay(100)
      expect(results).toEqual(['forced-async'])
    })
  })

  describe('Priority and ordering guarantees', () => {
    it('should maintain priority ordering', async () => {
      const config: HookManagerConfig = {
        migrationMode: 'async',
      }
      const manager = new HookManager(config)

      const results: string[] = []

      manager.addAction('test:order', () => {
        results.push('listener')
      })

      // Dispatch with different priorities
      await manager.doActionAsync('test:order', 'low', {
        priority: 'low',
      })

      await manager.doActionAsync('test:order', 'high', {
        priority: 'high',
      })

      // Wait for processing
      await delay(200)

      // High priority should be processed first
      expect(results[0]).toBe('listener')
    })

    it('should maintain partition order for same key', async () => {
      const config: HookManagerConfig = {
        migrationMode: 'async',
      }
      const manager = new HookManager(config)

      const results: number[] = []

      manager.addAction('order:created', (payload) => {
        results.push(payload.seq)
      })

      // Send 5 events with same partition key
      for (let i = 0; i < 5; i++) {
        await manager.doActionAsync(
          'order:created',
          { orderId: 1, seq: i },
          {
            ordering: 'partition',
            partitionKey: '1',
            priority: 'high',
          }
        )
      }

      // Wait for processing
      await delay(500)

      // Should maintain order
      expect(results).toEqual([0, 1, 2, 3, 4])
    })
  })

  describe('Feature flag control', () => {
    it('should respect asyncByDefault flag', async () => {
      const config: HookManagerConfig = {
        asyncByDefault: true,
      }
      const manager = new HookManager(config)

      const results: string[] = []

      // Sync listener
      manager.addAction('test:async-by-default', () => {
        results.push('called')
      })

      const startTime = Date.now()
      await manager.doAction('test:async-by-default', {})
      const duration = Date.now() - startTime

      // Should use async dispatch (returns quickly)
      expect(duration).toBeLessThan(100)

      // Wait for processing
      await delay(100)
      expect(results).toEqual(['called'])
    })

    it('should support migration mode: sync (legacy)', async () => {
      const config: HookManagerConfig = {
        migrationMode: 'sync',
        showDeprecationWarnings: false,
      }
      const manager = new HookManager(config)

      const results: string[] = []

      manager.addAction('test:legacy', async () => {
        await delay(10)
        results.push('legacy')
      })

      // Even with async listener, should use sync dispatch
      await manager.doAction('test:legacy', {})

      // Should complete synchronously
      expect(results).toEqual(['legacy'])
    })

    it('should support migration mode: hybrid', async () => {
      const config: HookManagerConfig = {
        migrationMode: 'hybrid',
        showDeprecationWarnings: true,
      }
      const manager = new HookManager(config)

      const results: string[] = []

      manager.addAction('test:hybrid', () => {
        results.push('hybrid')
      })

      // Should auto-detect and use sync dispatch
      await manager.doAction('test:hybrid', {})

      expect(results).toEqual(['hybrid'])
    })

    it('should support migration mode: async (future mode)', async () => {
      const config: HookManagerConfig = {
        migrationMode: 'async',
      }
      const manager = new HookManager(config)

      const results: string[] = []

      manager.addAction('test:future', () => {
        results.push('future')
      })

      const startTime = Date.now()
      await manager.doAction('test:future', {})
      const duration = Date.now() - startTime

      // Should use async dispatch
      expect(duration).toBeLessThan(100)

      // Wait for processing
      await delay(100)
      expect(results).toEqual(['future'])
    })
  })

  describe('Idempotency support', () => {
    it('should prevent duplicate event processing with idempotency key', async () => {
      const results: string[] = []

      hookManager.addAction('test:idempotent', () => {
        results.push('processed')
      })

      const idempotencyKey = 'unique-key-123'

      // First dispatch
      await hookManager.doActionAsync(
        'test:idempotent',
        {},
        {
          idempotencyKey,
          ttl: 1000,
        }
      )

      await delay(100)

      // Second dispatch with same key (should be skipped)
      await hookManager.doActionAsync(
        'test:idempotent',
        {},
        {
          idempotencyKey,
          ttl: 1000,
        }
      )

      await delay(100)

      // Should only process once
      expect(results).toEqual(['processed'])
    })
  })

  describe('Backward compatibility edge cases', () => {
    it('should handle empty action handlers', async () => {
      // Should not throw
      await expect(async () => {
        await hookManager.doAction('non:existent', {})
      }).not.toThrow()
    })

    it('should handle handlers added after first dispatch', async () => {
      const results: string[] = []

      hookManager.addAction('test:dynamic', () => {
        results.push('first')
      })

      await hookManager.doAction('test:dynamic', {})
      expect(results).toEqual(['first'])

      // Add handler after first dispatch
      hookManager.addAction('test:dynamic', () => {
        results.push('second')
      })

      await hookManager.doAction('test:dynamic', {})
      expect(results).toEqual(['first', 'first', 'second'])
    })

    it('should handle rapid successive dispatches', async () => {
      const results: string[] = []

      hookManager.addAction('test:rapid', () => {
        results.push('called')
      })

      // Dispatch multiple times rapidly
      await Promise.all([
        hookManager.doAction('test:rapid', {}),
        hookManager.doAction('test:rapid', {}),
        hookManager.doAction('test:rapid', {}),
      ])

      expect(results.length).toBe(3)
    })

    it('should handle listeners that return values', async () => {
      hookManager.addAction('test:return', () => {
        return 'should be ignored'
      })

      // Should not throw
      await expect(async () => {
        await hookManager.doAction('test:return', {})
      }).not.toThrow()
    })
  })

  describe('Public API: detectMode and isAsyncListener', () => {
    it('should detect sync mode correctly', () => {
      hookManager.addAction('test:detect-sync', () => {
        // sync listener
      })

      const mode = hookManager.detectMode('test:detect-sync')
      expect(mode).toBe('sync')
    })

    it('should detect async mode correctly with hybrid mode', () => {
      const config: HookManagerConfig = {
        migrationMode: 'hybrid',
      }
      const manager = new HookManager(config)

      manager.addAction('test:detect-async', async () => {
        // async listener
      })

      const mode = manager.detectMode('test:detect-async')
      expect(mode).toBe('async')
    })

    it('should detect async mode with mixed listeners', () => {
      const config: HookManagerConfig = {
        migrationMode: 'hybrid',
      }
      const manager = new HookManager(config)

      manager.addAction('test:detect-mixed', () => {
        // sync listener
      })

      manager.addAction('test:detect-mixed', async () => {
        // async listener
      })

      const mode = manager.detectMode('test:detect-mixed')
      expect(mode).toBe('async')
    })

    it('should identify async listeners', () => {
      const asyncFn = async () => {
        await delay(0)
      }

      const syncFn = () => {
        // sync
      }

      expect(hookManager.isAsyncListener(asyncFn)).toBe(true)
      expect(hookManager.isAsyncListener(syncFn)).toBe(false)
    })

    it('should respect asyncByDefault in detectMode (hybrid mode)', () => {
      const config: HookManagerConfig = {
        migrationMode: 'hybrid',
        asyncByDefault: true,
      }
      const manager = new HookManager(config)

      manager.addAction('test:default-async', () => {
        // sync listener, but asyncByDefault is true in hybrid mode
      })

      const mode = manager.detectMode('test:default-async')
      expect(mode).toBe('async')
    })

    it('should ignore asyncByDefault in sync mode', () => {
      const config: HookManagerConfig = {
        migrationMode: 'sync',
        asyncByDefault: true,
      }
      const manager = new HookManager(config)

      manager.addAction('test:sync-default', () => {
        // sync listener, asyncByDefault is ignored in sync mode
      })

      const mode = manager.detectMode('test:sync-default')
      expect(mode).toBe('sync')
    })

    it('should respect migrationMode in detectMode', () => {
      const syncConfig: HookManagerConfig = {
        migrationMode: 'sync',
      }
      const syncManager = new HookManager(syncConfig)

      syncManager.addAction('test:sync-mode', async () => {
        // async listener, but migrationMode is 'sync'
      })

      expect(syncManager.detectMode('test:sync-mode')).toBe('sync')

      const asyncConfig: HookManagerConfig = {
        migrationMode: 'async',
      }
      const asyncManager = new HookManager(asyncConfig)

      asyncManager.addAction('test:async-mode', () => {
        // sync listener, but migrationMode is 'async'
      })

      expect(asyncManager.detectMode('test:async-mode')).toBe('async')
    })
  })

  describe('Config priority precedence', () => {
    it('should prioritize explicit option > config > auto-detect', async () => {
      const config: HookManagerConfig = {
        migrationMode: 'sync', // Force sync
        asyncByDefault: false,
      }
      const manager = new HookManager(config)

      const results: string[] = []

      // Async listener
      manager.addAction('test:precedence', async () => {
        await delay(10)
        results.push('async')
      })

      // But explicitly request async
      await manager.doAction('test:precedence', {}, { async: true })

      // Wait for async completion
      await delay(100)
      expect(results).toEqual(['async'])
    })

    it('should respect asyncByDefault when no explicit option', async () => {
      const config: HookManagerConfig = {
        asyncByDefault: true,
      }
      const manager = new HookManager(config)

      const results: string[] = []

      // Sync listener
      manager.addAction('test:default', () => {
        results.push('sync')
      })

      const startTime = Date.now()
      await manager.doAction('test:default', {})
      const duration = Date.now() - startTime

      // Should use async dispatch
      expect(duration).toBeLessThan(100)

      // Wait for processing
      await delay(100)
      expect(results).toEqual(['sync'])
    })
  })
})
