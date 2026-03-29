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

/**
 * Bun-native HTTP adapter for Gravito.
 *
 * Provides high-performance HTTP handling using Bun's native Request/Response API.
 * Implements the HttpAdapter interface for direct integration with Gravito applications.
 *
 * @see {@link GravitoEngineAdapter} for alternative adapter implementations
 * @public
 */
export { BunNativeAdapter } from './adapters/bun/BunNativeAdapter'

/**
 * Generic HTTP adapter bridge for Gravito.
 *
 * Allows swapping out HTTP engines (Hono, Elysia, etc.) by implementing the HttpAdapter
 * interface. Use this when you need a different runtime or framework integration.
 *
 * @see {@link BunNativeAdapter} for the recommended Bun-native implementation
 * @public
 */
export { GravitoEngineAdapter } from './adapters/GravitoEngineAdapter'

/**
 * HTTP adapter type definitions and utilities.
 *
 * Type definitions for building custom HTTP adapters and checking adapter compatibility.
 *
 * @public
 */
export type { AdapterConfig, AdapterFactory, HttpAdapter, RouteDefinition } from './adapters/types'

/**
 * Type guard for HTTP adapter validation.
 *
 * @param obj - Object to check
 * @returns true if object implements the HttpAdapter interface
 * @example
 * ```typescript
 * if (isHttpAdapter(config.adapter)) {
 *   const adapter = config.adapter as HttpAdapter
 * }
 * ```
 * @public
 */
export { isHttpAdapter } from './adapters/types'

/**
 * Gravito HTTP request/response types and constants.
 *
 * Type definitions for HTTP methods, status codes, context objects, handlers, and middleware.
 * These types are fundamental to routing and request handling in Gravito applications.
 *
 * @public
 */
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

// ─────────────────────────────────────────────────────────────────────────────
// Core Exports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enterprise-grade application container with DI, middleware, and plugin support.
 *
 * Application provides a high-level abstraction for building modular Gravito apps with
 * dependency injection, service configuration, middleware chains, and extensibility hooks.
 * Use this for complex applications; use {@link PlanetCore} for HTTP server bootstrapping.
 *
 * @example
 * ```typescript
 * const app = new Application({ config: myConfig })
 * app.register(MyOrbit)
 * app.bind('myService', () => new MyService())
 * ```
 * @public
 */
export { Application, type ApplicationConfig } from './Application'

/**
 * Command kernel for CLI command registration and execution.
 *
 * Manages command handlers, argument parsing, and command lifecycle in CLI contexts.
 * Typically used internally by Gravito; extend via custom commands registered with the kernel.
 *
 * @public
 */
export { type CommandHandler, CommandKernel } from './CommandKernel'

/**
 * Configuration manager for environment-aware application settings.
 *
 * Provides centralized config management with support for environment variables,
 * config files, defaults, and type-safe access patterns. All configs are immutable.
 *
 * @example
 * ```typescript
 * const appName = config.get('APP_NAME', 'DefaultApp')
 * const dbUrl = config.get('DATABASE_URL')
 * ```
 * @public
 */
export { ConfigManager } from './ConfigManager'

/**
 * Dependency injection container for service resolution and lifecycle management.
 *
 * Core singleton/transient resolver with support for factory functions, constructor injection,
 * and service binding. All resolved instances are immutably cached.
 *
 * @example
 * ```typescript
 * const container = new Container()
 * container.bind('logger', () => new ConsoleLogger())
 * const logger = container.resolve('logger')
 * ```
 * @public
 */
export { Container, type Factory, type ServiceKey, type ServiceMap } from './Container'

/**
 * Request-scoped instance manager for HTTP request lifecycle.
 *
 * Manages transient services and cleanup that are tied to individual HTTP requests.
 * Automatically integrates with Gravito's middleware pipeline for scope isolation.
 *
 * @public
 */
export { RequestScopeManager } from './Container/RequestScopeManager'

/**
 * Request scope metrics collection and analysis.
 *
 * Tracks memory usage, instance counts, and lifecycle metrics for request-scoped services.
 * Provides observability into container behavior and potential memory leaks.
 *
 * @public
 */
export {
  RequestScopeMetrics,
  RequestScopeMetricsCollector,
  type RequestScopeObserver,
} from './Container/RequestScopeMetrics'

