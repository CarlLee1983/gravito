/**
 * @gravito/core - Instrumentation Module
 *
 * 提供 OpenTelemetry SDK 集成功能，包括分佈式追蹤與指標收集。
 *
 * @example
 * ```typescript
 * import {
 *   setupOpenTelemetry,
 *   getOpenTelemetrySDK,
 *   getTracer,
 *   getMeter
 * } from '@gravito/core'
 *
 * // 初始化 SDK
 * await setupOpenTelemetry({
 *   serviceName: 'my-service',
 *   tracing: { enabled: true, exporter: 'jaeger' },
 *   metrics: { enabled: true, exporter: 'prometheus' }
 * })
 *
 * // 獲取 Tracer
 * const tracer = await getTracer('my-module')
 * const span = tracer.startSpan('my-operation')
 *
 * // 獲取 Meter
 * const meter = await getMeter('my-module')
 * const counter = meter.createCounter('request_count')
 * ```
 *
 * @packageDocumentation
 */

// Functions
export {
  getMeter,
  getOpenTelemetrySDK,
  getTracer,
  isOpenTelemetryInitialized,
  resetOpenTelemetry,
  setupOpenTelemetry,
  shutdownOpenTelemetry,
} from './opentelemetry'
// Types
export type {
  MetricsConfig,
  MetricsExporter,
  OpenTelemetryConfig,
  OpenTelemetrySDK,
  TracingConfig,
  TracingExporter,
} from './types'
// Constants
export { DEFAULT_CONFIG, OTEL_ENV_VARS } from './types'
