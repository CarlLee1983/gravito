import { afterEach, describe, expect, it } from 'bun:test'
import {
  asAbsolutePath,
  asLocale,
  createDetector,
  defineConfig,
  generate404Html,
  generateLocalizedRoutes,
  generateRedirectHtml,
  generateRedirects,
  generateRobotsTxt,
  generateSitemapEntries,
  generateSitemapXml,
  getLocalizedPath,
  inferRedirects,
  isLocalizedPath,
  validateRoutes,
} from '../src'

describe('@gravito/freeze', () => {
  describe('defineConfig', () => {
    it('should merge with defaults', () => {
      const config = defineConfig({
        staticDomains: ['example.com'],
        baseUrl: 'https://example.com',
      })

      expect(config.staticDomains).toEqual(['example.com'])
      expect(config.previewPort).toBe(4173)
      expect(config.defaultLocale).toBe(asLocale('en'))
      expect(config.outputDir).toBe('dist-static')
    })

    it('should allow overriding defaults', () => {
      const config = defineConfig({
        staticDomains: ['example.com'],
        baseUrl: 'https://example.com',
        previewPort: 5000,
        defaultLocale: asLocale('zh'),
      })

      expect(config.previewPort).toBe(5000)
      expect(config.defaultLocale).toBe(asLocale('zh'))
    })
  })

  describe('FreezeDetector', () => {
    const config = defineConfig({
      staticDomains: ['example.com', 'example.github.io'],
      locales: [asLocale('en'), asLocale('zh')],
      defaultLocale: asLocale('en'),
      baseUrl: 'https://example.com',
      redirects: [
        { from: asAbsolutePath('/docs'), to: asAbsolutePath('/en/docs/guide/getting-started') },
        { from: asAbsolutePath('/about'), to: asAbsolutePath('/en/about') },
      ],
    })
    const detector = createDetector(config)

    describe('getLocaleFromPath', () => {
      it('should extract locale from path', () => {
        expect(detector.getLocaleFromPath(asAbsolutePath('/en/docs'))).toBe(asLocale('en'))
        expect(detector.getLocaleFromPath(asAbsolutePath('/zh/about'))).toBe(asLocale('zh'))
        expect(detector.getLocaleFromPath(asAbsolutePath('/en'))).toBe(asLocale('en'))
        expect(detector.getLocaleFromPath(asAbsolutePath('/zh'))).toBe(asLocale('zh'))
      })

      it('should return default locale for paths without locale', () => {
        expect(detector.getLocaleFromPath(asAbsolutePath('/docs'))).toBe(asLocale('en'))
        expect(detector.getLocaleFromPath(asAbsolutePath('/'))).toBe(asLocale('en'))
      })
    })

    describe('getLocalizedPath', () => {
      it('should add locale prefix', () => {
        expect(detector.getLocalizedPath(asAbsolutePath('/about'), asLocale('en'))).toBe(
          asAbsolutePath('/about')
        )
        expect(detector.getLocalizedPath(asAbsolutePath('/docs/guide'), asLocale('zh'))).toBe(
          asAbsolutePath('/zh/docs/guide')
        )
      })

      it('should handle root path', () => {
        expect(detector.getLocalizedPath(asAbsolutePath('/'), asLocale('en'))).toBe(
          asAbsolutePath('/')
        )
        expect(detector.getLocalizedPath(asAbsolutePath('/'), asLocale('zh'))).toBe(
          asAbsolutePath('/zh')
        )
      })

      it('should replace existing locale prefix', () => {
        expect(detector.getLocalizedPath(asAbsolutePath('/en/docs'), asLocale('zh'))).toBe(
          asAbsolutePath('/zh/docs')
        )
        expect(detector.getLocalizedPath(asAbsolutePath('/zh/about'), asLocale('en'))).toBe(
          asAbsolutePath('/about')
        )
      })
    })

    describe('switchLocale', () => {
      it('should switch locale while preserving path', () => {
        expect(detector.switchLocale(asAbsolutePath('/en/docs/guide'), asLocale('zh'))).toBe(
          asAbsolutePath('/zh/docs/guide')
        )
        expect(detector.switchLocale(asAbsolutePath('/zh/about'), asLocale('en'))).toBe(
          asAbsolutePath('/about')
        )
      })

      it('should handle root locale paths', () => {
        expect(detector.switchLocale(asAbsolutePath('/en'), asLocale('zh'))).toBe(
          asAbsolutePath('/zh')
        )
        expect(detector.switchLocale(asAbsolutePath('/zh/'), asLocale('en'))).toBe(
          asAbsolutePath('/')
        )
      })
    })

    describe('needsRedirect', () => {
      it('should detect redirect rules', () => {
        const redirect = detector.needsRedirect(asAbsolutePath('/docs'))
        expect(redirect).not.toBeNull()
        expect(redirect?.to).toBe(asAbsolutePath('/en/docs/guide/getting-started'))
      })

      it('should return null for non-redirect paths', () => {
        expect(detector.needsRedirect(asAbsolutePath('/en/docs'))).toBeNull()
        expect(detector.needsRedirect(asAbsolutePath('/random'))).toBeNull()
      })
    })

    describe('isStaticSite', () => {
      const originalWindow = globalThis.window

      afterEach(() => {
        globalThis.window = originalWindow
      })

      it('returns true for preview server', () => {
        globalThis.window = {
          location: {
            hostname: 'localhost',
            port: '4173',
            pathname: '/en/docs',
          },
        } as any

        const detector = createDetector(config)
        expect(detector.isStaticSite()).toBe(true)
      })

      it('returns true for configured static domain', () => {
        globalThis.window = {
          location: {
            hostname: 'example.com',
            port: '',
            pathname: '/en',
          },
        } as any

        const detector = createDetector(config)
        expect(detector.isStaticSite()).toBe(true)
      })

      it('returns false for local dev server', () => {
        globalThis.window = {
          location: {
            hostname: 'localhost',
            port: '3000',
            pathname: '/en',
          },
        } as any

        const detector = createDetector(config)
        expect(detector.isStaticSite()).toBe(false)
      })
    })

    describe('getCurrentLocale', () => {
      const originalWindow = globalThis.window

      afterEach(() => {
        globalThis.window = originalWindow
      })

      it('returns locale from window path when available', () => {
        globalThis.window = {
          location: { pathname: '/zh/docs' },
        } as any

        const detector = createDetector(config)
        expect(detector.getCurrentLocale()).toBe('zh')
      })
    })
  })

  describe('generateRedirectHtml', () => {
    it('should generate valid redirect HTML', () => {
      const html = generateRedirectHtml('/en/about')

      expect(html).toContain('http-equiv="refresh"')
      expect(html).toContain('url=/en/about')
      expect(html).toContain("window.location.href='/en/about'")
      expect(html).toContain('href="/en/about"')
    })
  })

  describe('generateRedirects', () => {
    it('should generate redirect map', () => {
      const config = defineConfig({
        staticDomains: [],
        baseUrl: 'https://example.com',
        redirects: [
          { from: asAbsolutePath('/docs'), to: asAbsolutePath('/en/docs') },
          { from: asAbsolutePath('/about'), to: asAbsolutePath('/en/about') },
        ],
      })

      const redirects = generateRedirects(config)

      expect(redirects.size).toBe(2)
      expect(redirects.has('docs/index.html')).toBe(true)
      expect(redirects.has('about/index.html')).toBe(true)
    })
  })

  describe('generateLocalizedRoutes', () => {
    it('should generate localized routes', () => {
      const routes = generateLocalizedRoutes(['/docs', '/about'], ['en', 'zh'])

      expect(routes).toContain('/en/docs')
      expect(routes).toContain('/zh/docs')
      expect(routes).toContain('/en/about')
      expect(routes).toContain('/zh/about')
      expect(routes.length).toBe(4)
    })

    it('should handle root path', () => {
      const routes = generateLocalizedRoutes(['/'], ['en', 'zh'])

      expect(routes).toContain('/en')
      expect(routes).toContain('/zh')
    })
  })

  describe('inferRedirects', () => {
    it('should infer redirects from common routes', () => {
      const redirects = inferRedirects([asLocale('en'), asLocale('zh')], asLocale('en'), [
        asAbsolutePath('/docs'),
        asAbsolutePath('/about'),
      ])

      expect(redirects).toEqual([
        { from: asAbsolutePath('/docs'), to: asAbsolutePath('/en/docs') },
        { from: asAbsolutePath('/about'), to: asAbsolutePath('/en/about') },
      ])
    })
  })

  describe('generateSitemapEntries', () => {
    it('should include alternates and x-default', () => {
      const config = defineConfig({
        staticDomains: ['example.com'],
        baseUrl: 'https://example.com',
        locales: [asLocale('en'), asLocale('zh')],
        defaultLocale: asLocale('en'),
      })

      const routes = ['/en', '/zh', '/en/about', '/zh/about']
      const entries = generateSitemapEntries(routes, config)

      const aboutEntry = entries.find((e) => e.url === 'https://example.com/en/about')
      expect(aboutEntry?.alternates?.length).toBe(3)
      expect(aboutEntry?.alternates?.some((alt) => alt.hreflang === 'x-default')).toBe(true)
    })
  })

  describe('generateSitemapXml', () => {
    it('should generate basic sitemap XML', () => {
      const entries = [{ url: 'https://example.com/' }, { url: 'https://example.com/about' }]
      const xml = generateSitemapXml(entries)

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(xml).toContain('<urlset')
      expect(xml).toContain('<loc>https://example.com/</loc>')
      expect(xml).toContain('<loc>https://example.com/about</loc>')
      expect(xml).toContain('</urlset>')
    })

    it('should include optional fields when present', () => {
      const entries = [
        {
          url: 'https://example.com/about',
          lastmod: '2024-01-01',
          changefreq: 'weekly',
          priority: 0.8,
        },
      ]
      const xml = generateSitemapXml(entries)

      expect(xml).toContain('<lastmod>2024-01-01</lastmod>')
      expect(xml).toContain('<changefreq>weekly</changefreq>')
      expect(xml).toContain('<priority>0.8</priority>')
    })

    it('should include alternates when present', () => {
      const entries = [
        {
          url: 'https://example.com/en/about',
          alternates: [
            { hreflang: 'en', href: 'https://example.com/en/about' },
            { hreflang: 'zh', href: 'https://example.com/zh/about' },
          ],
        },
      ]
      const xml = generateSitemapXml(entries)

      expect(xml).toContain('hreflang="en"')
      expect(xml).toContain('hreflang="zh"')
      expect(xml).toContain('https://example.com/zh/about')
    })
  })

  describe('generateRobotsTxt', () => {
    it('should generate robots.txt with sitemap reference', () => {
      const config = defineConfig({
        staticDomains: ['example.com'],
        baseUrl: 'https://example.com',
      })
      const robots = generateRobotsTxt(config)

      expect(robots).toContain('User-agent: *')
      expect(robots).toContain('Allow: /')
      expect(robots).toContain('Sitemap: https://example.com/sitemap.xml')
    })

    it('should handle base URL with trailing slash', () => {
      const config = defineConfig({
        staticDomains: ['example.com'],
        baseUrl: 'https://example.com/',
      })
      const robots = generateRobotsTxt(config)

      expect(robots).toContain('Sitemap: https://example.com/sitemap.xml')
    })
  })

  describe('generate404Html', () => {
    it('should generate redirect HTML when targetUrl provided', () => {
      const html = generate404Html('/en/docs')

      expect(html).toContain('http-equiv="refresh"')
      expect(html).toContain('url=/en/docs')
      expect(html).toContain("window.location.href='/en/docs'")
    })

    it('should generate 404 page when no targetUrl', () => {
      const html = generate404Html()

      expect(html).toContain('404')
      expect(html).toContain('<!DOCTYPE html>')
    })
  })

  describe('validateRoutes', () => {
    it('should return empty array for valid routes', () => {
      const errors = validateRoutes(['/', '/about', '/docs/guide', '/en', '/zh'])

      expect(errors).toEqual([])
    })

    it('should detect routes not starting with /', () => {
      const errors = validateRoutes(['about', 'docs/guide'])

      expect(errors.length).toBe(2)
      expect(errors[0]).toContain("must start with '/'")
      expect(errors[1]).toContain("must start with '/'")
    })

    it('should detect routes ending with /', () => {
      const errors = validateRoutes(['/about/', '/docs/'])

      expect(errors.length).toBe(2)
      expect(errors[0]).toContain("should not end with '/'")
      expect(errors[1]).toContain("should not end with '/'")
    })

    it('should allow root path to end with /', () => {
      const errors = validateRoutes(['/'])

      expect(errors).toEqual([])
    })
  })

  describe('path-utils - isLocalizedPath', () => {
    const locales = [asLocale('en'), asLocale('zh')]

    it('should return true for localized paths', () => {
      expect(isLocalizedPath(asAbsolutePath('/en/docs'), locales)).toBe(true)
      expect(isLocalizedPath(asAbsolutePath('/zh/about'), locales)).toBe(true)
      expect(isLocalizedPath(asAbsolutePath('/en'), locales)).toBe(true)
      expect(isLocalizedPath(asAbsolutePath('/zh'), locales)).toBe(true)
    })

    it('should return false for non-localized paths', () => {
      expect(isLocalizedPath(asAbsolutePath('/docs'), locales)).toBe(false)
      expect(isLocalizedPath(asAbsolutePath('/about'), locales)).toBe(false)
      expect(isLocalizedPath(asAbsolutePath('/'), locales)).toBe(false)
    })
  })

  describe('path-utils - getLocalizedPath direct', () => {
    it('should switch locale correctly', () => {
      const locales = ['en', 'zh']
      const defaultLocale = 'en'

      expect(
        getLocalizedPath(asAbsolutePath('/en/docs'), asLocale('zh'), locales, defaultLocale)
      ).toBe(asAbsolutePath('/zh/docs'))
      expect(
        getLocalizedPath(asAbsolutePath('/zh/about'), asLocale('en'), locales, defaultLocale)
      ).toBe(asAbsolutePath('/about'))
    })

    it('should handle root path', () => {
      const locales = ['en', 'zh']
      const defaultLocale = 'en'

      expect(getLocalizedPath(asAbsolutePath('/'), asLocale('zh'), locales, defaultLocale)).toBe(
        asAbsolutePath('/zh')
      )
      expect(getLocalizedPath(asAbsolutePath('/'), asLocale('en'), locales, defaultLocale)).toBe(
        asAbsolutePath('/')
      )
    })
  })
})
