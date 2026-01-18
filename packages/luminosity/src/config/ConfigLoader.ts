import { existsSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import type { SeoConfig } from '../types'

/**
 * ConfigLoader is responsible for discovering and loading Luminosity
 * configuration files.
 *
 * It searches for standard configuration filenames (`gravito.seo.config.ts`, etc.)
 * in the current working directory or loads a specific file from a provided path.
 *
 * @public
 * @since 3.0.0
 */
export class ConfigLoader {
  /**
   * Load configuration from file
   * Supports .ts, .js, .mjs chunks
   */
  async load(configPath?: string): Promise<SeoConfig> {
    const cwd = process.cwd()

    // Default search paths in order
    const defaultPaths = [
      'gravito.seo.config.ts',
      'gravito.seo.config.js',
      'gravito.seo.config.mjs',
    ]

    let targetPath = ''

    if (configPath) {
      targetPath = isAbsolute(configPath) ? configPath : resolve(cwd, configPath)
    } else {
      for (const p of defaultPaths) {
        const fullPath = join(cwd, p)
        if (existsSync(fullPath)) {
          targetPath = fullPath
          break
        }
      }
    }

    if (!targetPath) {
      throw new Error(
        `[GravitoSeo] Config file not found. Please create 'gravito.seo.config.ts' or pass a path.`
      )
    }

    try {
      // Dynamic import usage
      const mod = await import(targetPath)
      const config = mod.default || mod

      this.validate(config)

      return config as SeoConfig
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`[GravitoSeo] Failed to load config from ${targetPath}: ${message}`)
    }
  }

  private validate(config: unknown): void {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be an object')
    }

    const raw = config as Record<string, unknown>

    const mode = raw.mode
    if (mode !== 'dynamic' && mode !== 'cached' && mode !== 'incremental') {
      throw new Error('Config missing "mode"')
    }

    const baseUrl = raw.baseUrl
    if (typeof baseUrl !== 'string' || baseUrl.trim().length === 0) {
      throw new Error('Config missing "baseUrl"')
    }

    const resolvers = raw.resolvers
    if (!Array.isArray(resolvers)) {
      throw new Error('Config missing "resolvers"')
    }
  }
}
