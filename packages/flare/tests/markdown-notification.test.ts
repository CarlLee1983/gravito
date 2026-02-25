import { describe, expect, it, mock } from 'bun:test'
import { TemplatedNotification } from '../src/templates/NotificationTemplate'
import type { Notifiable } from '../src/types'

// ============ Mock @gravito/core markdown adapter ============

const mockHtml = mock((markdown: string) => {
  // 簡單的 HTML 渲染模擬
  if (!markdown) {
    return ''
  }
  return markdown
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" />')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
})

// biome-ignore lint/suspicious/noExplicitAny: test mock 需要動態存取 callbacks 屬性
const mockRender = mock((markdown: string, callbacks?: any) => {
  if (!markdown) {
    return ''
  }
  // 模擬 Bun.markdown.render 的行為：
  // 遇到原始 HTML 時呼叫 callbacks.html() 進行過濾
  let result = markdown

  // 先處理原始 HTML 區塊（呼叫 callbacks.html）
  if (callbacks?.html) {
    result = result.replace(/<[^>]+>[^<]*<\/[^>]+>/g, (match) => callbacks.html(match))
    result = result.replace(/<[^>]+\/?>/g, (match) => callbacks.html(match))
  }

  // 再做 Markdown -> HTML 轉換
  result = result
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" />')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/`(.+?)`/g, '<code>$1</code>')

  return result
})

mock.module('@gravito/core', () => ({
  getMarkdownAdapter: () => ({
    html: mockHtml,
    render: mockRender,
    react: () => null,
    isNative: true,
  }),
  createHtmlRenderCallbacks: (overrides: Record<string, unknown> = {}) => ({
    html: (raw: string) => raw,
    ...overrides,
  }),
}))

// ============ Test Helpers ============

const notifiable: Notifiable & { email: string } = {
  getNotifiableId: () => '1',
  email: 'test@example.com',
}

/**
 * 測試用的具體 TemplatedNotification 子類。
 * 暴露 renderMarkdown() 以便測試。
 */
class TestNotification extends TemplatedNotification {
  private template: string

  constructor(template = '# Hello') {
    super()
    this.template = template
  }

  via() {
    return ['mail']
  }

  protected mailTemplate() {
    return {
      subject: 'Test',
      view: 'emails.test',
    }
  }

  /**
   * 公開 renderMarkdown 供測試使用
   */
  public testRenderMarkdown(template?: string): string {
    return this.renderMarkdown(template ?? this.template)
  }
}

// ============ Tests ============

