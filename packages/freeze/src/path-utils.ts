/**
 * @gravito/freeze - Path & Locale Utilities
 *
 * Pure, side-effect free functions for manipulating locale-prefixed URL paths.
 * Used by both runtime detection and build-time generation.
 */

/**
 * Extracts the locale identifier from a URL path.
 *
 * Scans the path for locale prefixes (e.g., `/en/`, `/zh/`) and returns
 * the matching locale. Returns the default locale if no match is found.
 *
 * @param path - The URL pathname to analyze
 * @param locales - Array of supported locale identifiers
 * @param defaultLocale - Fallback locale when no prefix matches
 * @returns The detected locale or default locale
 *
 * @example
 * ```typescript
 * getLocaleFromPath('/en/docs', ['en', 'zh'], 'en') // 'en'
 * getLocaleFromPath('/zh/about', ['en', 'zh'], 'en') // 'zh'
 * getLocaleFromPath('/about', ['en', 'zh'], 'en') // 'en' (default)
 * ```
 */
export function getLocaleFromPath(path: string, locales: string[], defaultLocale: string): string {
  for (const locale of locales) {
    if (path === `/${locale}` || path.startsWith(`/${locale}/`)) {
      return locale
    }
  }
  return defaultLocale
}

/**
 * Removes locale prefix from a URL path if present.
 *
 * Strips the leading locale segment (e.g., `/en/`, `/zh/`) from the path,
 * returning the locale-neutral base path. Used for path normalization.
 *
 * @param path - The URL pathname with potential locale prefix
 * @param locales - Array of supported locale identifiers
 * @returns The path with locale prefix removed, or the original path
 *
 * @example
 * ```typescript
 * stripLocalePrefix('/en/docs', ['en', 'zh']) // '/docs'
 * stripLocalePrefix('/zh', ['en', 'zh']) // '/'
 * stripLocalePrefix('/about', ['en', 'zh']) // '/about' (unchanged)
 * ```
 */
export function stripLocalePrefix(path: string, locales: string[]): string {
  let cleanPath = path
  for (const loc of locales) {
    if (cleanPath === `/${loc}` || cleanPath.startsWith(`/${loc}/`)) {
      cleanPath = cleanPath.replace(new RegExp(`^/${loc}`), '') || '/'
      break
    }
  }
  return cleanPath
}

/**
 * Adds a locale prefix to a base path.
 *
 * Prepends the locale identifier to the path unless it's the default locale.
 * Ensures proper slash handling for root and nested paths.
 *
 * @param path - The base path without locale
 * @param locale - The target locale identifier
 * @param defaultLocale - The default locale (omitted from URLs)
 * @returns The localized path with appropriate prefix
 *
 * @example
 * ```typescript
 * // Non-default locale
 * addLocalePrefix('/docs', 'zh', 'en') // '/zh/docs'
 * addLocalePrefix('/', 'zh', 'en') // '/zh'
 *
 * // Default locale (no prefix)
 * addLocalePrefix('/docs', 'en', 'en') // '/docs'
 * addLocalePrefix('/', 'en', 'en') // '/'
 * ```
 */
export function addLocalePrefix(path: string, locale: string, defaultLocale: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`

  if (locale === defaultLocale) {
    return cleanPath
  }

  if (cleanPath === '/') {
    return `/${locale}`
  }
  return `/${locale}${cleanPath}`
}

/**
 * Switches the locale of a path while preserving the base route.
 *
 * Removes any existing locale prefix and applies the target locale's prefix.
 * This is a composite operation combining {@link stripLocalePrefix} and {@link addLocalePrefix}.
 *
 * @param path - The current path (possibly with locale prefix)
 * @param targetLocale - The locale to switch to
 * @param locales - Array of all supported locale identifiers
 * @param defaultLocale - The default locale identifier
 * @returns The path with the target locale's prefix
 *
 * @example
 * ```typescript
 * // Switching between locales
 * getLocalizedPath('/en/docs', 'zh', ['en', 'zh'], 'en') // '/zh/docs'
 * getLocalizedPath('/zh/about', 'en', ['en', 'zh'], 'en') // '/about'
 *
 * // Switching to default locale removes prefix
 * getLocalizedPath('/zh/docs', 'en', ['en', 'zh'], 'en') // '/docs'
 * ```
 */
export function getLocalizedPath(
  path: string,
  targetLocale: string,
  locales: string[],
  defaultLocale: string
): string {
  const cleanPath = stripLocalePrefix(path, locales)
  return addLocalePrefix(cleanPath, targetLocale, defaultLocale)
}

/**
 * Checks whether a path already contains a locale prefix.
 *
 * Tests if the path starts with any of the supported locale identifiers.
 * Useful for conditional path processing and validation.
 *
 * @param path - The path to test
 * @param locales - Array of supported locale identifiers
 * @returns `true` if the path has a locale prefix, `false` otherwise
 *
 * @example
 * ```typescript
 * isLocalizedPath('/en/docs', ['en', 'zh']) // true
 * isLocalizedPath('/zh', ['en', 'zh']) // true
 * isLocalizedPath('/docs', ['en', 'zh']) // false
 * isLocalizedPath('/about', ['en', 'zh']) // false
 * ```
 */
export function isLocalizedPath(path: string, locales: string[]): boolean {
  return locales.some((locale) => path === `/${locale}` || path.startsWith(`/${locale}/`))
}
