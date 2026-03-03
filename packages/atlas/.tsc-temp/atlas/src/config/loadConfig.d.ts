/**
 * Configuration Loader
 * @description Load database configuration from various sources
 */
import type { AtlasConfig } from '../types'
/**
 * Load configuration from a TypeScript/JavaScript config file
 *
 * @param configPath - Path to the config file (default: 'config/database.ts' or 'config/database.js')
 * @returns Atlas configuration
 *
 * @example
 * ```typescript
 * // config/database.ts
 * import { defineConfig } from '@gravito/atlas'
 *
 * export default defineConfig({
 *   default: 'default',
 *   connections: {
 *     default: {
 *       driver: 'postgres',
 *       host: 'localhost',
 *       database: 'myapp'
 *     }
 *   }
 * })
 * ```
 */
export declare function loadConfigFile(configPath?: string): Promise<AtlasConfig>
/**
 * Load configuration from multiple sources with priority
 * Priority: 1. Config file, 2. Environment variables, 3. Default
 *
 * @param options - Loading options
 * @returns Atlas configuration
 */
export declare function loadConfig(options?: {
  configPath?: string
  useEnv?: boolean
  envPrefix?: string
}): Promise<AtlasConfig>
