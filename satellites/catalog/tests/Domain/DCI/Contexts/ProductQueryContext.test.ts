import { beforeEach, describe, expect, it } from 'bun:test'
import type {
  IProductRepository,
  ProductFilters,
} from '../../../../src/Domain/Contracts/ICatalogRepository'
import { ProductQueryContext } from '../../../../src/Domain/DCI/Contexts/ProductQueryContext'
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

  async findBySlug(slug: string) {
    return Array.from(this.products.values()).find((p) => p.slug.value === slug) || null
  }

  async findByVariantId(variantId: string) {
    return (
      Array.from(this.products.values()).find((p) =>
        p.variants.some((v: any) => v.id === variantId)
      ) || null
    )
  }

  async findAll(filters?: ProductFilters) {
    let results = Array.from(this.products.values())

    if (filters?.status) {
      results = results.filter((p) => p.status === filters.status)
    }

    if (filters?.categoryId) {
      results = results.filter((p) => p.categoryIds.includes(filters.categoryId))
    }

    return results
  }

  async delete(id: string): Promise<void> {
    this.products.delete(id)
  }
}

describe('ProductQueryContext', () => {
  let repo: IProductRepository
  let product: Product

  beforeEach(async () => {
    repo = new InMemoryProductRepository()
    product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('my-product'))

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
    await repo.save(product)
  })

  it('should get product by id', async () => {
    const ctx = new ProductQueryContext(repo)
    const result = await ctx.getProduct('prod-1')

    expect(result?.id).toBe('prod-1')
    expect(result?.name.getText('en')).toBe('Product')
  })

  it('should return null for non-existent product', async () => {
    const ctx = new ProductQueryContext(repo)
    const result = await ctx.getProduct('prod-999')

    expect(result).toBeNull()
  })

  it('should get product by slug', async () => {
    const ctx = new ProductQueryContext(repo)
    const result = await ctx.getProductBySlug('my-product')

    expect(result?.id).toBe('prod-1')
  })

  it('should get product by variant id', async () => {
    const ctx = new ProductQueryContext(repo)
    const result = await ctx.getProductByVariantId('var-1')

    expect(result?.id).toBe('prod-1')
  })

  it('should list all products', async () => {
    const ctx = new ProductQueryContext(repo)
    const results = await ctx.listProducts()

    expect(results.length).toBeGreaterThan(0)
    expect(results.some((p) => p.id === 'prod-1')).toBe(true)
  })

  it('should get variant from product', async () => {
    const ctx = new ProductQueryContext(repo)
    const variant = await ctx.getVariant('prod-1', 'var-1')

    expect(variant.id).toBe('var-1')
    expect(variant.sku).toBe('SKU-001')
  })

  it('should throw error getting non-existent variant', async () => {
    const ctx = new ProductQueryContext(repo)

    try {
      await ctx.getVariant('prod-1', 'var-999')
      expect.unreachable()
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e.message).toContain('Variant not found')
      }
    }
  })

  it('should throw error getting variant from non-existent product', async () => {
    const ctx = new ProductQueryContext(repo)

    try {
      await ctx.getVariant('prod-999', 'var-1')
      expect.unreachable()
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e.message).toContain('Product not found')
      }
    }
  })

  it('should check sku existence', async () => {
    const ctx = new ProductQueryContext(repo)
    expect(await ctx.checkSkuExists('SKU-001')).toBe(true)
    expect(await ctx.checkSkuExists('SKU-999')).toBe(false)
  })
})
