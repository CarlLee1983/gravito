import { describe, expect, it } from 'vitest'
import { AnalyticsError } from '../../../src/Application/Errors/AnalyticsError'
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

  it('addDataPoint() 新增資料點', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    const dp = DataPoint.create(
      'dp-1',
      metricName,
      DataPointValue.of(1000, 'currency_cents'),
      new Date(),
      'event'
    )
    report.addDataPoint(dp)
    expect(report.dataPointCount).toBe(1)
    expect(report.isEmpty).toBe(false)
  })

  it('addDataPoint() throws 當指標不匹配', () => {
    const metric1 = MetricName.of('commerce.revenue')
    const metric2 = MetricName.of('commerce.order_volume')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metric1, period, 'SUM', 'TIMESERIES')
    const dp = DataPoint.create('dp-1', metric2, DataPointValue.of(100), new Date(), 'event')
    expect(() => report.addDataPoint(dp)).toThrow(AnalyticsError)
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
  })

  it('setDataPoints() throws 當任何指標不匹配', () => {
    const metric1 = MetricName.of('commerce.revenue')
    const metric2 = MetricName.of('commerce.order_volume')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metric1, period, 'SUM', 'TIMESERIES')
    const dps = [
      DataPoint.create('dp-1', metric1, DataPointValue.of(1000), new Date(), 'event'),
      DataPoint.create('dp-2', metric2, DataPointValue.of(2000), new Date(), 'event'),
    ]
    expect(() => report.setDataPoints(dps)).toThrow(AnalyticsError)
  })

  it('computeAggregatedValue() SUM 聚合', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(200), new Date(), 'event'),
      DataPoint.create('dp-3', metricName, DataPointValue.of(300), new Date(), 'event'),
    ]
    report.setDataPoints(dps)
    expect(report.computeAggregatedValue()).toBe(600)
  })

  it('computeAggregatedValue() AVG 聚合', () => {
    const metricName = MetricName.of('commerce.order_volume')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'AVG', 'SINGLE_VALUE')
    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(200), new Date(), 'event'),
    ]
    report.setDataPoints(dps)
    expect(report.computeAggregatedValue()).toBe(150)
  })

  it('computeAggregatedValue() COUNT 聚合', () => {
    const metricName = MetricName.of('membership.signups')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'COUNT', 'SINGLE_VALUE')
    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(1), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(1), new Date(), 'event'),
      DataPoint.create('dp-3', metricName, DataPointValue.of(1), new Date(), 'event'),
    ]
    report.setDataPoints(dps)
    expect(report.computeAggregatedValue()).toBe(3)
  })

  it('computeAggregatedValue() MIN 聚合', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'MIN', 'TIMESERIES')
    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(50), new Date(), 'event'),
      DataPoint.create('dp-3', metricName, DataPointValue.of(200), new Date(), 'event'),
    ]
    report.setDataPoints(dps)
    expect(report.computeAggregatedValue()).toBe(50)
  })

  it('computeAggregatedValue() MAX 聚合', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'MAX', 'TIMESERIES')
    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(50), new Date(), 'event'),
      DataPoint.create('dp-3', metricName, DataPointValue.of(200), new Date(), 'event'),
    ]
    report.setDataPoints(dps)
    expect(report.computeAggregatedValue()).toBe(200)
  })

  it('computeAggregatedValue() 空報告返回 0', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    expect(report.computeAggregatedValue()).toBe(0)
  })

  it('computeSummary() 生成摘要', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(200), new Date(), 'event'),
    ]
    report.setDataPoints(dps)
    report.computeSummary()
    expect(report.summary).toContain('commerce.revenue')
    expect(report.summary).toContain('300')
    expect(report.summary).toContain('2')
  })

  it('computeSummary() 空報告', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    report.computeSummary()
    expect(report.summary).toBe('無資料')
  })

  it('markAsGenerated() 發出 DomainEvent', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    const dps = [DataPoint.create('dp-1', metricName, DataPointValue.of(1000), new Date(), 'event')]
    report.setDataPoints(dps)
    report.markAsGenerated()
    const events = report.pullDomainEvents()
    expect(events.length).toBeGreaterThan(0)
    const event = events[0]
    expect(event?.eventName).toBe('analytics.report_generated')
  })
})
