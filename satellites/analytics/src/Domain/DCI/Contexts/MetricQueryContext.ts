import type { MetricResult } from '../../Contracts/IAnalyticsResolver'
import { AnalyticsFilters } from '../../ValueObjects/AnalyticsFilters'
import { MetricId } from '../../ValueObjects/MetricId'
import { Period } from '../../ValueObjects/Period'
import { injectQueryExecutor, type QueryExecutor } from '../Roles/QueryExecutorRole'
import type { ResolverManagementContext } from './ResolverManagementContext'

/**
 * 原始查詢輸入 - 客戶端的查詢請求
 */
export interface MetricQueryInput {
  metric: string
  period?: string
  filters?: Record<string, string>
}

/**
 * MetricQueryContext - 執行指標查詢的完整流程
 * 責任：
 * - 驗證並轉換輸入參數為 ValueObjects
 * - 委派 QueryExecutor 角色執行查詢
 * - 包裝錯誤並回傳結果
 */
export class MetricQueryContext {
  private executor: QueryExecutor

  constructor(managementContext: ResolverManagementContext) {
    const registry = managementContext.getRegistry()
    this.executor = injectQueryExecutor(registry)
  }

  /**
   * 執行指標查詢
   * @throws AnalyticsError 如果驗證或執行失敗
   */
  async query(input: MetricQueryInput): Promise<MetricResult> {
    // 轉換原始輸入為 ValueObjects
    const metric = MetricId.of(input.metric)
    const period = Period.of(input.period)
    const filters = AnalyticsFilters.of(input.filters)

    // 委派 QueryExecutor 執行查詢
    return this.executor.execute({
      metric,
      period,
      filters,
    })
  }
}
