import { describe, expect, it } from 'bun:test'
import {
  getMarkdownAdapter,
  type MarkdownRenderCallbacks,
  type RuntimeMarkdownAdapter,
} from '../src/runtime'

// ============ 測試輔助 ============

const getAdapter = (): RuntimeMarkdownAdapter => getMarkdownAdapter()

/**
 * 判斷 Bun.markdown 是否可用
 */
const hasBunMarkdown =
  typeof Bun !== 'undefined' &&
  typeof Bun.markdown === 'object' &&
  typeof Bun.markdown.html === 'function'

// ============ 測試群組 ============

describe('getMarkdownAdapter', () => {
  it('應回傳 RuntimeMarkdownAdapter 物件', () => {
    const adapter = getAdapter()
    expect(adapter).toBeDefined()
    expect(typeof adapter.html).toBe('function')
    expect(typeof adapter.render).toBe('function')
    expect(typeof adapter.react).toBe('function')
    expect(typeof adapter.isNative).toBe('boolean')
  })

  it('應快取並回傳相同的 adapter 實例', () => {
    const adapter1 = getAdapter()
    const adapter2 = getAdapter()
    expect(adapter1).toBe(adapter2)
  })
})

// ============ html() 方法測試 ============

describe('RuntimeMarkdownAdapter - html()', () => {
  it('應將基本 Markdown 轉換為 HTML', () => {
    const adapter = getAdapter()
    const result = adapter.html('# Hello')
    expect(result).toContain('<h1>')
    expect(result).toContain('Hello')
    expect(result).toContain('</h1>')
  })

  it('應處理粗體和斜體', () => {
    const adapter = getAdapter()
    const result = adapter.html('**bold** and *italic*')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<em>italic</em>')
  })

  it('應處理無序列表', () => {
    const adapter = getAdapter()
    const result = adapter.html('- item 1\n- item 2')
    expect(result).toContain('<ul>')
    expect(result).toContain('<li>')
    expect(result).toContain('item 1')
    expect(result).toContain('item 2')
  })

  it('應處理程式碼區塊', () => {
    const adapter = getAdapter()
    const result = adapter.html('```js\nconsole.log(1)\n```')
    expect(result).toContain('<pre>')
    expect(result).toContain('<code')
    expect(result).toContain('console.log(1)')
  })

  it('應處理行內程式碼', () => {
    const adapter = getAdapter()
    const result = adapter.html('Use `const x = 1` here')
    expect(result).toContain('<code>')
    expect(result).toContain('const x = 1')
  })

  it('應處理連結', () => {
    const adapter = getAdapter()
    const result = adapter.html('[Gravito](https://gravito.dev)')
    expect(result).toContain('<a')
    expect(result).toContain('href="https://gravito.dev"')
    expect(result).toContain('Gravito')
  })

  it('應處理圖片', () => {
    const adapter = getAdapter()
    const result = adapter.html('![alt text](https://img.png)')
    expect(result).toContain('<img')
    expect(result).toContain('src="https://img.png"')
    expect(result).toContain('alt="alt text"')
  })

  it('應處理引用區塊', () => {
    const adapter = getAdapter()
    const result = adapter.html('> This is a quote')
    expect(result).toContain('<blockquote>')
    expect(result).toContain('This is a quote')
  })

  it('應處理水平線', () => {
    const adapter = getAdapter()
    const result = adapter.html('---')
    expect(result).toContain('<hr')
  })

  it('應處理多級標題', () => {
    const adapter = getAdapter()
    const result = adapter.html('# H1\n## H2\n### H3')
    expect(result).toContain('<h1>')
    expect(result).toContain('<h2>')
    expect(result).toContain('<h3>')
  })
})

// ============ GFM 擴展測試 ============

describe('RuntimeMarkdownAdapter - GFM 擴展', () => {
  it('應支援 GFM 表格', () => {
    const adapter = getAdapter()
    const result = adapter.html('| A | B |\n|---|---|\n| 1 | 2 |')
    expect(result).toContain('<table>')
    expect(result).toContain('<th>')
    expect(result).toContain('<td>')
  })

  it('應支援 GFM 刪除線', () => {
    const adapter = getAdapter()
    const result = adapter.html('~~deleted~~')
    expect(result).toContain('<del>')
    expect(result).toContain('deleted')
  })

  it('應支援 GFM 任務列表', () => {
    const adapter = getAdapter()
    const result = adapter.html('- [x] done\n- [ ] todo')
    expect(result).toContain('done')
    expect(result).toContain('todo')
    // 至少有 checkbox 相關標記
    expect(result).toContain('checkbox')
  })
})

// ============ render() 方法測試 ============

