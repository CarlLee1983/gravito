import type {
  IDataPointRepository,
  IReportRepository,
} from '../../Domain/Contracts/IAnalyticsRepository'
import type {
  AnalyticsQuery,
  AnalyticsResult,
  IAnalyticsResolver,
} from '../../Domain/Contracts/IAnalyticsResolver'
import { MetricQueryContext } from '../../Domain/DCI/Contexts/MetricQueryContext'
import { MetricName } from '../../Domain/ValueObjects/MetricName'

export class OrderVolumeResolver implements IAnalyticsResolver {
  private dataPointRepo: IDataPointRepository
  private reportRepo: IReportRepository

  constructor(dataPointRepo: IDataPointRepository, reportRepo: IReportRepository) {
    this.dataPointRepo = dataPointRepo
    this.reportRepo = reportRepo
  }

  get metricName(): MetricName {
    return MetricName.of('commerce.order_volume')
  }

  async resolve(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const ctx = new MetricQueryContext(this.dataPointRepo, this.reportRepo)
    const report = await ctx.queryMetric({
      metricName: query.metric.fullName,
      period:
        typeof query.period === 'string'
          ? query.period
          : {
              start: query.period.startDate.toISOString(),
              end: query.period.endDate.toISOString(),
            },
      aggregation: query.aggregation || 'SUM',
      chartType: 'TIMESERIES',
    })

    return {
      chartType: report.chartType,
      dataPoints: report.dataPoints,
      aggregatedValue: report.computeAggregatedValue(),
      summary: report.summary,
    }
  }
}
