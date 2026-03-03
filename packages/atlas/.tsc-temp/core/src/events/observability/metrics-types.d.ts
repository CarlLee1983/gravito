/**
 * Minimal metric types for event observability.
 * Avoids importing @gravito/monitor from core to prevent circular dependency.
 * Runtime implementations are provided by @gravito/monitor MetricsRegistry.
 *
 * @internal
 */
export interface EventMetricCounter {
  inc(labels: Record<string, string>): void
}
export interface EventMetricGauge {
  set(value: number, labels: Record<string, string>): void
}
export interface EventMetricHistogram {
  observe(value: number, labels: Record<string, string>): void
}
