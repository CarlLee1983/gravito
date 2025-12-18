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
export {
  type GlobalErrorHandlersMode,
  type GlobalProcessErrorHandlerContext,
  type GlobalProcessErrorKind,
  type RegisterGlobalErrorHandlersOptions,
  registerGlobalErrorHandlers,
} from './GlobalErrorHandlers'
export type { ActionCallback, FilterCallback } from './HookManager'
export { HookManager } from './HookManager'
// Events Exports
export { EventManager } from './EventManager'
export { Event } from './types/events'
export type { ShouldBroadcast, Channel } from './types/events'
export type { Listener, ShouldQueue } from './Listener'
export * from './helpers'
export * from './exceptions'
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
export {
  type ControllerClass,
  type FormRequestClass,
  type FormRequestLike,
  type RouteHandler,
  Router,
} from './Router'

export { Container, type Factory } from './Container'
export { ServiceProvider } from './ServiceProvider'

/**
 * Configure your Gravito application
 */
export function defineConfig(config: GravitoConfig): GravitoConfig {
  return config
}
