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
    product.updateName(newName)
    expect(product.name.getText('en')).toBe('Updated')
  })

  it('should update product slug', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    const newSlug = Slug.of('new-product')
    product.updateSlug(newSlug)
    expect(product.slug.value).toBe('new-product')
  })

  it('should update product description', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    product.updateDescription('New description')
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

  it('should add variant to product', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    const variant = createVariant('var-1', 'SKU-001')
    product.addVariant(variant)
    expect(product.variants.length).toBe(1)
    expect(product.variants[0].id).toBe('var-1')
  })

  it('should generate domain event when adding variant', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    const variant = createVariant('var-1', 'SKU-001')
    product.addVariant(variant)
    const events = product.pullDomainEvents()
    expect(events.length).toBe(1)
    expect(events[0].type).toBe('ProductVariantAdded')
  })

  it('should remove variant from product', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    const variant = createVariant('var-1', 'SKU-001')
    product.addVariant(variant)
    product.removeVariant('var-1')
    expect(product.variants.length).toBe(0)
  })

  it('should find variant by id', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    const variant = createVariant('var-1', 'SKU-001')
    product.addVariant(variant)
    const found = product.findVariant('var-1')
    expect(found?.id).toBe('var-1')
  })

  it('should return undefined when variant not found', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    const found = product.findVariant('var-999')
    expect(found).toBeUndefined()
  })

  it('should assign product to category', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    product.assignToCategory('cat-1')
    expect(product.categoryIds).toContain('cat-1')
  })

  it('should not duplicate category assignment', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    product.assignToCategory('cat-1')
    product.assignToCategory('cat-1')
    expect(product.categoryIds.length).toBe(1)
  })

  it('should remove product from category', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    product.assignToCategory('cat-1')
    product.assignToCategory('cat-2')
    product.removeFromCategory('cat-1')
    expect(product.categoryIds).not.toContain('cat-1')
    expect(product.categoryIds).toContain('cat-2')
  })

  it('should archive product', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    expect(product.status).toBe(ProductStatus.ACTIVE)
    product.archive()
    expect(product.status).toBe(ProductStatus.ARCHIVED)
  })

  it('should clear domain events after pulling', () => {
    const product = Product.create('prod-1', I18nText.of({ en: 'Product' }), Slug.of('product'))
    const variant = createVariant('var-1', 'SKU-001')
    product.addVariant(variant)
    product.pullDomainEvents()
    expect(product.pullDomainEvents().length).toBe(0)
  })
})