describe('TemplatedNotification.renderMarkdown()', () => {
  // -------- 基礎功能 --------

  describe('基礎功能', () => {
    it('renderMarkdown() 方法存在', () => {
      const notification = new TestNotification()
      expect(typeof notification.testRenderMarkdown).toBe('function')
    })

    it('渲染簡單 Markdown 標題', () => {
      const notification = new TestNotification('# Welcome')
      const result = notification.testRenderMarkdown()

      expect(result).toContain('<h1>')
      expect(result).toContain('Welcome')
    })

    it('渲染粗體文字', () => {
      const notification = new TestNotification('Hello **world**')
      const result = notification.testRenderMarkdown()

      expect(result).toContain('<strong>world</strong>')
    })

    it('渲染斜體文字', () => {
      const notification = new TestNotification('Hello *world*')
      const result = notification.testRenderMarkdown()

      expect(result).toContain('<em>world</em>')
    })

    it('渲染連結', () => {
      const notification = new TestNotification('[Docs](https://docs.example.com)')
      const result = notification.testRenderMarkdown()

      expect(result).toContain('<a href="https://docs.example.com">')
      expect(result).toContain('Docs')
    })

    it('渲染多行內容（段落、列表、程式碼）', () => {
      const template = [
        '# Title',
        '',
        'Paragraph text with **bold**.',
        '',
        '- Item 1',
        '- Item 2',
        '',
        '`inline code`',
      ].join('\n')

      const notification = new TestNotification(template)
      const result = notification.testRenderMarkdown()

      expect(result).toContain('<h1>')
      expect(result).toContain('<strong>bold</strong>')
      expect(result).toContain('<li>')
      expect(result).toContain('<code>inline code</code>')
    })
  })

  // -------- 變數插值 + Markdown --------

  describe('變數插值與 Markdown 整合', () => {
    it('在 Markdown 渲染前執行變數插值', () => {
      const notification = new TestNotification('# Welcome, {{name}}!').with({ name: 'Alice' })

      const result = notification.testRenderMarkdown()

      expect(result).toContain('Alice')
      expect(result).not.toContain('{{name}}')
    })

    it('多個變數同時插值', () => {
      const template = '# Hello {{name}}\n\nYour role: **{{role}}**'
      const notification = new TestNotification(template).with({ name: 'Bob', role: 'admin' })

      const result = notification.testRenderMarkdown()

      expect(result).toContain('Bob')
      expect(result).toContain('<strong>admin</strong>')
    })

    it('缺少的變數保留原始模板標記', () => {
      const notification = new TestNotification('Hello {{name}}')

      const result = notification.testRenderMarkdown()

      expect(result).toContain('{{name}}')
    })
  })

  // -------- 安全性 --------

  describe('安全性', () => {
    it('XSS script 標籤被過濾', () => {
      const template = '# Title\n\n<script>alert("xss")</script>'
      const notification = new TestNotification(template)
      const result = notification.testRenderMarkdown()

      expect(result).not.toContain('<script>')
      expect(result).not.toContain('</script>')
    })

    it('HTML event handler 被過濾', () => {
      const template = '<img onerror="alert(1)" src="x">'
      const notification = new TestNotification(template)
      const result = notification.testRenderMarkdown()

      expect(result).not.toContain('onerror')
    })

    it('iframe 標籤被過濾', () => {
      const template = '<iframe src="https://evil.com"></iframe>'
      const notification = new TestNotification(template)
      const result = notification.testRenderMarkdown()

      expect(result).not.toContain('<iframe')
    })
  })

  // -------- 邊界情況 --------

  describe('邊界情況', () => {
    it('空 template 回傳空字串', () => {
      const notification = new TestNotification('')
      const result = notification.testRenderMarkdown()

      expect(result).toBe('')
    })

    it('純文字 template（無 Markdown 語法）', () => {
      const notification = new TestNotification('Hello world plain text')
      const result = notification.testRenderMarkdown()

      expect(result).toContain('Hello world plain text')
    })

    it('中文與 Unicode 內容', () => {
      const template = '# 歡迎\n\n你好 **世界**'
      const notification = new TestNotification(template)
      const result = notification.testRenderMarkdown()

      expect(result).toContain('歡迎')
      expect(result).toContain('<strong>世界</strong>')
    })

    it('傳入自訂 template 覆蓋預設', () => {
      const notification = new TestNotification('# Default')
      const result = notification.testRenderMarkdown('# Custom')

      expect(result).toContain('Custom')
      expect(result).not.toContain('Default')
    })
  })

  // -------- 向後相容 --------

  describe('向後相容', () => {
    it('既有 toMail() 不受 renderMarkdown 影響', () => {
      const notification = new TestNotification().with({ name: 'Carl' })

      const mail = notification.toMail(notifiable)

      expect(mail.subject).toBe('Test')
      expect(mail.to).toBe('test@example.com')
    })

    it('既有 interpolate 行為（透過 toMail）不變', () => {
      class WelcomeNotification extends TemplatedNotification {
        via() {
          return ['mail']
        }

        protected mailTemplate() {
          return {
            subject: 'Welcome, {{name}}!',
            view: 'emails.welcome',
            data: { role: 'user' },
          }
        }
      }

      const notification = new WelcomeNotification().with({ name: 'John' })
      const mail = notification.toMail(notifiable)

      expect(mail.subject).toBe('Welcome, John!')
      expect(mail.to).toBe('test@example.com')
    })

    it('未使用 renderMarkdown 的通知完全不受影響', () => {
      class SimpleNotification extends TemplatedNotification {
        via() {
          return ['mail']
        }

        protected mailTemplate() {
          return {
            subject: 'Simple {{item}}',
            view: 'simple',
          }
        }
      }

      const notification = new SimpleNotification().with({ item: 'test' })
      const mail = notification.toMail(notifiable)

      expect(mail.subject).toBe('Simple test')
    })

    it('renderMarkdown 和 toMail 可在同一通知中獨立使用', () => {
      class RichNotification extends TestNotification {
        constructor() {
          super('# Hello {{name}}')
        }

        protected override mailTemplate() {
          return {
            subject: 'Hello {{name}}!',
            view: 'rich',
          }
        }

        getHtmlBody(): string {
          return this.testRenderMarkdown()
        }
      }

      const notification = new RichNotification().with({ name: 'Alice' }) as RichNotification
      const mail = notification.toMail(notifiable)
      const htmlBody = notification.getHtmlBody()

      expect(mail.subject).toBe('Hello Alice!')
      expect(htmlBody).toContain('Alice')
      expect(htmlBody).toContain('<h1>')
    })
  })

  // -------- 整合測試 --------

  describe('整合：完整通知場景', () => {
    it('WelcomeNotification 場景 -- Markdown 郵件', () => {
      class WelcomeNotification extends TestNotification {
        constructor(name: string) {
          super(
            [
              '# Welcome {{name}}!',
              '',
              'Thanks for signing up. Here is your **quick start** guide:',
              '',
              '1. Complete your profile',
              '2. Set up 2FA',
              '3. Browse documentation',
              '',
              '[View Docs](https://docs.example.com)',
            ].join('\n')
          )
          this.with({ name })
        }

        getHtmlBody(): string {
          return this.testRenderMarkdown()
        }
      }

      const notification = new WelcomeNotification('Carl')
      const html = notification.getHtmlBody()

      expect(html).toContain('Carl')
      expect(html).toContain('<strong>quick start</strong>')
      expect(html).toContain('<a href="https://docs.example.com">')
      expect(html).not.toContain('{{name}}')
    })

    it('多個通知實例各自獨立不互相影響', () => {
      const n1 = new TestNotification('# Hello {{name}}').with({ name: 'Alice' })
      const n2 = new TestNotification('# Goodbye {{name}}').with({ name: 'Bob' })

      const r1 = n1.testRenderMarkdown()
      const r2 = n2.testRenderMarkdown()

      expect(r1).toContain('Alice')
      expect(r1).not.toContain('Bob')
      expect(r2).toContain('Bob')
      expect(r2).not.toContain('Alice')
    })
  })
})
