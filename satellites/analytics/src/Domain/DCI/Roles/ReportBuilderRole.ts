import { AnalyticsError } from '../../../Application/Errors/AnalyticsError'
import type { AnalyticsReport, ChartType } from '../../Entities/AnalyticsReport'
import type { DataPoint } from '../../Entities/DataPoint'
import { createMetricAggregator } from './MetricAggregatorRole'

export interface ReportBuilder {
  /** 填充資料點（含驗證） */
  populateData(dataPoints: DataPoint[]): void
  /** 計算聚合值與摘要 */
  computeAggregation(): void
  /** 設置圖表類型 */
  setChartType(chartType: ChartType): void
}

/**
 * 將報告構建角色注入到 AnalyticsReport 實體中
 *
 * 職責：
 * - 驗證資料點與指標的匹配性
 * - 透過 MetricAggregatorRole 計算聚合值
 * - 生成摘要文本
 */
export function injectReportBuilder(report: AnalyticsReport): ReportBuilder {
  return {
    populateData(dataPoints) {
      // 驗證邏輯：業務規則應在此執行
      for (const dp of dataPoints) {
        if (!dp.metricName.equals(report.metricName)) {
          throw AnalyticsError.invalidMetricName(
            `指標不匹配：${dp.metricName.fullName} vs ${report.metricName.fullName}`
          )
        }
      }
      report.setDataPoints(dataPoints)
    },

    computeAggregation() {
      if (report.isEmpty) {
        report.setSummary('無資料')
        report.setAggregatedValue(0)
        return
      }

      // 透過 Role 執行聚合計算
      const aggregator = createMetricAggregator()
      const aggregatedValue = aggregator.aggregate(report.dataPoints, report.aggregation)

      // 設置聚合值供 markAsGenerated() 使用
      report.setAggregatedValue(aggregatedValue)

      // 生成摘要
      const metricName = report.metricName.fullName
      const summary =
        `${metricName} 在 ${report.period.toString()} 的${report.aggregation}值為 ${aggregatedValue.toFixed(2)}` +
        `（共 ${report.dataPointCount} 個資料點）`

      report.setSummary(summary)
    },

    setChartType(_chartType) {
      // chartType 在建立時設置，無法修改
      // 如需支援動態修改，可在 Entity 中添加 setChartType()
    },
  }
}
