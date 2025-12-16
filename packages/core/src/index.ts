/**
 * gravito-core
 *
 * The core micro-kernel for the Galaxy Architecture.
 */

// Export version from package.json
import packageJson from '../package.json';

export const VERSION = packageJson.version;

// Phase 2 Exports
export { ConfigManager } from './ConfigManager';
export type { ActionCallback, FilterCallback } from './HookManager';

export { HookManager } from './HookManager';
export type { Logger } from './Logger';
export { ConsoleLogger } from './Logger';
export type { PlanetCoreOptions } from './PlanetCore';
// Core Exports
export { PlanetCore, type GravitoConfig, type GravitoOrbit } from './PlanetCore';

/**
 * Configure your Gravito application
 */
export function defineConfig(config: GravitoConfig): GravitoConfig {
    return config;
}
