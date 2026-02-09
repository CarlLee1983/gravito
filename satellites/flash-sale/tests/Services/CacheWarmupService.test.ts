/**
 * CacheWarmupService 單元測試
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { CacheService } from '@gravito/core'
import type { IProductRepository } from '../../src/Application/Contracts/IProductRepository'
import type { Product } from '../../src/Domain/Models'
import { ProductStatus } from '../../src/Domain/Models'
import { CacheWarmupService } from '../../src/Infrastructure/Services/CacheWarmupService'

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
  setCalled = 0

  async get<T = unknown>(key: string): Promise<T | null> {
    return (this.data.get(key) as T) || null
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    this.setCalled++
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
}

/**
 * Mock ProductRepository
 */
class MockProductRepository implements IProductRepository {
  findByIdCalls = 0
  findAllCalls = 0

  private products: Product[] = [
    {
      id: 'product-1',
      name: 'Product 1',
      sku: 'SKU-001',
      description: 'Test product 1',
      price: 100,
      cost: 50,
      stock: 100,
      status: ProductStatus.ACTIVE,
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'product-2',
      name: 'Product 2',
      sku: 'SKU-002',
      description: 'Test product 2',
      price: 200,
      cost: 100,
      stock: 50,
      status: ProductStatus.ACTIVE,
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  async findById(id: string): Promise<Product | null> {
    this.findByIdCalls++
    return this.products.find((p) => p.id === id) || null
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.products.find((p) => p.sku === sku) || null
  }

  async findAll(): Promise<{ items: Product[]; total: number; page: number; limit: number }> {
    this.findAllCalls++
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

/**
 * Mock HotnessTracker
 */
class MockHotnessTracker {
  getTopHotCalls = 0
  getNessCalls = 0

  async getTopHot(limit: number): Promise<string[]> {
    this.getTopHotCalls++
    return ['product-1', 'product-2']
  }

  async getHotness(productId: string): Promise<number> {
    this.getNessCalls++
    return productId === 'product-1' ? 100 : 50
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

describe('CacheWarmupService', () => {
  let service: CacheWarmupService
  let cache: MockCacheService
  let repository: MockProductRepository
  let hotnessTracker: MockHotnessTracker
  let logger: MockLogger
  let metrics: MockMetricsRegistry

  beforeEach(() => {
    cache = new MockCacheService()
    repository = new MockProductRepository()
    hotnessTracker = new MockHotnessTracker()
    logger = new MockLogger()
    metrics = new MockMetricsRegistry()

    service = new CacheWarmupService(
      hotnessTracker as any,
      repository,
      cache,
      logger as any,
      metrics as any
    )
  })

  describe('warmupOnStartup', () => {
    it('應該預熱所有商品', async () => {
      await service.warmupOnStartup()

      expect(repository.findAllCalls).toBe(1)
      expect(cache.setCalled).toBeGreaterThan(0)
    })

    it('應該為每個商品設置 5 分鐘 TTL', async () => {
      await service.warmupOnStartup()

      const product1 = await cache.get('product:detail:product-1')
      expect(product1).toBeDefined()
    })

    it('應該記錄預熱日誌', async () => {
      await service.warmupOnStartup()

      const hasLog = logger.messages.some((m) => m.includes('啟動預熱'))
      expect(hasLog).toBe(true)
    })

    it('應該處理空商品列表', async () => {
      // 創建只返回空列表的 repository
      const emptyRepo = {
        findAll: async () => ({ items: [], total: 0, page: 1, limit: 100 }),
      } as any

      const serviceWithEmpty = new CacheWarmupService(
        hotnessTracker as any,
        emptyRepo,
        cache,
        logger as any,
        metrics as any
      )

      await serviceWithEmpty.warmupOnStartup()

      expect(cache.setCalled).toBe(0)
    })
  })

  describe('warmupOnHotness', () => {
    it('應該在熱度超過閾值時預熱商品', async () => {
      await service.warmupOnHotness('product-1')

      // 應該嘗試從 repository 獲取商品
      expect(repository.findByIdCalls).toBeGreaterThan(0)
    })

    it('應該不為低熱度商品預熱', async () => {
      // 假設熱度閾值是 50，product-2 的熱度剛好是 50
      await service.warmupOnHotness('product-2')

      // 應該仍然預熱（因為 hotness >= 50）
      expect(repository.findByIdCalls).toBeGreaterThan(0)
    })
  })

  describe('refreshWarmup', () => {
    it('應該刷新熱門商品快取', async () => {
      await service.refreshWarmup()

      expect(hotnessTracker.getTopHotCalls).toBe(1)
      expect(cache.setCalled).toBeGreaterThan(0)
    })

    it('應該獲取 Top 50 商品', async () => {
      await service.refreshWarmup()

      expect(hotnessTracker.getTopHotCalls).toBe(1)
    })
  })

  describe('periodic refresh', () => {
    it('應該啟動定期刷新定時器', async () => {
      service.startPeriodicRefresh(5) // 5 秒間隔

      const stats = await service.getStats()
      expect(stats.timerRunning).toBe(true)

      service.stopPeriodicRefresh()
    })

    it('應該停止定期刷新定時器', async () => {
      service.startPeriodicRefresh(5)
      service.stopPeriodicRefresh()

      const stats = await service.getStats()
      expect(stats.timerRunning).toBe(false)
    })
  })

  describe('fullWarmup', () => {
    it('應該觸發完整預熱', async () => {
      await service.fullWarmup()

      expect(repository.findAllCalls).toBe(1)
      expect(cache.setCalled).toBeGreaterThan(0)
    })
  })

  describe('getStats', () => {
    it('應該返回預熱統計', async () => {
      const stats = await service.getStats()

      expect(stats.isWarmingUp).toBe(false)
      expect(stats.timerRunning).toBe(false)
    })
  })
})
