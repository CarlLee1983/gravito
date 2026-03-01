import { describe, expect, it } from 'bun:test'
import { AnalyticsReport } from '../../../src/Domain/Entities/AnalyticsReport'
import { DataPoint } from '../../../src/Domain/Entities/DataPoint'
import { DataPointValue } from '../../../src/Domain/ValueObjects/DataPointValue'
import { MetricName } from '../../../src/Domain/ValueObjects/MetricName'
import { TimePeriod } from '../../../src/Domain/ValueObjects/TimePeriod'

describe('AnalyticsReport', () => {
  it('create() 建立新 AnalyticsReport', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    expect(report.id).toBe('report-1')
    expect(report.metricName).toEqual(metricName)
    expect(report.aggregation).toBe('SUM')
    expect(report.chartType).toBe('TIMESERIES')
    expect(report.isEmpty).toBe(true)
  })

  it('reconstitute() 重建 AnalyticsReport', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const props = {
      metricName,
      period,
      aggregation: 'SUM' as const,
      chartType: 'TIMESERIES' as const,
      dataPoints: [] as DataPoint[],
      summary: null,
      generatedAt: new Date(),
    }
    const report = AnalyticsReport.reconstitute('report-1', props)
    expect(report.id).toBe('report-1')
    expect(report.isEmpty).toBe(true)
  })

  it('setDataPoints() 設定所有資料點', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(1000), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(2000), new Date(), 'event'),
    ]
    report.setDataPoints(dps)
    expect(report.dataPointCount).toBe(2)
    expect(report.isEmpty).toBe(false)
  })

  it('setDataPoints() 不進行驗證（驗證由 Role 負責）', () => {
    const metric1 = MetricName.of('commerce.revenue')
    const metric2 = MetricName.of('commerce.order_volume')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metric1, period, 'SUM', 'TIMESERIES')
    const dps = [
      DataPoint.create('dp-1', metric1, DataPointValue.of(1000), new Date(), 'event'),
      DataPoint.create('dp-2', metric2, DataPointValue.of(2000), new Date(), 'event'),
    ]
    // Entity 的 setDataPoints 不驗證指標匹配，驗證在 ReportBuilderRole 中
    report.setDataPoints(dps)
    expect(report.dataPointCount).toBe(2)
  })

  it('setSummary() 設定摘要', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    expect(report.summary).toBeNull()

    report.setSummary('測試摘要')
    expect(report.summary).toBe('測試摘要')
  })

  it('setAggregatedValue() 設定聚合值', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    expect(report.aggregatedValue).toBe(0)

    report.setAggregatedValue(1500)
    expect(report.aggregatedValue).toBe(1500)
  })

  it('aggregatedValue getter 預設為 0', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    expect(report.aggregatedValue).toBe(0)
  })

  it('dataPoints getter 回傳副本', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    const dps = [DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event')]
    report.setDataPoints(dps)

    const copy1 = report.dataPoints
    const copy2 = report.dataPoints
    expect(copy1).not.toBe(copy2)
    expect(copy1).toEqual(copy2)
  })

  it('generatedAt 回傳副本（防止外部修改）', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    const date1 = report.generatedAt
    const date2 = report.generatedAt
    expect(date1).not.toBe(date2)
    expect(date1.getTime()).toBe(date2.getTime())
  })

  it('markAsGenerated() 發出 DomainEvent', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    const dps = [DataPoint.create('dp-1', metricName, DataPointValue.of(1000), new Date(), 'event')]
    report.setDataPoints(dps)
    report.setAggregatedValue(1000)
    report.markAsGenerated()
    const events = report.pullDomainEvents()
    expect(events.length).toBeGreaterThan(0)
    const event = events[0]
    expect(event?.eventName).toBe('analytics.report_generated')
  })

  it('markAsGenerated() 使用 setAggregatedValue 設置的值', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    report.setAggregatedValue(999)
    report.markAsGenerated()
    const events = report.pullDomainEvents()
    expect(events.length).toBe(1)
    // 事件中包含 aggregatedValue
    expect(report.aggregatedValue).toBe(999)
  })
})
