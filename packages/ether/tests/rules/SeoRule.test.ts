import { describe, expect, test } from 'bun:test'
import { EtherRewriter } from '../../src/core/EtherRewriter'
import { createSeoRule } from '../../src/rules/SeoRule'

describe('SeoRule', () => {
  test('should update title tag', async () => {
    const rules = createSeoRule({ title: 'New Title' })
    let rewriter = new EtherRewriter()
    rules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><head><title>Old Title</title></head></html>')
    expect(html).toContain('<title>New Title</title>')
    expect(html).not.toContain('Old Title')
  })

  test('should add description meta tag', async () => {
    const rules = createSeoRule({ description: 'My site' })
    let rewriter = new EtherRewriter()
    rules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><head></head></html>')
    expect(html).toContain('name="description"')
    expect(html).toContain('My site')
  })

  test('should add robots meta tag', async () => {
    const rules = createSeoRule({ robots: 'index, follow' })
    let rewriter = new EtherRewriter()
    rules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><head></head></html>')
    expect(html).toContain('name="robots"')
    expect(html).toContain('index, follow')
  })

  test('should add canonical link', async () => {
    const rules = createSeoRule({ canonical: 'https://example.com/page' })
    let rewriter = new EtherRewriter()
    rules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><head></head></html>')
    expect(html).toContain('rel="canonical"')
    expect(html).toContain('https://example.com/page')
  })

  test('should add Open Graph tags', async () => {
    const rules = createSeoRule({
      og: {
        title: 'My Page',
        image: 'https://example.com/image.jpg',
      },
    })
    let rewriter = new EtherRewriter()
    rules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><head></head></html>')
    expect(html).toContain('property="og:title"')
    expect(html).toContain('property="og:image"')
    expect(html).toContain('My Page')
  })

  test('should add Twitter Cards tags', async () => {
    const rules = createSeoRule({
      twitter: {
        card: 'summary_large_image',
        title: 'My Page',
      },
    })
    let rewriter = new EtherRewriter()
    rules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><head></head></html>')
    expect(html).toContain('name="twitter:card"')
    expect(html).toContain('name="twitter:title"')
    expect(html).toContain('summary_large_image')
  })

  test('should set html lang attribute', async () => {
    const rules = createSeoRule({ lang: 'zh-TW' })
    let rewriter = new EtherRewriter()
    rules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html></html>')
    expect(html).toContain('lang="zh-TW"')
  })

  test('should escape special characters in content', async () => {
    const rules = createSeoRule({
      description: 'Test & <dangerous> "content"',
    })
    let rewriter = new EtherRewriter()
    rules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><head></head></html>')
    expect(html).toContain('&amp;')
    expect(html).toContain('&lt;')
    expect(html).toContain('&gt;')
    expect(html).toContain('&quot;')
    expect(html).not.toContain('<dangerous>')
  })

  test('should combine multiple SEO configurations', async () => {
    const rules = createSeoRule({
      title: 'My Page',
      description: 'Page description',
      robots: 'index, follow',
      canonical: 'https://example.com/page',
      og: {
        title: 'Open Graph Title',
        image: 'https://example.com/og.jpg',
      },
      twitter: {
        card: 'summary',
      },
      lang: 'en',
    })
    let rewriter = new EtherRewriter()
    rules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><head><title>Old</title></head></html>')
    expect(html).toContain('My Page')
    expect(html).toContain('Page description')
    expect(html).toContain('index, follow')
    expect(html).toContain('canonical')
    expect(html).toContain('og:title')
    expect(html).toContain('twitter:card')
    expect(html).toContain('lang="en"')
  })

  test('should handle empty options gracefully', async () => {
    const rules = createSeoRule({})
    expect(rules).toHaveLength(0)
  })

  test('should not create rules for undefined options', async () => {
    const rules = createSeoRule({
      title: undefined,
      description: undefined,
    })
    expect(rules).toHaveLength(0)
  })
})
