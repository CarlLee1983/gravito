import type { AnalyticsReport } from '../Entities/AnalyticsReport'
import type { DataPoint } from '../Entities/DataPoint'
import type { Dimension } from '../ValueObjects/Dimension'
import type { MetricName } from '../ValueObjects/MetricName'
import type { TimePeriod } from '../ValueObjects/TimePeriod'

export interface IDataPointRepository {
  save(dataPoint: DataPoint): Promise<void>
  saveBatch(dataPoints: DataPoint[]): Promise<void>
  findByMetric(metricName: MetricName, period: TimePeriod): Promise<DataPoint[]>
  findByMetricAndDimensions(
    metricName: MetricName,
    period: TimePeriod,
    dimensions: Dimension[]
  ): Promise<DataPoint[]>
  count(metricName: MetricName, period: TimePeriod): Promise<number>
  deleteByMetric(metricName: MetricName): Promise<void>
}

export interface IReportRepository {
  save(report: AnalyticsReport): Promise<void>
  findById(id: string): Promise<AnalyticsReport | null>
  findRecent(limit: number): Promise<AnalyticsReport[]>
  delete(id: string): Promise<void>
}
