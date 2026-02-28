import { describe, expect, it } from 'bun:test'
import { AnalyticsError } from '../../../../src/Application/Errors/AnalyticsError'
import type { IMetricResolver } from '../../../../src/Domain/Contracts/IAnalyticsResolver'
import { injectResolverRegistry } from '../../../../src/Domain/DCI/Roles/index.ts'
import { MetricId } from '../../../../src/Domain/ValueObjects/MetricId'

describe('ResolverRegistryRole', () => {
  const createMockResolver = (metric: string): IMetricResolver => ({
    metric: MetricId.of(metric),
    resolve: async () => ({
      type: 'SINGLE_VALUE' as const,
      data: 42,
    }),
  })

  it('應該成功註冊一個 resolver', () => {
    const storage = new Map()
    const registry = injectResolverRegistry(storage)
    const resolver = createMockResolver('test_metric')

    registry.register(resolver)

    expect(registry.has(MetricId.of('test_metric'))).toBe(true)
  })

  it('應該能取得已註冊的 resolver', () => {
    const storage = new Map()
    const registry = injectResolverRegistry(storage)
    const resolver = createMockResolver('test_metric')

    registry.register(resolver)
    const retrieved = registry.get(MetricId.of('test_metric'))

    expect(retrieved).toBe(resolver)
  })

  it('應該在 resolver 不存在時回傳 null', () => {
    const storage = new Map()
    const registry = injectResolverRegistry(storage)

    const retrieved = registry.get(MetricId.of('nonexistent'))

    expect(retrieved).toBeNull()
  })

  it('應該拒絕重複註冊相同的 metric', () => {
    const storage = new Map()
    const registry = injectResolverRegistry(storage)
    const resolver1 = createMockResolver('test_metric')
    const resolver2 = createMockResolver('test_metric')

    registry.register(resolver1)

    expect(() => {
      registry.register(resolver2)
    }).toThrow(AnalyticsError)
  })

  it('應該列出所有已註冊的 metric ID', () => {
    const storage = new Map()
    const registry = injectResolverRegistry(storage)

    registry.register(createMockResolver('metric_one'))
    registry.register(createMockResolver('metric_two'))
    registry.register(createMockResolver('metric_three'))

    const metrics = registry.getAll()

    expect(metrics.length).toBe(3)
    expect(metrics.map((m) => m.value)).toContain('metric_one')
    expect(metrics.map((m) => m.value)).toContain('metric_two')
    expect(metrics.map((m) => m.value)).toContain('metric_three')
  })

  it('應該正確檢查 metric 是否存在', () => {
    const storage = new Map()
    const registry = injectResolverRegistry(storage)

    registry.register(createMockResolver('existing_metric'))

    expect(registry.has(MetricId.of('existing_metric'))).toBe(true)
    expect(registry.has(MetricId.of('nonexistent_metric'))).toBe(false)
  })

  it('應該在空 registry 時回傳空列表', () => {
    const storage = new Map()
    const registry = injectResolverRegistry(storage)

    const metrics = registry.getAll()

    expect(metrics.length).toBe(0)
  })
})
