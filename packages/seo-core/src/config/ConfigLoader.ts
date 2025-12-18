import { existsSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import type { SeoConfig } from '../types'

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
    } catch (e: any) {
      throw new Error(`[GravitoSeo] Failed to load config from ${targetPath}: ${e.message}`)
    }
  }

  private validate(config: any) {
    if (!config.mode) throw new Error('Config missing "mode"')
    if (!config.baseUrl) throw new Error('Config missing "baseUrl"')
    if (!config.resolvers && config.mode !== 'incremental') {
      // Incremental mode might not strictly need resolvers if it's purely API driven,
      // but typically it does initial population. Let's warn or strict?
      // Let's be strict for now.
      throw new Error('Config missing "resolvers"')
    }
  }
}
