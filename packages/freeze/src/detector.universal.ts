import type { FreezeConfig } from './config'
import type { AbsolutePath, Locale } from './types'
import { asAbsolutePath } from './types'

/**
 * Information about a redirect rule match.
 *
 * Returned when a path matches a configured redirect rule,
 * indicating that the path should be redirected to another location.
 */
export interface RedirectInfo {
  /** The source path that triggered the redirect */
  from: AbsolutePath
  /** The target path to redirect to */
  to: AbsolutePath
}

/**
 * Universal environment detector for static vs dynamic site modes.
 *
 * Provides runtime detection of static hosting environments and utilities
 * for locale-aware path manipulation. Works in any JavaScript environment
 * (Node.js, browser, edge workers).
 *
 * @remarks
 * This is the base class providing universal (environment-agnostic) functionality.
 * For browser-specific detection, use {@link BrowserFreezeDetector} which extends
 * this class with DOM-based environment detection.
 *
 * The detector uses regex caching for performance when checking locale prefixes
 * repeatedly during navigation or path generation.
 *
 * @example
 * ```typescript
 * const detector = new FreezeDetector(config)
 *
 * // Get locale from path
 * const locale = detector.getLocaleFromPath('/en/docs') // 'en'
 *
 * // Generate localized path
 * const path = detector.getLocalizedPath('/about', 'zh') // '/zh/about'
 *
 * // Switch locale
 * const newPath = detector.switchLocale('/en/docs', 'zh') // '/zh/docs'
 * ```
 */
export class FreezeDetector {
  protected localeRegexMap: Map<Locale, RegExp> = new Map()

  /**
   * Creates a new FreezeDetector instance.
   *
   * Pre-computes regex patterns for all configured locales to optimize
   * repeated locale detection operations.
   *
   * @param config - The freeze configuration with locales and redirects
   */
  constructor(protected config: FreezeConfig) {
    for (const locale of config.locales) {
      this.localeRegexMap.set(locale, new RegExp(`^/${locale}(/|$)`))
    }
  }

  /**
   * Determines if the current environment is running as a static site.
   *
   * Base implementation always returns `false` (dynamic mode) since it lacks
   * environment context. Override this in environment-specific subclasses
   * like {@link BrowserFreezeDetector} for actual detection logic.
   *
   * @returns Always `false` in the base class
   *
   * @example
   * ```typescript
   * const detector = new FreezeDetector(config)
   * detector.isStaticSite() // false (base class)
   *
   * const browserDetector = new BrowserFreezeDetector(config)
   * browserDetector.isStaticSite() // true/false based on hostname
   * ```
   */
  isStaticSite(): boolean {
    return false
  }

  /**
   * Extracts the locale identifier from a URL path.
   *
   * Uses pre-compiled regex patterns for efficient matching. Returns the
   * default locale if no matching prefix is found.
   *
   * @param path - The URL pathname to analyze
   * @returns The detected locale or default locale
   *
   * @example
   * ```typescript
   * detector.getLocaleFromPath('/en/docs') // 'en'
   * detector.getLocaleFromPath('/zh/about') // 'zh'
   * detector.getLocaleFromPath('/about') // 'en' (default)
   * detector.getLocaleFromPath('/en') // 'en'
   * ```
   */
  getLocaleFromPath(path: string | AbsolutePath): Locale {
    for (const [locale, regex] of this.localeRegexMap) {
      if (regex.test(path)) {
        return locale
      }
    }
    return this.config.defaultLocale
  }

  /**
   * Generates a localized path for a given locale.
   *
   * Strips any existing locale prefix from the path and applies the target
   * locale's prefix. Handles special cases like root paths and default locale.
   *
   * @param path - The base path (with or without locale prefix)
   * @param locale - The target locale identifier
   * @returns The path with the appropriate locale prefix
   *
   * @example
   * ```typescript
   * // Adding locale prefix
   * detector.getLocalizedPath('/about', 'zh') // '/zh/about'
   *
   * // Switching locale
   * detector.getLocalizedPath('/en/docs', 'zh') // '/zh/docs'
   *
   * // Default locale removes prefix
   * detector.getLocalizedPath('/zh/about', 'en') // '/about'
   *
   * // Root path handling
   * detector.getLocalizedPath('/', 'zh') // '/zh'
   * ```
   */
  getLocalizedPath(path: string | AbsolutePath, locale: string | Locale): AbsolutePath {
    let cleanPath = path

    for (const regex of this.localeRegexMap.values()) {
      if (regex.test(cleanPath)) {
        cleanPath = cleanPath.replace(regex, '/')
        break
      }
    }

    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1)
    }
    if (!cleanPath.startsWith('/')) {
      cleanPath = `/${cleanPath}`
    }

    if (locale === this.config.defaultLocale) {
      return asAbsolutePath(cleanPath)
    }

    return asAbsolutePath(cleanPath === '/' ? `/${locale}` : `/${locale}${cleanPath}`)
  }

  /**
   * Switches the locale of a path while preserving the base route.
   *
   * Convenience method that delegates to {@link getLocalizedPath}.
   * Useful for implementing language switchers in the UI.
   *
   * @param currentPath - The current URL path
   * @param newLocale - The locale to switch to
   * @returns The path with the new locale prefix
   *
   * @example
   * ```typescript
   * // Language switcher implementation
   * detector.switchLocale('/en/docs/guide', 'zh') // '/zh/docs/guide'
   * detector.switchLocale('/zh/about', 'en') // '/about'
   * ```
   */
  switchLocale(currentPath: string | AbsolutePath, newLocale: string | Locale): AbsolutePath {
    return this.getLocalizedPath(currentPath, newLocale)
  }

  /**
   * Checks if a path matches any configured redirect rules.
   *
   * Used to implement abstract route redirects (e.g., `/docs` → `/en/docs`).
   * Returns redirect information if a match is found, or `null` otherwise.
   *
   * @param path - The path to check against redirect rules
   * @returns Redirect info if matched, `null` otherwise
   *
   * @example
   * ```typescript
   * // Configure redirect: /docs → /en/docs/guide
   * const redirect = detector.needsRedirect('/docs')
   * if (redirect) {
   *   console.log(`Redirect from ${redirect.from} to ${redirect.to}`)
   *   // Navigate to redirect.to
   * }
   *
   * // No match
   * detector.needsRedirect('/en/about') // null
   * ```
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
   * Gets the current locale based on the environment.
   *
   * Base implementation always returns the default locale since it lacks
   * environment context. Override in environment-specific subclasses like
   * {@link BrowserFreezeDetector} to extract locale from URL or query params.
   *
   * @returns The default locale in the base class
   *
   * @example
   * ```typescript
   * const detector = new FreezeDetector(config)
   * detector.getCurrentLocale() // 'en' (default)
   *
   * const browserDetector = new BrowserFreezeDetector(config)
   * browserDetector.getCurrentLocale() // 'zh' (from window.location)
   * ```
   */
  getCurrentLocale(): Locale {
    return this.config.defaultLocale
  }
}
