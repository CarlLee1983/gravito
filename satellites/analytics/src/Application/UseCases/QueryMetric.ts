import { UseCase } from '@gravito/enterprise'
import type {
  IDataPointRepository,
  IReportRepository,
} from '../../Domain/Contracts/IAnalyticsRepository'
import { MetricQueryContext } from '../../Domain/DCI/Contexts/MetricQueryContext'
import type { AggregationType, ChartType } from '../../Domain/Entities/AnalyticsReport'
import type { AnalyticsReportDTO } from '../DTOs/AnalyticsDTO'
import { AnalyticsMapper } from '../DTOs/AnalyticsDTO'

export interface QueryMetricInput {
  metricName: string
  period: string | { start: string; end: string }
  dimensions?: Array<{ key: string; value: string }>
  aggregation?: AggregationType
  chartType?: ChartType
}

export class QueryMetric extends UseCase<QueryMetricInput, AnalyticsReportDTO> {
  constructor(
    private readonly dataPointRepo: IDataPointRepository,
    private readonly reportRepo: IReportRepository
  ) {
    super()
  }

  async execute(input: QueryMetricInput): Promise<AnalyticsReportDTO> {
    const ctx = new MetricQueryContext(this.dataPointRepo, this.reportRepo)
    const report = await ctx.queryMetric(input)
    return AnalyticsMapper.toReportDTO(report)
  }
}
