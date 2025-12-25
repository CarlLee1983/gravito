/**
 * gravito-core
 *
 * The core micro-kernel for the Galaxy Architecture.
 *
 * @packageDocumentation
 */

// Export version from package.json
import packageJson from '../package.json'
import type { GravitoConfig } from './PlanetCore'

export const VERSION = packageJson.version

// ─────────────────────────────────────────────────────────────────────────────
// Gravito HTTP Abstractions (v2.0 - Adapter Pattern)
// These types enable swapping out the underlying HTTP engine.
// ─────────────────────────────────────────────────────────────────────────────

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

export { ConfigManager } from './ConfigManager'
export { Container, type Factory } from './Container'

// Events
export { EventManager } from './EventManager'

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

// Hooks
export type { ActionCallback, FilterCallback } from './HookManager'
export { HookManager } from './HookManager'

// Helpers
export * from './helpers'

// HTTP / Security utilities
export { CookieJar, type CookieOptions } from './http/CookieJar'
export { ThrottleRequests } from './http/middleware/ThrottleRequests'

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

// Routing
export { Route } from './Route'
export {
  type ControllerClass,
  type FormRequestClass,
  type FormRequestLike,
  type RouteHandler,
  type RouteOptions,
  Router,
} from './Router'

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
 *   orbits: [OrbitCache, OrbitPulsar],
 * })
 *
 * const core = await PlanetCore.boot(config)
 * ```
 */
export function defineConfig(config: GravitoConfig): GravitoConfig {
  return config
}
