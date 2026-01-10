import { describe, expect, it } from 'bun:test'
import { MetaInspector } from '../../src/meta/Inspector'

describe('MetaInspector', () => {
  const inspector = new MetaInspector()

  it('parses basic meta tags', () => {
    const html = `
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="This is a test description">
        </head>
      </html>
    `
    const preview = inspector.parse(html, 'https://example.com')

    expect(preview.title).toBe('Test Page')
    expect(preview.description).toBe('This is a test description')
  })

  it('parses OpenGraph tags', () => {
    const html = `
      <head>
        <meta property="og:title" content="OG Title">
        <meta property="og:image" content="https://example.com/image.jpg">
      </head>
    `
    const preview = inspector.parse(html, 'https://example.com')

    expect(preview.og?.title).toBe('OG Title')
    expect(preview.og?.image).toBe('https://example.com/image.jpg')
  })

  it('handles reverse attribute order', () => {
    const html = `
      <meta content="Reverse" name="description">
    `
    const preview = inspector.parse(html, 'https://example.com')
    expect(preview.description).toBe('Reverse')
  })
})
