import { describe, expect, it } from 'bun:test'
import { injectCatalogEditor } from '../../../../src/Domain/DCI/Roles/CatalogEditorRole'
import { Product, ProductStatus, Variant } from '../../../../src/Domain/Entities/Product'
import { I18nText } from '../../../../src/Domain/ValueObjects/I18nText'
import { Money } from '../../../../src/Domain/ValueObjects/Money'
import { Slug } from '../../../../src/Domain/ValueObjects/Slug'
import { Stock } from '../../../../src/Domain/ValueObjects/Stock'

describe('CatalogEditorRole', () => {
  const createProduct = (): Product => {
    return Product.create(
      'prod-1',
      I18nText.of({ en: 'Product', 'zh-TW': '商品' }),
      Slug.of('product')
    )
  }

  it('should update product name', () => {
    const product = createProduct()
    const editor = injectCatalogEditor(product, null as any)

    const newName = I18nText.of({ en: 'New Name' })
    editor.updateProductInfo({ name: newName })

    expect(product.name.getText('en')).toBe('New Name')
  })

  it('should update product slug', () => {
    const product = createProduct()
    const editor = injectCatalogEditor(product, null as any)

    const newSlug = Slug.of('new-slug')
    editor.updateProductInfo({ slug: newSlug })

    expect(product.slug.value).toBe('new-slug')
  })

  it('should update product description', () => {
    const product = createProduct()
    const editor = injectCatalogEditor(product, null as any)

    editor.updateProductInfo({ description: 'New description' })

    expect(product.description).toBe('New description')
  })

  it('should update product brand', () => {
    const product = createProduct()
    const editor = injectCatalogEditor(product, null as any)

    editor.updateProductInfo({ brand: 'My Brand' })

    expect(product.brand).toBe('My Brand')
  })

  it('should update multiple fields at once', () => {
    const product = createProduct()
    const editor = injectCatalogEditor(product, null as any)

    editor.updateProductInfo({
      name: I18nText.of({ en: 'New Name' }),
      description: 'New description',
      brand: 'My Brand',
    })

    expect(product.name.getText('en')).toBe('New Name')
    expect(product.description).toBe('New description')
    expect(product.brand).toBe('My Brand')
  })

  it('should assign categories', () => {
    const product = createProduct()
    const editor = injectCatalogEditor(product, null as any)

    editor.updateProductInfo({ categoryIds: ['cat-1', 'cat-2'] })

    expect(product.categoryIds).toContain('cat-1')
    expect(product.categoryIds).toContain('cat-2')
  })

  it('should replace categories when updating', () => {
    const product = createProduct()
    product.assignToCategory('cat-1')
    const editor = injectCatalogEditor(product, null as any)

    editor.updateProductInfo({ categoryIds: ['cat-2', 'cat-3'] })

    expect(product.categoryIds).not.toContain('cat-1')
    expect(product.categoryIds).toContain('cat-2')
    expect(product.categoryIds).toContain('cat-3')
  })

  it('should activate product', () => {
    const product = createProduct()
    expect(product.status).toBe(ProductStatus.ACTIVE)
    const editor = injectCatalogEditor(product, null as any)
    editor.activateProduct()
    expect(product.status).toBe(ProductStatus.ACTIVE)
  })

  it('should archive product', () => {
    const product = createProduct()
    const editor = injectCatalogEditor(product, null as any)

    editor.archiveProduct()

    expect(product.status).toBe(ProductStatus.ARCHIVED)
  })

  it('should add variant', () => {
    const product = createProduct()
    const editor = injectCatalogEditor(product, null as any)

    const variant = new Variant('var-1', {
      productId: 'prod-1',
      sku: 'SKU-001',
      name: null,
      price: Money.of(100),
      compareAtPrice: null,
      stock: Stock.of(50),
      options: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    editor.addVariant(variant)

    expect(product.variants.length).toBe(1)
    expect(product.findVariant('var-1')).toBeDefined()
  })

  it('should throw error adding variant from different product', () => {
    const product = createProduct()
    const editor = injectCatalogEditor(product, null as any)

    const variant = new Variant('var-1', {
      productId: 'prod-999',
      sku: 'SKU-001',
      name: null,
      price: Money.of(100),
      compareAtPrice: null,
      stock: Stock.of(50),
      options: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    try {
      editor.addVariant(variant)
      expect.unreachable()
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e.message).toContain('product ID mismatch')
      }
    }
  })

  it('should remove variant', () => {
    const product = createProduct()
    const editor = injectCatalogEditor(product, null as any)

    const variant = new Variant('var-1', {
      productId: 'prod-1',
      sku: 'SKU-001',
      name: null,
      price: Money.of(100),
      compareAtPrice: null,
      stock: Stock.of(50),
      options: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    editor.addVariant(variant)
    editor.removeVariant('var-1')

    expect(product.variants.length).toBe(0)
  })
})
