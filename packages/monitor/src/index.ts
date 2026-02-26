/**
 * @gravito/monitor
 *
 * Observability module for Gravito
 * - Health Checks (Kubernetes probes)
 * - Metrics (Prometheus format)
 * - Tracing (OpenTelemetry OTLP)
 */

// Observability Adapter (Phase 2.2)
// Integration layer between @gravito/core and OpenTelemetry
export {
  createObservabilityProvider,
  ObservabilityAdapterFactory,
} from './adapters/ObservabilityAdapter'
// Configuration
export {
  defineMonitorConfig,
  type HealthCheckFn,
  type HealthCheckResult,
  type HealthConfig,
  type MetricOptions,
  type MetricsConfig,
  type MonitorConfig,
  type TracingConfig,
} from './config'
// Health
export {
  createDatabaseCheck,
  createDiskCheck,
  createHttpCheck,
  createMemoryCheck,
  createRedisCheck,
  HealthController,
  HealthRegistry,
  type HealthReport,
} from './health'
// Main plugin
export { MonitorOrbit, type MonitorService } from './MonitorOrbit'
// Metrics
export {
  Counter,
  createHttpMetricsMiddleware,
  Gauge,
  Histogram,
  MetricsController,
  MetricsRegistry,
} from './metrics'
// OpenTelemetry SDK Integration (Phase 2.2)
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
} from './opentelemetry'
// Tracing
export {
  createTracingMiddleware,
  type Span,
  type SpanContext,
  type SpanEvent,
  TracingManager,
} from './tracing'
