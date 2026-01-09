import { describe, expect, it } from 'bun:test'
import { AnalyticsBuilder } from '../../src/meta/AnalyticsBuilder'
import { JsonLdBuilder } from '../../src/meta/JsonLdBuilder'
import { MetaTagBuilder } from '../../src/meta/MetaTagBuilder'
import { OpenGraphBuilder } from '../../src/meta/OpenGraphBuilder'
import { SeoMetadata } from '../../src/meta/SeoMetadata'
import { TwitterCardBuilder } from '../../src/meta/TwitterCardBuilder'

describe('Meta builders', () => {
  it('builds meta tags with escaping', () => {
    const html = new MetaTagBuilder({
      title: 'Hello "World" <meta>',
      description: 'Test <desc>',
      keywords: ['one', 'two'],
      canonical: 'https://example.com',
      robots: 'index,follow',
    }).build()

    expect(html).toContain('&quot;World&quot;')
    expect(html).toContain('&lt;meta&gt;')
    expect(html).toContain('keywords')
    expect(html).toContain('canonical')
  })

  it('builds OpenGraph tags with image metadata', () => {
    const html = new OpenGraphBuilder({
      title: 'Title',
      type: 'website',
      url: 'https://example.com',
      description: 'Desc',
      siteName: 'Site',
      locale: 'en_US',
      alternateLocales: ['zh_TW'],
      image: {
        url: 'https://example.com/og.png',
        width: 1200,
        height: 630,
        alt: 'Alt',
      },
    }).build()

    expect(html).toContain('og:title')
    expect(html).toContain('og:image')
    expect(html).toContain('og:image:width')
    expect(html).toContain('og:locale:alternate')
  })

  it('builds Twitter Card tags', () => {
    const html = new TwitterCardBuilder({
      card: 'summary_large_image',
      site: '@site',
      creator: '@creator',
      title: 'Title',
      description: 'Desc',
      image: 'https://example.com/img.png',
    }).build()

    expect(html).toContain('twitter:card')
    expect(html).toContain('twitter:image')
  })

  it('builds JSON-LD script with array payload', () => {
    const html = new JsonLdBuilder([
      { type: 'Organization', data: { name: 'Gravito' } },
      { type: 'WebSite', data: { url: 'https://example.com' } },
    ]).build()

    expect(html).toContain('application/ld+json')
    expect(html).toContain('"@type":"Organization"')
  })

  it('builds analytics scripts', () => {
    const html = new AnalyticsBuilder({
      gtag: 'G-123',
      pixel: 'PX-1',
      baidu: 'BD-1',
    }).build()

    expect(html).toContain('googletagmanager')
    expect(html).toContain('fbq(')
    expect(html).toContain('hm.baidu.com')
  })

  it('builds composed seo metadata', () => {
    const html = new SeoMetadata({
      meta: {
        title: 'Title',
        description: 'Desc',
      },
      og: {
        title: '',
        url: 'https://example.com',
      },
      twitter: {
        title: '',
        card: 'summary',
      },
      jsonLd: { type: 'WebSite', data: { url: 'https://example.com' } },
      analytics: { gtag: 'G-123' },
    }).toString()

    expect(html).toContain('<title>Title</title>')
    expect(html).toContain('og:title')
    expect(html).toContain('twitter:title')
    expect(html).toContain('application/ld+json')
  })
})
