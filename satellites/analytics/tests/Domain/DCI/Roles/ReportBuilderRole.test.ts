import { describe, expect, it } from 'bun:test'
import { injectReportBuilder } from '../../../../src/Domain/DCI/Roles/ReportBuilderRole'
import { AnalyticsReport } from '../../../../src/Domain/Entities/AnalyticsReport'
import { DataPoint } from '../../../../src/Domain/Entities/DataPoint'
import { DataPointValue } from '../../../../src/Domain/ValueObjects/DataPointValue'
import { MetricName } from '../../../../src/Domain/ValueObjects/MetricName'
import { TimePeriod } from '../../../../src/Domain/ValueObjects/TimePeriod'

describe('ReportBuilderRole', () => {
  it('populateData() 設定資料點', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    const builder = injectReportBuilder(report)

    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(200), new Date(), 'event'),
    ]
    builder.populateData(dps)
    expect(report.dataPointCount).toBe(2)
  })

  it('computeAggregation() 計算摘要', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    const builder = injectReportBuilder(report)

    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(200), new Date(), 'event'),
    ]
    builder.populateData(dps)
    builder.computeAggregation()
    expect(report.summary).not.toBeNull()
    expect(report.summary).toContain('300')
  })

  it('setChartType() 設定圖表類型', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    const builder = injectReportBuilder(report)

    builder.setChartType('PIE')
    // Currently chartType is immutable, set at creation
    expect(report.chartType).toBe('TIMESERIES')
  })

  it('完整流程：populate -> aggregate', () => {
    const metricName = MetricName.of('commerce.order_volume')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    const builder = injectReportBuilder(report)

    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(10), new Date(), 'event1'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(20), new Date(), 'event2'),
      DataPoint.create('dp-3', metricName, DataPointValue.of(30), new Date(), 'event3'),
    ]

    builder.populateData(dps)
    builder.computeAggregation()

    expect(report.dataPointCount).toBe(3)
    expect(report.computeAggregatedValue()).toBe(60)
    expect(report.summary).toBeDefined()
  })
})
