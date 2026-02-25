/**
 * @gravito/core - Observability Module
 *
 * 提供分佈式追蹤、指標收集與監控功能。
 *
 * @public
 */

// OpenTelemetry SDK Integration moved to @gravito/monitor (Phase 2.2)
// Currently still in core/instrumentation but marked for migration
// Import from @gravito/monitor once migration is complete
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
  type DashboardSnapshot,
  type ErrorStats,
  type JobEvent,
  QueueDashboard,
  type QueueDashboardConfig,
  type QueueMetrics,
  type WorkerMetrics,
} from './QueueDashboard'
