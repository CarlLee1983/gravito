import { describe, expect, it } from 'vitest'
import { AnalyticsError } from '../../../src/Application/Errors/AnalyticsError'
import { DataPointValue } from '../../../src/Domain/ValueObjects/DataPointValue'

describe('DataPointValue', () => {
  it('of() 建立有限數值', () => {
    const value = DataPointValue.of(100, 'count')
    expect(value.value).toBe(100)
    expect(value.unit).toBe('count')
  })

  it('of() 不提供 unit', () => {
    const value = DataPointValue.of(50)
    expect(value.value).toBe(50)
    expect(value.unit).toBeNull()
  })

  it('zero() 建立零值', () => {
    const value = DataPointValue.zero('count')
    expect(value.value).toBe(0)
    expect(value.unit).toBe('count')
  })

  it('zero() 不提供 unit', () => {
    const value = DataPointValue.zero()
    expect(value.value).toBe(0)
    expect(value.unit).toBeNull()
  })

  it('throws 當數值是 Infinity', () => {
    expect(() => DataPointValue.of(Infinity)).toThrow(AnalyticsError)
  })

  it('throws 當數值是 -Infinity', () => {
    expect(() => DataPointValue.of(-Infinity)).toThrow(AnalyticsError)
  })

  it('throws 當數值是 NaN', () => {
    expect(() => DataPointValue.of(NaN)).toThrow(AnalyticsError)
  })

  it('add() 相加相同單位的值', () => {
    const v1 = DataPointValue.of(100, 'count')
    const v2 = DataPointValue.of(50, 'count')
    const result = v1.add(v2)
    expect(result.value).toBe(150)
    expect(result.unit).toBe('count')
  })

  it('add() throws 當單位不同', () => {
    const v1 = DataPointValue.of(100, 'count')
    const v2 = DataPointValue.of(50, 'currency_cents')
    expect(() => v1.add(v2)).toThrow(AnalyticsError)
  })

  it('subtract() 相減', () => {
    const v1 = DataPointValue.of(100)
    const v2 = DataPointValue.of(30)
    const result = v1.subtract(v2)
    expect(result.value).toBe(70)
  })

  it('multiply() 乘以因數', () => {
    const v = DataPointValue.of(10, 'count')
    const result = v.multiply(5)
    expect(result.value).toBe(50)
    expect(result.unit).toBe('count')
  })

  it('multiply() throws 當因數不是有限數字', () => {
    const v = DataPointValue.of(10)
    expect(() => v.multiply(Infinity)).toThrow(AnalyticsError)
  })

  it('isZero 判斷是否為零', () => {
    const v1 = DataPointValue.of(0)
    const v2 = DataPointValue.of(1)
    expect(v1.isZero).toBe(true)
    expect(v2.isZero).toBe(false)
  })

  it('equals() 判斷相等', () => {
    const v1 = DataPointValue.of(100, 'count')
    const v2 = DataPointValue.of(100, 'count')
    const v3 = DataPointValue.of(100, 'currency_cents')
    const v4 = DataPointValue.of(50, 'count')
    expect(v1.equals(v2)).toBe(true)
    expect(v1.equals(v3)).toBe(false)
    expect(v1.equals(v4)).toBe(false)
  })

  it('toString() 格式', () => {
    const v1 = DataPointValue.of(100, 'count')
    const v2 = DataPointValue.of(50)
    expect(v1.toString()).toBe('100 count')
    expect(v2.toString()).toBe('50')
  })

  it('支援浮點數', () => {
    const v = DataPointValue.of(3.14)
    expect(v.value).toBe(3.14)
  })

  it('支援負數', () => {
    const v = DataPointValue.of(-100)
    expect(v.value).toBe(-100)
  })

  it('支援 currency_cents unit', () => {
    const v = DataPointValue.of(10000, 'currency_cents')
    expect(v.unit).toBe('currency_cents')
  })
})