/**
 * CLI queue command registration utilities.
 *
 * Provides helpers for registering queue-related commands (queue:work, queue:retry, etc.)
 * into the Gravito CLI framework.
 *
 * @public
 */
export { registerQueueCommands } from './cli/queue-commands'

/**
 * Centralized HTTP error handler with status code management.
 *
 * Converts HTTP status codes to error responses with appropriate messages.
 * Used internally by the HTTP layer and exception handlers.
 *
 * @public
 */
export {
  codeFromStatus,
  ErrorHandler,
  type ErrorHandlerDeps,
  messageFromStatus,
} from './ErrorHandler'

/**
 * Event manager for application-level event dispatching and listener registration.
 *
 * Provides type-safe event system with support for synchronous listeners and
 * async queue-based listeners. Integrates with the event queue infrastructure.
 *
 * @example
 * ```typescript
 * core.events.listen(UserCreated, SendWelcomeEmail)
 * await core.events.dispatch(new UserCreated(user))
 * ```
 * @public
 */
export { EventManager } from './EventManager'
/**
 * Request scope error handling utilities for memory safety.
 *
 * Provides cleanup functions, leak detection, and error context extraction
 * to prevent memory leaks and ensure proper resource disposal on request completion.
 * Use these in custom middleware or error handlers for enhanced reliability.
 *
 * @public
 */
export {
  cleanupRequestScopeOnError,
  detectRequestScopeLeaks,
  extractRequestScopeErrorContext,
  RequestScopeCleanupError,
  type RequestScopeErrorContext,
  withRequestScopeCleanup,
} from './error-handling/RequestScopeErrorContext'
/**
 * High-reliability event queue infrastructure with backpressure, circuit breaking, and flow control.
 *
 * Complete async event processing system with queue prioritization, retry logic, dead-letter queue,
 * worker pool management, backpressure handling, and circuit breaker patterns for system stability.
 * Handles millions of events with guaranteed delivery and failure recovery.
 *
 * Key components:
 * - EventPriorityQueue: Multi-priority async queue with backpressure
 * - CircuitBreaker: Fault tolerance with automatic recovery
 * - DeadLetterQueue: Failed event capture and replay
 * - WorkerPool: Concurrent task execution with metrics
 * - BackpressureManager: Flow control to prevent overload
 *
 * @example
 * ```typescript
 * const queue = new EventPriorityQueue(config)
 * await queue.enqueue('high-priority', task)
 * const metrics = queue.metrics()
 * ```
 * @public
 */
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

// Event system implementations (see types above)
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
/**
 * Event system observability and metrics collection.
 *
 * Built-in tracing, metrics, and performance monitoring for event queues and workers.
 * Provides hooks into queue operations for custom instrumentation via OpenTelemetry.
 *
 * @public
 */
export type {
  EventTracingConfig,
  ObservabilityConfig,
  QueueDepthCallback,
} from './events/observability'

// Event observability implementations (see types above)
export {
  EventMetrics,
  EventTracer,
  EventTracing,
  getEventTracing,
  ObservableHookManager,
  OTelEventMetrics,
} from './events/observability'

/**
 * Observability provider contracts for monitoring and tracing.
 *
 * Abstract interfaces for building custom observability integrations with
 * OpenTelemetry, monitoring systems, or custom tracing implementations.
 * Concrete implementations are provided by @gravito/monitor.
 *
 * @see https://github.com/gravitojs/gravito-monitor
 * @public
 */
export type {
  EventMetricsRecorder,
  EventTracingProvider,
  ObservabilityProvider,
  TracingSpan,
  WorkerMetricsProvider,
} from './observability/contracts'

/**
 * No-operation observability provider for testing and development.
 *
 * Returns a noop provider that satisfies the ObservabilityProvider interface
 * without performing actual tracing or metrics collection. Useful for development
 * environments or when observability is not needed.
 *
 * @returns A noop ObservabilityProvider instance
 * @public
 */
export { createNoOpObservabilityProvider } from './observability/contracts'

/**
 * Real-time queue dashboard for monitoring event processing.
 *
 * Provides a web-based and CLI dashboard for monitoring queue depth, worker status,
 * error rates, throughput, and other metrics. Useful for operational visibility
 * and debugging queue performance issues.
 *
 * @public
 */
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

