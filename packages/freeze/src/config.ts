/**
 * @gravito/freeze - Static Site Generation Core Module
 *
 * Configuration for SSG detection, locale handling, and build options.
 */

/**
 * Redirect rule for abstract routes
 */
export interface RedirectRule {
  /** Source path (e.g., '/docs', '/about') */
  from: string
  /** Target path with locale (e.g., '/en/docs/guide/getting-started') */
  to: string
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
  locales: string[]

  /**
   * Default locale (used for redirects)
   * @default 'en'
   */
  defaultLocale: string

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
}

/**
 * Default configuration values
 */
export const defaultConfig: Partial<FreezeConfig> = {
  previewPort: 4173,
  defaultLocale: 'en',
  outputDir: 'dist-static',
  locales: ['en'],
  redirects: [],
  staticDomains: [],
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
  return {
    ...defaultConfig,
    ...config,
  } as FreezeConfig
}
