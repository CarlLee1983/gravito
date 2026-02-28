export type AnalyticsErrorCode =
  | 'METRIC_NOT_FOUND'
  | 'INVALID_METRIC_NAME'
  | 'INVALID_PERIOD'
  | 'INVALID_DATE_RANGE'
  | 'INVALID_AGGREGATION'
  | 'INVALID_DATA_POINT_VALUE'
  | 'REPORT_NOT_FOUND'
  | 'DIMENSION_NOT_SUPPORTED'
  | 'RESOLVER_NOT_REGISTERED'
  | 'DATA_INGESTION_FAILED'

export class AnalyticsError extends Error {
  public readonly code: AnalyticsErrorCode
  public readonly statusCode: number

  constructor(code: AnalyticsErrorCode, message: string, statusCode = 400) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    this.name = 'AnalyticsError'
    Object.setPrototypeOf(this, AnalyticsError.prototype)
  }

  static metricNotFound(metricName: string): AnalyticsError {
    return new AnalyticsError('METRIC_NOT_FOUND', `指標 '${metricName}' 不存在`, 404)
  }

  static invalidMetricName(reason: string): AnalyticsError {
    return new AnalyticsError('INVALID_METRIC_NAME', `無效的指標名稱：${reason}`, 400)
  }

  static invalidPeriod(reason: string): AnalyticsError {
    return new AnalyticsError('INVALID_PERIOD', `無效的時間區間：${reason}`, 400)
  }

  static invalidDateRange(startDate: Date, endDate: Date): AnalyticsError {
    return new AnalyticsError(
      'INVALID_DATE_RANGE',
      `開始日期 ${startDate.toISOString()} 晚於結束日期 ${endDate.toISOString()}`,
      400
    )
  }

  static invalidAggregation(aggregationType: string): AnalyticsError {
    return new AnalyticsError('INVALID_AGGREGATION', `無效的聚合方式：${aggregationType}`, 400)
  }

  static invalidDataPointValue(reason: string): AnalyticsError {
    return new AnalyticsError('INVALID_DATA_POINT_VALUE', `無效的資料點數值：${reason}`, 400)
  }

  static reportNotFound(reportId: string): AnalyticsError {
    return new AnalyticsError('REPORT_NOT_FOUND', `報告 '${reportId}' 不存在`, 404)
  }

  static dimensionNotSupported(dimensionKey: string): AnalyticsError {
    return new AnalyticsError('DIMENSION_NOT_SUPPORTED', `維度 '${dimensionKey}' 不支援`, 400)
  }

  static resolverNotRegistered(metricName: string): AnalyticsError {
    return new AnalyticsError('RESOLVER_NOT_REGISTERED', `指標 '${metricName}' 的解析器未註冊`, 404)
  }

  static dataIngestionFailed(reason: string): AnalyticsError {
    return new AnalyticsError('DATA_INGESTION_FAILED', `資料寫入失敗：${reason}`, 500)
  }
}
