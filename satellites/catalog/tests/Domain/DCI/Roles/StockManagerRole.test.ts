import { describe, expect, it } from 'bun:test'
import {
  injectStockManager,
  type StockManager,
} from '../../../../src/Domain/DCI/Roles/StockManagerRole'
import { Product, Variant } from '../../../../src/Domain/Entities/Product'
import { I18nText } from '../../../../src/Domain/ValueObjects/I18nText'
import { Money } from '../../../../src/Domain/ValueObjects/Money'
import { Slug } from '../../../../src/Domain/ValueObjects/Slug'
import { Stock } from '../../../../src/Domain/ValueObjects/Stock'

describe('StockManagerRole', () => {
  const createProduct = (): Product => {
    const product = Product.create(
      'prod-1',
      I18nText.of({ en: 'Test Product' }),
      Slug.of('test-product')
    )

    const variant = new Variant('var-1', {
      productId: 'prod-1',
      sku: 'SKU-001',
      name: null,
      price: Money.of(100),
      compareAtPrice: null,
      stock: Stock.of(100),
      options: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    product.addVariant(variant)
    return product
  }

  it('should deduct stock from variant', async () => {
    const product = createProduct()
    const manager = injectStockManager(product, null as any)

    await manager.deductStock('var-1', 30)

    const variant = product.findVariant('var-1')
    expect(variant?.stock.quantity).toBe(70)
  })

  it('should throw error when deducting from non-existent variant', async () => {
    const product = createProduct()
    const manager = injectStockManager(product, null as any)

    try {
      await manager.deductStock('var-999', 10)
      expect.unreachable()
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e.message).toContain('Variant not found')
      }
    }
  })

  it('should throw error when deducting more than available', async () => {
    const product = createProduct()
    const manager = injectStockManager(product, null as any)

    try {
      await manager.deductStock('var-1', 101)
      expect.unreachable()
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e.message).toContain('Insufficient stock')
      }
    }
  })

  it('should recover stock for variant', async () => {
    const product = createProduct()
    const manager = injectStockManager(product, null as any)

    await manager.deductStock('var-1', 30)
    await manager.recoverStock('var-1', 30)

    const variant = product.findVariant('var-1')
    expect(variant?.stock.quantity).toBe(100)
  })

  it('should check availability correctly', () => {
    const product = createProduct()
    const manager = injectStockManager(product, null as any)

    expect(manager.checkAvailability('var-1', 50)).toBe(true)
    expect(manager.checkAvailability('var-1', 100)).toBe(true)
    expect(manager.checkAvailability('var-1', 101)).toBe(false)
  })

  it('should throw error checking availability for non-existent variant', () => {
    const product = createProduct()
    const manager = injectStockManager(product, null as any)

    try {
      manager.checkAvailability('var-999', 10)
      expect.unreachable()
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e.message).toContain('Variant not found')
      }
    }
  })
})