/**
 * Built-in HTTP exception classes for common error scenarios.
 *
 * Pre-defined exception classes (BadRequestException, UnauthorizedException, NotFoundException, etc.)
 * that automatically map to correct HTTP status codes. Extend HttpException for custom domain errors.
 *
 * @public
 */
export {
  AuthenticationException,
  AuthException,
  AuthorizationException,
  CacheException,
  CircularDependencyException,
  ConfigurationException,
  DatabaseException,
  DomainException,
  type ExceptionOptions,
  GravitoException,
  HttpException,
  InfrastructureException,
  type InfrastructureExceptionOptions,
  ModelNotFoundException,
  QueueException,
  StorageException,
  StreamException,
  SystemException,
  type ValidationError,
  ValidationException,
} from './exceptions'

/**
 * Global process error handler registration for uncaught exceptions and rejections.
 *
 * Registers handlers for process-level errors (unhandledRejection, uncaughtException) that occur
 * outside of HTTP request context. Enables centralized error reporting, logging, and recovery.
 *
 * @example
 * ```typescript
 * registerGlobalErrorHandlers({
 *   onUnhandledRejection: (error) => logger.error('Rejection:', error),
 *   onUncaughtException: (error) => process.exit(1),
 * })
 * ```
 * @public
 */
export {
  type GlobalErrorHandlersMode,
  type GlobalProcessErrorHandlerContext,
  type GlobalProcessErrorKind,
  type RegisterGlobalErrorHandlersOptions,
  registerGlobalErrorHandlers,
} from './GlobalErrorHandlers'

/**
 * Gravito server bootstrap and lifecycle management.
 *
 * Provides the main server instance with configuration, port binding, graceful shutdown,
 * and signal handling. Use {@link PlanetCore} for most applications; use GravitoServer
 * when you need lower-level HTTP server control.
 *
 * @public
 */
export { type GravitoManifest, GravitoServer } from './GravitoServer'

/**
 * Hook system for extensibility and event-driven architecture.
 *
 * Provides action hooks (filters) and listener hooks (listeners) that allow plugins
 * and custom code to tap into framework lifecycle events. Supports async handlers
 * and conditional execution.
 *
 * @example
 * ```typescript
 * const hooks = new HookManager()
 * hooks.addAction('user:created', async (user) => {
 *   await sendWelcomeEmail(user)
 * })
 * ```
 * @public
 */
export type { ActionCallback, FilterCallback, ListenerInfo, ListenerOptions } from './HookManager'
export { HookManager, type HookManagerConfig } from './HookManager'
/**
 * Application health check provider for readiness and liveness probes.
 *
 * Enables custom health checks for database connectivity, cache availability, and other
 * dependencies. Integrates with Kubernetes and load balancer health endpoints.
 *
 * @public
 */
export type { HealthCheck, HealthCheckResult } from './health/HealthProvider'
export { HealthProvider } from './health/HealthProvider'

export type { DumpOptions } from './helpers'

/**
 * Developer-friendly utility functions and helper classes.
 *
 * Collection of utilities for common tasks: array/string manipulation (Arr, Str),
 * value resolution (value, tap), assertions (abort, throwIf, throwUnless),
 * debugging (dump, dd), and service access (app, config, env, logger, router).
 *
 * @public
 */
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
  tap,
  throwIf,
  throwUnless,
  value,
} from './helpers'

/**
 * Helper utilities for data transformation and validation.
 * @public
 */
export { dataGet, dataHas, dataSet, type DataPath, type PathSegment } from './helpers/data'

/**
 * Error creation and handling helpers.
 * @public
 */
export { createErrorBag, type ErrorBag, errors, old } from './helpers/errors'

/**
 * HTTP response building helpers.
 * @public
 */
export { type ApiFailure, type ApiSuccess, fail, jsonFail, jsonSuccess, ok } from './helpers/response'

/**
 * Cookie jar and cookie management utilities.
 *
 * Provides CookieJar class for cookie-set operations and helper functions
 * (getCookie, setCookie, deleteCookie) for cookie manipulation in requests/responses.
 *
 * @example
 * ```typescript
 * setCookie(ctx, 'sessionId', token, { httpOnly: true, sameSite: 'Strict' })
 * const value = getCookie(ctx, 'sessionId')
 * ```
 * @public
 */
