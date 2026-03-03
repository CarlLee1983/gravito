/**
 * @gravito/core
 *
 * The core micro-kernel for the Galaxy Architecture.
 *
 * @packageDocumentation
 */
import type { GravitoConfig } from './PlanetCore'
/**
 * Current version of @gravito/core.
 * @public
 */
export declare const VERSION: string
export { GravitoEngineAdapter } from './adapters/GravitoEngineAdapter'
export type { AdapterConfig, AdapterFactory, HttpAdapter, RouteDefinition } from './adapters/types'
export { isHttpAdapter } from './adapters/types'
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
  ProxyOptions,
  StatusCode,
  ValidationTarget,
} from './http/types'
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
export {
  codeFromStatus,
  ErrorHandler,
  type ErrorHandlerDeps,
  messageFromStatus,
} from './ErrorHandler'
export { EventManager } from './EventManager'
export {
  cleanupRequestScopeOnError,
  detectRequestScopeLeaks,
  extractRequestScopeErrorContext,
  RequestScopeCleanupError,
  type RequestScopeErrorContext,
  withRequestScopeCleanup,
} from './error-handling/RequestScopeErrorContext'
export type {
  BackpressureConfig,
  BackpressureDecision,
  BackpressureMetricsSnapshot,
  BackpressureStrategy,
  CircuitBreakerMetrics,
  CircuitBreakerMetricsRecorder,
  CircuitBreakerOptions,
  DeadLetterDecision,
  DLQEntry,
  DLQEntryCallback,
  DLQEntrySource,
  DLQFilter,
  EventBackend,
  EventOptions,
  EventQueueConfig,
  EventTask,
  FlowControlContext,
  FlowControlStrategy,
  MultiPriorityQueueDepth,
  PriorityStatistics,
  RetrySchedulerConfig,
  WindowAdjustment,
  WorkerPoolConfig,
  WorkerPoolStats,
  WorkerStats,
} from './events'
export {
  BackpressureManager,
  BackpressureState,
  CircuitBreaker,
  CircuitBreakerState,
  CompositeStrategy,
  DEFAULT_EVENT_OPTIONS,
  DeadLetterQueue,
  EventPriorityQueue,
  IdempotencyCache,
  PriorityEscalationManager,
  PriorityRebalanceStrategy,
  QueueDepthStrategy,
  RateLimitStrategy,
  RetryScheduler,
  StarvationProtectionStrategy,
  WorkerPool,
  WorkerPoolMetrics,
} from './events'
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
export type {
  EventMetricsRecorder,
  EventTracingProvider,
  ObservabilityProvider,
  TracingSpan,
  WorkerMetricsProvider,
} from './observability/contracts'
export { createNoOpObservabilityProvider } from './observability/contracts'
export {
  type DashboardSnapshot,
  type ErrorStats,
  type JobEvent,
  QueueDashboard,
  type QueueDashboardConfig,
  type QueueMetrics,
  type WorkerMetrics as QueueWorkerMetrics,
} from './observability/QueueDashboard'
export * from './exceptions'
export {
  type GlobalErrorHandlersMode,
  type GlobalProcessErrorHandlerContext,
  type GlobalProcessErrorKind,
  type RegisterGlobalErrorHandlersOptions,
  registerGlobalErrorHandlers,
} from './GlobalErrorHandlers'
export { type GravitoManifest, GravitoServer } from './GravitoServer'
export type { ActionCallback, FilterCallback, ListenerInfo, ListenerOptions } from './HookManager'
export { HookManager, type HookManagerConfig } from './HookManager'
export type { HealthCheck, HealthCheckResult } from './health/HealthProvider'
export { HealthProvider } from './health/HealthProvider'
export type { DumpOptions } from './helpers'
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
export { CookieJar, type CookieOptions } from './http/CookieJar'
export { deleteCookie, getCookie, setCookie } from './http/cookie'
export type { Listener, ShouldQueue } from './Listener'
export type { Logger } from './Logger'
export { ConsoleLogger } from './Logger'
export {
  type CacheService,
  type ErrorHandlerContext,
  type GravitoConfig,
  type GravitoOrbit,
  PlanetCore,
  type ViewService,
} from './PlanetCore'
export { RequestContext, type RequestContextData } from './RequestContext'
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
export type { DLQManagerFilter, DLQRecord, DLQStats, RetryPolicy } from './reliability'
export {
  DeadLetterQueueManager,
  getDefaultRetryPolicy,
  getPresetRetryPolicy,
  RetryEngine,
} from './reliability'
export { ServiceProvider } from './ServiceProvider'
export { Encrypter, type EncrypterOptions } from './security/Encrypter'
export type { Channel, ShouldBroadcast } from './types/events'
export { Event } from './types/events'
export * from './testing'
export {
  type ArchiveCreateOptions,
  type ArchiveEntry,
  type ArchiveExtractOptions,
  type ArchiveFileInfo,
  type ArchiveFromDirectoryOptions,
  archiveFromDirectory,
  type CompressionOptions,
  createHtmlRenderCallbacks,
  createSqliteDatabase,
  type EscapeHtmlFn,
  getArchiveAdapter,
  getCompressionAdapter,
  getEscapeHtml,
  getMarkdownAdapter,
  getPasswordAdapter,
  getRuntimeAdapter,
  getRuntimeEnv,
  getRuntimeKind,
  type MarkdownRenderCallbacks,
  type MarkdownRenderOptions,
  type RuntimeAdapter,
  type RuntimeArchiveAdapter,
  type RuntimeCompressionAdapter,
  type RuntimeFileSink,
  type RuntimeFileStat,
  type RuntimeKind,
  type RuntimeMarkdownAdapter,
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
  toUint8Array,
} from './runtime'
export {
  getDefaultRuntimeAdapter,
  runtimeAppendFile,
  runtimeCreateFileSink,
  runtimeMkdir,
  runtimeReadDir,
  runtimeReadJSON,
  runtimeReadText,
  runtimeRemoveRecursive,
  runtimeRename,
  runtimeStatFull,
  runtimeWriteFileExclusive,
} from './runtime-helpers'
export { BinaryUtils } from './binary'
export type { DeepEqualsFn, DeepEqualsOptions } from './runtime/deep-equals'
export { getDeepEquals } from './runtime/deep-equals'
export * as engine from './engine'
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
export declare function defineConfig(config: GravitoConfig): GravitoConfig
