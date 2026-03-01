import { describe, expect, it } from 'bun:test'
import { AnalyticsMapper } from '../../../src/Application/DTOs/AnalyticsDTO'
import { AnalyticsReport } from '../../../src/Domain/Entities/AnalyticsReport'
import { DataPoint } from '../../../src/Domain/Entities/DataPoint'
import { DataPointValue } from '../../../src/Domain/ValueObjects/DataPointValue'
import { Dimension } from '../../../src/Domain/ValueObjects/Dimension'
import { MetricName } from '../../../src/Domain/ValueObjects/MetricName'
import { TimePeriod } from '../../../src/Domain/ValueObjects/TimePeriod'

describe('AnalyticsMapper', () => {
  it('toDataPointDTO() 轉換 DataPoint', () => {
    const metricName = MetricName.of('commerce.revenue')
    const timestamp = new Date('2026-02-28T10:00:00Z')
    const dp = DataPoint.create(
      'dp-1',
      metricName,
      DataPointValue.of(1000, 'currency_cents'),
      timestamp,
      'event'
    )
    const dto = AnalyticsMapper.toDataPointDTO(dp)

    expect(dto.id).toBe('dp-1')
    expect(dto.metric).toBe('commerce.revenue')
    expect(dto.value).toBe(1000)
    expect(dto.unit).toBe('currency_cents')
    expect(dto.timestamp).toBe('2026-02-28T10:00:00.000Z')
    expect(dto.source).toBe('event')
  })

  it('toDataPointDTO() 帶維度', () => {
    const metricName = MetricName.of('commerce.revenue')
    const dims = [Dimension.of('category', 'electronics'), Dimension.of('region', 'asia')]
    const dp = DataPoint.create(
      'dp-1',
      metricName,
      DataPointValue.of(100),
      new Date(),
      'event',
      dims
    )
    const dto = AnalyticsMapper.toDataPointDTO(dp)

    expect(dto.dimensions).toEqual({ category: 'electronics', region: 'asia' })
  })

  it('toReportDTO() 轉換 AnalyticsReport', () => {
    const metricName = MetricName.of('commerce.revenue')
    const period = TimePeriod.fromPreset('7d')
    const report = AnalyticsReport.create('report-1', metricName, period, 'SUM', 'TIMESERIES')
    const dp = DataPoint.create('dp-1', metricName, DataPointValue.of(1000), new Date(), 'event')
    report.setDataPoints([dp])
    report.setAggregatedValue(1000)
    report.setSummary('commerce.revenue SUM = 1000')

    const dto = AnalyticsMapper.toReportDTO(report)

    expect(dto.id).toBe('report-1')
    expect(dto.metric).toBe('commerce.revenue')
    expect(dto.aggregation).toBe('SUM')
    expect(dto.chartType).toBe('TIMESERIES')
    expect(dto.dataPoints).toHaveLength(1)
    expect(dto.aggregatedValue).toBe(1000)
    expect(dto.summary).toBeDefined()
  })

  it('toDataPointDTO() 無維度時返回空物件', () => {
    const metricName = MetricName.of('test.metric')
    const dp = DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event', [])
    const dto = AnalyticsMapper.toDataPointDTO(dp)

    expect(dto.dimensions).toEqual({})
  })
})
