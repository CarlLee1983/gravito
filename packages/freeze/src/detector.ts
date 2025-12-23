/**
 * @gravito/freeze - SSG Detector
 *
 * Runtime detection for static site environment.
 * Works in both browser and server contexts.
 */

import type { FreezeConfig } from './config'

/**
 * SSG Environment Detector
 *
 * Detects whether the application is running in a static site environment
 * and provides utilities for locale-aware navigation.
 */
export class FreezeDetector {
  constructor(private config: FreezeConfig) {}

  /**
   * Check if running in a static site environment.
   *
   * Detection rules:
   * 1. Server-side rendering: always returns false.
   * 2. Local preview server (port 4173): returns true.
   * 3. Development server (localhost): returns false.
   * 4. Configured static domains: returns true.
   * 5. Common static hosting patterns (github.io, vercel.app, etc.): returns true.
   *
   * @returns True if the environment is a static site.
   */
  isStaticSite(): boolean {
    // Server-side: not static
    if (typeof window === 'undefined') {
      return false
    }

    const hostname = window.location.hostname
    const port = window.location.port

    // Local static preview server
    if (
      (hostname === 'localhost' || hostname === '127.0.0.1') &&
      port === String(this.config.previewPort)
    ) {
      return true
    }

    // Local development server (Inertia backend available)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return false
    }

    // Configured static domains
    if (this.config.staticDomains.includes(hostname)) {
      return true
    }

    // Common static hosting patterns
    const staticPatterns = [
      '.github.io',
      '.vercel.app',
      '.netlify.app',
      '.pages.dev',
      '.surge.sh',
      '.render.com',
    ]

    return staticPatterns.some((pattern) => hostname.endsWith(pattern))
  }

  /**
   * Extract locale from URL path.
   *
   * @param path - The URL pathname.
   * @returns The extracted locale string, or the default locale if not found.
   *
   * @example
   * getLocaleFromPath('/en/docs/guide') // 'en'
   * getLocaleFromPath('/zh/about') // 'zh'
   * getLocaleFromPath('/docs/guide') // defaultLocale
   */
  getLocaleFromPath(path: string): string {
    for (const locale of this.config.locales) {
      if (path === `/${locale}` || path.startsWith(`/${locale}/`)) {
        return locale
      }
    }
    return this.config.defaultLocale
  }

  /**
   * Get localized path for a given path and locale.
   *
   * @param path - The base path.
   * @param locale - The target locale code.
   * @returns The path prefixed with the locale.
   *
   * @example
   * getLocalizedPath('/about', 'en') // '/en/about'
   * getLocalizedPath('/docs/guide', 'zh') // '/zh/docs/guide'
   * getLocalizedPath('/', 'en') // '/en'
   */
  getLocalizedPath(path: string, locale: string): string {
    // Remove existing locale prefix if present
    let cleanPath = path
    for (const loc of this.config.locales) {
      if (cleanPath === `/${loc}` || cleanPath.startsWith(`/${loc}/`)) {
        cleanPath = cleanPath.replace(new RegExp(`^/${loc}`), '') || '/'
        break
      }
    }

    // Add new locale prefix
    if (cleanPath === '/') {
      return `/${locale}`
    }
    if (cleanPath.startsWith('/')) {
      return `/${locale}${cleanPath}`
    }
    return `/${locale}/${cleanPath}`
  }

  /**
   * Switch locale while preserving current path.
   *
   * @param currentPath - The current URL pathname.
   * @param newLocale - The locale to switch to.
   * @returns The new path with the updated locale prefix.
   *
   * @example
   * switchLocale('/en/docs/guide', 'zh') // '/zh/docs/guide'
   * switchLocale('/zh/about', 'en') // '/en/about'
   */
  switchLocale(currentPath: string, newLocale: string): string {
    // Strip existing locale prefix
    let path = currentPath
    for (const locale of this.config.locales) {
      if (path === `/${locale}`) {
        path = '/'
        break
      }
      if (path.startsWith(`/${locale}/`)) {
        path = path.replace(new RegExp(`^/${locale}`), '')
        break
      }
    }

    // Add new locale prefix
    if (path === '/') {
      return `/${newLocale}/`
    }
    return `/${newLocale}${path}`
  }

  /**
   * Check if a path needs a redirect (abstract route without static file).
   *
   * @param path - The URL pathname to check.
   * @returns RedirectInfo object if a redirect is needed, null otherwise.
   */
  needsRedirect(path: string): RedirectInfo | null {
    for (const rule of this.config.redirects) {
      if (path === rule.from || path === `${rule.from}/`) {
        return {
          from: rule.from,
          to: rule.to,
        }
      }
    }
    return null
  }

  /**
   * Get the current locale from browser URL.
   *
   * @returns The current locale string.
   */
  getCurrentLocale(): string {
    if (typeof window === 'undefined') {
      return this.config.defaultLocale
    }
    return this.getLocaleFromPath(window.location.pathname)
  }
}

/**
 * Redirect information.
 */
export interface RedirectInfo {
  /** Original abstract path */
  from: string
  /** Target localized path */
  to: string
}

/**
 * Create a new FreezeDetector instance.
 *
 * @param config - The Freeze configuration.
 * @returns A new FreezeDetector instance.
 */
export function createDetector(config: FreezeConfig): FreezeDetector {
  return new FreezeDetector(config)
}
