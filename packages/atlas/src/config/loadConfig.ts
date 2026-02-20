/**
 * Configuration Loader
 * @description Load database configuration from various sources
 */

import type { AtlasConfig } from '../types'
import { fromEnv } from './defineConfig'

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
export async function loadConfigFile(configPath?: string): Promise<AtlasConfig> {
  const paths = configPath
    ? [configPath]
    : [
        'config/database.ts',
        'config/database.js',
        'config/database.mjs',
        'database.config.ts',
        'database.config.js',
      ]

  for (const path of paths) {
    try {
      // Try to load the config file
      const configModule = await import(path)
      const config = configModule.default || configModule.config

      if (config) {
        // Validate and return
        if (typeof config === 'function') {
          return config()
        }
        return config as AtlasConfig
      }
    } catch (error) {
      // File not found, try next path
      if ((error as { code?: string }).code !== 'ERR_MODULE_NOT_FOUND') {
        throw error
      }
    }
  }

  throw new Error(
    `Configuration file not found. Tried: ${paths.join(', ')}. ` +
      `Create a config file or use DB.configureFromEnv() instead.`
  )
}

/**
 * Load configuration from multiple sources with priority
 * Priority: 1. Config file, 2. Environment variables, 3. Default
 *
 * @param options - Loading options
 * @returns Atlas configuration
 */
export async function loadConfig(
  options: { configPath?: string; useEnv?: boolean; envPrefix?: string } = {}
): Promise<AtlasConfig> {
  const { configPath, useEnv = true, envPrefix = '' } = options

  // Priority 1: Try config file
  if (configPath !== null) {
    try {
      return await loadConfigFile(configPath)
    } catch (error) {
      // Config file not found, continue to next priority
      if (useEnv) {
        // Priority 2: Try environment variables
        try {
          return fromEnv('default', envPrefix)
        } catch {
          // Environment variables not found, throw error
          throw new Error(
            'No database configuration found. ' +
              'Please provide a config file or set environment variables.'
          )
        }
      }
      throw error
    }
  }

  // Priority 2: Environment variables
  if (useEnv) {
    return fromEnv('default', envPrefix)
  }

  throw new Error('No database configuration provided')
}
