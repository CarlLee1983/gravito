import { describe, expect, it } from 'bun:test'
import { AnalyticsError } from '../../../src/Application/Errors/AnalyticsError'
import { MetricId } from '../../../src/Domain/ValueObjects/MetricId'

describe('MetricId ValueObject', () => {
  it('應該成功建立有效的 MetricId', () => {
    const metricId = MetricId.of('order_volume')

    expect(metricId.value).toBe('order_volume')
  })

  it('應該自動轉換為小寫', () => {
    const metricId = MetricId.of('Order_Volume')

    expect(metricId.value).toBe('order_volume')
  })

  it('應該允許包含數字和底線', () => {
    const metricId = MetricId.of('order_volume_2024')

    expect(metricId.value).toBe('order_volume_2024')
  })

  it('應該拒絕以底線開頭的 ID', () => {
    expect(() => {
      MetricId.of('_order_volume')
    }).toThrow(AnalyticsError)
  })

  it('應該自動轉換大寫字母為小寫', () => {
    const metricId = MetricId.of('OrderVolume')
    expect(metricId.value).toBe('ordervolume')
  })

  it('應該拒絕包含特殊字符的 ID', () => {
    expect(() => {
      MetricId.of('order-volume')
    }).toThrow(AnalyticsError)
  })

  it('應該拒絕不以字母開頭的 ID', () => {
    expect(() => {
      MetricId.of('1order_volume')
    }).toThrow(AnalyticsError)
  })

  it('兩個相同值的 MetricId 應該相等', () => {
    const id1 = MetricId.of('order_volume')
    const id2 = MetricId.of('order_volume')

    expect(id1.equals(id2)).toBe(true)
  })
})
