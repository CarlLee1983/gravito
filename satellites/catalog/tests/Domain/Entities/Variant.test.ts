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

  it('should reduce stock and return new stock instance', () => {
    const props = createVariantProps()
    const variant = new Variant('var-1', props)
    const oldStock = variant.stock
    const newStock = variant.reduceStock(30)
    expect(newStock.quantity).toBe(70)
    expect(variant.stock.quantity).toBe(70)
    expect(oldStock).not.toBe(newStock)
  })

  it('should throw error when reducing more stock than available', () => {
    const props = createVariantProps()
    const variant = new Variant('var-1', props)
    expect(() => variant.reduceStock(101)).toThrow()
  })

  it('should add stock and return new stock instance', () => {
    const props = createVariantProps()
    const variant = new Variant('var-1', props)
    const newStock = variant.addStock(50)
    expect(newStock.quantity).toBe(150)
    expect(variant.stock.quantity).toBe(150)
  })

  it('should update updatedAt when reducing stock', () => {
    const props = createVariantProps()
    const _oldDate = props.updatedAt
    const variant = new Variant('var-1', props)
    const dateBeforeReduce = variant.updatedAt
    variant.reduceStock(10)
    expect(variant.updatedAt.getTime()).toBeGreaterThanOrEqual(dateBeforeReduce.getTime())
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
