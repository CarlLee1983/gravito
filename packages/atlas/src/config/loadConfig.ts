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
        'config/database.json',
        'config/database.json5',
        'database.config.ts',
        'database.config.js',
        'database.config.json',
        'database.config.json5',
      ]

  for (const path of paths) {
    try {
      // 處理 JSON5 格式的設定檔
      if (path.endsWith('.json5')) {
        const config = await loadJson5ConfigFile(path)
        if (config) {
          return config
        }
        continue
      }

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
 * 讀取並解析 JSON5 格式的設定檔
 * 優先使用 Bun.JSON5.parse()，若不支援則降級為標準 JSON.parse()
 *
 * @param filePath - JSON5 設定檔路徑
 * @returns Atlas 設定物件，若檔案不存在則返回 null
 */
async function loadJson5ConfigFile(filePath: string): Promise<AtlasConfig | null> {
  const g = globalThis as Record<string, unknown>
  const bunGlobal = g.Bun as
    | {
        file: (path: string) => { text: () => Promise<string>; exists?: () => Promise<boolean> }
        JSON5?: { parse: (text: string) => unknown }
      }
    | undefined

  try {
    let content: string

    if (bunGlobal?.file) {
      // Bun 環境：使用 Bun.file 讀取
      const file = bunGlobal.file(filePath)
      // 能力偵測：檢查檔案是否存在
      if (file.exists) {
        const exists = await file.exists()
        if (!exists) {
          return null
        }
      }
      content = await file.text()
    } else {
      // Node.js 降級方案
      const { readFile } = await import('node:fs/promises')
      content = await readFile(filePath, 'utf8')
    }

    // 解析 JSON5 內容
    if (bunGlobal?.JSON5?.parse) {
      // 使用 Bun.JSON5.parse() 進行完整 JSON5 語法支援
      const parsed = bunGlobal.JSON5.parse(content)
      return parsed as AtlasConfig
    }

    // 降級：使用標準 JSON.parse()（JSON5 是 JSON 的超集，標準 JSON 仍可解析）
    return JSON.parse(content) as AtlasConfig
  } catch (error) {
    const err = error as { code?: string }
    // 忽略「檔案不存在」錯誤，繼續嘗試下一個路徑
    if (err.code === 'ENOENT' || err.code === 'ERR_MODULE_NOT_FOUND') {
      return null
    }
    throw error
  }
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
