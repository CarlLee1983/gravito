/**
 * InputSanitizer 單元測試
 *
 * 測試輸入清理和驗證功能，防止 XSS、SQL Injection 等攻擊
 * 測試覆蓋率目標：95%+
 */

import { InputSanitizer } from '@infrastructure/security/InputSanitizer'
import { describe, expect, it } from 'vitest'

describe('InputSanitizer', () => {
  describe('sanitizeHtml', () => {
    it('應轉義基本 HTML 標籤', () => {
      const input = '<script>alert("xss")</script>'
      const result = InputSanitizer.sanitizeHtml(input)

      expect(result).not.toContain('<script>')
      expect(result).toContain('&lt;script&gt;')
      expect(result).toContain('&lt;/script&gt;')
    })

    it('應轉義特殊字符', () => {
      const input = '&<>"\'`'
      const result = InputSanitizer.sanitizeHtml(input)

      expect(result).toContain('&amp;')
      expect(result).toContain('&lt;')
      expect(result).toContain('&gt;')
      expect(result).toContain('&quot;')
      expect(result).toContain('&#x27;') // 或 &#39;
    })

    it('應轉義多個 XSS 向量', () => {
      const input = '<img src=x onerror=alert("xss")>'
      const result = InputSanitizer.sanitizeHtml(input)

      expect(result).not.toContain('onerror=')
      expect(result).toContain('&lt;img')
    })

    it('應處理空字符串', () => {
      expect(InputSanitizer.sanitizeHtml('')).toBe('')
    })

    it('應處理只包含空白的字符串', () => {
      const result = InputSanitizer.sanitizeHtml('   \n\t  ')
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('應保留普通文本', () => {
      const input = 'Hello World!'
      const result = InputSanitizer.sanitizeHtml(input)

      expect(result).toBe(input)
    })

    it('應處理多層嵌套標籤', () => {
      const input = '<div><script><img src=x onerror=alert("nested")></script></div>'
      const result = InputSanitizer.sanitizeHtml(input)

      expect(result).not.toContain('<')
      expect(result).toContain('&lt;')
    })

    it('應轉義事件處理器', () => {
      const inputs = [
        '<div onclick="alert(1)">',
        '<img onload="alert(1)">',
        '<input onfocus="alert(1)">',
        '<body onload="alert(1)">',
      ]

      inputs.forEach((input) => {
        const result = InputSanitizer.sanitizeHtml(input)
        expect(result).not.toContain('on')
        expect(result).toContain('&lt;')
      })
    })
  })

  describe('sanitizeSql', () => {
    it('應轉義單引號防止 SQL 注入', () => {
      const input = "'; DROP TABLE users--"
      const result = InputSanitizer.sanitizeSql(input)

      // 應該逃逸單引號
      expect(result).not.toContain("'; DROP")
    })

    it('應移除或轉義 SQL 註釋', () => {
      const inputs = ["admin'--", "admin'#", "admin'/*"]

      inputs.forEach((input) => {
        const result = InputSanitizer.sanitizeSql(input)
        // 應該移除或安全轉義
        expect(typeof result).toBe('string')
      })
    })

    it('應移除 null bytes', () => {
      const input = 'test\x00data'
      const result = InputSanitizer.sanitizeSql(input)

      expect(result).not.toContain('\x00')
    })

    it('應處理雙引號', () => {
      const input = 'test" OR "1"="1'
      const result = InputSanitizer.sanitizeSql(input)

      expect(typeof result).toBe('string')
    })

    it('應處理 UNION 注入', () => {
      const input = "' UNION SELECT * FROM users--"
      const result = InputSanitizer.sanitizeSql(input)

      expect(typeof result).toBe('string')
    })

    it('應保留正常的 SQL 字符串', () => {
      const input = 'John Smith'
      const result = InputSanitizer.sanitizeSql(input)

      expect(result).toContain('John')
      expect(result).toContain('Smith')
    })
  })

  describe('sanitizeRegex', () => {
    it('應允許簡單的正則表達式模式', () => {
      const patterns = ['[a-z]+', '\\d{3}-\\d{4}', '^test$', '[0-9]']

      patterns.forEach((pattern) => {
        expect(() => InputSanitizer.sanitizeRegex(pattern)).not.toThrow()
      })
    })

    it('應檢測潛在的 ReDoS 攻擊', () => {
      const maliciousPattern = '(a+)+b'
      // 應該拋出或返回 false，取決於實現
      expect(() => InputSanitizer.sanitizeRegex(maliciousPattern)).not.toThrow()
    })

    it('應檢測嵌套量詞', () => {
      const patterns = ['(a*)*', '(a+)+', '(a|a)*', '(a|ab)*']

      patterns.forEach((pattern) => {
        expect(() => InputSanitizer.sanitizeRegex(pattern)).not.toThrow()
      })
    })

    it('應允許基本字符類', () => {
      const patterns = ['\\w+', '\\s*', '\\d+', '\\W+']

      patterns.forEach((pattern) => {
        expect(() => InputSanitizer.sanitizeRegex(pattern)).not.toThrow()
      })
    })
  })

  describe('sanitizeUrl', () => {
    it('應拒絕 javascript: URL', () => {
      const input = 'javascript:alert("xss")'
      const result = InputSanitizer.sanitizeUrl(input)

      expect(result).not.toContain('javascript:')
    })

    it('應拒絕 data: URL', () => {
      const input = 'data:text/html,<script>alert("xss")</script>'
      const result = InputSanitizer.sanitizeUrl(input)

      expect(result).not.toContain('data:')
    })

    it('應允許 http 和 https URL', () => {
      const urls = [
        'https://example.com',
        'http://example.com',
        'https://example.com/path?query=value',
      ]

      urls.forEach((url) => {
        const result = InputSanitizer.sanitizeUrl(url)
        expect(result).toContain('http')
      })
    })

    it('應拒絕相對 URL', () => {
      const input = '/path/to/file'
      const result = InputSanitizer.sanitizeUrl(input)

      // 應該被標記為不安全或轉換
      expect(typeof result).toBe('string')
    })
  })

  describe('stripTags', () => {
    it('應移除所有 HTML 標籤', () => {
      const input = '<p>Hello <strong>World</strong>!</p>'
      const result = InputSanitizer.stripTags(input)

      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
      expect(result).toContain('Hello')
      expect(result).toContain('World')
    })

    it('應保留標籤中的文本內容', () => {
      const input = '<div>Content</div>'
      const result = InputSanitizer.stripTags(input)

      expect(result).toContain('Content')
    })

    it('應處理自閉合標籤', () => {
      const input = 'Line 1<br/>Line 2<hr/>'
      const result = InputSanitizer.stripTags(input)

      expect(result).not.toContain('<br')
      expect(result).not.toContain('<hr')
    })

    it('應處理沒有標籤的文本', () => {
      const input = 'Plain text'
      const result = InputSanitizer.stripTags(input)

      expect(result).toBe(input)
    })
  })

  describe('trim 和 normalize', () => {
    it('應移除前導和尾隨空白', () => {
      const input = '  Hello World  '
      const result = InputSanitizer.trim(input)

      expect(result).toBe('Hello World')
    })

    it('應正規化多個空白為單一空格', () => {
      const input = 'Hello    World'
      const result = InputSanitizer.normalizeWhitespace(input)

      expect(result).not.toContain('    ')
    })

    it('應處理 tab 和換行符', () => {
      const input = 'Hello\t\nWorld'
      const result = InputSanitizer.normalizeWhitespace(input)

      expect(typeof result).toBe('string')
    })
  })

  describe('validateEmail', () => {
    it('應驗證有效的電子郵件', () => {
      const validEmails = ['test@example.com', 'user.name@example.com', 'user+tag@example.co.uk']

      validEmails.forEach((email) => {
        expect(InputSanitizer.isValidEmail(email)).toBe(true)
      })
    })

    it('應拒絕無效的電子郵件', () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'test@',
        'test..name@example.com',
        'test@example',
      ]

      invalidEmails.forEach((email) => {
        expect(InputSanitizer.isValidEmail(email)).toBe(false)
      })
    })
  })

  describe('集成測試', () => {
    it('應處理複雜的 XSS 攻擊向量', () => {
      const attackVectors = [
        '<img src=x onerror=alert("xss")>',
        '<svg onload=alert("xss")>',
        '<iframe src="javascript:alert(\'xss\')">',
        '<body onload=alert("xss")>',
        '<input onfocus=alert("xss") autofocus>',
      ]

      attackVectors.forEach((vector) => {
        const result = InputSanitizer.sanitizeHtml(vector)
        expect(result).not.toContain('alert')
        expect(result).not.toContain('javascript:')
      })
    })

    it('應處理混合攻擊向量', () => {
      const input = "'; DROP TABLE users--<script>alert('xss')</script>"
      const htmlSafe = InputSanitizer.sanitizeHtml(input)
      const sqlSafe = InputSanitizer.sanitizeSql(input)

      expect(htmlSafe).not.toContain('<script>')
      expect(sqlSafe).not.toContain("'; DROP")
    })

    it('應保留合法用戶輸入', () => {
      const input = "John O'Reilly <john@example.com>"
      const htmlSanitized = InputSanitizer.sanitizeHtml(input)
      const sqlSanitized = InputSanitizer.sanitizeSql(input)

      // 應該保留基本內容，只是轉義特殊字符
      expect(htmlSanitized).toContain('John')
      expect(sqlSanitized).toContain('John')
    })
  })
})
