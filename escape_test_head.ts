/**
 * Tests for RuntimeEscapeAdapter (runtime/escape.ts)
 */

import { describe, expect, it } from 'bun:test'
import { getEscapeHtml } from '../src/runtime'

describe('runtime/escape', () => {
  describe('getEscapeHtml()', () => {
    it('should return a function', () => {
      const escapeHtml = getEscapeHtml()
      expect(typeof escapeHtml).toBe('function')
    })

    it('should be a singleton', () => {
      const escapeHtml1 = getEscapeHtml()
      const escapeHtml2 = getEscapeHtml()
      expect(escapeHtml1).toBe(escapeHtml2)
    })
  })

  describe('Basic character escaping', () => {
    const escapeHtml = getEscapeHtml()

    it('should escape ampersand', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b')
    })

    it('should escape less-than', () => {
      expect(escapeHtml('a < b')).toBe('a &lt; b')
    })

    it('should escape greater-than', () => {
      expect(escapeHtml('a > b')).toBe('a &gt; b')
    })

    it('should escape double quote', () => {
      expect(escapeHtml('a "b" c')).toBe('a &quot;b&quot; c')
    })

    it('should escape single quote', () => {
      expect(escapeHtml("a 'b' c")).toBe('a &#x27;b&#x27; c')
    })
  })

  describe('Combined characters', () => {
    const escapeHtml = getEscapeHtml()

    it('should escape multiple special characters', () => {
      expect(escapeHtml('a & < > " \' b')).toBe('a &amp; &lt; &gt; &quot; &#x27; b')
    })

    it('should escape repeated characters', () => {
      expect(escapeHtml('&&&')).toBe('&amp;&amp;&amp;')
      expect(escapeHtml('<<<')).toBe('&lt;&lt;&lt;')
      expect(escapeHtml('>>>')).toBe('&gt;&gt;&gt;')
    })
  })

  describe('HTML/XML contexts', () => {
    const escapeHtml = getEscapeHtml()

    it('should escape HTML tags', () => {
      expect(escapeHtml('<div>content</div>')).toBe('&lt;div&gt;content&lt;/div&gt;')
    })

    it('should escape attribute values with double quotes', () => {
      expect(escapeHtml('value="test"')).toBe('value=&quot;test&quot;')
    })

    it('should escape attribute values with single quotes', () => {
      expect(escapeHtml("value='test'")).toBe('value=&#x27;test&#x27;')
    })

    it('should escape XML entities', () => {
      expect(escapeHtml('<?xml version="1.0"?>')).toBe('&lt;?xml version=&quot;1.0&quot;?&gt;')
    })
  })

  describe('XSS vectors', () => {
    const escapeHtml = getEscapeHtml()

    it('should escape standard script tag injection', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      )
    })

    it('should escape onclick attribute injection', () => {
      expect(escapeHtml('" onclick="alert(\'xss\')')).toBe(
        '&quot; onclick=&quot;alert(&#x27;xss&#x27;)'
      )
    })

    it('should escape img src injection', () => {
      expect(escapeHtml('<img src="x" onerror="alert(\'xss\')">')).toBe(
        '&lt;img src=&quot;x&quot; onerror=&quot;alert(&#x27;xss&#x27;)&quot;&gt;'
      )
    })

    it('should escape JavaScript protocol injection', () => {
      expect(escapeHtml('<a href="javascript:alert(\'xss\')">click</a>')).toBe(
        '&lt;a href=&quot;javascript:alert(&#x27;xss&#x27;)&quot;&gt;click&lt;/a&gt;'
      )
    })

    it('should escape iframe injection', () => {
      expect(escapeHtml('<iframe src="http://attacker.com"></iframe>')).toBe(
        '&lt;iframe src=&quot;http://attacker.com&quot;&gt;&lt;/iframe&gt;'
      )
    })

    it('should escape style injection', () => {
      expect(escapeHtml('<style>body { display:none }</style>')).toBe(
        '&lt;style&gt;body { display:none }&lt;/style&gt;'
      )
    })
  })

  describe('Edge cases', () => {
    const escapeHtml = getEscapeHtml()

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('')
    })

    it('should not escape regular text', () => {
      expect(escapeHtml('hello world')).toBe('hello world')
    })

    it('should not escape numbers', () => {
      expect(escapeHtml('123456')).toBe('123456')
    })

    it('should handle string with only special characters', () => {
      expect(escapeHtml('&<>"')).toBe('&amp;&lt;&gt;&quot;')
    })

    it('should handle very long strings', () => {
      const longString = `${'a'.repeat(10000)}<script>`
      const result = escape(longString)
      expect(result).toContain('&lt;script&gt;')
      expect(result).toMatch(/^a+&lt;script&gt;$/)
    })
  })

  describe('Unicode and special characters', () => {
    const escapeHtml = getEscapeHtml()

    it('should handle Chinese characters', () => {
      expect(escapeHtml('你好世界')).toBe('你好世界')
    })

    it('should handle mixed Chinese and special characters', () => {
      expect(escapeHtml('你好<世界>')).toBe('你好&lt;世界&gt;')
    })

    it('should handle Japanese characters', () => {
      expect(escapeHtml('こんにちは世界')).toBe('こんにちは世界')
    })

    it('should handle emoji', () => {
      expect(escapeHtml('Hello 👋 World')).toBe('Hello 👋 World')
    })

    it('should handle mixed emoji and special characters', () => {
      expect(escapeHtml('<Hello 👋 World>')).toBe('&lt;Hello 👋 World&gt;')
    })

    it('should handle accented characters', () => {
      expect(escapeHtml('Café')).toBe('Café')
    })

    it('should handle tab and newline characters', () => {
      expect(escapeHtml('line1\nline2\ttab')).toBe('line1\nline2\ttab')
    })
  })

  describe('Idempotency', () => {
    const escapeHtml = getEscapeHtml()

    it('should not double-escape already escaped content', () => {
      const original = '<script>'
      const escaped = escapeHtml(original)
      const doubleEscaped = escapeHtml(escaped)
      expect(escaped).not.toBe(doubleEscaped)
      // The second escape should add more entities
      expect(doubleEscaped).toContain('&amp;')
    })
  })

  describe('Cross-runtime consistency', () => {
    it('should produce consistent results across multiple calls', () => {
      const escapeHtml = getEscapeHtml()
      const inputs = [
        '<script>alert("xss")</script>',
        'normal text',
        '&<>"\'',
        'mixed <text> & content',
        '中文 & English',
      ]

      for (const input of inputs) {
        const result1 = escapeHtml(input)
        const result2 = escapeHtml(input)
        expect(result1).toBe(result2)
      }
    })
  })

  describe('HTML entity combinations', () => {
    const escapeHtml = getEscapeHtml()

    it('should escape complex HTML structures', () => {
      const html = '<div class="test" data-value="123">Content & More</div>'
      expect(escapeHtml(html)).toBe(
        '&lt;div class=&quot;test&quot; data-value=&quot;123&quot;&gt;Content &amp; More&lt;/div&gt;'
      )
    })

    it('should escape JSON-like structures', () => {
      const json = '{"key": "value<script>"}'
      expect(escapeHtml(json)).toBe('{&quot;key&quot;: &quot;value&lt;script&gt;&quot;}')
    })

    it('should escape URL-like strings', () => {
      const url = 'https://example.com?param=<value>&other="test"'
      expect(escapeHtml(url)).toBe(
        'https://example.com?param=&lt;value&gt;&amp;other=&quot;test&quot;'
      )
    })
  })

  describe('Real-world use cases', () => {
    it('should escape user input from a form', () => {
      const escapeHtmlFn = getEscapeHtml()
      const userInput = '<img src=x onerror="alert(\'xss\')">'
      const escaped = escapeHtmlFn(userInput)
      expect(escaped).not.toContain('<img')
      // The escaped version should have & entities, not raw HTML
      expect(escaped).toContain('&lt;img')
      expect(escaped).toContain('&quot;')
    })

    it('should escape content for HTML attribute', () => {
      const content = 'value" onclick="alert(\'xss\')'
      const escaped = escape(content)
      const html = `<div title="${escaped}">Test</div>`
      // The escaped version prevents the quote from closing the attribute
      expect(escaped).toBe('value&quot; onclick=&quot;alert(&#x27;xss&#x27;)')
      // So the attribute injection is neutralized
      expect(html).toBe('<div title="value&quot; onclick=&quot;alert(&#x27;xss&#x27;)">Test</div>')
    })

    it('should escape content for HTML text node', () => {
      const content = '<script>alert("xss")</script>'
      const escaped = escape(content)
      const html = `<div>${escaped}</div>`
      expect(html).not.toContain('<script>')
    })

    it('should escape markdown-like content', () => {
      const markdown = '[Link](<script>alert("xss")</script>)'
      const escaped = escape(markdown)
      expect(escaped).toContain('&lt;script&gt;')
    })
  })
})
