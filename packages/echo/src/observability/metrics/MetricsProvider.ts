/**
 * Defines the interface for collecting application metrics.
 * Implementations can bridge to Prometheus, StatsD, or other monitoring systems.
 *
 * @example
 * ```typescript
 * const metrics: MetricsProvider = getMetrics();
 * metrics.increment(EchoMetrics.INCOMING_TOTAL, { provider: 'stripe' });
 * ```
 */
export interface MetricsProvider {
  /**
   * Increments a counter by 1.
   * Counters are used for values that only increase (e.g., total requests).
   */
  increment(name: string, labels?: Record<string, string>): void

  /**
   * Records a value in a histogram.
   * Histograms are used to track the distribution of values (e.g., request latency).
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void

  /**
   * Sets a gauge to a specific value.
   * Gauges are used for values that can go up and down (e.g., current queue size).
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void
}

/**
 * Common labels used for webhook-related metrics.
 */
export interface WebhookMetricLabels {
  /** The webhook provider name (e.g., 'stripe', 'github'). */
  provider?: string
  /** The type of event received or sent. */
  event_type?: string
  /** The outcome of the operation. */
  status?: 'success' | 'failure'
  /** The HTTP status code returned by the remote server. */
  status_code?: string
  /** A category for the error if the operation failed. */
  error_type?: string
  [key: string]: string | undefined
}

/**
 * Standard metric names used across the Echo module.
 * Use these constants to ensure consistency in dashboards and alerts.
 */
export const EchoMetrics = {
  /** Total number of incoming webhooks received. */
  INCOMING_TOTAL: 'echo_incoming_webhooks_total',
  /** Time taken to process an incoming webhook. */
  INCOMING_DURATION: 'echo_incoming_duration_seconds',
  /** Total number of incoming webhooks that failed signature verification. */
  INCOMING_VERIFICATION_FAILURES: 'echo_incoming_verification_failures_total',

  /** Total number of outgoing webhooks dispatched. */
  OUTGOING_TOTAL: 'echo_outgoing_webhooks_total',
  /** Time taken to deliver an outgoing webhook. */
  OUTGOING_DURATION: 'echo_outgoing_duration_seconds',
  /** Total number of retry attempts for outgoing webhooks. */
  OUTGOING_RETRIES: 'echo_outgoing_retries_total',
  /** Total number of outgoing webhooks that failed after all retries. */
  OUTGOING_FAILURES: 'echo_outgoing_failures_total',

  /** Current number of items in the Dead Letter Queue. */
  DLQ_SIZE: 'echo_dlq_size',
  /** Total number of items added to the DLQ. */
  DLQ_ENQUEUED: 'echo_dlq_enqueued_total',
  /** Total number of items successfully processed from the DLQ. */
  DLQ_PROCESSED: 'echo_dlq_processed_total',
} as const
