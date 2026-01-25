import type { AlternateUrl } from '../interfaces'

/**
 * Options for createAlternates
 */
export interface CreateAlternatesOptions {
  /** The base URL of the site (e.g., 'https://example.com') */
  baseUrl: string
  /** The path of the page (e.g., '/about') */
  path: string
  /** Map of locales to their path prefix or full URL transformer */
  locales: string[] | Record<string, string | ((path: string) => string)>
  /** Whether to include the 'x-default' alternate */
  xDefault?: string
}

/**
 * Helper to create i18n alternate URLs for a sitemap entry.
 *
 * Generates alternate URL objects for different locales, useful for creating
 * `hreflang` tags. Supports simple locale prefixes or custom transformation functions.
 *
 * @param options - Configuration for creating alternates.
 * @returns An array of alternate URL objects.
 *
 * @example
 * ```typescript
 * createAlternates({
 *   baseUrl: 'https://example.com',
 *   path: '/about',
 *   locales: ['en', 'zh-TW'],
 *   xDefault: 'en'
 * })
 * ```
 */
export function createAlternates(options: CreateAlternatesOptions): AlternateUrl[] {
  const { baseUrl, path, locales, xDefault } = options
  const alternates: AlternateUrl[] = []
  const normalizedBase = baseUrl.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (Array.isArray(locales)) {
    for (const locale of locales) {
      alternates.push({
        lang: locale,
        url: `${normalizedBase}/${locale}${normalizedPath === '/' ? '' : normalizedPath}`,
      })
    }
  } else {
    for (const [locale, transform] of Object.entries(locales)) {
      let url: string
      if (typeof transform === 'function') {
        url = transform(normalizedPath)
      } else {
        const prefix = transform.startsWith('/') ? transform : `/${transform}`
        url = `${normalizedBase}${prefix === '/' ? '' : prefix}${
          normalizedPath === '/' ? '' : normalizedPath
        }`
      }
      alternates.push({ lang: locale, url })
    }
  }

  if (xDefault) {
    const defaultAlt = alternates.find((a) => a.lang === xDefault)
    if (defaultAlt) {
      alternates.push({ lang: 'x-default', url: defaultAlt.url })
    }
  }

  return alternates
}
