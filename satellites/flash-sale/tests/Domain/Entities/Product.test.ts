import { describe, expect, it } from 'bun:test'
import { FlashSaleErrorCode } from '../../../src/Application/Errors/FlashSaleError'
import { Product } from '../../../src/Domain/Entities/Product'
import { ProductStatus } from '../../../src/Domain/Models'
import { Money } from '../../../src/Domain/ValueObjects/Money'
import { Stock } from '../../../src/Domain/ValueObjects/Stock'

describe('Product', () => {
  const defaultPrice = Money.of(299)
  const defaultCost = Money.of(150)
  const defaultStock = Stock.of(100)

  describe('create (靜態工廠方法)', () => {
    it('應正確建立 Product', () => {
      const product = Product.create(
        'prod-1',
        'Test Product',
        'SKU-001',
        'A test product',
        defaultPrice,
        defaultCost,
        defaultStock,
        ['img1.jpg']
      )

      expect(product.id).toBe('prod-1')
      expect(product.name).toBe('Test Product')
      expect(product.sku).toBe('SKU-001')
      expect(product.description).toBe('A test product')
      expect(product.price.value).toBe(299)
      expect(product.cost.value).toBe(150)
      expect(product.stock.quantity).toBe(100)
      expect(product.images).toEqual(['img1.jpg'])
      expect(product.status).toBe(ProductStatus.ACTIVE)
    })

    it('應以空圖片陣列建立 Product', () => {
      const product = Product.create(
        'prod-1',
        'Test Product',
        'SKU-001',
        'Description',
        defaultPrice,
        defaultCost,
        defaultStock,
        []
      )

      expect(product.images).toEqual([])
    })
  })

  describe('reconstitute (從 DB 重建)', () => {
    it('應正確重建 Product', () => {
      const product = Product.reconstitute('prod-1', {
        name: 'Reconstituted Product',
        sku: 'SKU-002',
        description: 'Reconstituted',
        price: defaultPrice,
        cost: defaultCost,
        stock: defaultStock,
        images: ['img2.jpg'],
        status: ProductStatus.INACTIVE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      })

      expect(product.id).toBe('prod-1')
      expect(product.name).toBe('Reconstituted Product')
      expect(product.status).toBe(ProductStatus.INACTIVE)
    })
  })

  describe('deductStock', () => {
    it('應正確扣減庫存', () => {
      const product = Product.create(
        'prod-1',
        'Test',
        'SKU',
        'Desc',
        defaultPrice,
        defaultCost,
        Stock.of(10),
        []
      )

      product.deductStock(3)

      expect(product.stock.quantity).toBe(7)
    })

    it('庫存不足時應拋出 INSUFFICIENT_STOCK 錯誤', () => {
      const product = Product.create(
        'prod-1',
        'Test',
        'SKU',
        'Desc',
        defaultPrice,
        defaultCost,
        Stock.of(3),
        []
      )

      try {
        product.deductStock(5)
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INSUFFICIENT_STOCK)
      }
    })

    it('扣減後庫存物件應更新', () => {
      const product = Product.create(
        'prod-1',
        'Test',
        'SKU',
        'Desc',
        defaultPrice,
        defaultCost,
        Stock.of(10),
        []
      )

      product.deductStock(10)

      expect(product.stock.quantity).toBe(0)
      expect(product.stock.isAvailable).toBe(false)
    })
  })

  describe('replenishStock', () => {
    it('應正確補充庫存', () => {
      const product = Product.create(
        'prod-1',
        'Test',
        'SKU',
        'Desc',
        defaultPrice,
        defaultCost,
        Stock.of(10),
        []
      )

      product.replenishStock(5)

      expect(product.stock.quantity).toBe(15)
    })
  })

  describe('transitionToInactive (狀態轉換)', () => {
    it('應轉換為 INACTIVE 狀態', () => {
      const product = Product.create(
        'prod-1',
        'Test',
        'SKU',
        'Desc',
        defaultPrice,
        defaultCost,
        defaultStock,
        []
      )

      expect(product.status).toBe(ProductStatus.ACTIVE)

      product.transitionToInactive()

      expect(product.status).toBe(ProductStatus.INACTIVE)
    })
  })

  describe('transitionToActive (狀態轉換)', () => {
    it('應轉換為 ACTIVE 狀態', () => {
      const product = Product.reconstitute('prod-1', {
        name: 'Test',
        sku: 'SKU',
        description: 'Desc',
        price: defaultPrice,
        cost: defaultCost,
        stock: defaultStock,
        images: [],
        status: ProductStatus.INACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(product.status).toBe(ProductStatus.INACTIVE)

      product.transitionToActive()

      expect(product.status).toBe(ProductStatus.ACTIVE)
    })
  })

  describe('Entity identity', () => {
    it('相同 ID 的 Product 應相等', () => {
      const a = Product.create(
        'prod-1',
        'A',
        'SKU-A',
        'A',
        defaultPrice,
        defaultCost,
        defaultStock,
        []
      )
      const b = Product.create(
        'prod-1',
        'B',
        'SKU-B',
        'B',
        defaultPrice,
        defaultCost,
        defaultStock,
        []
      )

      expect(a.equals(b)).toBe(true)
    })

    it('不同 ID 的 Product 應不相等', () => {
      const a = Product.create(
        'prod-1',
        'A',
        'SKU-A',
        'A',
        defaultPrice,
        defaultCost,
        defaultStock,
        []
      )
      const b = Product.create(
        'prod-2',
        'A',
        'SKU-A',
        'A',
        defaultPrice,
        defaultCost,
        defaultStock,
        []
      )

      expect(a.equals(b)).toBe(false)
    })
  })
})
