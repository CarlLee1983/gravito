/**
 * Metrics 收集器介面
 */
export interface MetricsProvider {
  /**
   * 增加計數器
   */
  increment(name: string, labels?: Record<string, string>): void

  /**
   * 記錄直方圖數值（如延遲）
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void

  /**
   * 設定 Gauge 數值
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void
}

/**
 * 標籤定義
 */
export interface WebhookMetricLabels {
  provider?: string
  event_type?: string
  status?: 'success' | 'failure'
  status_code?: string
  error_type?: string
  [key: string]: string | undefined
}

/**
 * Echo 模組指標名稱
 */
export const EchoMetrics = {
  // 接收相關
  INCOMING_TOTAL: 'echo_incoming_webhooks_total',
  INCOMING_DURATION: 'echo_incoming_duration_seconds',
  INCOMING_VERIFICATION_FAILURES: 'echo_incoming_verification_failures_total',

  // 發送相關
  OUTGOING_TOTAL: 'echo_outgoing_webhooks_total',
  OUTGOING_DURATION: 'echo_outgoing_duration_seconds',
  OUTGOING_RETRIES: 'echo_outgoing_retries_total',
  OUTGOING_FAILURES: 'echo_outgoing_failures_total',

  // DLQ 相關
  DLQ_SIZE: 'echo_dlq_size',
  DLQ_ENQUEUED: 'echo_dlq_enqueued_total',
  DLQ_PROCESSED: 'echo_dlq_processed_total',
} as const
