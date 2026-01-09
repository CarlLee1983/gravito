import { describe, expect, it } from 'bun:test'
import { RobotsTxtBuilder } from '../../src/robots/RobotsTxtBuilder'

describe('RobotsTxtBuilder', () => {
  it('builds robots.txt directives', () => {
    const txt = new RobotsTxtBuilder()
      .userAgent('TestBot')
      .allow('/public')
      .disallow('/admin')
      .crawlDelay(10)
      .sitemap('https://example.com/sitemap.xml')
      .host('example.com')
      .build()

    expect(txt).toContain('User-agent: TestBot')
    expect(txt).toContain('Allow: /public')
    expect(txt).toContain('Disallow: /admin')
    expect(txt).toContain('Crawl-delay: 10')
    expect(txt).toContain('Sitemap: https://example.com/sitemap.xml')
    expect(txt).toContain('Host: example.com')
  })
})
