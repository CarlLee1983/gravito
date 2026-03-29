/// <reference types="bun-types" />
/**
 * @gravito/core
 *
 * Browser-safe entry point for the core micro-kernel.
 * Excludes Node.js specific modules like runtime adapters and FFI.
 *
 * @packageDocumentation
 */

// Export version from package.json
import packageJson from '../package.json'

/**
 * Current version of @gravito/core.
 * @public
 */
export const VERSION = packageJson.version

// ─────────────────────────────────────────────────────────────────────────────
// Gravito HTTP Abstractions (Types are safe)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Core Exports (Filtered for browser safety)
// ─────────────────────────────────────────────────────────────────────────────

export { ConfigManager } from './ConfigManager'
export { Container, type Factory, type ServiceKey, type ServiceMap } from './Container'
export { registerQueueCommands } from './cli/queue-commands'
export {
  codeFromStatus,
  ErrorHandler,
  type ErrorHandlerDeps,
  messageFromStatus,
} from './ErrorHandler'
export { EventManager } from './EventManager'

// Event System (Types are safe)
export * from './events' // Most logic in events is browser-safe or has fallbacks

// Hooks
export { HookManager, type HookManagerConfig } from './HookManager'

// Health
export { HealthProvider } from './health/HealthProvider'

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
  tap,
  throwIf,
  throwUnless,
  value,
} from './helpers'
export { dataGet, dataHas, dataSet, type DataPath, type PathSegment } from './helpers/data'
export { createErrorBag, type ErrorBag, errors, old } from './helpers/errors'
export { type ApiFailure, type ApiSuccess, fail, jsonFail, jsonSuccess, ok } from './helpers/response'

// HTTP utilities
export { CookieJar, type CookieOptions } from './http/CookieJar'
export { deleteCookie, getCookie, setCookie } from './http/cookie'

// Service Provider
export { ServiceProvider } from './ServiceProvider'

// ─────────────────────────────────────────────────────────────────────────────
// Browser-Safe Runtime
// ─────────────────────────────────────────────────────────────────────────────

export * from './runtime/index.browser'

// ─────────────────────────────────────────────────────────────────────────────
// Configuration Helper
// ─────────────────────────────────────────────────────────────────────────────

export function defineConfig(config: any): any {
  return config
}
