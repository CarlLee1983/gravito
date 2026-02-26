import { describe, expect, test } from 'bun:test'
import { EtherRewriter } from '../../src/core/EtherRewriter'
import {
  createInjectRule,
  createLinkRule,
  createSanitizeRule,
  createSecurityRule,
  createSeoRule,
} from '../../src/rules'

describe('Full Pipeline Integration', () => {
  test('should apply security + seo rules in sequence', async () => {
    const securityRules = [createSecurityRule({ cspNonce: true, nonceValue: 'test-nonce' })]
    const seoRules = createSeoRule({ title: 'Test Page', lang: 'en' })

    let rewriter = new EtherRewriter()
    securityRules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })
    seoRules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml(
      '<html lang="fr"><head><title>Old</title></head><body></body></html>'
    )

    expect(html).toContain('Test Page')
    expect(html).toContain('lang="en"')
  })

  test('should combine security + inject rules', async () => {
    const securityRules = [createSecurityRule({ cspNonce: true, nonceValue: 'nonce123' })]
    const injectRules = createInjectRule({
      headEnd: '<meta name="custom" />',
      bodyEnd: '<script>console.log("loaded")</script>',
    })

    let rewriter = new EtherRewriter()
    securityRules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })
    injectRules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><head></head><body></body></html>')

    expect(html).toContain('custom')
    expect(html).toContain('loaded')
  })

  test('should apply seo + inject + link rules', async () => {
    const seoRules = createSeoRule({
      title: 'My Site',
      description: 'A great site',
      og: { image: 'https://example.com/og.jpg' },
    })
    const injectRules = createInjectRule({
      bodyEnd: '<script src="app.js"></script>',
    })
    const linkRules = [
      createLinkRule({
        external: { target: '_blank', noopener: true },
      }),
    ]

    let rewriter = new EtherRewriter()
    seoRules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })
    injectRules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })
    linkRules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml(
      '<html><head><title>Old</title></head><body><a href="https://example.com">External</a></body></html>'
    )

    expect(html).toContain('My Site')
    expect(html).toContain('description')
    expect(html).toContain('og:image')
    expect(html).toContain('app.js')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('noopener')
  })

  test('should apply security + sanitize + seo rules', async () => {
    const securityRules = [createSecurityRule({ secureLinkAttrs: true })]
    const sanitizeRules = [createSanitizeRule({ stripEventHandlers: true })]
    const seoRules = createSeoRule({
      title: 'Secure Site',
      robots: 'index, follow',
    })

    let rewriter = new EtherRewriter()
    securityRules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })
    sanitizeRules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })
    seoRules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml(
      '<html><head><title>Old</title></head><body><a href="https://test.com">Link</a></body></html>'
    )

    expect(html).toContain('Secure Site')
    expect(html).toContain('robots')
    expect(html).toContain('noopener')
  })

  test('should handle complex multi-rule pipeline', async () => {
    const seoRules = createSeoRule({
      title: 'Complex Pipeline',
      description: 'Testing multiple rules',
      canonical: 'https://example.com/test',
      og: {
        title: 'Complex',
        image: 'https://example.com/image.jpg',
      },
      twitter: {
        card: 'summary',
        creator: '@example',
      },
      lang: 'en-US',
    })

    const injectRules = createInjectRule({
      headEnd: '<link rel="preconnect" href="https://fonts.googleapis.com" />',
      bodyStart: '<div id="root">',
      bodyEnd: '</div>',
    })

    const securityRules = [createSecurityRule({ cspNonce: true, nonceValue: 'abc123' })]

    let rewriter = new EtherRewriter()
    seoRules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })
    injectRules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })
    securityRules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml(
      '<html lang="fr"><head><title>Old</title></head><body><p>Content</p></body></html>'
    )

    // SEO validations
    expect(html).toContain('Complex Pipeline')
    expect(html).toContain('Testing multiple rules')
    expect(html).toContain('canonical')
    expect(html).toContain('og:title')
    expect(html).toContain('og:image')
    expect(html).toContain('twitter:card')
    expect(html).toContain('twitter:creator')
    expect(html).toContain('lang="en-US"')

    // Inject validations
    expect(html).toContain('preconnect')
    expect(html).toContain('<div id="root">')
    expect(html).toContain('</div>')

    // Content preservation
    expect(html).toContain('<p>Content</p>')
  })

  test('should maintain rule independence', async () => {
    // Each rule should work independently without affecting others
    const seoRules = createSeoRule({ title: 'SEO Title' })
    const injectRules = createInjectRule({ headEnd: '<!-- Injected -->' })

    let rewriter1 = new EtherRewriter()
    seoRules.forEach((r) => {
      rewriter1 = rewriter1.addRule(r)
    })
    const html1 = await rewriter1.transformHtml('<html><head><title>Old</title></head></html>')

    let rewriter2 = new EtherRewriter()
    injectRules.forEach((r) => {
      rewriter2 = rewriter2.addRule(r)
    })
    const html2 = await rewriter2.transformHtml('<html><head></head></html>')

    // SEO rule should not affect inject functionality
    expect(html1).toContain('SEO Title')
    expect(html1).not.toContain('Injected')

    // Inject rule should not affect SEO functionality
    expect(html2).toContain('Injected')
    expect(html2).not.toContain('SEO Title')
  })

  test('should handle special characters in combined rules', async () => {
    const seoRules = createSeoRule({
      title: 'Test & <Special> "Chars"',
      description: 'Description with & < > "quotes"',
      og: {
        title: 'Test & Title',
      },
    })

    const injectRules = createInjectRule({
      headEnd: '<script>var x = "test & data";</script>',
    })

    let rewriter = new EtherRewriter()
    seoRules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })
    injectRules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><head><title>Old</title></head></html>')

    // SEO should escape special characters
    expect(html).toContain('&amp;')
    expect(html).toContain('&lt;')
    expect(html).toContain('&quot;')

    // Inject content should be preserved as-is
    expect(html).toContain('test & data')
  })
})