describe('RuntimeMarkdownAdapter - render()', () => {
  it('應回傳純文字內容（無 HTML 標籤）', () => {
    const adapter = getAdapter()
    const result = adapter.render('# Hello **bold**')
    // render() 在 Bun 環境回傳純文字
    expect(typeof result).toBe('string')
    expect(result).toContain('Hello')
  })

  it('應支援自訂 heading 回調', () => {
    const adapter = getAdapter()
    const callbacks: MarkdownRenderCallbacks = {
      heading: (content: string, opts: { level: number }) => {
        return `<h${opts.level} class="custom">${content}</h${opts.level}>`
      },
    }
    const result = adapter.render('# Custom Title', callbacks)
    expect(result).toContain('class="custom"')
    expect(result).toContain('Custom Title')
  })

  it('應支援自訂 link 回調', () => {
    const adapter = getAdapter()
    const callbacks: MarkdownRenderCallbacks = {
      link: (content: string, opts: { href: string; title?: string }) => {
        return `<a href="${opts.href}" rel="noopener">${content}</a>`
      },
    }
    const result = adapter.render('[click](https://example.com)', callbacks)
    expect(result).toContain('rel="noopener"')
    expect(result).toContain('click')
  })

  it('應支援自訂 code 回調', () => {
    const adapter = getAdapter()
    const callbacks: MarkdownRenderCallbacks = {
      code: (code: string, opts: { language?: string }) => {
        const lang = opts.language ?? 'text'
        return `<pre data-lang="${lang}"><code>${code}</code></pre>`
      },
    }
    const result = adapter.render('```ts\nconst x = 1\n```', callbacks)
    expect(result).toContain('data-lang="ts"')
    expect(result).toContain('const x = 1')
  })

  it('應支援自訂 html 回調（XSS 防護）', () => {
    const adapter = getAdapter()
    const callbacks: MarkdownRenderCallbacks = {
      html: (rawHtml: string) => {
        // 過濾所有原始 HTML
        return rawHtml.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      },
    }
    const result = adapter.render('<script>alert(1)</script>', callbacks)
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;script&gt;')
  })

  it('應支援自訂 image 回調', () => {
    const adapter = getAdapter()
    const callbacks: MarkdownRenderCallbacks = {
      image: (alt: string, opts: { src: string; title?: string }) => {
        return `<img src="${opts.src}" alt="${alt}" loading="lazy" />`
      },
    }
    const result = adapter.render('![logo](https://img.png)', callbacks)
    expect(result).toContain('loading="lazy"')
  })
})

// ============ react() 方法測試 ============

describe('RuntimeMarkdownAdapter - react()', () => {
  it('應回傳物件或 null', () => {
    const adapter = getAdapter()
    const result = adapter.react('# Hello')
    // react() 應回傳 React 元素結構或 null（非 Bun 環境）
    if (hasBunMarkdown) {
      expect(result).not.toBeNull()
      expect(typeof result).toBe('object')
    } else {
      expect(result).toBeNull()
    }
  })

  it('React 元素結構應包含 props', () => {
    if (!hasBunMarkdown) {
      return // 非 Bun 環境跳過
    }
    const adapter = getAdapter()
    const result = adapter.react('# Hello')
    expect(result).not.toBeNull()
    // React 元素有 props 屬性
    const element = result as Record<string, unknown>
    expect(element).toHaveProperty('props')
  })
})

// ============ isNative 屬性測試 ============

describe('RuntimeMarkdownAdapter - isNative', () => {
  it('在 Bun 環境中 isNative 應為 true', () => {
    if (!hasBunMarkdown) {
      return
    }
    const adapter = getAdapter()
    expect(adapter.isNative).toBe(true)
  })

  it('isNative 屬性應為唯讀布林值', () => {
    const adapter = getAdapter()
    expect(typeof adapter.isNative).toBe('boolean')
  })
})

// ============ 邊界情況測試 ============

describe('RuntimeMarkdownAdapter - 邊界情況', () => {
  it('空字串應回傳空字串', () => {
    const adapter = getAdapter()
    const result = adapter.html('')
    expect(result).toBe('')
  })

  it('render 空字串應回傳空字串', () => {
    const adapter = getAdapter()
    const result = adapter.render('')
    expect(result).toBe('')
  })

  it('純文字無 Markdown 語法應包在 <p> 標籤中', () => {
    const adapter = getAdapter()
    const result = adapter.html('just plain text')
    expect(result).toContain('just plain text')
    expect(result).toContain('<p>')
  })

  it('應處理 Unicode 字元', () => {
    const adapter = getAdapter()
    const result = adapter.html('# 你好世界')
    expect(result).toContain('你好世界')
    expect(result).toContain('<h1>')
  })

  it('應處理特殊 Markdown 字元的轉義', () => {
    const adapter = getAdapter()
    const result = adapter.html('\\*not bold\\*')
    // 轉義後不應出現 <strong>
    expect(result).not.toContain('<strong>')
    expect(result).not.toContain('<em>')
  })

  it('應處理多行內容', () => {
    const adapter = getAdapter()
    const input = ['# Title', '', 'Paragraph one.', '', 'Paragraph two.', '', '- List item'].join(
      '\n'
    )
    const result = adapter.html(input)
    expect(result).toContain('<h1>')
    expect(result).toContain('Paragraph one')
    expect(result).toContain('Paragraph two')
    expect(result).toContain('<li>')
  })

  it('XSS payload 在 html() 中不做自動過濾（原始行為）', () => {
    const adapter = getAdapter()
    const result = adapter.html('<script>alert(1)</script>')
    // Bun.markdown.html() 不做 XSS 過濾 -- 這是預期行為
    // 使用者應透過 render() + html 回調來自訂過濾
    expect(typeof result).toBe('string')
  })

  it('react() 空字串應回傳 null 或空結構', () => {
    const adapter = getAdapter()
    const result = adapter.react('')
    // 根據環境可能不同，但不應拋出錯誤
    if (result !== null) {
      expect(typeof result).toBe('object')
    }
  })
})
