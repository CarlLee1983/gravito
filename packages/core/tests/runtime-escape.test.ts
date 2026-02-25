/**
 * Tests for RuntimeEscapeAdapter
 */

import { describe, expect, it } from 'vitest'
import { getEscapeHtml } from '../src/runtime/escape'

describe('getEscapeHtml', () => {
  const escapeHtml = getEscapeHtml()

  describe('基本轉義', () => {
    it('應該轉義單個特殊字元', () => {
      expect(escapeHtml('&')).toBe('&amp;')
      expect(escapeHtml('<')).toBe('&lt;')
      expect(escapeHtml('>')).toBe('&gt;')
      expect(escapeHtml('"')).toBe('&quot;')
      // Bun 使用 &#x27; 而不是 &#39;，兩者皆有效
      const escaped = escapeHtml("'")
      expect(escaped === '&#39;' || escaped === '&#x27;').toBe(true)
    })

    it('應該轉義多個特殊字元', () => {
      expect(escapeHtml('&<>')).toBe('&amp;&lt;&gt;')
      const escaped = escapeHtml('"\'&')
      expect(escaped === '&quot;&#39;&amp;' || escaped === '&quot;&#x27;&amp;').toBe(true)
    })

    it('應該轉義重複出現的字元', () => {
      expect(escapeHtml('&&')).toBe('&amp;&amp;')
      expect(escapeHtml('<<>>')).toBe('&lt;&lt;&gt;&gt;')
    })
  })

  describe('HTML/XML 上下文', () => {
    it('應該轉義標籤', () => {
      expect(escapeHtml('<div>')).toBe('&lt;div&gt;')
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
    })

    it('應該轉義屬性', () => {
      expect(escapeHtml('<a href="http://example.com">')).toBe(
        '&lt;a href=&quot;http://example.com&quot;&gt;'
      )
    })

    it('應該轉義 HTML 實體組合', () => {
      expect(escapeHtml('&amp;')).toBe('&amp;amp;')
      expect(escapeHtml('&lt;')).toBe('&amp;lt;')
    })
  })

  describe('XSS 防護', () => {
    it('應該防護 script 標籤 XSS', () => {
      const xss = '<script>alert("xss")</script>'
      const escaped = escapeHtml(xss)
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
      expect(escaped).not.toContain('<script>')
    })

    it('應該防護 onclick 屬性 XSS', () => {
      const xss = '" onclick="alert(\'xss\')'
      const escaped = escapeHtml(xss)
      // 引號本身被轉義
      expect(escaped).toContain('&quot;')
      // 單引號被轉義（Bun 使用 &#x27;）
      expect(escaped.includes('&#x27;') || escaped.includes('&#39;')).toBe(true)
    })

    it('應該防護 iframe 標籤 XSS', () => {
      const xss = '<iframe src="javascript:alert(\'xss\')"></iframe>'
      const escaped = escapeHtml(xss)
      expect(escaped).not.toContain('<iframe')
      expect(escaped).toContain('&lt;iframe')
    })

    it('應該防護 javascript: 協議', () => {
      const xss = '<a href="javascript:alert(\'xss\')">click</a>'
      const escaped = escapeHtml(xss)
      // 標籤本身被轉義，href 屬性值內容無法執行
      expect(escaped).not.toContain('<a')
      expect(escaped).toContain('&lt;a')
      expect(escaped).toContain('&quot;')
    })

    it('應該防護常見 XSS payload', () => {
      const payloads = [
        '<img src=x onerror="alert(\'xss\')">',
        '<svg onload="alert(\'xss\')"></svg>',
        '<body onload="alert(\'xss\')">',
        '<marquee onstart="alert(\'xss\')">',
      ]

      payloads.forEach((payload) => {
        const escaped = escapeHtml(payload)
        // 標籤本身被轉義，屬性無法執行
        expect(escaped).not.toContain('<img')
        expect(escaped).not.toContain('<svg')
        expect(escaped).not.toContain('<body')
        expect(escaped).not.toContain('<marquee')
        expect(escaped).toContain('&lt;')
      })
    })
  })

  describe('邊界情況', () => {
    it('應該處理空字串', () => {
      expect(escapeHtml('')).toBe('')
    })

    it('應該處理超長字串', () => {
      const longString = 'a'.repeat(10000)
      expect(escapeHtml(longString)).toBe(longString)
    })

    it('應該保留普通字符', () => {
      expect(escapeHtml('hello')).toBe('hello')
      expect(escapeHtml('123')).toBe('123')
      expect(escapeHtml('hello world')).toBe('hello world')
    })

    it('應該處理混合內容', () => {
      const mixed = 'Hello & "World" <tag>'
      const escaped = escapeHtml(mixed)
      expect(escaped).toBe('Hello &amp; &quot;World&quot; &lt;tag&gt;')
    })
  })

  describe('Unicode 與 Emoji', () => {
    it('應該保留中文字元', () => {
      expect(escapeHtml('你好')).toBe('你好')
      expect(escapeHtml('你好<世界>')).toBe('你好&lt;世界&gt;')
    })

    it('應該保留日文字元', () => {
      expect(escapeHtml('こんにちは')).toBe('こんにちは')
      expect(escapeHtml('テスト<tag>')).toBe('テスト&lt;tag&gt;')
    })

    it('應該保留 Emoji', () => {
      expect(escapeHtml('😀')).toBe('😀')
      expect(escapeHtml('🎉<test>')).toBe('🎉&lt;test&gt;')
    })

    it('應該保留重音字元', () => {
      expect(escapeHtml('café')).toBe('café')
      expect(escapeHtml('naïve<tag>')).toBe('naïve&lt;tag&gt;')
    })
  })

  describe('幪等性與一致性', () => {
    it('應該使單次轉義後的字串安全', () => {
      const original = '<script>alert("xss")</script>'
      const once = escapeHtml(original)
      const twice = escapeHtml(once)
      // 第二次轉義應該再次轉義 &，所以結果應該不同
      expect(twice).not.toBe(once)
    })

    it('應該產生一致的輸出', () => {
      const input = 'test<tag>&"\'end'
      const result1 = escapeHtml(input)
      const result2 = escapeHtml(input)
      expect(result1).toBe(result2)
    })
  })

  describe('跨運行時一致性', () => {
    it('應該在所有運行時返回相同結果', () => {
      const testCases = [
        'hello',
        '<tag>',
        'content & "quoted"',
        "<script>alert('xss')</script>",
        '混合 < HTML > 與 & 特殊字元',
      ]

      testCases.forEach((testCase) => {
        const result1 = escapeHtml(testCase)
        const result2 = getEscapeHtml()(testCase)
        expect(result1).toBe(result2)
      })
    })
  })
})
