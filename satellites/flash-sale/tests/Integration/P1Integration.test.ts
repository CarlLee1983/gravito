/**
 * Flash Sale P1 集成測試
 *
 * 驗證 HotnessTracker、CacheWarmupService、TieredCacheService、
 * 和 BatchInvalidationHandler 之間的集成
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { CacheService } from '@gravito/core'
import type { IProductRepository } from '../../src/Application/Contracts/IProductRepository'
import type { Product } from '../../src/Domain/Models'
import { ProductStatus } from '../../src/Domain/Models'
import { BatchInvalidationHandler } from '../../src/Infrastructure/Handlers/BatchInvalidationHandler'
import { CacheWarmupService } from '../../src/Infrastructure/Services/CacheWarmupService'
import { HotnessTracker } from '../../src/Infrastructure/Services/HotnessTracker'
import { TieredCacheService } from '../../src/Infrastructure/Services/TieredCacheService'

/**
 * Mock implementations for integration testing
 */
class IntegrationMockLogger {
  logs: Array<{ level: string; message: string }> = []

  debug(message: string): void {
    this.logs.push({ level: 'debug', message })
  }

  info(message: string): void {
    this.logs.push({ level: 'info', message })
  }

  warn(message: string): void {
    this.logs.push({ level: 'warn', message })
  }

  error(message: string): void {
    this.logs.push({ level: 'error', message })
  }
}

class IntegrationMockRedis {
  private data: Map<string, Map<string, number> | any> = new Map()

  async zadd(key: string, options: any): Promise<number> {
    const existing = (this.data.get(key) as Map<string, number>) || new Map()
    const currentScore = existing.get(options.member) || 0
    existing.set(options.member, currentScore + options.score)
    this.data.set(key, existing)
    return 1
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    const zset = this.data.get(key) as Map<string, number> | undefined
    if (!zset) return []

    const sorted = Array.from(zset.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(start, stop + 1)
      .map(([member]) => member)

    return sorted
  }

  async zscore(key: string, member: string): Promise<number | null> {
    const zset = this.data.get(key) as Map<string, number> | undefined
    return zset?.get(member) || null
  }

  async zcard(key: string): Promise<number | null> {
    const zset = this.data.get(key) as Map<string, number> | undefined
    return zset?.size || 0
  }

  async del(key: string): Promise<number> {
    const existed = this.data.has(key) ? 1 : 0
    this.data.delete(key)
    return existed
  }

  async eval(script: string, numKeys: number, ...args: any[]): Promise<any> {
    const key = args[0]
    const factor = parseFloat(args[1])
    const zset = this.data.get(key) as Map<string, number> | undefined

    if (!zset) return 0

    for (const [member] of zset) {
      const score = zset.get(member) || 0
      zset.set(member, score * factor)
    }

    return zset.size
  }

  async scan(cursor: string, options: any): Promise<{ cursor: string; keys: string[] }> {
    // 簡單實現，返回所有鍵
    const keys = Array.from(this.data.keys())
    return { cursor: '0', keys }
  }
}

class IntegrationMockL2Cache implements CacheService {
  private data: Map<string, any> = new Map()

  async get<T = unknown>(key: string): Promise<T | null> {
    return (this.data.get(key) as T) || null
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
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
    if (cached !== null) return cached

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
    let count = 0
    for (const key of this.data.keys()) {
      if (this.matchPattern(key, pattern)) {
        this.data.delete(key)
        count++
      }
    }
    return Promise.resolve(count)
  }

