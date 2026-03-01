import type { IDataPointRepository, IReportRepository } from '../../Contracts/IAnalyticsRepository'
import {
  type AggregationType,
  AnalyticsReport,
  type ChartType,
} from '../../Entities/AnalyticsReport'
import type { DataPoint } from '../../Entities/DataPoint'
import { Dimension } from '../../ValueObjects/Dimension'
import { MetricName } from '../../ValueObjects/MetricName'
import { type PeriodPreset, TimePeriod } from '../../ValueObjects/TimePeriod'
import { injectReportBuilder } from '../Roles/ReportBuilderRole'

export interface QueryMetricInput {
  metricName: string
  period: string | { start: string; end: string }
  dimensions?: Array<{ key: string; value: string }>
  aggregation?: AggregationType
  chartType?: ChartType
}

export class MetricQueryContext {
  constructor(
    private readonly dataPointRepo: IDataPointRepository,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _reportRepo: IReportRepository
  ) {}

  async queryMetric(input: QueryMetricInput): Promise<AnalyticsReport> {
    const metricName = MetricName.of(input.metricName)
    const period = this.parsePeriod(input.period)
    const dimensions = (input.dimensions ?? []).map((d) => Dimension.of(d.key, d.value))
    const aggregation = input.aggregation ?? 'SUM'
    const chartType = input.chartType ?? 'TIMESERIES'

    let dataPoints: DataPoint[]
    if (dimensions.length > 0) {
      dataPoints = await this.dataPointRepo.findByMetricAndDimensions(
        metricName,
        period,
        dimensions
      )
    } else {
      dataPoints = await this.dataPointRepo.findByMetric(metricName, period)
    }

    const report = AnalyticsReport.create(
      `report-${Date.now()}-${Math.random()}`,
      metricName,
      period,
      aggregation,
      chartType
    )

    const builder = injectReportBuilder(report)
    builder.populateData(dataPoints)
    builder.computeAggregation()

    return report
  }

  async queryTimeSeries(input: QueryMetricInput): Promise<AnalyticsReport> {
    const result = await this.queryMetric({
      ...input,
      chartType: 'TIMESERIES',
    })
    return result
  }

  private parsePeriod(period: string | { start: string; end: string }): TimePeriod {
    if (typeof period === 'string') {
      return TimePeriod.fromPreset(period as PeriodPreset)
    }
    return TimePeriod.ofRange(new Date(period.start), new Date(period.end))
  }
}
