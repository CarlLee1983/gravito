import { describe, expect, it } from 'bun:test'
import { AnalyticsFilters } from '../../../src/Domain/ValueObjects/AnalyticsFilters'

describe('AnalyticsFilters ValueObject', () => {
  it('應該建立空的篩選條件', () => {
    const filters = AnalyticsFilters.of()

    expect(filters.isEmpty()).toBe(true)
  })

  it('應該建立有篩選條件的實例', () => {
    const filters = AnalyticsFilters.of({ region: 'taipei', category: 'electronics' })

    expect(filters.isEmpty()).toBe(false)
  })

  it('應該能取得指定的篩選條件值', () => {
    const filters = AnalyticsFilters.of({ region: 'taipei' })

    expect(filters.get('region')).toBe('taipei')
  })

  it('應該在鍵不存在時回傳 undefined', () => {
    const filters = AnalyticsFilters.of({ region: 'taipei' })

    expect(filters.get('nonexistent')).toBeUndefined()
  })

  it('應該檢查指定的鍵是否存在', () => {
    const filters = AnalyticsFilters.of({ region: 'taipei' })

    expect(filters.has('region')).toBe(true)
    expect(filters.has('category')).toBe(false)
  })

  it('應該轉換為原始記錄', () => {
    const original = { region: 'taipei', category: 'electronics' }
    const filters = AnalyticsFilters.of(original)
    const record = filters.toRecord()

    expect(record).toEqual(original)
  })

  it('應該對空篩選條件返回空記錄', () => {
    const filters = AnalyticsFilters.of()

    expect(filters.toRecord()).toEqual({})
  })

  it('兩個相同值的 AnalyticsFilters 應該相等', () => {
    const f1 = AnalyticsFilters.of({ region: 'taipei' })
    const f2 = AnalyticsFilters.of({ region: 'taipei' })

    expect(f1.equals(f2)).toBe(true)
  })
})
