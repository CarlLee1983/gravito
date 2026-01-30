/**
 * Configuration Module
 * @description Database configuration utilities
 */

// Re-export for convenience
export type { AtlasConfig, ConnectionConfig } from '../types'
export { defineConfig, fromEnv } from './defineConfig'
export { autoConfigure, loadConfig, loadConfigFile } from './loadConfig'
