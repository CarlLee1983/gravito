/// <reference types="bun-types" />
/**
 * @gravito/core
 *
 * The core micro-kernel for the Galaxy Architecture.
 *
 * @packageDocumentation
 */

// Export version from package.json
import packageJson from '../package.json'
import type { GravitoConfig } from './PlanetCore'

/**
 * Current version of @gravito/core.
 * @public
 */
export const VERSION = packageJson.version

// ─────────────────────────────────────────────────────────────────────────────
// Gravito HTTP Abstractions (v2.0 - Adapter Pattern)
// These types enable swapping out the underlying HTTP engine.
// ─────────────────────────────────────────────────────────────────────────────

export { GravitoEngineAdapter } from './adapters/GravitoEngineAdapter'
export {
  createGravitoAdapter,
  createPhotonAdapter,
  GravitoAdapter,
  PhotonAdapter,
  PhotonContextWrapper,
  PhotonRequestWrapper,
} from './adapters/PhotonAdapter'

// Adapters
export type { AdapterConfig, AdapterFactory, HttpAdapter, RouteDefinition } from './adapters/types'
export { isHttpAdapter } from './adapters/types'
// HTTP Types
export type {
  ContentfulStatusCode,
  GravitoContext,
  GravitoErrorHandler,
  GravitoHandler,
  GravitoMiddleware,
  GravitoNext,
  GravitoNotFoundHandler,
  GravitoRequest,
  GravitoVariables,
  HttpMethod,
  StatusCode,
  ValidationTarget,
} from './http/types'

// ─────────────────────────────────────────────────────────────────────────────
// Core Exports
// ─────────────────────────────────────────────────────────────────────────────

// Application (Enterprise Container)
export { Application, type ApplicationConfig } from './Application'
export { type CommandHandler, CommandKernel } from './CommandKernel'
export { ConfigManager } from './ConfigManager'
export { Container, type Factory, type ServiceKey, type ServiceMap } from './Container'
export { RequestScopeManager } from './Container/RequestScopeManager'
export {
  RequestScopeMetrics,
  RequestScopeMetricsCollector,
  type RequestScopeObserver,
} from './Container/RequestScopeMetrics'
export { registerQueueCommands } from './cli/queue-commands'
// Error Handler (extracted from PlanetCore for SRP)
export {
  codeFromStatus,
  ErrorHandler,
  type ErrorHandlerDeps,
  messageFromStatus,
} from './ErrorHandler'
// Events
export { EventManager } from './EventManager'
// RequestScope-Aware Error Handling
export {
  cleanupRequestScopeOnError,
  detectRequestScopeLeaks,
  extractRequestScopeErrorContext,
  RequestScopeCleanupError,
  type RequestScopeErrorContext,
  withRequestScopeCleanup,
} from './error-handling/RequestScopeErrorContext'
// Event System
export type {
  CircuitBreakerOptions,
  DLQEntry,
  DLQFilter,
  EventBackend,
  EventOptions,
  EventTask,
} from './events'
export {
  CircuitBreaker,
  CircuitBreakerState,
  DEFAULT_EVENT_OPTIONS,
  DeadLetterQueue,
  EventPriorityQueue,
} from './events'
// Event System Observability
export type {
  EventTracingConfig,
  ObservabilityConfig,
  QueueDepthCallback,
} from './events/observability'
export {
  EventMetrics,
  EventTracer,
  EventTracing,
  getEventTracing,
  ObservableHookManager,
  OTelEventMetrics,
} from './events/observability'
// Queue Dashboard & CLI
export {
  type DashboardSnapshot,
  type ErrorStats,
  type JobEvent,
  QueueDashboard,
  type QueueDashboardConfig,
  type QueueMetrics,
  type WorkerMetrics as QueueWorkerMetrics,
} from './observability/QueueDashboard'

// ─────────────────────────────────────────────────────────────────────────────
// OpenTelemetry Instrumentation
// ─────────────────────────────────────────────────────────────────────────────

