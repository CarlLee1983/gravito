import { AnalyticsErrorFactory } from '../../../Application/Errors/AnalyticsError'
import type { MetricQuery, MetricResult } from '../../Contracts/IAnalyticsResolver'
import type { ResolverRegistry } from './ResolverRegistryRole'

/**
 * QueryExecutor Role - 執行指標查詢
 * 負責從 registry 取得 resolver 並執行查詢，包括錯誤處理
 */
export interface QueryExecutor {
  execute(query: MetricQuery): Promise<MetricResult>
}

/**
 * 使用閉包注入模式建立 QueryExecutor
 */
export function injectQueryExecutor(registry: ResolverRegistry): QueryExecutor {
  return {
    async execute(query: MetricQuery): Promise<MetricResult> {
      const resolver = registry.get(query.metric)

      if (!resolver) {
        throw AnalyticsErrorFactory.metricNotFound(query.metric.value)
      }

      try {
        return await resolver.resolve(query)
      } catch (error) {
        if (error instanceof Error) {
          throw AnalyticsErrorFactory.resolverExecutionFailed(query.metric.value, error)
        }
        throw AnalyticsErrorFactory.resolverExecutionFailed(
          query.metric.value,
          new Error(String(error))
        )
      }
    },
  }
}
