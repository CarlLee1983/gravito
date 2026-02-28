import { AnalyticsErrorFactory } from '../../../Application/Errors/AnalyticsError'
import type { IMetricResolver } from '../../Contracts/IAnalyticsResolver'
import { MetricId } from '../../ValueObjects/MetricId'

/**
 * ResolverRegistry Role - 管理指標解析器的註冊與查詢
 * 使用閉包模式捕獲 storage Map，無外部依賴
 */
export interface ResolverRegistry {
  register(resolver: IMetricResolver): void
  get(metricId: MetricId): IMetricResolver | null
  getAll(): MetricId[]
  has(metricId: MetricId): boolean
}

/**
 * 使用閉包注入模式建立 ResolverRegistry
 */
export function injectResolverRegistry(storage: Map<string, IMetricResolver>): ResolverRegistry {
  return {
    register(resolver: IMetricResolver): void {
      const key = resolver.metric.value
      if (storage.has(key)) {
        throw AnalyticsErrorFactory.resolverAlreadyRegistered(key)
      }
      storage.set(key, resolver)
    },

    get(metricId: MetricId): IMetricResolver | null {
      return storage.get(metricId.value) ?? null
    },

    getAll(): MetricId[] {
      return Array.from(storage.keys()).map((key) => MetricId.of(key))
    },

    has(metricId: MetricId): boolean {
      return storage.has(metricId.value)
    },
  }
}
