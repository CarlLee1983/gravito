import { beforeEach, describe, expect, it } from 'bun:test'
import type { IProductRepository } from '../../../../src/Domain/Contracts/ICatalogRepository'
import { InventoryManagementContext } from '../../../../src/Domain/DCI/Contexts/InventoryManagementContext'
import { Product, Variant } from '../../../../src/Domain/Entities/Product'
import { I18nText } from '../../../../src/Domain/ValueObjects/I18nText'
import { Money } from '../../../../src/Domain/ValueObjects/Money'
import { Slug } from '../../../../src/Domain/ValueObjects/Slug'
import { Stock } from '../../../../src/Domain/ValueObjects/Stock'

class InMemoryProductRepository implements IProductRepository {
  private products: Map<string, any> = new Map()

  async save(product: any): Promise<void> {
    this.products.set(product.id, product)
  }

  async findById(id: string) {
    return this.products.get(id) || null
  }

  async findBySlug() {
    return null
  }

  async findByVariantId() {
    return null
  }

  async findAll() {
    return Array.from(this.products.values())
  }

  async delete(id: string): Promise<void> {
    this.products.delete(id)
  }
}

describe('InventoryManagementContext', () => {
  let repo: IProductRepository
  let product: Product

  beforeEach(() => {
    repo = new InMemoryProductRepository()
    product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))

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
  })

  it('should deduct stock from inventory', async () => {
    await repo.save(product)
    const ctx = new InventoryManagementContext(repo)

    await ctx.deductStock('prod-1', 'var-1', 30)

    const updated = await repo.findById('prod-1')
    const variant = updated!.findVariant('var-1')
    expect(variant?.stock.quantity).toBe(70)
  })

  it('should throw error when product not found', async () => {
    const ctx = new InventoryManagementContext(repo)

    try {
      await ctx.deductStock('prod-999', 'var-1', 10)
      expect.unreachable()
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e.message).toContain('Product not found')
      }
    }
  })

  it('should throw error when insufficient stock', async () => {
    await repo.save(product)
    const ctx = new InventoryManagementContext(repo)

    try {
      await ctx.deductStock('prod-1', 'var-1', 101)
      expect.unreachable()
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e.message).toContain('Insufficient stock')
      }
    }
  })

  it('should recover stock', async () => {
    await repo.save(product)
    const ctx = new InventoryManagementContext(repo)

    await ctx.deductStock('prod-1', 'var-1', 30)
    await ctx.recoverStock('prod-1', 'var-1', 30)

    const updated = await repo.findById('prod-1')
    const variant = updated!.findVariant('var-1')
    expect(variant?.stock.quantity).toBe(100)
  })

  it('should batch recover stock', async () => {
    const variant2 = new Variant('var-2', {
      productId: 'prod-1',
      sku: 'SKU-002',
      name: null,
      price: Money.of(50),
      compareAtPrice: null,
      stock: Stock.of(50),
      options: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    product.addVariant(variant2)
    await repo.save(product)

    const ctx = new InventoryManagementContext(repo)
    await ctx.deductStock('prod-1', 'var-1', 20)
    await ctx.deductStock('prod-1', 'var-2', 10)

    await ctx.batchRecoverStock([
      { productId: 'prod-1', variantId: 'var-1', quantity: 20 },
      { productId: 'prod-1', variantId: 'var-2', quantity: 10 },
    ])

    const updated = await repo.findById('prod-1')
    expect(updated!.findVariant('var-1')?.stock.quantity).toBe(100)
    expect(updated!.findVariant('var-2')?.stock.quantity).toBe(50)
  })

  it('should check availability', async () => {
    await repo.save(product)
    const ctx = new InventoryManagementContext(repo)

    expect(await ctx.checkAvailability('prod-1', 'var-1', 50)).toBe(true)
    expect(await ctx.checkAvailability('prod-1', 'var-1', 100)).toBe(true)
    expect(await ctx.checkAvailability('prod-1', 'var-1', 101)).toBe(false)
  })
})