// Exceptions
export * from './exceptions'
// Global Error Handlers
export {
  type GlobalErrorHandlersMode,
  type GlobalProcessErrorHandlerContext,
  type GlobalProcessErrorKind,
  type RegisterGlobalErrorHandlersOptions,
  registerGlobalErrorHandlers,
} from './GlobalErrorHandlers'
export { type GravitoManifest, GravitoServer } from './GravitoServer'
// Hooks
export type { ActionCallback, FilterCallback, ListenerInfo, ListenerOptions } from './HookManager'
export { HookManager, type HookManagerConfig } from './HookManager'
// Health
export type { HealthCheck, HealthCheckResult } from './health/HealthProvider'
export { HealthProvider } from './health/HealthProvider'
export type { DumpOptions } from './helpers'
// Helpers
export {
  Arr,
  abort,
  abortIf,
  abortUnless,
  app,
  blank,
  config,
  DumpDieError,
  dd,
  dump,
  env,
  filled,
  hasApp,
  logger,
  router,
  Str,
  setApp,
  tap,
  throwIf,
  throwUnless,
  value,
} from './helpers'
export * from './helpers/data'
export * from './helpers/errors'
export * from './helpers/response'
// HTTP / Security utilities
export { CookieJar, type CookieOptions } from './http/CookieJar'
export { deleteCookie, getCookie, setCookie } from './http/cookie'
export { type BodySizeLimitOptions, bodySizeLimit } from './http/middleware/BodySizeLimit'
export { type CorsOptions, type CorsOrigin, cors } from './http/middleware/Cors'
export { type CsrfOptions, csrfProtection, getCsrfToken } from './http/middleware/Csrf'
export {
  createHeaderGate,
  type HeaderTokenGateOptions,
  type RequireHeaderTokenOptions,
  requireHeaderToken,
} from './http/middleware/HeaderTokenGate'
export {
  type HstsOptions,
  type SecurityHeadersOptions,
  securityHeaders,
} from './http/middleware/SecurityHeaders'
export { ThrottleRequests } from './http/middleware/ThrottleRequests'
// Re-export instrumentation module for subpath import
export * as instrumentation from './instrumentation'
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
} from './instrumentation'
// Listeners
export type { Listener, ShouldQueue } from './Listener'
// Logger
export type { Logger } from './Logger'
export { ConsoleLogger } from './Logger'
// PlanetCore (Main Application Class)
export {
  type CacheService,
  type ErrorHandlerContext,
  type GravitoConfig,
  type GravitoOrbit,
  PlanetCore,
  type ViewService,
} from './PlanetCore'
// Request Context
export {
  RequestContext,
  type RequestContextData,
} from './RequestContext'
// Routing
export { Route } from './Route'
export {
  type ControllerClass,
  FORM_REQUEST_SYMBOL,
  type FormRequestClass,
  type FormRequestLike,
  RouteGroup,
  type RouteHandler,
  type RouteOptions,
  Router,
} from './Router'
// Reliability
export type { DLQManagerFilter, DLQRecord, DLQStats, RetryPolicy } from './reliability'
export {
  DeadLetterQueueManager,
  getDefaultRetryPolicy,
  getPresetRetryPolicy,
  RetryEngine,
} from './reliability'
// Service Provider
export { ServiceProvider } from './ServiceProvider'
// Security
export { Encrypter, type EncrypterOptions } from './security/Encrypter'
// Event Types
export type { Channel, ShouldBroadcast } from './types/events'
export { Event } from './types/events'

// ─────────────────────────────────────────────────────────────────────────────
// Testing Utilities
// ─────────────────────────────────────────────────────────────────────────────

export * from './testing'

// ─────────────────────────────────────────────────────────────────────────────
// Runtime Adapters
// ─────────────────────────────────────────────────────────────────────────────

export {
  type ArchiveCreateOptions,
  type ArchiveEntry,
  type ArchiveExtractOptions,
  type ArchiveFileInfo,
  type ArchiveFromDirectoryOptions,
  archiveFromDirectory,
  type CompressionOptions,
  createSqliteDatabase,
  getArchiveAdapter,
  getCompressionAdapter,
  getPasswordAdapter,
  getRuntimeAdapter,
  getRuntimeEnv,
  getRuntimeKind,
  type RuntimeAdapter,
  type RuntimeArchiveAdapter,
  type RuntimeCompressionAdapter,
  type RuntimeFileStat,
  type RuntimeKind,
  type RuntimePasswordAdapter,
  type RuntimeProcess,
  type RuntimeProcessOutput,
  type RuntimeResourceUsage,
  type RuntimeServeConfig,
  type RuntimeServer,
  type RuntimeSpawnOptions,
  type RuntimeSpawnSyncResult,
  type RuntimeSqliteDatabase,
  type RuntimeSqliteStatement,
} from './runtime'

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Engine (High-Performance Bun-Only Engine)
// ─────────────────────────────────────────────────────────────────────────────

// Re-export engine module for @gravito/core/engine import path
export * as engine from './engine'

// ─────────────────────────────────────────────────────────────────────────────
// Configuration Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configure your Gravito application
 *
 * @example
 * ```typescript
 * const config = defineConfig({
 *   config: {
 *     APP_NAME: 'My App',
 *     PORT: 3000,
 *   },
 *   orbits: [], // Add your orbits here
 * })
 *
 * const core = await PlanetCore.boot(config)
 * ```
 */
export function defineConfig(config: GravitoConfig): GravitoConfig {
  return config
}
