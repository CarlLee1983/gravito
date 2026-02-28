/**
 * MockProductRepository 單元測試
 *
 * 驗證 Repository 返回 Product Entity（非 raw object）
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { Product } from '../../../src/Domain/Entities/Product'
import { ProductStatus } from '../../../src/Domain/Models'
import { Money } from '../../../src/Domain/ValueObjects/Money'
import { Stock } from '../../../src/Domain/ValueObjects/Stock'
import { MockProductRepository } from '../../../src/Infrastructure/Repositories/MockProductRepository'

describe('MockProductRepository (Entity-based)', () => {
  let repo: MockProductRepository

  beforeEach(() => {
    repo = new MockProductRepository()
  })

  describe('findById', () => {
    it('should return Product Entity for seeded products', async () => {
      const product = await repo.findById('product-0')

      expect(product).not.toBeNull()
      expect(product).toBeInstanceOf(Product)
      expect(product!.id).toBe('product-0')
      expect(product!.name).toBe('\u6436\u8CFC\u5546\u54C1 1')
    })

    it('should return Product Entity with Money price', async () => {
      const product = await repo.findById('product-0')

      expect(product!.price).toBeDefined()
      expect(product!.price.value).toBeGreaterThan(0)
      expect(product!.price.currency).toBe('TWD')
    })

    it('should return Product Entity with Stock value object', async () => {
      const product = await repo.findById('product-0')

      expect(product!.stock).toBeDefined()
      expect(product!.stock.quantity).toBeGreaterThan(0)
      expect(product!.stock.isAvailable).toBe(true)
    })

    it('should return null for non-existent product', async () => {
      const product = await repo.findById('nonexistent')
      expect(product).toBeNull()
    })
  })

  describe('findAll', () => {
    it('should return array of Product Entities', async () => {
      const products = await repo.findAll()

      expect(products.length).toBeGreaterThan(0)
      for (const product of products) {
        expect(product).toBeInstanceOf(Product)
      }
    })
  })

  describe('save', () => {
    it('should persist a Product Entity', async () => {
      const product = Product.create(
        'new-product',
        'New Product',
        'SKU-NEW',
        'A new product',
        Money.of(199.99),
        Money.of(100),
        Stock.of(50),
        ['https://example.com/img.jpg']
      )

      await repo.save(product)

      const found = await repo.findById('new-product')
      expect(found).not.toBeNull()
      expect(found).toBeInstanceOf(Product)
      expect(found!.name).toBe('New Product')
      expect(found!.price.value).toBe(199.99)
      expect(found!.stock.quantity).toBe(50)
    })

    it('should update existing Product Entity', async () => {
      const product = await repo.findById('product-0')
      expect(product).not.toBeNull()

      product!.deductStock(5)
      await repo.save(product!)

      const updated = await repo.findById('product-0')
      expect(updated!.stock.quantity).toBe(product!.stock.quantity)
    })
  })

  describe('findBySku', () => {
    it('should return Product Entity by SKU', async () => {
      const product = await repo.findBySku('SKU-000')

      expect(product).not.toBeNull()
      expect(product).toBeInstanceOf(Product)
      expect(product!.sku).toBe('SKU-000')
    })

    it('should return null for non-existent SKU', async () => {
      const product = await repo.findBySku('NONEXISTENT')
      expect(product).toBeNull()
    })
  })

  describe('findByIds', () => {
    it('should return array of Product Entities', async () => {
      const products = await repo.findByIds(['product-0', 'product-1', 'product-2'])

      expect(products).toHaveLength(3)
      for (const product of products) {
        expect(product).toBeInstanceOf(Product)
      }
    })

    it('should skip non-existent IDs', async () => {
      const products = await repo.findByIds(['product-0', 'nonexistent'])
      expect(products).toHaveLength(1)
    })
  })

  describe('updateStock', () => {
    it('should update stock on Product Entity', async () => {
      const product = await repo.findById('product-0')
      const originalQty = product!.stock.quantity

      await repo.updateStock('product-0', Stock.of(originalQty + 10))

      const updated = await repo.findById('product-0')
      expect(updated!.stock.quantity).toBe(originalQty + 10)
    })
  })

  describe('exists', () => {
    it('should return true for existing product', async () => {
      expect(await repo.exists('product-0')).toBe(true)
    })

    it('should return false for non-existent product', async () => {
      expect(await repo.exists('nonexistent')).toBe(false)
    })
  })

  describe('delete', () => {
    it('should remove product from repository', async () => {
      await repo.delete('product-0')
      const product = await repo.findById('product-0')
      expect(product).toBeNull()
    })
  })

  describe('reset', () => {
    it('should re-seed products after reset', async () => {
      await repo.delete('product-0')
      await repo.reset()

      const product = await repo.findById('product-0')
      expect(product).not.toBeNull()
      expect(product).toBeInstanceOf(Product)
    })
  })
})
