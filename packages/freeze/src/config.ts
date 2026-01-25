/**
 * @gravito/freeze - Static Site Generation Core Module
 *
 * Configuration for SSG detection, locale handling, and build options.
 */

import type { AbsolutePath, Locale } from './types'
import { asAbsolutePath, asLocale } from './types'

/**
 * Defines a redirect rule for abstract routes in static site generation.
 *
 * Used to redirect non-localized paths (like `/docs`) to their localized
 * equivalents (like `/en/docs/guide`). These rules generate HTML redirect
 * files during the build process.
 *
 * @example
 * ```typescript
 * const rule: RedirectRule = {
 *   from: asAbsolutePath('/docs'),
 *   to: asAbsolutePath('/en/docs/guide/getting-started')
 * }
 * ```
 */
export interface RedirectRule {
  /** Source path without locale prefix (e.g., '/docs', '/about') */
  from: AbsolutePath
  /** Target path with locale prefix (e.g., '/en/docs/guide/getting-started') */
  to: AbsolutePath
}

/**
 * Configuration for Static Site Generation (SSG) in Gravito Framework.
 *
 * Defines how the framework detects static hosting environments,
 * handles multi-locale routing, and generates build artifacts.
 *
 * @remarks
 * This configuration drives both runtime environment detection
 * (via {@link FreezeDetector}) and build-time file generation
 * (via builder utilities).
 *
 * @example
 * ```typescript
 * const config = defineConfig({
 *   staticDomains: ['example.com'],
 *   locales: ['en', 'zh'],
 *   defaultLocale: 'en',
 *   baseUrl: 'https://example.com'
 * })
 * ```
 */
export interface FreezeConfig {
  /**
   * Production domains that should use static mode.
   *
   * When the site is accessed via these domains, static navigation
   * (native `<a>` tags) will be used instead of dynamic routing.
   *
   * @example ['example.com', 'example.github.io']
   */
  staticDomains: string[]

  /**
   * Port number for local static preview server.
   *
   * Used to detect when running the built static site locally.
   * When accessed via `localhost:<previewPort>`, static mode is enabled.
   *
   * @defaultValue 4173
   */
  previewPort: number

  /**
   * Supported locale identifiers for internationalization.
   *
   * These locales are used to generate URL prefixes (e.g., `/en/`, `/zh/`)
   * and build hreflang alternates for SEO.
   *
   * @example ['en', 'zh', 'ja']
   */
  locales: Locale[]

  /**
   * Default locale used for fallbacks and redirects.
   *
   * Abstract routes (like `/docs`) redirect to this locale's version
   * (e.g., `/en/docs`) by default.
   *
   * @defaultValue 'en'
   */
  defaultLocale: Locale

  /**
   * Redirect rules for abstract routes.
   *
   * Abstract routes are paths without static HTML files that need
   * redirect pages generated during build. Each rule creates an
   * `index.html` with meta refresh and JavaScript redirect.
   */
  redirects: RedirectRule[]

  /**
   * Output directory for static build artifacts.
   *
   * All generated HTML, redirects, and assets are written here.
   *
   * @defaultValue 'dist-static'
   */
  outputDir: string

  /**
   * Base URL for production deployment.
   *
   * Used in sitemap generation, canonical URLs, and hreflang tags.
   * Must include protocol (https://) but no trailing slash.
   *
   * @example 'https://example.com'
   */
  baseUrl: string

  /**
   * Domain patterns for auto-detecting static hosting platforms.
   *
   * Hostnames ending with these patterns are automatically treated
   * as static sites, enabling static navigation mode.
   *
   * @defaultValue ['.github.io', '.vercel.app', '.netlify.app', '.pages.dev', '.surge.sh', '.render.com']
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
 * Defines SSG configuration with sensible defaults.
 *
 * Merges user-provided configuration with framework defaults and validates
 * branded types (Locale, AbsolutePath) to ensure type safety.
 *
 * @param config - Partial configuration to override defaults
 * @returns Complete FreezeConfig with all required fields populated
 *
 * @example
 * ```typescript
 * // Minimal configuration
 * const config = defineConfig({
 *   staticDomains: ['example.com'],
 *   baseUrl: 'https://example.com'
 * })
 *
 * // Full configuration
 * const config = defineConfig({
 *   staticDomains: ['example.com'],
 *   previewPort: 4173,
 *   locales: ['en', 'zh', 'ja'],
 *   defaultLocale: 'en',
 *   baseUrl: 'https://example.com',
 *   redirects: [
 *     { from: '/docs', to: '/en/docs/guide' }
 *   ]
 * })
 * ```
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
