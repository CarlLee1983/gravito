import type { AggregationType, AnalyticsReport, ChartType } from '../../Entities/AnalyticsReport'
import type { MetricQueryContext } from './MetricQueryContext'

export interface DashboardWidget {
  metricName: string
  period: string
  aggregation: AggregationType
  chartType: ChartType
}

export interface DashboardInput {
  widgets: DashboardWidget[]
}

export class DashboardContext {
  constructor(private readonly queryContext: MetricQueryContext) {}

  async loadDashboard(input: DashboardInput): Promise<AnalyticsReport[]> {
    const results: AnalyticsReport[] = []
    for (const widget of input.widgets) {
      const report = await this.queryContext.queryMetric({
        metricName: widget.metricName,
        period: widget.period,
        aggregation: widget.aggregation,
        chartType: widget.chartType,
      })
      results.push(report)
    }
    return results
  }
}
