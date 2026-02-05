import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { MetaInspector } from '../../src/meta/Inspector'

describe('MetaInspector', () => {
  const inspector = new MetaInspector()
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('parse()', () => {
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

    it('parses Twitter Card tags', () => {
      const html = `
        <head>
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:site" content="@example">
          <meta name="twitter:creator" content="@author">
        </head>
      `
      const preview = inspector.parse(html, 'https://example.com')

      expect(preview.twitter?.card).toBe('summary_large_image')
      expect(preview.twitter?.site).toBe('@example')
      expect(preview.twitter?.creator).toBe('@author')
    })

    it('returns undefined for missing title', () => {
      const html = '<html><head></head></html>'
      const preview = inspector.parse(html, 'https://example.com')
      expect(preview.title).toBeUndefined()
    })

    it('sets url from parameter', () => {
      const html = '<html></html>'
      const preview = inspector.parse(html, 'https://example.com/page')
      expect(preview.url).toBe('https://example.com/page')
    })
  })

  describe('inspect()', () => {
    it('fetches and parses HTML from a URL', async () => {
      const mockHtml = `
        <html>
          <head>
            <title>Remote Page</title>
            <meta name="description" content="Remote description">
            <meta property="og:title" content="OG Remote">
          </head>
        </html>
      `

      globalThis.fetch = async () =>
        new Response(mockHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })

      const preview = await inspector.inspect('https://example.com')

      expect(preview.title).toBe('Remote Page')
      expect(preview.description).toBe('Remote description')
      expect(preview.og?.title).toBe('OG Remote')
      expect(preview.url).toBe('https://example.com')
    })

    it('throws on non-200 HTTP status', async () => {
      globalThis.fetch = async () =>
        new Response('Not Found', {
          status: 404,
          statusText: 'Not Found',
        })

      await expect(inspector.inspect('https://example.com/missing')).rejects.toThrow(
        'Inspection failed'
      )
    })

    it('throws on network error with Error instance', async () => {
      globalThis.fetch = async () => {
        throw new Error('Connection refused')
      }

      await expect(inspector.inspect('https://example.com')).rejects.toThrow(
        'Inspection failed: Connection refused'
      )
    })

    it('re-throws non-Error values directly', async () => {
      globalThis.fetch = async () => {
        throw 'raw string error'
      }

      await expect(inspector.inspect('https://example.com')).rejects.toBe('raw string error')
    })

    it('includes status code in error message for non-OK responses', async () => {
      globalThis.fetch = async () =>
        new Response('Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        })

      await expect(inspector.inspect('https://example.com')).rejects.toThrow(
        'Failed to fetch https://example.com: 500 Internal Server Error'
      )
    })
  })
})