export { CookieJar, type CookieOptions } from './http/CookieJar'
export { deleteCookie, getCookie, setCookie } from './http/cookie'
// HTTP Middleware moved to @gravito/photon/middleware (Phase 2.1)
// - bodySizeLimit → @gravito/photon/middleware/body
// - cors → @gravito/photon/middleware/cors
// - csrfProtection, getCsrfToken → @gravito/photon/middleware/security
// - createHeaderGate, requireHeaderToken → @gravito/photon/middleware/security
// - securityHeaders → @gravito/photon/middleware/security
// - throttleRequests (was ThrottleRequests) → @gravito/photon/middleware/rate-limit
// OpenTelemetry exports moved to @gravito/monitor (Phase 2.2)
// Import from @gravito/monitor for OTel functionality
/**
 * Event listener interface for asynchronous event handling.
 *
 * Listeners handle dispatched events synchronously or asynchronously. Implement ShouldQueue
 * to enable queue-based execution with retry and delay support.
 *
 * @public
 */
export type { Listener, ShouldQueue } from './Listener'

/**
 * Structured logging interface and default console implementation.
 *
 * Standard PSR-3-inspired logger interface (debug, info, warn, error methods)
 * enables swapping implementations (Winston, Pino, etc.). ConsoleLogger provides
 * a basic console-based implementation suitable for development.
 *
 * @public
 */
export type { Logger } from './Logger'
export { ConsoleLogger } from './Logger'

/**
 * Main application kernel and HTTP server bootstrap.
 *
 * PlanetCore is the entry point for Gravito applications. It handles service registration,
 * middleware setup, route definitions, event binding, and server lifecycle. Use PlanetCore.boot()
 * to initialize a complete application.
 *
 * @example
 * ```typescript
 * const core = await PlanetCore.boot(config)
 * core.listen(3000)
 * ```
 * @public
 */
export {
  type CacheService,
  type ErrorHandlerContext,
  type GravitoConfig,
  type GravitoOrbit,
  PlanetCore,
  type ViewService,
} from './PlanetCore'

/**
 * Request context carrier for per-request state and data.
 *
 * Provides type-safe storage for request-scoped data (user, tracing context, etc.)
 * with automatic cleanup. Integrates with request scope management.
 *
 * @public
 */
export {
  RequestContext,
  type RequestContextData,
} from './RequestContext'

/**
 * HTTP route definition and registration.
 *
 * Route represents a single HTTP route with its handler, middleware, and metadata.
 * Use Router to register routes; Route provides the chainable registration API.
 *
 * @public
 */
export { Route } from './Route'

/**
 * HTTP routing system with controller and handler support.
 *
 * Provides fluent API for route registration (GET, POST, etc.), middleware attachment,
 * route groups, and controller method dispatch. Supports form request validation,
 * domain constraints, and nested groups.
 *
 * @example
 * ```typescript
 * router.get('/users', [UserController, 'index'])
 * router.post('/users', UserStoreRequest, [UserController, 'store'])
 *
 * router.group({ prefix: '/api' }, (r) => {
 *   r.get('/posts', [PostController, 'index'])
 * })
 * ```
 * @public
 */
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

/**
 * Dead-letter queue management and retry policy configuration.
 *
 * Handles failed events that cannot be processed. Provides DLQ inspection, replay,
 * and filtering. Integrates with RetryScheduler for automatic retries.
 *
 * @public
 */
export type { DLQManagerFilter, DLQRecord, DLQStats, RetryPolicy } from './reliability'

// DLQ implementations (see types above)
export {
  DeadLetterQueueManager,
  getDefaultRetryPolicy,
  getPresetRetryPolicy,
  RetryEngine,
} from './reliability'

/**
 * Service provider for application bootstrap and service registration.
 *
 * Base class for extending Gravito with custom service bindings, event listeners,
 * and middleware registration. Providers are automatically loaded during application boot.
 *
 * @example
 * ```typescript
 * class MyServiceProvider extends ServiceProvider {
 *   register() {
 *     this.app.bind('cache', () => new RedisCache())
 *   }
 *   boot() {
 *     const cache = this.app.resolve('cache')
 *   }
 * }
 * ```
 * @public
 */
