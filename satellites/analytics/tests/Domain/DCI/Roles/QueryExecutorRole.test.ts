import { describe, expect, it } from 'bun:test'
import { AnalyticsError } from '../../../../src/Application/Errors/AnalyticsError'
import type {
  IMetricResolver,
  MetricQuery,
} from '../../../../src/Domain/Contracts/IAnalyticsResolver'
import {
  injectQueryExecutor,
  injectResolverRegistry,
} from '../../../../src/Domain/DCI/Roles/index.ts'
import { AnalyticsFilters } from '../../../../src/Domain/ValueObjects/AnalyticsFilters'
import { MetricId } from '../../../../src/Domain/ValueObjects/MetricId'
import { Period } from '../../../../src/Domain/ValueObjects/Period'

describe('QueryExecutorRole', () => {
  const createMockResolver = (metric: string, shouldFail = false): IMetricResolver => ({
    metric: MetricId.of(metric),
    resolve: async () => {
      if (shouldFail) {
        throw new Error('Resolver execution failed')
      }
      return {
        type: 'SINGLE_VALUE' as const,
        data: 42,
        summary: 'Mock result',
      }
    },
  })

  it('應該成功執行已註冊的查詢', async () => {
    const storage = new Map()
    const registry = injectResolverRegistry(storage)
    const executor = injectQueryExecutor(registry)

    const resolver = createMockResolver('test_metric')
    registry.register(resolver)

    const query: MetricQuery = {
      metric: MetricId.of('test_metric'),
      period: Period.of('7d'),
      filters: AnalyticsFilters.of(),
    }

    const result = await executor.execute(query)

    expect(result.type).toBe('SINGLE_VALUE')
    expect(result.data).toBe(42)
  })

  it('應該拒絕未註冊的指標', async () => {
    const storage = new Map()
    const registry = injectResolverRegistry(storage)
    const executor = injectQueryExecutor(registry)

    const query: MetricQuery = {
      metric: MetricId.of('unregistered_metric'),
      period: Period.of('7d'),
      filters: AnalyticsFilters.of(),
    }

    expect(async () => {
      await executor.execute(query)
    }).toThrow(AnalyticsError)
  })

  it('應該包裝 resolver 拋出的異常', async () => {
    const storage = new Map()
    const registry = injectResolverRegistry(storage)
    const executor = injectQueryExecutor(registry)

    const resolver = createMockResolver('failing_metric', true)
    registry.register(resolver)

    const query: MetricQuery = {
      metric: MetricId.of('failing_metric'),
      period: Period.of('7d'),
      filters: AnalyticsFilters.of(),
    }

    expect(async () => {
      await executor.execute(query)
    }).toThrow(AnalyticsError)
  })

  it('應該在異常中包含 metric 信息', async () => {
    const storage = new Map()
    const registry = injectResolverRegistry(storage)
    const executor = injectQueryExecutor(registry)

    const query: MetricQuery = {
      metric: MetricId.of('test_metric'),
      period: Period.of('7d'),
      filters: AnalyticsFilters.of(),
    }

    try {
      await executor.execute(query)
    } catch (error) {
      expect(error).toBeInstanceOf(AnalyticsError)
      expect((error as AnalyticsError).message).toContain('test_metric')
    }
  })
})
