import type { MetricResult } from '../../Domain/Contracts/IAnalyticsResolver'
import type {
  MetricQueryContext,
  MetricQueryInput,
} from '../../Domain/DCI/Contexts/MetricQueryContext'

/**
 * QueryMetric UseCase - 查詢單個指標
 * 薄殼委派模式：驗證並轉發給 MetricQueryContext
 */
export class QueryMetric {
  constructor(private queryContext: MetricQueryContext) {}

  async execute(input: MetricQueryInput): Promise<MetricResult> {
    return this.queryContext.query(input)
  }
}
