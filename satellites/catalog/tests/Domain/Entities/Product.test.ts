import { describe, expect, it } from 'bun:test'
import { Product, ProductStatus, Variant } from '../../../src/Domain/Entities/Product'
import { I18nText } from '../../../src/Domain/ValueObjects/I18nText'
import { Money } from '../../../src/Domain/ValueObjects/Money'
import { Slug } from '../../../src/Domain/ValueObjects/Slug'
import { Stock } from '../../../src/Domain/ValueObjects/Stock'

describe('Product AggregateRoot', () => {
  const createVariant = (id: string, sku: string): Variant =>
    new Variant(id, {
      productId: 'prod-1',
      sku,
      name: null,
      price: Money.of(99.99),
      compareAtPrice: null,
      stock: Stock.of(100),
      options: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })

  it('should create product with i18n name and slug', () => {
    const name = I18nText.of({ en: 'Product', 'zh-TW': '商品' })
    const slug = Slug.of('product')
    const product = Product.create('prod-1', name, slug)
    expect(product.id).toBe('prod-1')
    expect(product.name.getText('en')).toBe('Product')
    expect(product.slug.value).toBe('product')
    expect(product.status).toBe(ProductStatus.ACTIVE)
  })

  it('should update product name', () => {
    const name = I18nText.of({ en: 'Original' })
    const product = Product.create('prod-1', name, Slug.of('product'))
    const newName = I18nText.of({ en: 'Updated' })
    product.setName(newName)
    expect(product.name.getText('en')).toBe('Updated')
  })

  it('should update product slug', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    const newSlug = Slug.of('new-product')
    product.setSlug(newSlug)
    expect(product.slug.value).toBe('new-product')
  })

  it('should update product description', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    product.setDescription('New description')
    expect(product.description).toBe('New description')
  })

  it('should set product thumbnail', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    product.setThumbnail('s3://bucket/image.jpg')
    expect(product.thumbnail).toBe('s3://bucket/image.jpg')
  })

  it('should set product brand', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    product.setBrand('My Brand')
    expect(product.brand).toBe('My Brand')
  })

  it('should set product variants', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    const variant = createVariant('var-1', 'SKU-001')
    product.setVariants([variant])
    expect(product.variants.length).toBe(1)
    expect(product.variants[0].id).toBe('var-1')
  })

  it('should set product status', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    expect(product.status).toBe(ProductStatus.ACTIVE)
    product.setStatus(ProductStatus.ARCHIVED)
    expect(product.status).toBe(ProductStatus.ARCHIVED)
  })

  it('should find variant by id in variants list', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    const variant = createVariant('var-1', 'SKU-001')
    product.setVariants([variant])
    const found = product.variants.find((v) => v.id === 'var-1')
    expect(found?.id).toBe('var-1')
  })

  it('should return undefined when variant not found', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    const found = product.variants.find((v) => v.id === 'var-999')
    expect(found).toBeUndefined()
  })

  it('should set category ids', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    product.setCategoryIds(['cat-1', 'cat-2'])
    expect(product.categoryIds).toContain('cat-1')
    expect(product.categoryIds).toContain('cat-2')
    expect(product.categoryIds.length).toBe(2)
  })

  it('should replace category ids when setting', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    product.setCategoryIds(['cat-1'])
    product.setCategoryIds(['cat-2', 'cat-3'])
    expect(product.categoryIds).not.toContain('cat-1')
    expect(product.categoryIds).toContain('cat-2')
    expect(product.categoryIds).toContain('cat-3')
  })

  it('should update updatedAt when properties change', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    const originalUpdatedAt = product.updatedAt.getTime()
    product.setName(I18nText.of({ en: 'Updated' }))
    expect(product.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt)
  })

  it('should track createdAt and updatedAt', () => {
    const before = new Date()
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    const after = new Date()
    expect(product.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(product.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    expect(product.updatedAt.getTime()).toBeGreaterThanOrEqual(product.createdAt.getTime())
  })
})
