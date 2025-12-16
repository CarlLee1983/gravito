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
// Core Exports
export { type GravitoConfig, type GravitoOrbit, PlanetCore } from './PlanetCore';

import type { GravitoConfig } from './PlanetCore';

/**
 * Configure your Gravito application
 */
export function defineConfig(config: GravitoConfig): GravitoConfig {
  return config;
}
