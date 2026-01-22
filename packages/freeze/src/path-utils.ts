/**
 * @gravito/freeze - Path & Locale Utilities
 *
 * Side-effect free utilities for handling localized paths.
 */

/**
 * Extract locale from URL path.
 *
 * @param path - The URL pathname.
 * @param locales - Supported locales.
 * @param defaultLocale - The fallback locale.
 * @returns The extracted locale string, or the default locale if not found.
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
 * Remove locale prefix from a path if present.
 *
 * @param path - The URL pathname.
 * @param locales - Supported locales.
 * @returns The path without the locale prefix.
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
 * Add locale prefix to a path.
 *
 * @param path - The base path (abstract route).
 * @param locale - The target locale.
 * @param defaultLocale - The default locale.
 * @returns The localized path.
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
 * Get localized path for a given path and target locale, ensuring any existing prefix is replaced.
 *
 * @param path - The current path.
 * @param targetLocale - The locale to switch to.
 * @param locales - All supported locales.
 * @param defaultLocale - The default locale.
 * @returns The new path with the correct locale prefix.
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
 * Check if a path is already localized.
 *
 * @param path - The path to check.
 * @param locales - Supported locales.
 * @returns True if the path starts with a supported locale.
 */
export function isLocalizedPath(path: string, locales: string[]): boolean {
  return locales.some((locale) => path === `/${locale}` || path.startsWith(`/${locale}/`))
}
