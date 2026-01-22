/**
 * @gravito/freeze - SSG Builder Utilities
 *
 * Build-time utilities for static site generation.
 */

import type { FreezeConfig, RedirectRule } from './config'
import { addLocalePrefix, stripLocalePrefix } from './path-utils'
import type { AbsolutePath, Locale } from './types'
import { asAbsolutePath, asLocale } from './types'

/**
 * Generate redirect HTML for abstract routes
 *
 * @example
 * generateRedirectHtml('/en/about')
 * // Returns HTML with meta refresh and JS redirect
 */
export function generateRedirectHtml(targetUrl: string | AbsolutePath): string {
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
 * Generate all redirect HTML files for configured routes.
 *
 * Creates a map where keys are output file paths (e.g., 'about/index.html')
 * and values are the HTML content for redirection.
 *
 * @param config - The Freeze configuration.
 * @returns A Map of relative output paths to redirect HTML content.
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
 * Generate localized routes from abstract routes.
 *
 * Takes a list of base routes and expands them for each supported locale.
 *
 * @param abstractRoutes - List of base routes (e.g., ['/', '/about']).
 * @param locales - List of supported locale codes (e.g., ['en', 'zh']).
 * @returns An array of localized routes (e.g., ['/en', '/zh', '/en/about', '/zh/about']).
 *
 * @example
 * generateLocalizedRoutes(['/docs', '/about'], ['en', 'zh'])
 * // Returns ['/en/docs', '/zh/docs', '/en/about', '/zh/about']
 */
export function generateLocalizedRoutes(abstractRoutes: string[], locales: string[]): string[] {
  const routes: string[] = []

  for (const route of abstractRoutes) {
    for (const locale of locales) {
      routes.push(addLocalePrefix(route, locale, ''))
    }
  }

  return routes
}

/**
 * Infer redirects from locales and common routes.
 *
 * Automatically creates redirect rules from base routes to their default locale counterparts.
 *
 * @param _locales - List of supported locales (currently unused).
 * @param defaultLocale - The default locale code.
 * @param commonRoutes - List of routes to create redirects for.
 * @returns An array of RedirectRule objects.
 */
export function inferRedirects(
  _locales: string[] | Locale[],
  defaultLocale: string | Locale,
  commonRoutes: string[] | AbsolutePath[]
): RedirectRule[] {
  return commonRoutes.map((route) => ({
    from: asAbsolutePath(route),
    to: asAbsolutePath(addLocalePrefix(route, defaultLocale, '')),
  }))
}

/**
 * Sitemap entry for localized URLs.
 */
export interface SitemapEntry {
  /** Full URL of the page */
  url: string
  /** Last modification date (ISO 8601) */
  lastmod?: string
  /** Change frequency hint for crawlers */
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  /** Priority of this URL relative to other URLs on your site (0.0 to 1.0) */
  priority?: number
  /** Alternate language versions of the page */
  alternates?: Array<{ hreflang: string; href: string }>
}

/**
 * Generate sitemap entries with alternates for i18n.
 *
 * Creates entries for each route, including hreflang tags for all available translations
 * and an x-default entry pointing to the default locale.
 *
 * @param routes - List of all generated localized routes.
 * @param config - The Freeze configuration.
 * @returns An array of SitemapEntry objects ready for XML generation.
 */
export function generateSitemapEntries(routes: string[], config: FreezeConfig): SitemapEntry[] {
  const entries: SitemapEntry[] = []
  const baseUrl = config.baseUrl.replace(/\/$/, '')

  // Group routes by their non-localized path
  const routeGroups = new Map<string, string[]>()

  for (const route of routes) {
    // Extract the non-localized path
    const cleanPath = stripLocalePrefix(route, config.locales)

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

/**
 * Generate Sitemap XML from entries.
 *
 * @param entries - List of sitemap entries.
 * @returns A string containing the sitemap XML.
 */
export function generateSitemapXml(entries: SitemapEntry[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
  xml += 'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'

  for (const entry of entries) {
    xml += '  <url>\n'
    xml += `    <loc>${entry.url}</loc>\n`

    if (entry.lastmod) {
      xml += `    <lastmod>${entry.lastmod}</lastmod>\n`
    }
    if (entry.changefreq) {
      xml += `    <changefreq>${entry.changefreq}</changefreq>\n`
    }
    if (entry.priority !== undefined) {
      xml += `    <priority>${entry.priority.toFixed(1)}</priority>\n`
    }

    if (entry.alternates) {
      for (const alt of entry.alternates) {
        xml += `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}"/>\n`
      }
    }

    xml += '  </url>\n'
  }

  xml += '</urlset>'
  return xml
}

/**
 * Generate robots.txt content.
 *
 * @param config - The Freeze configuration.
 * @returns A string containing the robots.txt content.
 */
export function generateRobotsTxt(config: FreezeConfig): string {
  const baseUrl = config.baseUrl.replace(/\/$/, '')
  let robots = 'User-agent: *\n'
  robots += 'Allow: /\n'
  robots += `\nSitemap: ${baseUrl}/sitemap.xml\n`

  return robots
}

/**
 * Generate 404 HTML for static hosting.
 *
 * @param targetUrl - Optional redirect target (e.g. to home page).
 * @returns A string containing the 404 HTML.
 */
export function generate404Html(targetUrl?: string): string {
  if (targetUrl) {
    return generateRedirectHtml(targetUrl)
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>404 - Page Not Found</title>
</head>
<body>
  <h1>404 - Page Not Found</h1>
  <p>The page you are looking for does not exist.</p>
  <a href="/">Go back home</a>
</body>
</html>`
}

/**
 * Validate routes against configuration.
 *
 * @param routes - List of routes to validate.
 * @returns An array of error messages.
 */
export function validateRoutes(routes: string[]): string[] {
  const errors: string[] = []
  for (const route of routes) {
    if (!route.startsWith('/')) {
      errors.push(`Route must start with '/': ${route}`)
    }
    if (route !== '/' && route.endsWith('/')) {
      errors.push(`Route should not end with '/': ${route}`)
    }
  }
  return errors
}
