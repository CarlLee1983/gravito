import { describe, expect, it } from 'bun:test'
import { createAlternates } from '../../src/utils/i18n'

describe('createAlternates', () => {
  const baseUrl = 'https://example.com'

  it('should generate alternates from array of locales', () => {
    const alternates = createAlternates({
      baseUrl,
      path: '/about',
      locales: ['en', 'zh-TW'],
    })

    expect(alternates).toEqual([
      { lang: 'en', url: 'https://example.com/en/about' },
      { lang: 'zh-TW', url: 'https://example.com/zh-TW/about' },
    ])
  })

  it('should handle root path correctly', () => {
    const alternates = createAlternates({
      baseUrl,
      path: '/',
      locales: ['en', 'ja'],
    })

    expect(alternates).toEqual([
      { lang: 'en', url: 'https://example.com/en' },
      { lang: 'ja', url: 'https://example.com/ja' },
    ])
  })

  it('should support x-default', () => {
    const alternates = createAlternates({
      baseUrl,
      path: '/contact',
      locales: ['en', 'fr'],
      xDefault: 'en',
    })

    expect(alternates).toContainEqual({ lang: 'x-default', url: 'https://example.com/en/contact' })
  })

  it('should support locale mapping with prefixes', () => {
    const alternates = createAlternates({
      baseUrl,
      path: '/pricing',
      locales: {
        en: '/en-us',
        tw: '/zh-hant-tw',
      },
    })

    expect(alternates).toEqual([
      { lang: 'en', url: 'https://example.com/en-us/pricing' },
      { lang: 'tw', url: 'https://example.com/zh-hant-tw/pricing' },
    ])
  })

  it('should support custom transform functions', () => {
    const alternates = createAlternates({
      baseUrl,
      path: '/post/hello',
      locales: {
        en: (path) => `https://en.example.com${path}`,
        tw: (path) => `https://tw.example.com${path}`,
      },
    })

    expect(alternates).toEqual([
      { lang: 'en', url: 'https://en.example.com/post/hello' },
      { lang: 'tw', url: 'https://tw.example.com/post/hello' },
    ])
  })
})
