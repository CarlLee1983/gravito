import { describe, expect, it } from 'bun:test'
import { AnalyticsError } from '../../../../src/Application/Errors/AnalyticsError'
import type { IMetricResolver } from '../../../../src/Domain/Contracts/IAnalyticsResolver'
import {
  MetricQueryContext,
  type MetricQueryInput,
  ResolverManagementContext,
} from '../../../../src/Domain/DCI/Contexts/index.ts'
import { MetricId } from '../../../../src/Domain/ValueObjects/MetricId'

describe('MetricQueryContext', () => {
  const createMockResolver = (metric: string, shouldFail = false): IMetricResolver => ({
    metric: MetricId.of(metric),
    resolve: async () => {
      if (shouldFail) {
        throw new Error('Test error')
      }
      return {
        type: 'SINGLE_VALUE' as const,
        data: 100,
        summary: 'Test summary',
      }
    },
  })

  it('應該成功執行完整的查詢流程', async () => {
    const managementContext = new ResolverManagementContext([createMockResolver('order_volume')])
    const queryContext = new MetricQueryContext(managementContext)

    const input: MetricQueryInput = {
      metric: 'order_volume',
      period: '7d',
    }

    const result = await queryContext.query(input)

    expect(result.type).toBe('SINGLE_VALUE')
    expect(result.data).toBe(100)
    expect(result.summary).toBe('Test summary')
  })

  it('應該驗證無效的 metric ID', async () => {
    const managementContext = new ResolverManagementContext()
    const queryContext = new MetricQueryContext(managementContext)

    const input: MetricQueryInput = {
      metric: 'Invalid-Metric-Name',
      period: '7d',
    }

    expect(async () => {
      await queryContext.query(input)
    }).toThrow(AnalyticsError)
  })

  it('應該拒絕無效的期間', async () => {
    const managementContext = new ResolverManagementContext([createMockResolver('test_metric')])
    const queryContext = new MetricQueryContext(managementContext)

    const input: MetricQueryInput = {
      metric: 'test_metric',
      period: 'invalid_period',
    }

    expect(async () => {
      await queryContext.query(input)
    }).toThrow(AnalyticsError)
  })

  it('應該在 metric 未註冊時拋出錯誤', async () => {
    const managementContext = new ResolverManagementContext()
    const queryContext = new MetricQueryContext(managementContext)

    const input: MetricQueryInput = {
      metric: 'unregistered_metric',
    }

    expect(async () => {
      await queryContext.query(input)
    }).toThrow(AnalyticsError)
  })

  it('應該使用預設期間 7d', async () => {
    const managementContext = new ResolverManagementContext([createMockResolver('test_metric')])
    const queryContext = new MetricQueryContext(managementContext)

    const input: MetricQueryInput = {
      metric: 'test_metric',
      // 未提供 period，應使用預設值
    }

    const result = await queryContext.query(input)

    expect(result).toBeDefined()
    expect(result.data).toBe(100)
  })

  it('應該接受篩選條件參數', async () => {
    const managementContext = new ResolverManagementContext([createMockResolver('test_metric')])
    const queryContext = new MetricQueryContext(managementContext)

    const input: MetricQueryInput = {
      metric: 'test_metric',
      period: '30d',
      filters: { region: 'taipei', category: 'electronics' },
    }

    const result = await queryContext.query(input)

    expect(result).toBeDefined()
    expect(result.data).toBe(100)
  })

  it('應該在 resolver 拋出異常時包裝錯誤', async () => {
    const managementContext = new ResolverManagementContext([
      createMockResolver('failing_metric', true),
    ])
    const queryContext = new MetricQueryContext(managementContext)

    const input: MetricQueryInput = {
      metric: 'failing_metric',
    }

    expect(async () => {
      await queryContext.query(input)
    }).toThrow(AnalyticsError)
  })

  it('應該支持所有允許的期間值', async () => {
    const managementContext = new ResolverManagementContext([createMockResolver('test_metric')])
    const queryContext = new MetricQueryContext(managementContext)

    const periods = ['24h', '7d', '30d', '90d'] as const

    for (const period of periods) {
      const input: MetricQueryInput = {
        metric: 'test_metric',
        period,
      }

      const result = await queryContext.query(input)

      expect(result).toBeDefined()
    }
  })
})
