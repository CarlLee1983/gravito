import { describe, expect, it } from 'vitest'
import { DataPoint } from '../../../src/Domain/Entities/DataPoint'
import { DataPointValue } from '../../../src/Domain/ValueObjects/DataPointValue'
import { Dimension } from '../../../src/Domain/ValueObjects/Dimension'
import { MetricName } from '../../../src/Domain/ValueObjects/MetricName'

describe('DataPoint', () => {
  it('create() 建立新 DataPoint', () => {
    const metricName = MetricName.of('commerce.revenue')
    const value = DataPointValue.of(10000, 'currency_cents')
    const timestamp = new Date('2026-02-28T10:00:00Z')
    const dp = DataPoint.create('dp-1', metricName, value, timestamp, 'commerce:order-placed')
    expect(dp.id).toBe('dp-1')
    expect(dp.metricName).toEqual(metricName)
    expect(dp.value).toEqual(value)
    expect(dp.source).toBe('commerce:order-placed')
  })

  it('create() 帶維度', () => {
    const metricName = MetricName.of('commerce.revenue')
    const value = DataPointValue.of(100)
    const dims = [Dimension.of('category', 'electronics')]
    const dp = DataPoint.create('dp-1', metricName, value, new Date(), 'event', dims)
    expect(dp.dimensions.length).toBe(1)
    expect(dp.dimensions[0].equals(dims[0])).toBe(true)
  })

  it('reconstitute() 重建 DataPoint', () => {
    const metricName = MetricName.of('commerce.order_volume')
    const value = DataPointValue.of(5, 'count')
    const timestamp = new Date('2026-02-28T10:00:00Z')
    const props = {
      metricName,
      value,
      timestamp,
      dimensions: [] as any[],
      source: 'test',
      createdAt: new Date(),
    }
    const dp = DataPoint.reconstitute('dp-1', props)
    expect(dp.id).toBe('dp-1')
    expect(dp.metricName).toEqual(metricName)
  })

  it('timestamp 返回防禦性拷貝', () => {
    const original = new Date('2026-02-28T10:00:00Z')
    const metricName = MetricName.of('commerce.revenue')
    const value = DataPointValue.of(100)
    const dp = DataPoint.create('dp-1', metricName, value, original, 'event')
    const retrieved = dp.timestamp
    retrieved.setDate(15)
    expect(dp.timestamp.getDate()).toBe(28)
  })

  it('dimensions 返回防禦性拷貝', () => {
    const metricName = MetricName.of('commerce.revenue')
    const value = DataPointValue.of(100)
    const dims = [Dimension.of('region', 'asia')]
    const dp = DataPoint.create('dp-1', metricName, value, new Date(), 'event', dims)
    const retrieved = dp.dimensions
    retrieved.push(Dimension.of('category', 'electronics'))
    expect(dp.dimensions.length).toBe(1)
  })

  it('hasDimension() 檢查維度是否存在', () => {
    const metricName = MetricName.of('commerce.revenue')
    const value = DataPointValue.of(100)
    const dims = [Dimension.of('category', 'electronics'), Dimension.of('region', 'asia')]
    const dp = DataPoint.create('dp-1', metricName, value, new Date(), 'event', dims)
    expect(dp.hasDimension('category')).toBe(true)
    expect(dp.hasDimension('region')).toBe(true)
    expect(dp.hasDimension('brand')).toBe(false)
  })

  it('getDimensionValue() 取得維度值', () => {
    const metricName = MetricName.of('commerce.revenue')
    const value = DataPointValue.of(100)
    const dims = [Dimension.of('category', 'electronics'), Dimension.of('region', 'asia')]
    const dp = DataPoint.create('dp-1', metricName, value, new Date(), 'event', dims)
    expect(dp.getDimensionValue('category')).toBe('electronics')
    expect(dp.getDimensionValue('region')).toBe('asia')
    expect(dp.getDimensionValue('brand')).toBeUndefined()
  })

  it('createdAt 返回防禦性拷貝', () => {
    const metricName = MetricName.of('commerce.revenue')
    const value = DataPointValue.of(100)
    const dp = DataPoint.create('dp-1', metricName, value, new Date(), 'event')
    const retrieved = dp.createdAt
    retrieved.setDate(15)
    expect(dp.createdAt.getDate()).not.toBe(15)
  })

  it('getter 返回正確的值', () => {
    const metricName = MetricName.of('commerce.revenue')
    const value = DataPointValue.of(5000, 'currency_cents')
    const source = 'commerce:order-placed'
    const dp = DataPoint.create('dp-123', metricName, value, new Date(), source)
    expect(dp.metricName).toEqual(metricName)
    expect(dp.value).toEqual(value)
    expect(dp.source).toBe(source)
  })
})
