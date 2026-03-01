import type { AnalyticsReport } from '../../Domain/Entities/AnalyticsReport'
import type { DataPoint } from '../../Domain/Entities/DataPoint'

export interface DataPointDTO {
  id: string
  metric: string
  value: number
  unit: string | null
  timestamp: string
  dimensions: Record<string, string>
  source: string
}

export interface AnalyticsReportDTO {
  id: string
  metric: string
  period: { start: string; end: string }
  aggregation: string
  chartType: string
  dataPoints: DataPointDTO[]
  aggregatedValue: number
  summary: string | null
  generatedAt: string
}

export class AnalyticsMapper {
  static toDataPointDTO(dp: DataPoint): DataPointDTO {
    const dimensions: Record<string, string> = {}
    for (const dim of dp.dimensions) {
      dimensions[dim.key] = dim.value
    }

    return {
      id: dp.id,
      metric: dp.metricName.fullName,
      value: dp.value.value,
      unit: dp.value.unit,
      timestamp: dp.timestamp.toISOString(),
      dimensions,
      source: dp.source,
    }
  }

  static toReportDTO(report: AnalyticsReport): AnalyticsReportDTO {
    return {
      id: report.id,
      metric: report.metricName.fullName,
      period: {
        start: report.period.startDate.toISOString(),
        end: report.period.endDate.toISOString(),
      },
      aggregation: report.aggregation,
      chartType: report.chartType,
      dataPoints: report.dataPoints.map((dp) => this.toDataPointDTO(dp)),
      aggregatedValue: report.aggregatedValue,
      summary: report.summary,
      generatedAt: report.generatedAt.toISOString(),
    }
  }
}