export { ServiceProvider } from './ServiceProvider'

/**
 * Encryption service for secure data handling.
 *
 * Provides AES-256 encryption for sensitive data with key derivation from app key.
 * Automatically handles IV generation and verification.
 *
 * @public
 */
export { Encrypter, type EncrypterOptions } from './security/Encrypter'

/**
 * Event base class and broadcast channel types.
 *
 * Event is the base class for application events. Implement ShouldBroadcast
 * to enable real-time broadcasting to connected clients.
 *
 * @example
 * ```typescript
 * class UserCreated extends Event {
 *   constructor(public user: User) { super() }
 * }
 * ```
 * @public
 */
export type { Channel, ShouldBroadcast } from './types/events'
export { Event } from './types/events'

// ─────────────────────────────────────────────────────────────────────────────
// Testing Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Testing utilities and test helpers for unit and integration tests.
 * @public
 */
export { createHttpTester, HttpTester, TestResponse } from './testing'

// ─────────────────────────────────────────────────────────────────────────────
// Runtime Adapters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runtime abstraction layer for cross-platform compatibility (Bun, Node, Deno).
 *
 * Provides adapters for file I/O, compression, markdown rendering, password hashing,
 * SQLite database, and archive operations. Automatically detects runtime and loads
 * the appropriate implementation. Ensures code portability across Bun, Node.js, and Deno.
 *
 * @example
 * ```typescript
 * const adapter = getRuntimeAdapter()
 * const fs = adapter.fs
 * const data = await fs.readText('file.txt')
 * ```
 * @public
 */
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
  resetRuntimeAdapter,
  toUint8Array,
} from './runtime'

/**
 * Runtime helper functions for file system operations.
 *
 * Convenience functions for common file operations: read/write/append/rename,
 * directory creation/reading, JSON parsing, and recursive deletion.
 * All functions abstract away platform differences.
 *
 * @public
 */
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

// ─────────────────────────────────────────────────────────────────────────────
// Deep Equals & Binary Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Binary data utilities and deep equality comparison.
 *
 * BinaryUtils provides utilities for binary data handling. Deep equality checking
 * enables structural comparison of complex objects across runtime environments.
 *
 * @public
 */
export { BinaryUtils } from './binary'

/**
 * Deep equality comparison for complex objects and values.
 *
 * Provides customizable deep equality checking that handles circular references,
 * custom equality functions, and type-specific comparisons.
 *
 * @public
 */
export type { DeepEqualsFn, DeepEqualsOptions } from './runtime/deep-equals'
export { getDeepEquals } from './runtime/deep-equals'

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Engine (High-Performance Bun-Only Engine)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Native Bun HTTP engine for maximum performance.
 *
 * High-performance standalone HTTP server implementation using Bun's native APIs.
 * Available via @gravito/core/engine import path for direct usage without PlanetCore.
 * Use this when you need raw performance and are targeting Bun runtime.
 *
 * @see {@link PlanetCore} for the full-featured application framework
 * @public
 */
export * as engine from './engine'

// ─────────────────────────────────────────────────────────────────────────────
// FFI (Foreign Function Interface) - Native Acceleration Layer
// Re-export via @gravito/core/ffi to avoid compile-time FFI initialization
// ─────────────────────────────────────────────────────────────────────────────
// Note: Import via `import { NativeAccelerator } from '@gravito/core/ffi'`
// Do NOT import directly from main entry to avoid compile-time FFI loading

// ─────────────────────────────────────────────────────────────────────────────
// Configuration Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configure your Gravito application with type safety.
 *
 * Helper function that validates and returns application configuration.
 * Enables IDE autocomplete and type checking for GravitoConfig.
 *
 * @param config - Application configuration object
 * @returns The same config object, type-validated
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
 * @public
 */
export function defineConfig(config: GravitoConfig): GravitoConfig {
  return config
}

/**
 * Bun platform-specific adapters and utilities.
 * @public
 */
export {
  BunContext,
  BunRequest,
  BunWebSocketHandler,
  NodeType,
  RadixNode,
  RadixRouter,
  type RouteMatch,
  type WebSocketRouteHandlers,
} from './adapters/bun'
