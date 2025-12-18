import type { AlternateUrl, SitemapEntry } from '../types'

/**
 * Interface representing basic structure needed to generate i18n entries.
 * Partial of SitemapEntry because url is generated dynamically.
 */
export type I18nSitemapEntryOptions = Omit<SitemapEntry, 'url' | 'alternates'>

/**
 * Generate fully cross-referenced SitemapEntries for multiple locales.
 *
 * @param path The path relative to the locale prefix (e.g. '/docs/intro')
 * @param locales List of supported locales (e.g. ['en', 'zh', 'jp'])
 * @param baseUrl The domain root (e.g. 'https://gravito.dev'). IF provided, URLs will be absolute. If not, they remain relative paths but include the locale prefix.
 * @param options Additional SitemapEntry options (lastmod, priority, etc.)
 */
export function generateI18nEntries(
  path: string,
  locales: string[],
  baseUrl = '',
  options: I18nSitemapEntryOptions = {}
): SitemapEntry[] {
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`

  // Clean baseUrl (remove trailing slash)
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  // 1. Generate the shared alternates list
  // This listing must be identical for ALL variants of the page
  const alternates: AlternateUrl[] = locales.map((locale) => {
    return {
      lang: locale,
      url: `${cleanBaseUrl}/${locale}${cleanPath}`,
    }
  })

  // 2. Generate an Entry for each locale
  return locales.map((locale) => {
    return {
      ...options,
      url: `${cleanBaseUrl}/${locale}${cleanPath}`,
      alternates: alternates,
    }
  })
}
