/**
 * Configuration Module
 * @description Database configuration utilities
 */

// Re-export for convenience
export type { ConnectionConfig } from '../types'
export type { AtlasConfig } from './defineConfig'
export { defineConfig, fromEnv } from './defineConfig'
export { autoConfigure, loadConfig, loadConfigFile } from './loadConfig'
