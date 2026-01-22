/**
 * @gravito/freeze - Static Site Generation Core Module
 *
 * Configuration for SSG detection, locale handling, and build options.
 */

import type { AbsolutePath, Locale } from './types'
import { asAbsolutePath, asLocale } from './types'

/**
 * Redirect rule for abstract routes
 */
export interface RedirectRule {
  /** Source path (e.g., '/docs', '/about') */
  from: AbsolutePath
  /** Target path with locale (e.g., '/en/docs/guide/getting-started') */
  to: AbsolutePath
}

/**
 * SSG Configuration
 */
export interface FreezeConfig {
  /**
   * Production domains that should use static mode
   * @example ['example.com', 'example.github.io']
   */
  staticDomains: string[]

  /**
   * Port number for local static preview server
   * @default 4173
   */
  previewPort: number

  /**
   * Supported locales
   * @example ['en', 'zh']
   */
  locales: Locale[]

  /**
   * Default locale (used for redirects)
   * @default 'en'
   */
  defaultLocale: Locale

  /**
   * Redirect rules for abstract routes
   * These routes don't have static files and need redirect HTML
   */
  redirects: RedirectRule[]

  /**
   * Output directory for static build
   * @default 'dist-static'
   */
  outputDir: string

  /**
   * Base URL for production (used in sitemap, etc.)
   * @example 'https://example.com'
   */
  baseUrl: string

  /**
   * Common static hosting patterns for auto-detection
   * @default ['.github.io', '.vercel.app', '.netlify.app', '.pages.dev', '.surge.sh', '.render.com']
   */
  staticPatterns: string[]
}

/**
 * Default configuration values
 */
export const defaultConfig: Partial<FreezeConfig> = {
  previewPort: 4173,
  defaultLocale: asLocale('en'),
  outputDir: 'dist-static',
  locales: [asLocale('en')],
  redirects: [],
  staticDomains: [],
  staticPatterns: [
    '.github.io',
    '.vercel.app',
    '.netlify.app',
    '.pages.dev',
    '.surge.sh',
    '.render.com',
  ],
}

/**
 * Define SSG configuration with defaults.
 *
 * Merges the provided partial configuration with the internal default values.
 *
 * @param config - Partial configuration options.
 * @returns A complete FreezeConfig object.
 */
export function defineConfig(config: Partial<FreezeConfig>): FreezeConfig {
  const merged = {
    ...defaultConfig,
    ...config,
  } as FreezeConfig

  if (config.locales) {
    merged.locales = config.locales.map((l) => asLocale(l))
  }
  if (config.defaultLocale) {
    merged.defaultLocale = asLocale(config.defaultLocale)
  }
  if (config.redirects) {
    merged.redirects = config.redirects.map((r) => ({
      from: asAbsolutePath(r.from),
      to: asAbsolutePath(r.to),
    }))
  }

  return merged
}
