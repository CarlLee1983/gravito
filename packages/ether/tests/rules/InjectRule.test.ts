import { describe, expect, test } from 'bun:test'
import { EtherRewriter } from '../../src/core/EtherRewriter'
import { createInjectRule } from '../../src/rules/InjectRule'

describe('InjectRule', () => {
  test('should inject into head end', async () => {
    const rules = createInjectRule({
      headEnd: '<script src="app.js"></script>',
    })
    let rewriter = new EtherRewriter()
    rules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><head></head></html>')
    expect(html).toContain('<script src="app.js"></script>')
  })

  test('should inject into body start', async () => {
    const rules = createInjectRule({
      bodyStart: '<div id="app">',
    })
    let rewriter = new EtherRewriter()
    rules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><body></body></html>')
    expect(html).toContain('<div id="app">')
  })

  test('should inject into body end', async () => {
    const rules = createInjectRule({
      bodyEnd: '<script src="analytics.js"></script>',
    })
    let rewriter = new EtherRewriter()
    rules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><body></body></html>')
    expect(html).toContain('<script src="analytics.js"></script>')
  })

  test('should support multiple injections', async () => {
    const rules = createInjectRule({
      headEnd: '<!-- Head -->',
      bodyStart: '<!-- Start -->',
      bodyEnd: '<!-- End -->',
    })
    let rewriter = new EtherRewriter()
    rules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><head></head><body></body></html>')
    expect(html).toContain('<!-- Head -->')
    expect(html).toContain('<!-- Start -->')
    expect(html).toContain('<!-- End -->')
  })

  test('should handle HTML content in injection', async () => {
    const rules = createInjectRule({
      headEnd: '<meta charset="utf-8" />',
      bodyEnd: '<footer><p>© 2026</p></footer>',
    })
    let rewriter = new EtherRewriter()
    rules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><head></head><body></body></html>')
    expect(html).toContain('charset="utf-8"')
    expect(html).toContain('© 2026')
  })

  test('should inject analytics tracking', async () => {
    const rules = createInjectRule({
      headEnd: '<script async src="https://cdn.example.com/analytics.js"></script>',
      bodyEnd: '<noscript><img src="https://track.example.com/pixel.gif" /></noscript>',
    })
    let rewriter = new EtherRewriter()
    rules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><head></head><body></body></html>')
    expect(html).toContain('analytics.js')
    expect(html).toContain('pixel.gif')
  })

  test('should inject opening and closing div tags', async () => {
    const rules = createInjectRule({
      bodyStart: '<div id="wrapper">',
      bodyEnd: '</div>',
    })
    let rewriter = new EtherRewriter()
    rules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><body><p>Content</p></body></html>')
    expect(html).toContain('<div id="wrapper">')
    expect(html).toContain('</div>')
    expect(html).toContain('<p>Content</p>')
  })

  test('should handle empty options gracefully', async () => {
    const rules = createInjectRule({})
    expect(rules).toHaveLength(0)
  })

  test('should not create rules for undefined options', async () => {
    const rules = createInjectRule({
      headEnd: undefined,
      bodyStart: undefined,
      bodyEnd: undefined,
    })
    expect(rules).toHaveLength(0)
  })

  test('should inject complex HTML with attributes', async () => {
    const rules = createInjectRule({
      headEnd: '<link rel="preload" href="app.js" as="script" />',
      bodyStart: '<nav role="navigation" aria-label="Main">',
      bodyEnd: '</nav>',
    })
    let rewriter = new EtherRewriter()
    rules.forEach((r) => {
      rewriter = rewriter.addRule(r)
    })

    const html = await rewriter.transformHtml('<html><head></head><body></body></html>')
    expect(html).toContain('rel="preload"')
    expect(html).toContain('aria-label="Main"')
  })
})
