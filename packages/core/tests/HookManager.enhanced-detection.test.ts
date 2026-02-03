import { beforeEach, describe, expect, it } from 'bun:test'
import { HookManager, type HookManagerConfig, type ListenerOptions } from '../src/HookManager'

/**
 * 輔助函數：延遲指定毫秒數
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 空操作函數（用於測試）
 */
function noop() {
  // Intentionally empty for testing
}

/**
 * 異步空操作函數（用於測試）
 */
async function asyncNoop() {
  // Intentionally empty async for testing
}

describe('HookManager - Enhanced Detection (Task 1.1.3.2)', () => {
  let hookManager: HookManager

  beforeEach(() => {
    hookManager = new HookManager()
  })

  describe('isAsyncListener 邊界案例', () => {
    it('should detect async arrow function', () => {
      const asyncArrow = async () => {
        await delay(0)
      }

      expect(hookManager.isAsyncListener(asyncArrow)).toBe(true)
    })

    it('should detect async function expression', () => {
      const asyncExpr = async function asyncHandler() {
        await delay(0)
      }

      expect(hookManager.isAsyncListener(asyncExpr)).toBe(true)
    })

    it('should return false for sync function', () => {
      const syncFn = () => {
        // sync function body
        return undefined
      }

      expect(hookManager.isAsyncListener(syncFn)).toBe(false)
    })

    it('should return false for sync function expression', () => {
      const syncExpr = function syncHandler() {
        // sync function body
        return undefined
      }

      expect(hookManager.isAsyncListener(syncExpr)).toBe(false)
    })

    it('should detect function that returns Promise (runtime detection)', async () => {
      // 這個函數不是 async 關鍵字定義的，但返回 Promise
      const promiseReturningFn = () => {
        return new Promise<void>((resolve) => {
          setTimeout(resolve, 10)
        })
      }

      // 靜態檢測應該返回 false（因為不是 AsyncFunction）
      // 但我們希望增強的實現能夠在運行時檢測到
      const staticResult = hookManager.isAsyncListener(promiseReturningFn)
      expect(staticResult).toBe(false) // 靜態檢測無法識別

      // 使用 isAsyncListenerRuntime 進行運行時檢測
      const runtimeResult = await hookManager.isAsyncListenerRuntime(promiseReturningFn, {})
      expect(runtimeResult).toBe(true)
    })

    it('should cache detection results', () => {
      const asyncFn = async () => {
        await delay(0)
      }

      // 第一次調用
      const result1 = hookManager.isAsyncListener(asyncFn)
      // 第二次調用（應該從快取返回）
      const result2 = hookManager.isAsyncListener(asyncFn)

      expect(result1).toBe(true)
      expect(result2).toBe(true)

      // 驗證快取被使用（透過 getCacheSize）
      expect(hookManager.getAsyncDetectionCacheSize()).toBeGreaterThan(0)
    })

    it('should handle bound functions', () => {
      const obj = {
        async asyncMethod() {
          await delay(0)
        },
        syncMethod() {
          // sync method body
          return undefined
        },
      }

      const boundAsync = obj.asyncMethod.bind(obj)
      const boundSync = obj.syncMethod.bind(obj)

      // 綁定函數的檢測可能需要特殊處理
      expect(hookManager.isAsyncListener(boundAsync)).toBe(true)
      expect(hookManager.isAsyncListener(boundSync)).toBe(false)
    })
  })

  describe('ListenerOptions.type 功能', () => {
    it('should explicitly mark sync function as async with type option', async () => {
      const config: HookManagerConfig = {
        migrationMode: 'hybrid',
      }
      const manager = new HookManager(config)

      const results: string[] = []

      // 同步函數，但標記為 async
      const syncFn = () => {
        results.push('marked-as-async')
      }

      const options: ListenerOptions = {
        type: 'async',
      }

      manager.addAction('test:explicit-async', syncFn, options)

      // 應該被視為 async
      const mode = manager.detectMode('test:explicit-async')
      expect(mode).toBe('async')
    })

    it('should explicitly mark async function as sync with type option', async () => {
      const config: HookManagerConfig = {
        migrationMode: 'hybrid',
      }
      const manager = new HookManager(config)

      const results: string[] = []

      // 異步函數，但標記為 sync
      const asyncFn = async () => {
        await delay(10)
        results.push('marked-as-sync')
      }

      const options: ListenerOptions = {
        type: 'sync',
      }

      manager.addAction('test:explicit-sync', asyncFn, options)

      // 應該被視為 sync
      const mode = manager.detectMode('test:explicit-sync')
      expect(mode).toBe('sync')
    })

    it('should use auto detection with type: auto', async () => {
      const config: HookManagerConfig = {
        migrationMode: 'hybrid',
      }
      const manager = new HookManager(config)

      const asyncFn = async () => {
        await delay(0)
      }

      const options: ListenerOptions = {
        type: 'auto',
      }

      manager.addAction('test:auto-detect', asyncFn, options)

      // 應該自動檢測為 async
      const mode = manager.detectMode('test:auto-detect')
      expect(mode).toBe('async')
    })

    it('should default to auto detection when no type specified', async () => {
      const config: HookManagerConfig = {
        migrationMode: 'hybrid',
      }
      const manager = new HookManager(config)

      const asyncFn = async () => {
        await delay(0)
      }

      // 不指定 type
      manager.addAction('test:no-type', asyncFn)

      const mode = manager.detectMode('test:no-type')
      expect(mode).toBe('async')
    })

    it('should support mixed explicit and auto-detected listeners', async () => {
      const config: HookManagerConfig = {
        migrationMode: 'hybrid',
      }
      const manager = new HookManager(config)

      // 同步函數，明確標記為 sync
      manager.addAction('test:mixed', noop, { type: 'sync' })

      // 同步函數，明確標記為 async
      manager.addAction('test:mixed', noop, { type: 'async' })

      // 有一個 async 標記，所以應該是 async
      const mode = manager.detectMode('test:mixed')
      expect(mode).toBe('async')
    })
  })

  describe('ListenerOptions 與 CircuitBreaker 整合', () => {
    it('should support both type and circuitBreaker options', async () => {
      const config: HookManagerConfig = {
        migrationMode: 'hybrid',
      }
      const manager = new HookManager(config)

      const results: string[] = []

      const options: ListenerOptions = {
        type: 'async',
        circuitBreaker: {
          failureThreshold: 3,
          recoveryTimeout: 1000,
        },
      }

      manager.addAction(
        'test:combined',
        () => {
          results.push('combined')
        },
        options
      )

      const mode = manager.detectMode('test:combined')
      expect(mode).toBe('async')
    })
  })

  describe('getListenerInfo 公開 API', () => {
    it('should return listener info including type override', () => {
      const config: HookManagerConfig = {
        migrationMode: 'hybrid',
      }
      const manager = new HookManager(config)

      const syncFn = noop
      const asyncFn = asyncNoop

      manager.addAction('test:info', syncFn, { type: 'async' })
      manager.addAction('test:info', asyncFn)

      const info = manager.getListenerInfo('test:info')

      expect(info.length).toBe(2)
      expect(info[0].typeOverride).toBe('async')
      expect(info[0].isAsync).toBe(true) // 因為有 type override
      expect(info[1].typeOverride).toBeUndefined()
      expect(info[1].isAsync).toBe(true) // 因為是 async function
    })
  })

  describe('hasAsyncListeners 公開 API', () => {
    it('should return true if any listener is async', () => {
      const config: HookManagerConfig = {
        migrationMode: 'hybrid',
      }
      const manager = new HookManager(config)

      manager.addAction('test:has-async', noop)
      manager.addAction('test:has-async', asyncNoop)

      expect(manager.hasAsyncListeners('test:has-async')).toBe(true)
    })

    it('should return false if no listeners are async', () => {
      const manager = new HookManager()

      manager.addAction('test:no-async', noop)
      manager.addAction('test:no-async', noop)

      expect(manager.hasAsyncListeners('test:no-async')).toBe(false)
    })

    it('should respect type override', () => {
      const config: HookManagerConfig = {
        migrationMode: 'hybrid',
      }
      const manager = new HookManager(config)

      // 只有同步函數，但標記為 async
      manager.addAction('test:override', noop, { type: 'async' })

      expect(manager.hasAsyncListeners('test:override')).toBe(true)
    })
  })

  describe('向後兼容性', () => {
    it('should maintain backward compatibility with existing addAction API', async () => {
      const results: string[] = []

      // 舊 API：不傳 options
      hookManager.addAction('test:legacy', () => {
        results.push('legacy')
      })

      await hookManager.doAction('test:legacy', {})

      expect(results).toEqual(['legacy'])
    })

    it('should maintain backward compatibility with circuitBreaker-only options', async () => {
      const results: string[] = []

      // 舊 API：只傳 circuitBreaker
      hookManager.addAction(
        'test:cb-only',
        () => {
          results.push('cb-only')
        },
        {
          circuitBreaker: {
            failureThreshold: 3,
            recoveryTimeout: 1000,
          },
        }
      )

      await hookManager.doAction('test:cb-only', {})

      expect(results).toEqual(['cb-only'])
    })

    it('should work with all existing HookManagerConfig options', async () => {
      const config: HookManagerConfig = {
        asyncByDefault: false,
        migrationMode: 'hybrid',
        showDeprecationWarnings: false,
        enableDLQ: true,
      }
      const manager = new HookManager(config)

      const results: string[] = []

      manager.addAction('test:full-config', async () => {
        results.push('full-config')
      })

      await manager.doAction('test:full-config', {})
      await delay(100)

      expect(results).toEqual(['full-config'])
    })
  })

  describe('邊界案例和錯誤處理', () => {
    it('should handle undefined options gracefully', async () => {
      hookManager.addAction('test:undefined-options', noop, undefined)

      await expect(async () => {
        await hookManager.doAction('test:undefined-options', {})
      }).not.toThrow()
    })

    it('should handle empty options object', async () => {
      hookManager.addAction('test:empty-options', noop, {})

      await expect(async () => {
        await hookManager.doAction('test:empty-options', {})
      }).not.toThrow()
    })

    it('should handle invalid type value gracefully', async () => {
      // TypeScript 會在編譯時捕獲這個，但運行時應該優雅處理
      const invalidOptions = { type: 'invalid' as 'sync' | 'async' | 'auto' }

      hookManager.addAction('test:invalid-type', noop, invalidOptions)

      // 應該回退到 auto 檢測
      await expect(async () => {
        await hookManager.doAction('test:invalid-type', {})
      }).not.toThrow()
    })

    it('should handle listeners that throw errors', async () => {
      const results: string[] = []

      hookManager.addAction(
        'test:error',
        () => {
          throw new Error('Test error')
        },
        { type: 'sync' }
      )

      hookManager.addAction(
        'test:error',
        () => {
          results.push('after-error')
        },
        { type: 'sync' }
      )

      await hookManager.doAction('test:error', {})

      // 錯誤應該被捕獲，下一個監聽器應該執行
      expect(results).toEqual(['after-error'])
    })

    it('should handle async listeners that reject', async () => {
      const results: string[] = []

      hookManager.addAction('test:async-error', async () => {
        throw new Error('Async test error')
      })

      hookManager.addAction('test:async-error', async () => {
        results.push('after-async-error')
      })

      await hookManager.doAction('test:async-error', {})
      await delay(100)

      expect(results).toContain('after-async-error')
    })
  })

  describe('效能測試', () => {
    it('should handle large number of listeners efficiently', async () => {
      const config: HookManagerConfig = {
        migrationMode: 'sync',
      }
      const manager = new HookManager(config)

      let callCount = 0

      // 添加 100 個監聽器
      for (let i = 0; i < 100; i++) {
        manager.addAction('test:many-listeners', () => {
          callCount++
        })
      }

      const startTime = Date.now()
      await manager.doAction('test:many-listeners', {})
      const duration = Date.now() - startTime

      expect(callCount).toBe(100)
      // 應該在合理時間內完成（< 100ms）
      expect(duration).toBeLessThan(100)
    })

    it('should cache detection results for better performance', () => {
      const manager = new HookManager()

      const listeners: Array<() => void> = []

      // 創建 50 個相同的監聯器引用
      for (let i = 0; i < 50; i++) {
        const fn = asyncNoop
        listeners.push(fn)
        manager.addAction('test:cache-perf', fn)
      }

      // 多次檢測
      for (let i = 0; i < 100; i++) {
        for (const fn of listeners) {
          manager.isAsyncListener(fn)
        }
      }

      // 快取應該有效（只有一個唯一函數，因為都是同一個 asyncNoop 引用）
      const cacheSize = manager.getAsyncDetectionCacheSize()
      expect(cacheSize).toBe(1)
    })
  })

  describe('清除快取 API', () => {
    it('should clear async detection cache', () => {
      const manager = new HookManager()

      manager.isAsyncListener(asyncNoop)

      expect(manager.getAsyncDetectionCacheSize()).toBe(1)

      manager.clearAsyncDetectionCache()

      expect(manager.getAsyncDetectionCacheSize()).toBe(0)
    })
  })
})
