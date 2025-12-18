import { describe, expect, it } from 'bun:test'
import { RobotsBuilder } from '../../src/robots/RobotsBuilder'
import type { RobotsConfig } from '../../src/robots/types'

describe('RobotsBuilder', () => {
  const baseUrl = 'https://example.com'

  describe('build()', () => {
    it('should generate basic robots.txt with single rule', () => {
      const config: RobotsConfig = {
        rules: [{ userAgent: '*', allow: ['/'] }],
      }

      const builder = new RobotsBuilder(config, baseUrl)
      const output = builder.build()

      expect(output).toContain('User-agent: *')
      expect(output).toContain('Allow: /')
    })

    it('should include multiple disallow paths', () => {
      const config: RobotsConfig = {
        rules: [
          {
            userAgent: '*',
            disallow: ['/admin', '/private', '/api'],
          },
        ],
      }

      const builder = new RobotsBuilder(config, baseUrl)
      const output = builder.build()

      expect(output).toContain('Disallow: /admin')
      expect(output).toContain('Disallow: /private')
      expect(output).toContain('Disallow: /api')
    })

    it('should include both allow and disallow paths', () => {
      const config: RobotsConfig = {
        rules: [
          {
            userAgent: '*',
            allow: ['/public'],
            disallow: ['/private'],
          },
        ],
      }

      const builder = new RobotsBuilder(config, baseUrl)
      const output = builder.build()

      expect(output).toContain('Allow: /public')
      expect(output).toContain('Disallow: /private')
    })

    it('should include crawl-delay', () => {
      const config: RobotsConfig = {
        rules: [
          {
            userAgent: 'Googlebot',
            allow: ['/'],
            crawlDelay: 10,
          },
        ],
      }

      const builder = new RobotsBuilder(config, baseUrl)
      const output = builder.build()

      expect(output).toContain('User-agent: Googlebot')
      expect(output).toContain('Crawl-delay: 10')
    })

    it('should handle multiple user-agent rules', () => {
      const config: RobotsConfig = {
        rules: [
          { userAgent: 'Googlebot', allow: ['/'] },
          { userAgent: 'Bingbot', allow: ['/'], crawlDelay: 5 },
          { userAgent: 'BadBot', disallow: ['/'] },
        ],
      }

      const builder = new RobotsBuilder(config, baseUrl)
      const output = builder.build()

      expect(output).toContain('User-agent: Googlebot')
      expect(output).toContain('User-agent: Bingbot')
      expect(output).toContain('User-agent: BadBot')
      expect(output).toContain('Crawl-delay: 5')
    })

    it('should auto-generate sitemap URL from baseUrl', () => {
      const config: RobotsConfig = {
        rules: [{ userAgent: '*', allow: ['/'] }],
      }

      const builder = new RobotsBuilder(config, baseUrl)
      const output = builder.build()

      expect(output).toContain('Sitemap: https://example.com/sitemap.xml')
    })

    it('should use explicit sitemapUrls when provided', () => {
      const config: RobotsConfig = {
        rules: [{ userAgent: '*', allow: ['/'] }],
        sitemapUrls: [
          'https://example.com/sitemap-index.xml',
          'https://example.com/sitemap-news.xml',
        ],
      }

      const builder = new RobotsBuilder(config, baseUrl)
      const output = builder.build()

      expect(output).toContain('Sitemap: https://example.com/sitemap-index.xml')
      expect(output).toContain('Sitemap: https://example.com/sitemap-news.xml')
      // Should NOT contain default /sitemap.xml
      expect(output.match(/Sitemap:/g)?.length).toBe(2)
    })

    it('should include Host directive when provided', () => {
      const config: RobotsConfig = {
        rules: [{ userAgent: '*', allow: ['/'] }],
        host: 'example.com',
      }

      const builder = new RobotsBuilder(config, baseUrl)
      const output = builder.build()

      expect(output).toContain('Host: example.com')
    })

    it('should end with newline', () => {
      const config: RobotsConfig = {
        rules: [{ userAgent: '*', allow: ['/'] }],
      }

      const builder = new RobotsBuilder(config, baseUrl)
      const output = builder.build()

      expect(output.endsWith('\n')).toBe(true)
    })

    it('should generate complete production-ready robots.txt', () => {
      const config: RobotsConfig = {
        rules: [
          {
            userAgent: '*',
            allow: ['/'],
            disallow: ['/admin', '/api/internal'],
          },
          {
            userAgent: 'GPTBot',
            disallow: ['/'],
          },
        ],
        sitemapUrls: ['https://example.com/sitemap.xml'],
        host: 'www.example.com',
      }

      const builder = new RobotsBuilder(config, baseUrl)
      const output = builder.build()

      // Verify structure
      expect(output).toContain('User-agent: *')
      expect(output).toContain('Allow: /')
      expect(output).toContain('Disallow: /admin')
      expect(output).toContain('Disallow: /api/internal')
      expect(output).toContain('User-agent: GPTBot')
      expect(output).toContain('Sitemap:')
      expect(output).toContain('Host: www.example.com')
    })
  })
})
