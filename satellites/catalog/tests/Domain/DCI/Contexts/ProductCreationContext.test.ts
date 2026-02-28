import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import type { IProductRepository } from '../../../../src/Domain/Contracts/ICatalogRepository'
import { ProductCreationContext } from '../../../../src/Domain/DCI/Contexts/ProductCreationContext'

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

describe('ProductCreationContext', () => {
  let repo: IProductRepository
  let core: any

  beforeEach(() => {
    repo = new InMemoryProductRepository()
    core = {
      hooks: {
        doAction: async () => {},
      },
    } as unknown as PlanetCore
  })

  it('should create product with variants', async () => {
    const ctx = new ProductCreationContext(repo, core)
    const product = await ctx.execute({
      name: { en: 'Product', 'zh-TW': '商品' },
      slug: 'product',
      brand: 'My Brand',
      variants: [
        {
          sku: 'SKU-001',
          price: 99.99,
          stock: 100,
          options: { color: 'red' },
        },
        {
          sku: 'SKU-002',
          price: 109.99,
          stock: 50,
          options: { color: 'blue' },
        },
      ],
    })

    expect(product.id).toBeDefined()
    expect(product.name.getText('en')).toBe('Product')
    expect(product.slug.value).toBe('product')
    expect(product.brand).toBe('My Brand')
    expect(product.variants.length).toBe(2)
  })

  it('should assign categories when provided', async () => {
    const ctx = new ProductCreationContext(repo, core)
    const product = await ctx.execute({
      name: { en: 'Product' },
      slug: 'product',
      categoryIds: ['cat-1', 'cat-2'],
      variants: [
        {
          sku: 'SKU-001',
          price: 99.99,
          stock: 100,
          options: {},
        },
      ],
    })

    expect(product.categoryIds).toContain('cat-1')
    expect(product.categoryIds).toContain('cat-2')
  })

  it('should create variant with all fields', async () => {
    const ctx = new ProductCreationContext(repo, core)
    const product = await ctx.execute({
      name: { en: 'Product' },
      slug: 'product',
      variants: [
        {
          sku: 'SKU-001',
          name: 'Red Variant',
          price: 99.99,
          compareAtPrice: 129.99,
          stock: 100,
          options: { color: 'red', size: 'M' },
        },
      ],
    })

    const variant = product.variants[0]
    expect(variant.sku).toBe('SKU-001')
    expect(variant.name).toBe('Red Variant')
    expect(variant.price.value).toBe(99.99)
    expect(variant.compareAtPrice?.value).toBe(129.99)
    expect(variant.stock.quantity).toBe(100)
  })

  it('should trigger hook on creation', async () => {
    let hookCalled = false
    let hookData: any
    core.hooks.doAction = async (name: string, data: any) => {
      if (name === 'catalog:product-created') {
        hookCalled = true
        hookData = data
      }
    }

    const ctx = new ProductCreationContext(repo, core)
    const product = await ctx.execute({
      name: { en: 'Product' },
      slug: 'product',
      variants: [
        {
          sku: 'SKU-001',
          price: 99.99,
          stock: 100,
          options: {},
        },
      ],
    })

    expect(hookCalled).toBe(true)
    expect(hookData.productId).toBe(product.id)
    expect(hookData.skuCount).toBe(1)
  })

  it('should persist product to repository', async () => {
    const ctx = new ProductCreationContext(repo, core)
    const product = await ctx.execute({
      name: { en: 'Product' },
      slug: 'product',
      variants: [
        {
          sku: 'SKU-001',
          price: 99.99,
          stock: 100,
          options: {},
        },
      ],
    })

    const saved = await repo.findById(product.id)
    expect(saved).toBeDefined()
    expect(saved!.id).toBe(product.id)
  })

  it('should throw error for invalid slug', async () => {
    const ctx = new ProductCreationContext(repo, core)

    try {
      await ctx.execute({
        name: { en: 'Product' },
        slug: 'Invalid-Slug!',
        variants: [
          {
            sku: 'SKU-001',
            price: 99.99,
            stock: 100,
            options: {},
          },
        ],
      })
      expect.unreachable()
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e.message).toContain('Invalid slug')
      }
    }
  })
})
