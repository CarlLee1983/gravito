import { describe, expect, it } from 'bun:test'
import { AnalyticsError } from '../../../../src/Application/Errors/AnalyticsError'
import type { IMetricResolver } from '../../../../src/Domain/Contracts/IAnalyticsResolver'
import { ResolverManagementContext } from '../../../../src/Domain/DCI/Contexts/index.ts'
import { MetricId } from '../../../../src/Domain/ValueObjects/MetricId'

describe('ResolverManagementContext', () => {
  const createMockResolver = (metric: string): IMetricResolver => ({
    metric: MetricId.of(metric),
    resolve: async () => ({
      type: 'SINGLE_VALUE' as const,
      data: 0,
    }),
  })

  it('應該建立空的管理上下文', () => {
    const context = new ResolverManagementContext()

    expect(context.listMetrics().length).toBe(0)
  })

  it('應該使用初始化的 resolver 建立上下文', () => {
    const initialResolvers = [createMockResolver('metric_one'), createMockResolver('metric_two')]

    const context = new ResolverManagementContext(initialResolvers)

    const metrics = context.listMetrics()
    expect(metrics.length).toBe(2)
    expect(metrics.map((m) => m.value)).toContain('metric_one')
    expect(metrics.map((m) => m.value)).toContain('metric_two')
  })

  it('應該能動態註冊新 resolver', () => {
    const context = new ResolverManagementContext()
    const resolver = createMockResolver('dynamic_metric')

    context.registerResolver(resolver)

    const metrics = context.listMetrics()
    expect(metrics.length).toBe(1)
    expect(metrics[0].value).toBe('dynamic_metric')
  })

  it('應該拒絕重複註冊相同的 metric', () => {
    const context = new ResolverManagementContext()
    const resolver1 = createMockResolver('duplicate_metric')
    const resolver2 = createMockResolver('duplicate_metric')

    context.registerResolver(resolver1)

    expect(() => {
      context.registerResolver(resolver2)
    }).toThrow(AnalyticsError)
  })

  it('應該列出所有註冊的指標', () => {
    const context = new ResolverManagementContext()

    context.registerResolver(createMockResolver('metric_a'))
    context.registerResolver(createMockResolver('metric_b'))
    context.registerResolver(createMockResolver('metric_c'))

    const metrics = context.listMetrics()

    expect(metrics.length).toBe(3)
    expect(metrics.every((m) => m instanceof MetricId)).toBe(true)
  })

  it('應該對初始化和動態註冊的 resolver 一視同仁', () => {
    const initialResolvers = [createMockResolver('initial_metric')]
    const context = new ResolverManagementContext(initialResolvers)

    context.registerResolver(createMockResolver('dynamic_metric'))

    const metrics = context.listMetrics()

    expect(metrics.length).toBe(2)
    expect(metrics.map((m) => m.value)).toContain('initial_metric')
    expect(metrics.map((m) => m.value)).toContain('dynamic_metric')
  })
})
