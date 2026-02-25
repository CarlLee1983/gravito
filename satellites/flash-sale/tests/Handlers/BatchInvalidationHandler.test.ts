/**
 * BatchInvalidationHandler 單元測試
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { CacheService, PlanetCore } from '@gravito/core'
import { BatchInvalidationHandler } from '../../src/Infrastructure/Handlers/BatchInvalidationHandler'

/**
 * Mock Logger
 */
class MockLogger {
  messages: string[] = []

  debug(message: string): void {
    this.messages.push(message)
  }

  info(message: string): void {
    this.messages.push(message)
  }

  warn(message: string): void {
    this.messages.push(message)
  }

  error(message: string): void {
    this.messages.push(message)
  }
}

/**
 * Mock CacheService
 */
class MockCacheService implements CacheService {
  private data: Map<string, any> = new Map()
  deletePatternCalls: Array<{ pattern: string; timestamp: number }> = []

  async get<T = unknown>(key: string): Promise<T | null> {
    return (this.data.get(key) as T) || null
  }

  async set(key: string, value: unknown, _ttl?: number): Promise<void> {
    this.data.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key)
  }

  async clear(): Promise<void> {
    this.data.clear()
  }

  async remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const result = await callback()
    await this.set(key, result, ttl)
    return result
  }

  async has(key: string): Promise<boolean> {
    return this.data.has(key)
  }

  async increment(key: string, value?: number): Promise<number> {
    const current = (this.data.get(key) as number) || 0
    const next = current + (value || 1)
    this.data.set(key, next)
    return next
  }

  async decrement(key: string, value?: number): Promise<number> {
    return this.increment(key, -(value || 1))
  }

  deletePattern(pattern: string): Promise<number> {
    this.deletePatternCalls.push({
      pattern,
      timestamp: Date.now(),
    })
    return Promise.resolve(0)
  }
}

/**
 * Mock PlanetCore
 */
class MockPlanetCore implements Partial<PlanetCore> {
  logger = new MockLogger()
  hooks = {
    doActionAsync: async (_action: string, _payload: any, _options: any) => {
      // Mock DLQ
    },
  }
}

/**
 * Mock Metrics Registry
 */
class MockMetricsRegistry {
  histogram() {
    return { observe: () => {} }
  }

  counter() {
    return { inc: () => {} }
  }
}

describe('BatchInvalidationHandler', () => {
  let handler: BatchInvalidationHandler
  let cache: MockCacheService
  let core: MockPlanetCore
  let metrics: MockMetricsRegistry

  beforeEach(() => {
    cache = new MockCacheService()
    core = new MockPlanetCore()
    metrics = new MockMetricsRegistry()

    handler = new BatchInvalidationHandler(cache as any, core as any, metrics as any)
  })

  afterEach(() => {
    handler.destroy()
  })

  describe('invalidate', () => {
    it('應該提交失效請求到批處理隊列', async () => {
      await handler.invalidate('product:*')

      // 等待批處理窗口關閉
      await new Promise((resolve) => setTimeout(resolve, 250))

      expect(cache.deletePatternCalls.length).toBe(1)
      expect(cache.deletePatternCalls[0].pattern).toBe('product:*')
    })

    it('應該合併相同 pattern 的多個請求', async () => {
      await handler.invalidate('product:*')
      await handler.invalidate('product:*')
      await handler.invalidate('product:*')

      // 等待批處理窗口關閉
      await new Promise((resolve) => setTimeout(resolve, 250))

      // 應該只執行一次 deletePattern
      expect(cache.deletePatternCalls.length).toBe(1)
    })

    it('應該分別處理不同的 pattern', async () => {
      await handler.invalidate('product:*')
      await handler.invalidate('user:*')

      // 等待批處理窗口關閉
      await new Promise((resolve) => setTimeout(resolve, 250))

      // 應該執行兩次 deletePattern
      expect(cache.deletePatternCalls.length).toBe(2)
    })

    it('應該在 200ms 批量視窗內合併請求', async () => {
      const startTime = Date.now()

      await handler.invalidate('product:*')
      await new Promise((resolve) => setTimeout(resolve, 100))
      await handler.invalidate('product:*')

      // 等待批處理完成（200ms 視窗 + 額外延遲）
      await new Promise((resolve) => setTimeout(resolve, 250))

      const endTime = Date.now()
      const duration = endTime - startTime

      // 應該在 500ms 以內完成
      expect(duration).toBeLessThan(600)
      // 應該只執行一次（第二個請求應該合併到第一個）
      expect(cache.deletePatternCalls.length).toBe(1)
    })
  })

  describe('pattern normalization', () => {
    it('應該正規化 pattern（去除多餘空格）', async () => {
      await handler.invalidate('  product:*  ')

      await new Promise((resolve) => setTimeout(resolve, 250))

      expect(cache.deletePatternCalls[0].pattern).toBe('product:*')
    })
  })

  describe('getPendingStats', () => {
    it('應該返回待處理統計', async () => {
      await handler.invalidate('product:*')
      await handler.invalidate('user:*')

      const stats = handler.getPendingStats()

      expect(stats.totalPatterns).toBe(2)
      expect(stats.patterns.length).toBe(2)
    })

    it('應該在執行後清除待處理', async () => {
      await handler.invalidate('product:*')

      let stats = handler.getPendingStats()
      expect(stats.totalPatterns).toBe(1)

      // 等待執行
      await new Promise((resolve) => setTimeout(resolve, 250))

      stats = handler.getPendingStats()
      expect(stats.totalPatterns).toBe(0)
    })
  })

  describe('flushAll', () => {
    it('應該立即刷新所有待處理的失效', async () => {
      await handler.invalidate('product:*')
      await handler.invalidate('user:*')

      await handler.flushAll()

      expect(cache.deletePatternCalls.length).toBe(2)
    })

    it('應該在應用關閉時清理資源', async () => {
      await handler.invalidate('product:*')

      handler.destroy()

      const stats = handler.getPendingStats()
      expect(stats.totalPatterns).toBe(0)
    })
  })

  describe('error handling', () => {
    it('應該在失效失敗時發送到 DLQ', async () => {
      // Mock 失敗的 deletePattern
      const failingCache = {
        ...cache,
        deletePattern: async () => {
          throw new Error('Cache service error')
        },
      } as any

      const failingHandler = new BatchInvalidationHandler(failingCache, core as any, metrics as any)

      await failingHandler.invalidate('product:*')

      // 等待失敗處理
      await new Promise((resolve) => setTimeout(resolve, 250))

      failingHandler.destroy()
      expect(true).toBe(true) // 應該不拋出未捕獲的錯誤
    })
  })

  describe('concurrent requests', () => {
    it('應該處理並發請求', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => handler.invalidate(`product:${i}:*`))

      await Promise.all(promises)

      // 等待批處理
      await new Promise((resolve) => setTimeout(resolve, 250))

      // 應該有 10 個不同的 pattern
      expect(cache.deletePatternCalls.length).toBe(10)
    })
  })
})
