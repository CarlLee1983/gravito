import { describe, expect, it } from 'bun:test'
import { Sanitizer, sanitizeHtml, stripHtmlTags } from '../src/security/Sanitizer'

describe('Sanitizer', () => {
  describe('Basic HTML Sanitization', () => {
    it('should remove script tags', () => {
      const sanitizer = new Sanitizer()
      const dirty = '<p>Hello</p><script>alert("XSS")</script><p>World</p>'
      const clean = sanitizer.sanitize(dirty)
      expect(clean).toBe('<p>Hello</p><p>World</p>')
      expect(clean).not.toContain('script')
      expect(clean).not.toContain('alert')
    })

    it('should remove inline event handlers', () => {
      const sanitizer = new Sanitizer()
      const dirty = '<div onclick="malicious()">Click me</div>'
      const clean = sanitizer.sanitize(dirty)
      expect(clean).toBe('<div>Click me</div>')
      expect(clean).not.toContain('onclick')
    })

    it('should block javascript: URLs in href', () => {
      const sanitizer = new Sanitizer()
      const dirty = '<a href="javascript:alert(1)">Click</a>'
      const clean = sanitizer.sanitize(dirty)
      expect(clean).toBe('<a>Click</a>')
      expect(clean).not.toContain('javascript:')
    })

    it('should block javascript: URLs in src', () => {
      const sanitizer = new Sanitizer()
      const dirty = '<img src="javascript:alert(1)" alt="bad">'
      const clean = sanitizer.sanitize(dirty)
      expect(clean).not.toContain('javascript:')
    })

    it('should remove style tags', () => {
      const sanitizer = new Sanitizer()
      const dirty = '<p>Text</p><style>body{background:red}</style>'
      const clean = sanitizer.sanitize(dirty)
      expect(clean).toBe('<p>Text</p>')
      expect(clean).not.toContain('style')
    })

    it('should remove iframe tags', () => {
      const sanitizer = new Sanitizer()
      const dirty = '<p>Content</p><iframe src="evil.com"></iframe>'
      const clean = sanitizer.sanitize(dirty)
      expect(clean).toBe('<p>Content</p>')
      expect(clean).not.toContain('iframe')
    })
  })

  describe('Allowed HTML Preservation', () => {
    it('should preserve safe formatting tags', () => {
      const sanitizer = new Sanitizer()
      const html = '<p>Hello <strong>world</strong> with <em>emphasis</em></p>'
      const clean = sanitizer.sanitize(html)
      expect(clean).toBe(html)
    })

    it('should preserve lists', () => {
      const sanitizer = new Sanitizer()
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
      const clean = sanitizer.sanitize(html)
      expect(clean).toBe(html)
    })

    it('should preserve tables', () => {
      const sanitizer = new Sanitizer()
      const html = '<table><tr><td>Cell</td></tr></table>'
      const clean = sanitizer.sanitize(html)
      expect(clean).toBe(html)
    })

    it('should preserve links with safe URLs', () => {
      const sanitizer = new Sanitizer()
      const html = '<a href="https://example.com">Link</a>'
      const clean = sanitizer.sanitize(html)
      expect(clean).toContain('https://example.com')
      expect(clean).toContain('Link')
    })

    it('should preserve images with safe URLs', () => {
      const sanitizer = new Sanitizer()
      const html = '<img src="/static/image.jpg" alt="Photo" width="400" height="300">'
      const clean = sanitizer.sanitize(html)
      expect(clean).toContain('src="/static/image.jpg"')
      expect(clean).toContain('alt="Photo"')
      expect(clean).toContain('width="400"')
    })
  })

  describe('Attribute Sanitization', () => {
    it('should preserve safe attributes', () => {
      const sanitizer = new Sanitizer()
      const html = '<div class="container" id="main" title="Section">Content</div>'
      const clean = sanitizer.sanitize(html)
      expect(clean).toContain('class="container"')
      expect(clean).toContain('id="main"')
      expect(clean).toContain('title="Section"')
    })

    it('should remove all event handler attributes', () => {
      const sanitizer = new Sanitizer()
      const dirty = '<div onclick="x()" onmouseover="y()" onerror="z()">Text</div>'
      const clean = sanitizer.sanitize(dirty)
      expect(clean).toBe('<div>Text</div>')
    })

    it('should escape attribute values', () => {
      const sanitizer = new Sanitizer()
      const html = '<div title="Test &quot;quoted&quot; text">Content</div>'
      const clean = sanitizer.sanitize(html)
      expect(clean).toContain('title="Test &amp;quot;quoted&amp;quot; text"')
    })
  })

  describe('URL Validation', () => {
    it('should allow http URLs', () => {
      const sanitizer = new Sanitizer()
      const html = '<a href="http://example.com">Link</a>'
      const clean = sanitizer.sanitize(html)
      expect(clean).toContain('http://example.com')
    })

    it('should allow https URLs', () => {
      const sanitizer = new Sanitizer()
      const html = '<a href="https://example.com">Link</a>'
      const clean = sanitizer.sanitize(html)
      expect(clean).toContain('https://example.com')
    })

    it('should allow mailto URLs', () => {
      const sanitizer = new Sanitizer()
      const html = '<a href="mailto:test@example.com">Email</a>'
      const clean = sanitizer.sanitize(html)
      expect(clean).toContain('mailto:test@example.com')
    })

    it('should allow relative URLs', () => {
      const sanitizer = new Sanitizer()
      const html = '<a href="/page/about">About</a>'
      const clean = sanitizer.sanitize(html)
      expect(clean).toContain('href="/page/about"')
    })

    it('should block data: URLs', () => {
      const sanitizer = new Sanitizer()
      const dirty = '<img src="data:text/html,<script>alert(1)</script>" alt="bad">'
      const clean = sanitizer.sanitize(dirty)
      expect(clean).not.toContain('data:')
    })

    it('should block vbscript: URLs', () => {
      const sanitizer = new Sanitizer()
      const dirty = '<a href="vbscript:msgbox(1)">Click</a>'
      const clean = sanitizer.sanitize(dirty)
      expect(clean).not.toContain('vbscript:')
    })
  })

  describe('Custom Configuration', () => {
    it('should respect custom allowed tags', () => {
      const sanitizer = new Sanitizer({
        allowedTags: ['p', 'br'],
        allowedAttributes: [],
      })
      const html = '<p>Text</p><div>Should be removed</div><strong>Bold</strong>'
      const clean = sanitizer.sanitize(html)
      expect(clean).toContain('<p>Text</p>')
      expect(clean).not.toContain('div')
      expect(clean).not.toContain('strong')
    })

    it('should respect custom allowed attributes', () => {
      const sanitizer = new Sanitizer({
        allowedTags: ['div'],
        allowedAttributes: ['class'],
      })
      const html = '<div class="box" id="main" title="test">Content</div>'
      const clean = sanitizer.sanitize(html)
      expect(clean).toContain('class="box"')
      expect(clean).not.toContain('id=')
      expect(clean).not.toContain('title=')
    })
  })

  describe('stripAllTags', () => {
    it('should remove all HTML tags', () => {
      const sanitizer = new Sanitizer()
      const html = '<p>Hello <strong>world</strong>!</p>'
      const text = sanitizer.stripAllTags(html)
      expect(text).toBe('Hello world!')
    })

    it('should remove scripts and styles before stripping', () => {
      const sanitizer = new Sanitizer()
      const html = '<p>Text</p><script>alert(1)</script><style>css</style>'
      const text = sanitizer.stripAllTags(html)
      expect(text).toBe('Text')
    })

    it('should decode HTML entities', () => {
      const sanitizer = new Sanitizer()
      const html = '&lt;div&gt;&amp;&quot;test&quot;&lt;/div&gt;'
      const text = sanitizer.stripAllTags(html)
      expect(text).toBe('<div>&"test"</div>')
    })

    it('should work with stripAll option', () => {
      const sanitizer = new Sanitizer({ stripAll: true })
      const html = '<p>Hello <strong>world</strong>!</p>'
      const text = sanitizer.sanitize(html)
      expect(text).toBe('Hello world!')
    })
  })

  describe('Convenience Functions', () => {
    it('sanitizeHtml should use default sanitizer', () => {
      const dirty = '<p>Safe</p><script>alert(1)</script>'
      const clean = sanitizeHtml(dirty)
      expect(clean).toBe('<p>Safe</p>')
    })

    it('stripHtmlTags should remove all tags', () => {
      const html = '<p>Hello <strong>world</strong>!</p>'
      const text = stripHtmlTags(html)
      expect(text).toBe('Hello world!')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const sanitizer = new Sanitizer()
      expect(sanitizer.sanitize('')).toBe('')
      expect(sanitizer.stripAllTags('')).toBe('')
    })

    it('should handle malformed HTML', () => {
      const sanitizer = new Sanitizer()
      const dirty = '<p>Unclosed paragraph<div>Nested</p></div>'
      const clean = sanitizer.sanitize(dirty)
      expect(clean).not.toContain('script')
    })

    it('should handle nested script tags', () => {
      const sanitizer = new Sanitizer()
      const dirty = '<p><script>var x = "<script>alert(1)</script>"</script></p>'
      const clean = sanitizer.sanitize(dirty)
      expect(clean).not.toContain('alert')
      expect(clean).not.toContain('<script>')
    })

    it('should handle multiple event handlers', () => {
      const sanitizer = new Sanitizer()
      const dirty = '<div onclick="a()" onmouseover="b()" onload="c()">Text</div>'
      const clean = sanitizer.sanitize(dirty)
      expect(clean).toBe('<div>Text</div>')
    })

    it('should preserve closing tags', () => {
      const sanitizer = new Sanitizer()
      const html = '<p>Text</p>'
      const clean = sanitizer.sanitize(html)
      expect(clean).toBe('<p>Text</p>')
      expect(clean.match(/<\/p>/g)?.length).toBe(1)
    })
  })

  describe('Real-world XSS Vectors', () => {
    it('should block img onerror XSS', () => {
      const sanitizer = new Sanitizer()
      const xss = '<img src=x onerror="alert(1)">'
      const clean = sanitizer.sanitize(xss)
      expect(clean).not.toContain('onerror')
      expect(clean).not.toContain('alert')
    })

    it('should block svg-based XSS', () => {
      const sanitizer = new Sanitizer()
      const xss = '<svg onload="alert(1)"></svg>'
      const clean = sanitizer.sanitize(xss)
      expect(clean).not.toContain('onload')
    })

    it('should block form action XSS', () => {
      const sanitizer = new Sanitizer()
      const xss = '<form action="javascript:alert(1)"><input type="submit"></form>'
      const clean = sanitizer.sanitize(xss)
      expect(clean).not.toContain('javascript:')
    })

    it('should block meta refresh XSS', () => {
      const sanitizer = new Sanitizer()
      const xss = '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'
      const clean = sanitizer.sanitize(xss)
      expect(clean).not.toContain('meta')
    })
  })
})
