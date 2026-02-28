import { describe, expect, it } from 'vitest'
import { AnalyticsError } from '../../../src/Application/Errors/AnalyticsError'
import { Dimension } from '../../../src/Domain/ValueObjects/Dimension'

describe('Dimension', () => {
  it('of() 建立維度', () => {
    const dim = Dimension.of('category', 'electronics')
    expect(dim.key).toBe('category')
    expect(dim.value).toBe('electronics')
  })

  it('throws 當 key 為空', () => {
    expect(() => Dimension.of('', 'value')).toThrow(AnalyticsError)
  })

  it('throws 當 value 為空', () => {
    expect(() => Dimension.of('category', '')).toThrow(AnalyticsError)
  })

  it('throws 當 key 包含大寫字母', () => {
    expect(() => Dimension.of('Category', 'value')).toThrow(AnalyticsError)
  })

  it('throws 當 key 包含特殊字元', () => {
    expect(() => Dimension.of('cate-gory', 'value')).toThrow(AnalyticsError)
  })

  it('允許小寫字母、數字和底線', () => {
    const dim = Dimension.of('region_v2', 'asia_pacific_123')
    expect(dim.key).toBe('region_v2')
  })

  it('matches() 只比較 key', () => {
    const d1 = Dimension.of('category', 'electronics')
    const d2 = Dimension.of('category', 'books')
    const d3 = Dimension.of('region', 'asia')
    expect(d1.matches(d2)).toBe(true)
    expect(d1.matches(d3)).toBe(false)
  })

  it('equals() 比較 key 和 value', () => {
    const d1 = Dimension.of('category', 'electronics')
    const d2 = Dimension.of('category', 'electronics')
    const d3 = Dimension.of('category', 'books')
    expect(d1.equals(d2)).toBe(true)
    expect(d1.equals(d3)).toBe(false)
  })

  it('toString() 格式', () => {
    const dim = Dimension.of('region', 'asia')
    expect(dim.toString()).toBe('region=asia')
  })
})
