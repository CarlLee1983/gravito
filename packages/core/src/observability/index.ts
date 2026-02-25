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
// OpenTelemetry SDK Integration (新增)
export {
  DEFAULT_CONFIG as OTEL_DEFAULT_CONFIG,
  getMeter,
  getOpenTelemetrySDK,
  getTracer as getOtelTracer,
  isOpenTelemetryInitialized,
  type MetricsConfig as OtelMetricsConfig,
  type MetricsExporter,
  type OpenTelemetryConfig,
  type OpenTelemetrySDK,
  OTEL_ENV_VARS,
  resetOpenTelemetry,
  setupOpenTelemetry,
  shutdownOpenTelemetry,
  type TracingConfig as OtelTracingConfig,
  type TracingExporter,
} from '../instrumentation'
// Abstract observability contracts (Phase 2.2)
export {
  createNoOpObservabilityProvider,
  type EventMetricsRecorder,
  type EventTracingProvider,
  type ObservabilityProvider,
  type TracingSpan,
  type WorkerMetricsProvider,
} from './contracts'
export {
  type EventMetricsDefinition,
  getEventMetricsDefinition,
  PROMETHEUS_ALERT_RULES,
  PROMETHEUS_QUERIES,
  type PrometheusMetricsConfig,
  setupPrometheusMetrics,
} from './Metrics'
export {
  type DashboardSnapshot,
  type ErrorStats,
  type JobEvent,
  QueueDashboard,
  type QueueDashboardConfig,
  type QueueMetrics,
  type WorkerMetrics,
} from './QueueDashboard'
export {
  getTracer,
  isTracingInitialized,
  setupTracing,
  shutdownTracing,
  type TracingSetupOptions,
} from './TracingSetup'
