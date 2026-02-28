import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { CacheService } from '@gravito/core'
import type { IProductRepository } from '../../../../src/Domain/Contracts/IProductRepository'
import { ProductQueryContext } from '../../../../src/Domain/DCI/Contexts/ProductQueryContext'
import { Product } from '../../../../src/Domain/Entities/Product'
import { Money } from '../../../../src/Domain/ValueObjects/Money'
import { Stock } from '../../../../src/Domain/ValueObjects/Stock'

/**
 * ProductQueryContext 整合測試
 *
 * 驗證商品查詢流程：快取 -> Repository -> 快取回填
 */
describe('ProductQueryContext', () => {
  let productRepo: IProductRepository
  let cache: CacheService

  const createProduct = (id = 'prod-1') =>
    Product.create(
      id,
      'Flash Sale Product',
      `SKU-${id}`,
      'A flash sale product',
      Money.of(299),
      Money.of(150),
      Stock.of(100),
      ['img1.jpg']
    )

  beforeEach(() => {
    productRepo = {
      save: mock(() => Promise.resolve()),
      findById: mock(() => Promise.resolve(null)),
      findAll: mock(() => Promise.resolve([])),
      delete: mock(() => Promise.resolve()),
      exists: mock(() => Promise.resolve(false)),
      findBySku: mock(() => Promise.resolve(null)),
      findByIds: mock(() => Promise.resolve([])),
      updateStock: mock(() => Promise.resolve()),
    }

    cache = {
      get: mock(() => Promise.resolve(null)),
      set: mock(() => Promise.resolve()),
      delete: mock(() => Promise.resolve()),
      clear: mock(() => Promise.resolve()),
      remember: mock(async (_key: string, _ttl: number, callback: () => Promise<unknown>) => {
        return callback()
      }),
    }
  })

  describe('getProduct', () => {
    it('快取命中時應直接回傳快取資料', async () => {
      const product = createProduct()
      ;(cache.get as ReturnType<typeof mock>).mockResolvedValue(product)

      const context = new ProductQueryContext(productRepo, cache)
      const result = await context.getProduct('prod-1')

      expect(result).toBeDefined()
      expect(result!.id).toBe('prod-1')
      // 快取命中時不應查詢 repository
      expect(productRepo.findById).toHaveBeenCalledTimes(0)
    })

    it('快取未命中時應從 repository 查詢並存入快取', async () => {
      const product = createProduct()
      ;(cache.get as ReturnType<typeof mock>).mockResolvedValue(null)
      ;(productRepo.findById as ReturnType<typeof mock>).mockResolvedValue(product)

      const context = new ProductQueryContext(productRepo, cache)
      const result = await context.getProduct('prod-1')

      expect(result).toBeDefined()
      expect(result!.id).toBe('prod-1')
      expect(productRepo.findById).toHaveBeenCalledTimes(1)
      expect(cache.set).toHaveBeenCalledTimes(1)
    })

    it('商品不存在時應回傳 null', async () => {
      ;(cache.get as ReturnType<typeof mock>).mockResolvedValue(null)
      ;(productRepo.findById as ReturnType<typeof mock>).mockResolvedValue(null)

      const context = new ProductQueryContext(productRepo, cache)
      const result = await context.getProduct('prod-nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('listProducts', () => {
    it('應從 repository 查詢商品列表', async () => {
      const products = [createProduct('prod-1'), createProduct('prod-2')]
      ;(productRepo.findAll as ReturnType<typeof mock>).mockResolvedValue(products)

      const context = new ProductQueryContext(productRepo, cache)
      const result = await context.listProducts()

      expect(result).toHaveLength(2)
      expect(productRepo.findAll).toHaveBeenCalledTimes(1)
    })

    it('無商品時應回傳空陣列', async () => {
      ;(productRepo.findAll as ReturnType<typeof mock>).mockResolvedValue([])

      const context = new ProductQueryContext(productRepo, cache)
      const result = await context.listProducts()

      expect(result).toHaveLength(0)
    })
  })

  describe('invalidateCache', () => {
    it('指定 productId 時應刪除對應快取', async () => {
      const context = new ProductQueryContext(productRepo, cache)
      await context.invalidateCache('prod-1')

      expect(cache.delete).toHaveBeenCalledTimes(1)
    })

    it('傳入 "all" 時應清空所有快取', async () => {
      const context = new ProductQueryContext(productRepo, cache)
      await context.invalidateCache('all')

      expect(cache.clear).toHaveBeenCalledTimes(1)
    })
  })
})