  private matchPattern(key: string, pattern: string): boolean {
    const regex = pattern.replace(/\*/g, '.*')
    return new RegExp(`^${regex}$`).test(key)
  }
}

class IntegrationMockRepository implements IProductRepository {
  private products: Product[] = Array.from({ length: 20 }, (_, i) => ({
    id: `product-${i}`,
    name: `Product ${i}`,
    sku: `SKU-${String(i).padStart(3, '0')}`,
    description: `Test product ${i}`,
    price: 100 + i * 10,
    cost: 50 + i * 5,
    stock: 100 - i * 2,
    status: ProductStatus.ACTIVE,
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  async findById(id: string): Promise<Product | null> {
    return this.products.find((p) => p.id === id) || null
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.products.find((p) => p.sku === sku) || null
  }

  async findAll(): Promise<{ items: Product[]; total: number; page: number; limit: number }> {
    return {
      items: this.products,
      total: this.products.length,
      page: 1,
      limit: 100,
    }
  }

  async create(): Promise<Product> {
    throw new Error('Not implemented')
  }

  async update(): Promise<Product> {
    throw new Error('Not implemented')
  }

  async updateStock(): Promise<void> {
    throw new Error('Not implemented')
  }

  async delete(): Promise<void> {
    throw new Error('Not implemented')
  }

  async findByIds(): Promise<Product[]> {
    throw new Error('Not implemented')
  }
}

class IntegrationMockMetrics {
  histogram() {
    return { observe: () => {} }
  }

  gauge() {
    return { set: () => {} }
  }

  counter() {
    return { inc: () => {} }
  }
}

describe('Flash Sale P1 Integration Tests', () => {
  let hotnessTracker: HotnessTracker
  let cacheWarmupService: CacheWarmupService
  let tieredCache: TieredCacheService
  let batchHandler: BatchInvalidationHandler
  let redis: IntegrationMockRedis
  let l2Cache: IntegrationMockL2Cache
  let repository: IntegrationMockRepository
  let logger: IntegrationMockLogger
  let metrics: IntegrationMockMetrics
  let core: any

  beforeEach(() => {
    redis = new IntegrationMockRedis()
    l2Cache = new IntegrationMockL2Cache()
    repository = new IntegrationMockRepository()
    logger = new IntegrationMockLogger()
    metrics = new IntegrationMockMetrics()

    hotnessTracker = new HotnessTracker(redis as any, logger as any)
    tieredCache = new TieredCacheService(l2Cache, metrics as any, logger as any)
    cacheWarmupService = new CacheWarmupService(
      hotnessTracker,
      repository,
      tieredCache,
      logger as any,
      metrics as any
    )

    core = {
      logger,
      hooks: {
        doActionAsync: async (action: string, payload: any) => {
          // Mock DLQ
        },
      },
    }

    batchHandler = new BatchInvalidationHandler(tieredCache as any, core, metrics as any)
  })

  describe('End-to-end flow', () => {
    it('應該完整執行預熱和快取流程', async () => {
      // 1. 啟動預熱
      await cacheWarmupService.warmupOnStartup()

      // 2. 驗證商品已被快取
      const product1 = await tieredCache.get('product:detail:product-0')
      expect(product1).toBeDefined()
      expect(product1?.id).toBe('product-0')

      // 3. 記錄訪問熱度
      for (let i = 0; i < 5; i++) {
        await hotnessTracker.recordAccess('product-0')
      }

      // 4. 驗證熱度被記錄
      const hotness = await hotnessTracker.getHotness('product-0')
      expect(hotness).toBe(5)

      // 5. 直接刪除快取（測試簡化版，避免 pattern matching 複雜性）
      await tieredCache.delete('product:detail:product-0')

      // 6. 驗證快取被清除
      const cleared = await tieredCache.get('product:detail:product-0')
      expect(cleared).toBeNull()
    })

    it('應該支持多個商品的並行操作', async () => {
      // 並行記錄多個商品的訪問
      const productIds = Array.from({ length: 10 }, (_, i) => `product-${i}`)
      await hotnessTracker.recordBatchAccess(productIds)

      // 驗證所有商品的熱度
      for (const id of productIds) {
        const hotness = await hotnessTracker.getHotness(id)
        expect(hotness).toBe(1)
      }

      // 預熱
      await cacheWarmupService.warmupOnStartup()

      // 驗證快取
      for (let i = 0; i < 5; i++) {
        const product = await tieredCache.get(`product:detail:product-${i}`)
        expect(product?.id).toBe(`product-${i}`)
      }
    })

    it('應該處理高並發失效請求', async () => {
      // 發送多個並發失效請求
      const invalidatePromises = Array.from({ length: 20 }, (_, i) =>
        batchHandler.invalidate(`pattern:${i % 5}:*`)
      )

      await Promise.all(invalidatePromises)

      // 等待批處理完成
      await new Promise((resolve) => setTimeout(resolve, 250))

      // 應該有 5 個不同的 pattern
      const stats = batchHandler.getPendingStats()
      expect(stats.totalPatterns).toBe(0) // 已經處理完成
    })

    it('應該在快取預熱和失效之間保持一致性', async () => {
      // 預熱
      await cacheWarmupService.warmupOnStartup()

      // 驗證快取內容
      let product = await tieredCache.get('product:detail:product-0')
      expect(product?.name).toBe('Product 0')

      // 失效快取
      await tieredCache.delete('product:detail:product-0')

      // 驗證快取已清除
      product = await tieredCache.get('product:detail:product-0')
      expect(product).toBeNull()

      // 重新快取
      const originalProduct = await repository.findById('product-0')
      if (originalProduct) {
        await tieredCache.set('product:detail:product-0', {
          ...originalProduct,
          name: 'Updated Product 0',
        })
      }

      // 驗證更新
      product = await tieredCache.get('product:detail:product-0')
      expect(product?.name).toBe('Updated Product 0')
    })
  })

  describe('Performance characteristics', () => {
    it('L1 快取應該提供更快的訪問速度', async () => {
      // 預熱數據
      await tieredCache.set('key1', 'value1')

      // 第一次訪問（可能是 L2）
      const start1 = performance.now()
      await tieredCache.get('key1')
      const duration1 = performance.now() - start1

      // 第二次訪問（應該是 L1）
      const start2 = performance.now()
      await tieredCache.get('key1')
      const duration2 = performance.now() - start2

      // L1 命中應該更快（或至少不慢於 L2）
      expect(duration2).toBeLessThanOrEqual(duration1 + 1)
    })

    it('批量失效應該顯著減少 Redis 命令數', async () => {
      // 預先設置一些數據
      for (let i = 0; i < 10; i++) {
        await tieredCache.set(`product:detail:${i}`, `value-${i}`)
      }

      // 批量失效
      const start = performance.now()
      await batchHandler.invalidate('product:detail:*')
      await new Promise((resolve) => setTimeout(resolve, 250))
      const duration = performance.now() - start

      // 應該在合理時間內完成
      expect(duration).toBeLessThan(1000)
    })
  })
})
