import { describe, expect, it } from 'bun:test'
import { AnalyticsError } from '../../../src/Application/Errors/AnalyticsError'

describe('AnalyticsError', () => {
  it('metricNotFound', () => {
    const error = AnalyticsError.metricNotFound('commerce.revenue')
    expect(error.code).toBe('METRIC_NOT_FOUND')
    expect(error.statusCode).toBe(404)
    expect(error.message).toContain('commerce.revenue')
  })

  it('invalidMetricName', () => {
    const error = AnalyticsError.invalidMetricName('格式錯誤')
    expect(error.code).toBe('INVALID_METRIC_NAME')
    expect(error.statusCode).toBe(400)
  })

  it('invalidPeriod', () => {
    const error = AnalyticsError.invalidPeriod('未知的預設值')
    expect(error.code).toBe('INVALID_PERIOD')
    expect(error.statusCode).toBe(400)
  })

  it('invalidDateRange', () => {
    const start = new Date('2026-02-28')
    const end = new Date('2026-02-01')
    const error = AnalyticsError.invalidDateRange(start, end)
    expect(error.code).toBe('INVALID_DATE_RANGE')
    expect(error.statusCode).toBe(400)
  })

  it('invalidAggregation', () => {
    const error = AnalyticsError.invalidAggregation('INVALID')
    expect(error.code).toBe('INVALID_AGGREGATION')
    expect(error.statusCode).toBe(400)
  })

  it('invalidDataPointValue', () => {
    const error = AnalyticsError.invalidDataPointValue('無限大')
    expect(error.code).toBe('INVALID_DATA_POINT_VALUE')
    expect(error.statusCode).toBe(400)
  })

  it('reportNotFound', () => {
    const error = AnalyticsError.reportNotFound('report-123')
    expect(error.code).toBe('REPORT_NOT_FOUND')
    expect(error.statusCode).toBe(404)
  })

  it('dimensionNotSupported', () => {
    const error = AnalyticsError.dimensionNotSupported('invalid_key')
    expect(error.code).toBe('DIMENSION_NOT_SUPPORTED')
    expect(error.statusCode).toBe(400)
  })

  it('resolverNotRegistered', () => {
    const error = AnalyticsError.resolverNotRegistered('unknown.metric')
    expect(error.code).toBe('RESOLVER_NOT_REGISTERED')
    expect(error.statusCode).toBe(404)
  })

  it('dataIngestionFailed', () => {
    const error = AnalyticsError.dataIngestionFailed('資料庫連線失敗')
    expect(error.code).toBe('DATA_INGESTION_FAILED')
    expect(error.statusCode).toBe(500)
  })

  it('all error codes are defined', () => {
    expect(AnalyticsError.metricNotFound('test').code).toBeDefined()
    expect(AnalyticsError.invalidMetricName('test').code).toBeDefined()
    expect(AnalyticsError.invalidPeriod('test').code).toBeDefined()
    expect(AnalyticsError.invalidAggregation('test').code).toBeDefined()
  })
})
