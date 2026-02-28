import type { AnalyticsFilters } from '../ValueObjects/AnalyticsFilters'
import type { MetricId } from '../ValueObjects/MetricId'
import type { Period } from '../ValueObjects/Period'

export type ResponseType = 'TIMESERIES' | 'SINGLE_VALUE' | 'PIE' | 'TABLE'

export interface MetricQuery {
  metric: MetricId
  period: Period
  filters: AnalyticsFilters
}

export interface MetricResult {
  type: ResponseType
  data: unknown
  summary?: string
}

export interface IMetricResolver {
  readonly metric: MetricId
  resolve(query: MetricQuery): Promise<MetricResult>
}
