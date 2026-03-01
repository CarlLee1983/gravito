import { describe, expect, it } from 'bun:test'
import { Variant, type VariantProps } from '../../../src/Domain/Entities/Variant'
import { Money } from '../../../src/Domain/ValueObjects/Money'
import { Stock } from '../../../src/Domain/ValueObjects/Stock'

describe('Variant Entity', () => {
  const createVariantProps = (): VariantProps => ({
    productId: 'prod-1',
    sku: 'SKU-001',
    name: 'Variant 1',
    price: Money.of(99.99),
    compareAtPrice: Money.of(149.99),
    stock: Stock.of(100),
    options: { color: 'red', size: 'M' },
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  it('should create variant with properties', () => {
    const props = createVariantProps()
    const variant = new Variant('var-1', props)
    expect(variant.id).toBe('var-1')
    expect(variant.sku).toBe('SKU-001')
    expect(variant.price.value).toBe(99.99)
  })

  it('should get variant properties', () => {
    const props = createVariantProps()
    const variant = new Variant('var-1', props)
    expect(variant.productId).toBe('prod-1')
    expect(variant.name).toBe('Variant 1')
    expect(variant.compareAtPrice?.value).toBe(149.99)
    expect(variant.stock.quantity).toBe(100)
    expect(variant.options.color).toBe('red')
  })

  it('should set stock', () => {
    const props = createVariantProps()
    const variant = new Variant('var-1', props)
    const oldStock = variant.stock
    const newStock = Stock.of(70)
    variant.setStock(newStock)
    expect(variant.stock.quantity).toBe(70)
    expect(oldStock).not.toBe(variant.stock)
  })

  it('should set price', () => {
    const props = createVariantProps()
    const variant = new Variant('var-1', props)
    const newPrice = Money.of(79.99)
    variant.setPrice(newPrice)
    expect(variant.price.value).toBe(79.99)
  })

  it('should set compare at price', () => {
    const props = createVariantProps()
    const variant = new Variant('var-1', props)
    const newPrice = Money.of(199.99)
    variant.setCompareAtPrice(newPrice)
    expect(variant.compareAtPrice?.value).toBe(199.99)
  })

  it('should set name', () => {
    const props = createVariantProps()
    const variant = new Variant('var-1', props)
    variant.setName('New Name')
    expect(variant.name).toBe('New Name')
  })

  it('should set options', () => {
    const props = createVariantProps()
    const variant = new Variant('var-1', props)
    variant.setOptions({ color: 'blue', size: 'L' })
    expect(variant.options.color).toBe('blue')
    expect(variant.options.size).toBe('L')
  })

  it('should update updatedAt when setting stock', () => {
    const props = createVariantProps()
    const variant = new Variant('var-1', props)
    const dateBeforeUpdate = variant.updatedAt
    variant.setStock(Stock.of(50))
    expect(variant.updatedAt.getTime()).toBeGreaterThanOrEqual(dateBeforeUpdate.getTime())
  })

  it('should handle variant without compareAtPrice', () => {
    const props = createVariantProps()
    props.compareAtPrice = null
    const variant = new Variant('var-1', props)
    expect(variant.compareAtPrice).toBeNull()
  })

  it('should handle variant without name', () => {
    const props = createVariantProps()
    props.name = null
    const variant = new Variant('var-1', props)
    expect(variant.name).toBeNull()
  })

  it('should return metadata', () => {
    const props = createVariantProps()
    props.metadata = { color_code: '#FF0000' }
    const variant = new Variant('var-1', props)
    expect(variant.metadata.color_code).toBe('#FF0000')
  })

  it('should return empty metadata when not provided', () => {
    const props = createVariantProps()
    const variant = new Variant('var-1', props)
    expect(Object.keys(variant.metadata).length).toBe(0)
  })
})
