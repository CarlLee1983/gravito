import { execSync } from 'node:child_process'

console.log('Building @gravito/core...')

// Clean dist
await Bun.$`rm -rf dist`

try {
  // Build bundles WITHOUT dts to avoid memory exhaustion
  execSync(
    'npx tsup src/index.ts src/compat.ts --format esm,cjs --shims --external @gravito/photon --external bun:test --external bun:sqlite --outDir dist --target esnext',
    {
      stdio: 'inherit',
      env: process.env,
    }
  )

  // Generate d.ts files manually from source exports
  console.log('Generating .d.ts files...')
  const fs = await import('node:fs')

  // Generate compat.d.ts with proper type exports
  const compatDts = `/**
 * @fileoverview Type Compatibility Layer
 *
 * This module provides type aliases for backward compatibility with
 * code that directly imports from Photon. Users can gradually migrate
 * to the Gravito abstractions.
 *
 * @module @gravito/core/compat
 * @since 2.0.0
 */

// Re-export Gravito types with Photon-style aliases for migration
export type ContentfulStatusCode = import('./http/types').ContentfulStatusCode;
export type Context = import('./http/types').GravitoContext;
export type GravitoContext = import('./http/types').GravitoContext;
export type GravitoErrorHandler = import('./http/types').GravitoErrorHandler;
export type Handler = import('./http/types').GravitoHandler;
export type GravitoHandler = import('./http/types').GravitoHandler;
export type MiddlewareHandler = import('./http/types').GravitoMiddleware;
export type GravitoMiddleware = import('./http/types').GravitoMiddleware;
export type Next = import('./http/types').GravitoNext;
export type GravitoNext = import('./http/types').GravitoNext;
export type GravitoNotFoundHandler = import('./http/types').GravitoNotFoundHandler;
export type GravitoRequest = import('./http/types').GravitoRequest;
export type Variables = import('./http/types').GravitoVariables;
export type GravitoVariables = import('./http/types').GravitoVariables;
export type HttpMethod = import('./http/types').HttpMethod;
export type StatusCode = import('./http/types').StatusCode;
export type ValidationTarget = import('./http/types').ValidationTarget;
`

  fs.writeFileSync('dist/compat.d.ts', compatDts)

  // For index.d.ts, generate complete exports from index.ts
  const indexDts = `/**
 * @gravito/core - The micro-kernel for the Galaxy Architecture
 * @packageDocumentation
 */

export const VERSION: string;

// HTTP Types & Adapters
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
} from './http/types';

export type {
  AdapterConfig,
  AdapterFactory,
  HttpAdapter,
  RouteDefinition,
} from './adapters/types';

export { GravitoEngineAdapter } from './adapters/GravitoEngineAdapter';
export {
  createGravitoAdapter,
  createPhotonAdapter,
  GravitoAdapter,
  PhotonAdapter,
  PhotonContextWrapper,
  PhotonRequestWrapper,
} from './adapters/PhotonAdapter';
export { isHttpAdapter } from './adapters/types';

// Core Classes
export { Application } from './Application';
export { CommandKernel } from './CommandKernel';
export { ConfigManager } from './ConfigManager';
export { Container } from './Container';
export { EventManager } from './EventManager';
export { GravitoServer } from './GravitoServer';
export { HookManager } from './HookManager';
export { PlanetCore } from './PlanetCore';

// Core Types
export type { ApplicationConfig } from './Application';
export type { CacheService, ErrorHandlerContext, GravitoConfig, GravitoOrbit, FormRequestClass, ViewService } from './PlanetCore';
export type { CommandHandler } from './CommandKernel';
export type { Factory, ServiceKey, ServiceMap } from './Container';
export { RequestScopeManager } from './Container/RequestScopeManager';
export {
  RequestScopeMetrics,
  RequestScopeMetricsCollector,
  type RequestScopeObserver,
} from './Container/RequestScopeMetrics';
export { registerQueueCommands } from './cli/queue-commands';

// Error Handler
export {
  codeFromStatus,
  ErrorHandler,
  type ErrorHandlerDeps,
  messageFromStatus,
} from './ErrorHandler';

// Events
export { EventManager as EventManagerClass } from './EventManager';

// RequestScope-Aware Error Handling
export {
  cleanupRequestScopeOnError,
  detectRequestScopeLeaks,
  extractRequestScopeErrorContext,
  RequestScopeCleanupError,
  type RequestScopeErrorContext,
  withRequestScopeCleanup,
} from './error-handling/RequestScopeErrorContext';

// Event System
export type {
  CircuitBreakerOptions,
  DLQEntry,
  DLQFilter,
  EventBackend,
  EventOptions,
  EventTask,
} from './events';
export {
  CircuitBreaker,
  CircuitBreakerState,
  DEFAULT_EVENT_OPTIONS,
  DeadLetterQueue,
  EventPriorityQueue,
} from './events';

// Event System Observability
export type {
  EventTracingConfig,
  ObservabilityConfig,
  QueueDepthCallback,
} from './events/observability';
export {
  EventMetrics,
  EventTracer,
  EventTracing,
  getEventTracing,
  ObservableHookManager,
  OTelEventMetrics,
} from './events/observability';

// Queue Dashboard & CLI
export {
  type DashboardSnapshot,
  type ErrorStats,
  type JobEvent,
  QueueDashboard,
  type QueueDashboardConfig,
  type QueueMetrics,
  type WorkerMetrics as QueueWorkerMetrics,
} from './observability/QueueDashboard';

// Exceptions
export * from './exceptions';

// Global Error Handlers
export {
  type GlobalErrorHandlersMode,
  type GlobalProcessErrorHandlerContext,
  type GlobalProcessErrorKind,
  type RegisterGlobalErrorHandlersOptions,
  registerGlobalErrorHandlers,
} from './GlobalErrorHandlers';

export { type GravitoManifest } from './GravitoServer';

// Hooks
export type { ActionCallback, FilterCallback, ListenerInfo, ListenerOptions } from './HookManager';
export type { HookManagerConfig } from './HookManager';
export type { DumpOptions } from './helpers';

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
} from './helpers';
export * from './helpers/data';
export * from './helpers/errors';
export * from './helpers/response';

// HTTP / Security utilities
export { CookieJar, type CookieOptions } from './http/CookieJar';
export { deleteCookie, getCookie, setCookie } from './http/cookie';
export { type BodySizeLimitOptions, bodySizeLimit } from './http/middleware/BodySizeLimit';
export { type CorsOptions, type CorsOrigin, cors } from './http/middleware/Cors';
export { type CsrfOptions, csrfProtection, getCsrfToken } from './http/middleware/Csrf';
export {
  createHeaderGate,
  type HeaderTokenGateOptions,
  type RequireHeaderTokenOptions,
  requireHeaderToken,
} from './http/middleware/HeaderTokenGate';
export {
  type HstsOptions,
  type SecurityHeadersOptions,
  securityHeaders,
} from './http/middleware/SecurityHeaders';
export { ThrottleRequests } from './http/middleware/ThrottleRequests';

// OpenTelemetry Instrumentation
export * as instrumentation from './instrumentation';
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
} from './instrumentation';

// Listeners
export type { Listener, ShouldQueue } from './Listener';

// Logger
export type { Logger } from './Logger';
export { ConsoleLogger } from './Logger';

// Routing
export { Route } from './Route';
export {
  type ControllerClass,
  FORM_REQUEST_SYMBOL,
  type FormRequestLike,
  RouteGroup,
  type RouteHandler,
  type RouteOptions,
  Router,
} from './Router';

// Reliability
export type { DLQManagerFilter, DLQRecord, DLQStats, RetryPolicy } from './reliability';
export {
  DeadLetterQueueManager,
  getDefaultRetryPolicy,
  getPresetRetryPolicy,
  RetryEngine,
} from './reliability';

// Service Provider
export { ServiceProvider } from './ServiceProvider';

// Security
export { Encrypter, type EncrypterOptions } from './security/Encrypter';

// Event Types
export type { Channel, ShouldBroadcast } from './types/events';
export { Event } from './types/events';

// Testing Utilities
export * from './testing';

// Runtime Adapters
export {
  createSqliteDatabase,
  getPasswordAdapter,
  getRuntimeAdapter,
  getRuntimeEnv,
  type RuntimeAdapter,
  type RuntimeFileStat,
  type RuntimeKind,
  type RuntimePasswordAdapter,
  type RuntimeProcess,
  type RuntimeServeConfig,
  type RuntimeServer,
  type RuntimeSpawnOptions,
  type RuntimeSqliteDatabase,
  type RuntimeSqliteStatement,
} from './runtime';

// Standalone Engine (High-Performance Bun-Only Engine)
export * as engine from './engine';

// Configuration Helper
export function defineConfig(config: import('./PlanetCore').GravitoConfig): import('./PlanetCore').GravitoConfig;
`

  fs.writeFileSync('dist/index.d.ts', indexDts)

  // Generate Router.d.ts for proper type support
  const routerDts = `/**
 * @gravito/core - Router and Routing Utilities
 * @packageDocumentation
 */

export type ControllerClass = new (core: import('./index').PlanetCore) => any;
export type GravitoHandler = import('./index').GravitoHandler;
export type GravitoMiddleware = import('./index').GravitoMiddleware;
export type RouteHandler = GravitoHandler | [ControllerClass, string];
export interface FormRequestLike {
  validate(): Promise<void>;
  validated(): Record<string, unknown>;
  only(...keys: string[]): Record<string, unknown>;
  except(...keys: string[]): Record<string, unknown>;
  has(key: string): boolean;
  get(key: string, defaultValue?: unknown): unknown;
  all(): Record<string, unknown>;
  failed(): string[];
}
export type FormRequestClass = new () => FormRequestLike;
export const FORM_REQUEST_SYMBOL: symbol;
export interface RouteOptions {
  prefix?: string;
  domain?: string;
  middleware?: GravitoMiddleware[];
}
export declare class RouteGroup {
  constructor(router: Router, options: RouteOptions);
  prefix(path: string): RouteGroup;
  middleware(...handlers: (GravitoMiddleware | GravitoMiddleware[])[]): RouteGroup;
  domain(domain: string): RouteGroup;
  group(callback: (api: RouteGroup) => void): RouteGroup;
  get(path: string, handler: RouteHandler | RouteHandler[]): Route;
  post(path: string, handler: RouteHandler | RouteHandler[]): Route;
  put(path: string, handler: RouteHandler | RouteHandler[]): Route;
  patch(path: string, handler: RouteHandler | RouteHandler[]): Route;
  delete(path: string, handler: RouteHandler | RouteHandler[]): Route;
  head(path: string, handler: RouteHandler | RouteHandler[]): Route;
  options(path: string, handler: RouteHandler | RouteHandler[]): Route;
  any(path: string, handler: RouteHandler | RouteHandler[]): Route;
  resource(resource: string, controller: ControllerClass, options?: any): void;
  match(methods: string[], path: string, handler: RouteHandler | RouteHandler[]): Route;
}
export declare class Router {
  routes: Array<{ method: string; path: string; domain?: string }>;
  constructor(core?: import('./index').PlanetCore);
  compile(): Array<{ method: string; path: string; name?: string; domain?: string }>;
  bind(param: string, fn: (id: string) => Promise<unknown>): Router;
  url(name: string, params?: Record<string, any>): string | null;
  prefix(path: string): RouteGroup;
  middleware(...handlers: (GravitoMiddleware | GravitoMiddleware[])[]): RouteGroup;
  domain(domain: string): RouteGroup;
  group(callback: (api: RouteGroup) => void): void;
  get(path: string, handler: RouteHandler | RouteHandler[], name?: string): Route;
  post(path: string, handler: RouteHandler | RouteHandler[], name?: string): Route;
  put(path: string, handler: RouteHandler | RouteHandler[], name?: string): Route;
  patch(path: string, handler: RouteHandler | RouteHandler[], name?: string): Route;
  delete(path: string, handler: RouteHandler | RouteHandler[], name?: string): Route;
  head(path: string, handler: RouteHandler | RouteHandler[], name?: string): Route;
  options(path: string, handler: RouteHandler | RouteHandler[], name?: string): Route;
  any(path: string, handler: RouteHandler | RouteHandler[], name?: string): Route;
  resource(resource: string, controller: ControllerClass, options?: any): void;
  match(methods: string[], path: string, handler: RouteHandler | RouteHandler[], name?: string): Route;
}

export interface ResourceAction {
  index?: RouteHandler | RouteHandler[];
  create?: RouteHandler | RouteHandler[];
  store?: RouteHandler | RouteHandler[];
  show?: RouteHandler | RouteHandler[];
  edit?: RouteHandler | RouteHandler[];
  update?: RouteHandler | RouteHandler[];
  destroy?: RouteHandler | RouteHandler[];
}

export interface ResourceOptions {
  only?: string[];
  except?: string[];
  names?: Record<string, string>;
}

export declare class Route {
  constructor(method: string, path: string, handler: RouteHandler | RouteHandler[]);
  name(name: string): Route;
  middleware(...handlers: (GravitoMiddleware | GravitoMiddleware[])[]): Route;
}
`

  fs.writeFileSync('dist/Router.d.ts', routerDts)

  console.log('Building @gravito/core/engine...')

  // Build engine bundles
  execSync(
    'npx tsup src/engine/index.ts --format esm,cjs --shims --external @gravito/photon --external bun:test --outDir dist/engine --target esnext',
    {
      stdio: 'inherit',
      env: process.env,
    }
  )

  // Generate engine.d.ts for proper type support
  const engineDts = `/**
 * @gravito/core/engine - High-Performance Web Engine for Bun
 * @packageDocumentation
 */

// Main Engine Class
export declare class Gravito {
  constructor(options?: any);
  get(path: string, handler: any): void;
  post(path: string, handler: any): void;
  put(path: string, handler: any): void;
  patch(path: string, handler: any): void;
  delete(path: string, handler: any): void;
  head(path: string, handler: any): void;
  options(path: string, handler: any): void;
  use(middleware: any): void;
  all(path: string, handler: any): void;
  route(path: string, methods?: any): void;
  mount(path: string, router: any): void;
  notFound(handler: any): void;
  onError(handler: any): void;
  fetch(request: any): any;
  match(path: string, method?: string): any;
}

// Types
export type {
  EngineOptions,
  ErrorHandler,
  FastContext,
  FastRequest,
  Handler,
  Middleware,
  NotFoundHandler,
  RouteMatch,
} from './types';

// Advanced Exports
export declare class AOTRouter {
  constructor(routes?: any[]);
  compile(): void;
  match(path: string, method?: string): any;
}

export declare class FastContext {
  constructor(request: any, params?: any);
  json(data: any, status?: number): any;
  text(text: any, status?: number): any;
  html(html: any, status?: number): any;
  blob(blob: any, options?: any): any;
  redirect(url: string, status?: number): any;
  setHeader(key: string, value: string): void;
  setCookie(name: string, value: string, options?: any): void;
}

export declare class MinimalContext {
  constructor(request: any, params?: any);
  json(data: any): any;
  text(text: any): any;
}

export declare function extractPath(url: string): string;

export declare class ObjectPool {
  constructor(factory: any, options?: any);
  acquire(): any;
  release(obj: any): void;
  clear(): void;
}
`

  fs.writeFileSync('dist/engine/index.d.ts', engineDts)

  console.log('✅ Build complete!')
} catch (_error) {
  console.error('❌ Build failed', _error)
  process.exit(1)
}
