import type { AnalyticsReport, ChartType } from '../../Entities/AnalyticsReport'
import type { DataPoint } from '../../Entities/DataPoint'

export interface ReportBuilder {
  populateData(dataPoints: DataPoint[]): void
  computeAggregation(): void
  setChartType(chartType: ChartType): void
}

export function injectReportBuilder(report: AnalyticsReport): ReportBuilder {
  return {
    populateData(dataPoints) {
      report.setDataPoints(dataPoints)
    },
    computeAggregation() {
      report.computeSummary()
    },
    setChartType(_chartType) {
      // This would require a setter on AnalyticsReport
      // For now, chartType is set during creation
    },
  }
}
