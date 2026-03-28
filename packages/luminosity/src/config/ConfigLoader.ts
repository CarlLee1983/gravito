import { existsSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { LuminosityError } from '../errors/LuminosityError'
import { LuminosityErrorCodes } from '../errors/codes'
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
   * Load configuration from file.
   *
   * Supports .ts, .js, and .mjs files. Prioritizes the provided `configPath`
   * if given, otherwise searches default paths.
   *
   * @param configPath - Optional explicit path to the configuration file.
   * @returns The loaded and validated configuration.
   * @throws {Error} If the file is not found or is invalid.
   *
   * @example
   * ```typescript
   * const loader = new ConfigLoader();
   * const config = await loader.load('./seo.config.ts');
   * ```
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
      throw new LuminosityError(404, LuminosityErrorCodes.CONFIG_INVALID, {
        message:
          `[GravitoSeo] Config file not found. Please create 'gravito.seo.config.ts' or pass a path.`,
        retryable: false,
      })
    }

    try {
      // Dynamic import usage
      const mod = await import(targetPath)
      const config = mod.default || mod

      this.validate(config)

      return config as SeoConfig
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new LuminosityError(500, LuminosityErrorCodes.CONFIG_INVALID, {
        message: `[GravitoSeo] Failed to load config from ${targetPath}: ${message}`,
        retryable: false,
      })
    }
  }

  private validate(config: unknown): void {
    if (!config || typeof config !== 'object') {
      throw new LuminosityError(422, LuminosityErrorCodes.CONFIG_INVALID, {
        message: 'Config must be an object',
        retryable: false,
      })
    }

    const raw = config as Record<string, unknown>

    const mode = raw.mode
    if (mode !== 'dynamic' && mode !== 'cached' && mode !== 'incremental') {
      throw new LuminosityError(422, LuminosityErrorCodes.CONFIG_MISSING_MODE, {
        message: 'Config missing "mode"',
        retryable: false,
      })
    }

    const baseUrl = raw.baseUrl
    if (typeof baseUrl !== 'string' || baseUrl.trim().length === 0) {
      throw new LuminosityError(422, LuminosityErrorCodes.CONFIG_MISSING_BASE_URL, {
        message: 'Config missing "baseUrl"',
        retryable: false,
      })
    }

    const resolvers = raw.resolvers
    if (!Array.isArray(resolvers)) {
      throw new LuminosityError(422, LuminosityErrorCodes.CONFIG_MISSING_RESOLVERS, {
        message: 'Config missing "resolvers"',
        retryable: false,
      })
    }
  }
}
