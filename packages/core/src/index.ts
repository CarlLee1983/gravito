/**
 * gravito-core
 *
 * The core micro-kernel for the Galaxy Architecture.
 */

// Export version from package.json
import packageJson from '../package.json';
import type { GravitoConfig } from './PlanetCore';

export const VERSION = packageJson.version;

// Phase 2 Exports
export { ConfigManager } from './ConfigManager';
export type { ActionCallback, FilterCallback } from './HookManager';

export { HookManager } from './HookManager';
export * from './helpers';
export type { Logger } from './Logger';
export { ConsoleLogger } from './Logger';
// Core Exports
export {
  type CacheService,
  type ErrorHandlerContext,
  type GravitoConfig,
  type GravitoOrbit,
  PlanetCore,
  type ViewService,
} from './PlanetCore';
export {
  type ControllerClass,
  type FormRequestClass,
  type FormRequestLike,
  type RouteHandler,
  Router,
} from './Router';

/**
 * Configure your Gravito application
 */
export function defineConfig(config: GravitoConfig): GravitoConfig {
  return config;
}
