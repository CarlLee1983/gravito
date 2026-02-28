import type { AggregationType, ChartType } from '../Entities/AnalyticsReport'
import type { DataPoint } from '../Entities/DataPoint'
import type { Dimension } from '../ValueObjects/Dimension'
import type { MetricName } from '../ValueObjects/MetricName'
import type { TimePeriod } from '../ValueObjects/TimePeriod'

export interface AnalyticsQuery {
  metric: MetricName
  period: TimePeriod
  dimensions?: Dimension[]
  aggregation?: AggregationType
}

export interface AnalyticsResult {
  chartType: ChartType
  dataPoints: DataPoint[]
  aggregatedValue: number
  summary: string | null
}

export interface IAnalyticsResolver {
  metricName: MetricName
  resolve(query: AnalyticsQuery): Promise<AnalyticsResult>
}
