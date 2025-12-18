/**
 * gravito-core
 *
 * The core micro-kernel for the Galaxy Architecture.
 */

// Export version from package.json
import packageJson from '../package.json'
import type { GravitoConfig } from './PlanetCore'

export const VERSION = packageJson.version

// Phase 2 Exports
export { ConfigManager } from './ConfigManager'
export { Container, type Factory } from './Container'
// Events Exports
export { EventManager } from './EventManager'
export * from './exceptions'
export {
  type GlobalErrorHandlersMode,
  type GlobalProcessErrorHandlerContext,
  type GlobalProcessErrorKind,
  type RegisterGlobalErrorHandlersOptions,
  registerGlobalErrorHandlers,
} from './GlobalErrorHandlers'
export type { ActionCallback, FilterCallback } from './HookManager'
export { HookManager } from './HookManager'
export * from './helpers'
// HTTP / Security utilities
export { CookieJar, type CookieOptions } from './http/CookieJar'
export { ThrottleRequests } from './http/middleware/ThrottleRequests'
export type { Listener, ShouldQueue } from './Listener'
export type { Logger } from './Logger'
export { ConsoleLogger } from './Logger'
// Core Exports
export {
  type CacheService,
  type ErrorHandlerContext,
  type GravitoConfig,
  type GravitoOrbit,
  PlanetCore,
  type ViewService,
} from './PlanetCore'
export { Route } from './Route'
export {
  type ControllerClass,
  type FormRequestClass,
  type FormRequestLike,
  type RouteHandler,
  type RouteOptions,
  Router,
} from './Router'
export { ServiceProvider } from './ServiceProvider'
export { Encrypter, type EncrypterOptions } from './security/Encrypter'
export type { Channel, ShouldBroadcast } from './types/events'
export { Event } from './types/events'

/**
 * Configure your Gravito application
 */
export function defineConfig(config: GravitoConfig): GravitoConfig {
  return config
}
