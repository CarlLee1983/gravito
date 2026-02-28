import { describe, expect, it } from 'bun:test'
import type { MetricQuery, MetricResult } from '../src/Domain/Contracts/IAnalyticsResolver'
import { AnalyticsFilters } from '../src/Domain/ValueObjects/AnalyticsFilters'
import { MetricId } from '../src/Domain/ValueObjects/MetricId'
import { Period } from '../src/Domain/ValueObjects/Period'
import { OrderVolumeResolver } from '../src/Infrastructure/Resolvers/OrderVolumeResolver'

describe('Analytics Satellite', () => {
  describe('OrderVolumeResolver', () => {
    it('應該有正確的 metric 名稱', () => {
      const resolver = new OrderVolumeResolver()

      expect(resolver.metric.value).toBe('order_volume')
    })

    it('應該能解析訂單量數據', async () => {
      const resolver = new OrderVolumeResolver()
      const query: MetricQuery = {
        metric: MetricId.of('order_volume'),
        period: Period.of('7d'),
        filters: AnalyticsFilters.of(),
      }

      const result = await resolver.resolve(query)

      expect(result).toBeDefined()
      expect(result.type).toBe('TIMESERIES')
      expect(result.data).toBeDefined()
      expect(Array.isArray(result.data)).toBe(true)
    })

    it('應該回傳七天的訂單量數據', async () => {
      const resolver = new OrderVolumeResolver()
      const query: MetricQuery = {
        metric: MetricId.of('order_volume'),
        period: Period.of('7d'),
        filters: AnalyticsFilters.of(),
      }

      const result: MetricResult = await resolver.resolve(query)

      expect((result.data as unknown[]).length).toBe(7)
    })

    it('應該包含正確的資料結構', async () => {
      const resolver = new OrderVolumeResolver()
      const query: MetricQuery = {
        metric: MetricId.of('order_volume'),
        period: Period.of('7d'),
        filters: AnalyticsFilters.of(),
      }

      const resultData = await resolver.resolve(query)

      const data = resultData.data as any[]
      data.forEach((point) => {
        expect(point).toHaveProperty('label')
        expect(point).toHaveProperty('value')
        expect(typeof point.label).toBe('string')
        expect(typeof point.value).toBe('number')
      })
    })

    it('應該包含摘要信息', async () => {
      const resolver = new OrderVolumeResolver()
      const query: MetricQuery = {
        metric: MetricId.of('order_volume'),
        period: Period.of('7d'),
        filters: AnalyticsFilters.of(),
      }

      const result: MetricResult = await resolver.resolve(query)

      expect(result.summary).toBeDefined()
      expect(typeof result.summary).toBe('string')
      expect(result.summary!.length).toBeGreaterThan(0)
    })

    it('應該能處理不同的查詢參數', async () => {
      const resolver = new OrderVolumeResolver()

      const query1: MetricQuery = {
        metric: MetricId.of('order_volume'),
        period: Period.of('24h'),
        filters: AnalyticsFilters.of(),
      }
      const result1 = await resolver.resolve(query1)
      expect(result1.data).toBeDefined()

      const query2: MetricQuery = {
        metric: MetricId.of('order_volume'),
        period: Period.of('30d'),
        filters: AnalyticsFilters.of(),
      }
      const result2 = await resolver.resolve(query2)
      expect(result2.data).toBeDefined()
    })

    it('應該能計算周訂單總和', async () => {
      const resolver = new OrderVolumeResolver()
      const query: MetricQuery = {
        metric: MetricId.of('order_volume'),
        period: Period.of('7d'),
        filters: AnalyticsFilters.of(),
      }

      const result: MetricResult = await resolver.resolve(query)

      const total = (result.data as any[]).reduce((sum, point) => sum + point.value, 0)
      expect(total).toBeGreaterThan(0)
      expect(total).toBe(120 + 150 + 80 + 200 + 170 + 250 + 300)
    })
  })
})
