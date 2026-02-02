/**
 * @gravito/core - Observability Module
 *
 * 提供分佈式追蹤、指標收集與監控功能。
 *
 * @public
 */

export type { EventMetrics } from '../events/observability/EventMetrics'
export type { EventTracer } from '../events/observability/EventTracer'
export {
  EventTracing,
  type EventTracingConfig,
  getEventTracing,
} from '../events/observability/EventTracing'
export {
  type ObservabilityConfig,
  ObservableHookManager,
} from '../events/observability/ObservableHookManager'
export {
  type EventMetricsDefinition,
  getEventMetricsDefinition,
  PROMETHEUS_ALERT_RULES,
  PROMETHEUS_QUERIES,
  type PrometheusMetricsConfig,
  setupPrometheusMetrics,
} from './Metrics'
export {
  getTracer,
  isTracingInitialized,
  setupTracing,
  shutdownTracing,
  type TracingSetupOptions,
} from './TracingSetup'
