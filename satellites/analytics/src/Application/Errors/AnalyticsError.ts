export type AnalyticsErrorCode =
  | 'METRIC_NOT_FOUND'
  | 'INVALID_PERIOD'
  | 'INVALID_METRIC_ID'
  | 'INVALID_FILTER'
  | 'RESOLVER_EXECUTION_FAILED'
  | 'RESOLVER_ALREADY_REGISTERED'

export interface AnalyticsErrorOptions {
  cause?: Error
  context?: Record<string, unknown>
}

export class AnalyticsError extends Error {
  readonly code: AnalyticsErrorCode
  readonly statusCode: number
  readonly context?: Record<string, unknown>

  constructor(
    code: AnalyticsErrorCode,
    message: string,
    statusCode: number,
    options?: AnalyticsErrorOptions
  ) {
    super(message)
    this.name = 'AnalyticsError'
    this.code = code
    this.statusCode = statusCode
    this.context = options?.context

    if (options?.cause) {
      this.cause = options.cause
    }

    Object.setPrototypeOf(this, AnalyticsError.prototype)
  }
}

export const AnalyticsErrorFactory = {
  metricNotFound: (metric: string, options?: AnalyticsErrorOptions): AnalyticsError =>
    new AnalyticsError('METRIC_NOT_FOUND', `指標 "${metric}" 未被註冊`, 404, {
      ...options,
      context: { metric, ...options?.context },
    }),

  invalidPeriod: (period: string, options?: AnalyticsErrorOptions): AnalyticsError =>
    new AnalyticsError(
      'INVALID_PERIOD',
      `期間 "${period}" 無效，允許值為：24h、7d、30d、90d`,
      400,
      { ...options, context: { period, ...options?.context } }
    ),

  invalidMetricId: (metricId: string, options?: AnalyticsErrorOptions): AnalyticsError =>
    new AnalyticsError(
      'INVALID_METRIC_ID',
      `指標 ID "${metricId}" 格式無效，必須符合 ^[a-z][a-z0-9_]*$`,
      400,
      { ...options, context: { metricId, ...options?.context } }
    ),

  invalidFilter: (key: string, value: unknown, options?: AnalyticsErrorOptions): AnalyticsError =>
    new AnalyticsError('INVALID_FILTER', `篩選條件鍵 "${key}" 無效或值不合法`, 400, {
      ...options,
      context: { key, value, ...options?.context },
    }),

  resolverExecutionFailed: (
    metric: string,
    cause: Error,
    options?: AnalyticsErrorOptions
  ): AnalyticsError =>
    new AnalyticsError(
      'RESOLVER_EXECUTION_FAILED',
      `指標 "${metric}" 的 resolver 執行失敗：${cause.message}`,
      500,
      { ...options, cause, context: { metric, ...options?.context } }
    ),

  resolverAlreadyRegistered: (metric: string, options?: AnalyticsErrorOptions): AnalyticsError =>
    new AnalyticsError('RESOLVER_ALREADY_REGISTERED', `指標 "${metric}" 已被註冊`, 409, {
      ...options,
      context: { metric, ...options?.context },
    }),
}
