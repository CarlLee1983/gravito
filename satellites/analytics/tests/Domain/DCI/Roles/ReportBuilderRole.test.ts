import { describe, expect, it } from 'bun:test'
import { AnalyticsError } from '../../../../src/Application/Errors/AnalyticsError'
import { injectReportBuilder } from '../../../../src/Domain/DCI/Roles/ReportBuilderRole'
import { AnalyticsReport } from '../../../../src/Domain/Entities/AnalyticsReport'
import { DataPoint } from '../../../../src/Domain/Entities/DataPoint'
import { DataPointValue } from '../../../../src/Domain/ValueObjects/DataPointValue'
import { MetricName } from '../../../../src/Domain/ValueObjects/MetricName'
import { TimePeriod } from '../../../../src/Domain/ValueObjects/TimePeriod'

describe('ReportBuilderRole', () => {
  // --- populateData ---

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
    expect(report.isEmpty).toBe(false)
  })

  it('populateData() 驗證指標匹配性', () => {
    const metric1 = MetricName.of('commerce.revenue')
    const metric2 = MetricName.of('commerce.order_volume')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metric1, period, 'SUM', 'TIMESERIES')
    const builder = injectReportBuilder(report)

    const dps = [
      DataPoint.create('dp-1', metric1, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metric2, DataPointValue.of(200), new Date(), 'event'),
    ]
    expect(() => builder.populateData(dps)).toThrow(AnalyticsError)
  })

  it('populateData() 全部指標不匹配時拋出錯誤', () => {
    const metric1 = MetricName.of('commerce.revenue')
    const metric2 = MetricName.of('membership.signups')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metric1, period, 'SUM', 'TIMESERIES')
    const builder = injectReportBuilder(report)

    const dps = [DataPoint.create('dp-1', metric2, DataPointValue.of(100), new Date(), 'event')]
    expect(() => builder.populateData(dps)).toThrow(AnalyticsError)
  })

  it('populateData() 空資料點陣列合法', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    const builder = injectReportBuilder(report)

    builder.populateData([])
    expect(report.dataPointCount).toBe(0)
    expect(report.isEmpty).toBe(true)
  })

  // --- computeAggregation ---

  it('computeAggregation() SUM 聚合', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    const builder = injectReportBuilder(report)

    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(200), new Date(), 'event'),
      DataPoint.create('dp-3', metricName, DataPointValue.of(300), new Date(), 'event'),
    ]
    builder.populateData(dps)
    builder.computeAggregation()

    expect(report.aggregatedValue).toBe(600)
    expect(report.summary).not.toBeNull()
    expect(report.summary).toContain('600')
  })

  it('computeAggregation() AVG 聚合', () => {
    const metricName = MetricName.of('commerce.order_volume')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'AVG', 'SINGLE_VALUE')
    const builder = injectReportBuilder(report)

    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(200), new Date(), 'event'),
    ]
    builder.populateData(dps)
    builder.computeAggregation()

    expect(report.aggregatedValue).toBe(150)
    expect(report.summary).toContain('150')
  })

  it('computeAggregation() COUNT 聚合', () => {
    const metricName = MetricName.of('membership.signups')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'COUNT', 'SINGLE_VALUE')
    const builder = injectReportBuilder(report)

    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(1), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(1), new Date(), 'event'),
      DataPoint.create('dp-3', metricName, DataPointValue.of(1), new Date(), 'event'),
    ]
    builder.populateData(dps)
    builder.computeAggregation()

    expect(report.aggregatedValue).toBe(3)
  })

  it('computeAggregation() MIN 聚合', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'MIN', 'TIMESERIES')
    const builder = injectReportBuilder(report)

    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(50), new Date(), 'event'),
      DataPoint.create('dp-3', metricName, DataPointValue.of(200), new Date(), 'event'),
    ]
    builder.populateData(dps)
    builder.computeAggregation()

    expect(report.aggregatedValue).toBe(50)
  })

  it('computeAggregation() MAX 聚合', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'MAX', 'TIMESERIES')
    const builder = injectReportBuilder(report)

    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(50), new Date(), 'event'),
      DataPoint.create('dp-3', metricName, DataPointValue.of(200), new Date(), 'event'),
    ]
    builder.populateData(dps)
    builder.computeAggregation()

    expect(report.aggregatedValue).toBe(200)
  })

  it('computeAggregation() 空報告設置 "無資料" 摘要', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    const builder = injectReportBuilder(report)

    builder.computeAggregation()

    expect(report.aggregatedValue).toBe(0)
    expect(report.summary).toBe('無資料')
  })

  it('computeAggregation() 生成包含指標名稱和資料點數的摘要', () => {
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

    expect(report.summary).toContain('commerce.revenue')
    expect(report.summary).toContain('300')
    expect(report.summary).toContain('2')
  })

  // --- setChartType ---

  it('setChartType() chartType 建立時不可變', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    const builder = injectReportBuilder(report)

    builder.setChartType('PIE')
    // chartType 在建立時設置，無法修改
    expect(report.chartType).toBe('TIMESERIES')
  })

  // --- 完整流程 ---

  it('完整流程：populate -> aggregate -> markAsGenerated', () => {
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
    expect(report.aggregatedValue).toBe(60)
    expect(report.summary).toBeDefined()

    report.markAsGenerated()
    const events = report.pullDomainEvents()
    expect(events.length).toBe(1)
    expect(events[0]?.eventName).toBe('analytics.report_generated')
  })
})
