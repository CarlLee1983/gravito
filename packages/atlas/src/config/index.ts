/**
 * Configuration Module
 * @description Database configuration utilities
 */

// Re-export for convenience
export type { AtlasConfig, ConnectionConfig } from '../types'
export { defineConfig, fromEnv } from './defineConfig'
export { loadConfig, loadConfigFile } from './loadConfig'
