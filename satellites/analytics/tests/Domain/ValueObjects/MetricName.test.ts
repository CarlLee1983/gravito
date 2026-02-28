import { describe, expect, it } from 'vitest'
import { AnalyticsError } from '../../../src/Application/Errors/AnalyticsError'
import { MetricName } from '../../../src/Domain/ValueObjects/MetricName'

describe('MetricName', () => {
  it('of() 解析 fullName', () => {
    const metric = MetricName.of('commerce.order_volume')
    expect(metric.namespace).toBe('commerce')
    expect(metric.name).toBe('order_volume')
    expect(metric.fullName).toBe('commerce.order_volume')
  })

  it('ofParts() 分別傳入 namespace 和 name', () => {
    const metric = MetricName.ofParts('membership', 'signups')
    expect(metric.namespace).toBe('membership')
    expect(metric.name).toBe('signups')
    expect(metric.fullName).toBe('membership.signups')
  })

  it('throws 當 fullName 不含 dot', () => {
    expect(() => MetricName.of('invalid')).toThrow(AnalyticsError)
  })

  it('throws 當 namespace 為空', () => {
    expect(() => MetricName.ofParts('', 'name')).toThrow(AnalyticsError)
  })

  it('throws 當 name 為空', () => {
    expect(() => MetricName.ofParts('namespace', '')).toThrow(AnalyticsError)
  })

  it('throws 當 namespace 包含大寫字母', () => {
    expect(() => MetricName.ofParts('Commerce', 'metric')).toThrow(AnalyticsError)
  })

  it('throws 當 name 包含大寫字母', () => {
    expect(() => MetricName.ofParts('commerce', 'OrderVolume')).toThrow(AnalyticsError)
  })

  it('throws 當 name 以底線開頭', () => {
    expect(() => MetricName.ofParts('commerce', '_volume')).toThrow(AnalyticsError)
  })

  it('throws 當 name 以底線結尾', () => {
    expect(() => MetricName.ofParts('commerce', 'volume_')).toThrow(AnalyticsError)
  })

  it('允許小寫、數字和底線', () => {
    const metric = MetricName.ofParts('commerce_v2', 'order_volume_123')
    expect(metric.fullName).toBe('commerce_v2.order_volume_123')
  })

  it('equals() 判斷相等', () => {
    const m1 = MetricName.of('commerce.revenue')
    const m2 = MetricName.of('commerce.revenue')
    const m3 = MetricName.of('commerce.order_volume')
    expect(m1.equals(m2)).toBe(true)
    expect(m1.equals(m3)).toBe(false)
  })

  it('toString() 回傳 fullName', () => {
    const metric = MetricName.of('payment.succeeded')
    expect(metric.toString()).toBe('payment.succeeded')
  })
})
