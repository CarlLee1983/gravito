/**
 * @gravito/freeze - SSG Builder Utilities
 *
 * Build-time utilities for static site generation.
 */

import type { FreezeConfig, RedirectRule } from './config'

/**
 * Generate redirect HTML for abstract routes
 *
 * @example
 * generateRedirectHtml('/en/about')
 * // Returns HTML with meta refresh and JS redirect
 */
export function generateRedirectHtml(targetUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${targetUrl}">
  <link rel="canonical" href="${targetUrl}">
  <script>window.location.href='${targetUrl}';</script>
  <title>Redirecting...</title>
</head>
<body>
  Redirecting to <a href="${targetUrl}">${targetUrl}</a>...
</body>
</html>`
}

/**
 * Generate all redirect HTML files for configured routes
 */
export function generateRedirects(config: FreezeConfig): Map<string, string> {
  const redirects = new Map<string, string>()

  for (const rule of config.redirects) {
    const html = generateRedirectHtml(rule.to)
    // Path like '/about' -> 'about/index.html'
    const outputPath = `${rule.from.replace(/^\//, '')}/index.html`
    redirects.set(outputPath, html)
  }

  return redirects
}

/**
 * Generate localized routes from abstract routes
 *
 * @example
 * generateLocalizedRoutes(['/docs', '/about'], ['en', 'zh'])
 * // Returns ['/en/docs', '/zh/docs', '/en/about', '/zh/about']
 */
export function generateLocalizedRoutes(abstractRoutes: string[], locales: string[]): string[] {
  const routes: string[] = []

  for (const route of abstractRoutes) {
    for (const locale of locales) {
      if (route === '/') {
        routes.push(`/${locale}`)
      } else if (route.startsWith('/')) {
        routes.push(`/${locale}${route}`)
      } else {
        routes.push(`/${locale}/${route}`)
      }
    }
  }

  return routes
}

/**
 * Infer redirects from locales and common routes
 *
 * @example
 * inferRedirects(['en', 'zh'], 'en', ['/docs', '/about'])
 * // Returns redirects from abstract routes to default locale versions
 */
export function inferRedirects(
  _locales: string[],
  defaultLocale: string,
  commonRoutes: string[]
): RedirectRule[] {
  return commonRoutes.map((route) => ({
    from: route,
    to: route === '/' ? `/${defaultLocale}` : `/${defaultLocale}${route}`,
  }))
}

/**
 * Sitemap entry for localized URLs
 */
export interface SitemapEntry {
  url: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
  alternates?: Array<{ hreflang: string; href: string }>
}

/**
 * Generate sitemap entries with alternates for i18n
 */
export function generateSitemapEntries(routes: string[], config: FreezeConfig): SitemapEntry[] {
  const entries: SitemapEntry[] = []
  const baseUrl = config.baseUrl.replace(/\/$/, '')

  // Group routes by their non-localized path
  const routeGroups = new Map<string, string[]>()

  for (const route of routes) {
    // Extract the non-localized path
    let cleanPath = route
    for (const locale of config.locales) {
      if (cleanPath === `/${locale}` || cleanPath.startsWith(`/${locale}/`)) {
        cleanPath = cleanPath.replace(new RegExp(`^/${locale}`), '') || '/'
        break
      }
    }

    if (!routeGroups.has(cleanPath)) {
      routeGroups.set(cleanPath, [])
    }
    routeGroups.get(cleanPath)?.push(route)
  }

  // Generate entries with alternates
  for (const [_cleanPath, localizedRoutes] of routeGroups) {
    for (const route of localizedRoutes) {
      const alternates: Array<{ hreflang: string; href: string }> = []

      // Add alternates for other locales
      for (const altRoute of localizedRoutes) {
        const locale = config.locales.find(
          (l) => altRoute === `/${l}` || altRoute.startsWith(`/${l}/`)
        )
        if (locale) {
          alternates.push({
            hreflang: locale,
            href: `${baseUrl}${altRoute}`,
          })
        }
      }

      // Add x-default alternate (default locale)
      const defaultRoute = localizedRoutes.find(
        (r) => r === `/${config.defaultLocale}` || r.startsWith(`/${config.defaultLocale}/`)
      )
      if (defaultRoute) {
        alternates.push({
          hreflang: 'x-default',
          href: `${baseUrl}${defaultRoute}`,
        })
      }

      entries.push({
        url: `${baseUrl}${route}`,
        alternates,
      })
    }
  }

  return entries
}
