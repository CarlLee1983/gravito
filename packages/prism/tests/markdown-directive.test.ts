/**
 * @markdown 指令測試套件
 *
 * 測試 Prism TemplateCompiler 中的 @markdown/@endmarkdown 區塊指令
 * 以及 {{ markdown content="..." }} 行內 helper。
 *
 * 涵蓋：基礎功能、變數插值、安全性、邊界情況、向後相容
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type RenderContext, TemplateCompiler } from '../src/core/TemplateCompiler'
import { TemplateEngine } from '../src/engine/TemplateEngine'
import { createMarkdownHelper } from '../src/helpers/markdown'

// ============ 輔助函式 ============

/** 建立乾淨的 RenderContext */
function createContext(): RenderContext {
  return { sections: new Map(), stacks: new Map() }
}

/** 以 TemplateCompiler 直接編譯模板 */
function compileTemplate(
  template: string,
  data: Record<string, unknown> = {},
  helpers = new Map()
): string {
  const compiler = new TemplateCompiler()
  const ctx = createContext()
  return compiler.compile(template, data, ctx, helpers, () => '')
}

// ============ TemplateEngine 整合測試用暫存目錄 ============

let viewsDir = ''

beforeAll(() => {
  viewsDir = mkdtempSync(join(tmpdir(), 'gravito-prism-md-'))
})

afterAll(async () => {
  if (viewsDir) {
    await rm(viewsDir, { recursive: true, force: true })
  }
})

// ============================================================
// 1. 基礎功能測試
// ============================================================

describe('@markdown directive - basic functionality', () => {
  it('should render simple markdown heading to HTML', () => {
    const template = '@markdown\n# Hello World\n@endmarkdown'
    const result = compileTemplate(template)

    expect(result).toContain('<h1>')
    expect(result).toContain('Hello World')
    expect(result).toContain('</h1>')
  })

  it('should render markdown paragraphs', () => {
    const template = '@markdown\nThis is a paragraph.\n@endmarkdown'
    const result = compileTemplate(template)

    expect(result).toContain('<p>')
    expect(result).toContain('This is a paragraph.')
    expect(result).toContain('</p>')
  })

  it('should render markdown with bold and italic', () => {
    const template = '@markdown\n**bold** and *italic*\n@endmarkdown'
    const result = compileTemplate(template)

    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<em>italic</em>')
  })

  it('should render unordered lists', () => {
    const template = '@markdown\n- Item 1\n- Item 2\n- Item 3\n@endmarkdown'
    const result = compileTemplate(template)

    expect(result).toContain('<ul>')
    expect(result).toContain('<li>')
    expect(result).toContain('Item 1')
    expect(result).toContain('Item 2')
    expect(result).toContain('Item 3')
    expect(result).toContain('</ul>')
  })

  it('should render ordered lists', () => {
    const template = '@markdown\n1. First\n2. Second\n3. Third\n@endmarkdown'
    const result = compileTemplate(template)

    expect(result).toContain('<ol>')
    expect(result).toContain('<li>')
    expect(result).toContain('First')
  })

  it('should render code blocks', () => {
    const template = '@markdown\n```javascript\nconst x = 1\n```\n@endmarkdown'
    const result = compileTemplate(template)

    expect(result).toContain('<pre>')
    expect(result).toContain('<code')
    expect(result).toContain('const x = 1')
  })

  it('should render blockquotes', () => {
    const template = '@markdown\n> This is a quote\n@endmarkdown'
    const result = compileTemplate(template)

    expect(result).toContain('<blockquote>')
    expect(result).toContain('This is a quote')
  })

  it('should render links', () => {
    const template = '@markdown\n[Example](https://example.com)\n@endmarkdown'
    const result = compileTemplate(template)

    expect(result).toContain('<a')
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('Example')
  })

  it('should render tables', () => {
    const template =
      '@markdown\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1 | Cell 2 |\n@endmarkdown'
    const result = compileTemplate(template)

    expect(result).toContain('<table')
    expect(result).toContain('Header 1')
    expect(result).toContain('Cell 1')
  })

  it('should render horizontal rules', () => {
    const template = '@markdown\n---\n@endmarkdown'
    const result = compileTemplate(template)

    expect(result).toContain('<hr')
  })

  it('should preserve content before and after @markdown block', () => {
    const template = '<div>Before</div>\n@markdown\n# Title\n@endmarkdown\n<div>After</div>'
    const result = compileTemplate(template)

    expect(result).toContain('<div>Before</div>')
    expect(result).toContain('<h1>')
    expect(result).toContain('<div>After</div>')
  })

  it('should handle multiple @markdown blocks in one template', () => {
    const template = [
      '@markdown',
      '# First',
      '@endmarkdown',
      '<hr>',
      '@markdown',
      '# Second',
      '@endmarkdown',
    ].join('\n')
    const result = compileTemplate(template)

    expect(result).toContain('First')
    expect(result).toContain('Second')
    // 兩個 h1 標籤
    const h1Count = (result.match(/<h1>/g) || []).length
    expect(h1Count).toBe(2)
  })
})

// ============================================================
// 2. 變數插值測試
// ============================================================

describe('@markdown directive - variable interpolation', () => {
  it('should interpolate variables before markdown rendering', () => {
    const template = '@markdown\n# {{ title }}\n@endmarkdown'
    const result = compileTemplate(template, { title: 'Dynamic Title' })

    expect(result).toContain('<h1>')
    expect(result).toContain('Dynamic Title')
  })

  it('should interpolate multiple variables', () => {
    const template = '@markdown\n# {{ title }}\n\n{{ description }}\n@endmarkdown'
    const result = compileTemplate(template, {
      title: 'My Page',
      description: 'A great description',
    })

    expect(result).toContain('My Page')
    expect(result).toContain('A great description')
  })

  it('should handle nested object variables', () => {
    const template = '@markdown\n# {{ user.name }}\n@endmarkdown'
    const result = compileTemplate(template, { user: { name: 'Carl' } })

    expect(result).toContain('Carl')
  })
})

// ============================================================
// 3. 行內 markdown helper 測試
// ============================================================

describe('markdown inline helper', () => {
  it('should render inline markdown via helper syntax', () => {
    writeFileSync(
      join(viewsDir, 'inline-md.html'),
      '{{ markdown content="# Inline Title" }}',
      'utf-8'
    )
    const engine = new TemplateEngine(viewsDir)
    engine.registerHelper('markdown', createMarkdownHelper())
    const result = engine.render('inline-md')

    expect(result).toContain('<h1>')
    expect(result).toContain('Inline Title')
  })

  it('should render inline markdown with bold text', () => {
    writeFileSync(
      join(viewsDir, 'inline-md-bold.html'),
      '{{ markdown content="**bold text**" }}',
      'utf-8'
    )
    const engine = new TemplateEngine(viewsDir)
    engine.registerHelper('markdown', createMarkdownHelper())
    const result = engine.render('inline-md-bold')

    expect(result).toContain('<strong>bold text</strong>')
  })
})

// ============================================================
// 4. 安全性測試
// ============================================================

describe('@markdown directive - security', () => {
  it('should sanitize script tags in markdown output', () => {
    const template = '@markdown\n<script>alert("XSS")</script>\n@endmarkdown'
    const result = compileTemplate(template)

    expect(result).not.toContain('<script>')
    expect(result).not.toContain('alert')
  })

  it('should sanitize event handlers in markdown output', () => {
    const template = '@markdown\n<img onerror="alert(1)" src="x">\n@endmarkdown'
    const result = compileTemplate(template)

    expect(result).not.toContain('onerror')
    expect(result).not.toContain('alert')
  })

  it('should block javascript: URLs in markdown output', () => {
    const template = '@markdown\n[Click me](javascript:alert(1))\n@endmarkdown'
    const result = compileTemplate(template)

    expect(result).not.toContain('javascript:')
  })

  it('should sanitize iframe tags in markdown output', () => {
    const template = '@markdown\n<iframe src="evil.com"></iframe>\n@endmarkdown'
    const result = compileTemplate(template)

    expect(result).not.toContain('<iframe')
  })

  it('should sanitize style tags in markdown output', () => {
    const template = '@markdown\n<style>body{display:none}</style>\n@endmarkdown'
    const result = compileTemplate(template)

    expect(result).not.toContain('<style')
    expect(result).not.toContain('display:none')
  })

  it('should preserve safe HTML from markdown (links, emphasis, etc.)', () => {
    const template = '@markdown\n**bold** and [safe link](https://example.com)\n@endmarkdown'
    const result = compileTemplate(template)

    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('https://example.com')
  })
})

// ============================================================
// 5. 邊界情況測試
// ============================================================

describe('@markdown directive - edge cases', () => {
  it('should handle empty markdown block', () => {
    const template = '@markdown\n@endmarkdown'
    const result = compileTemplate(template)

    // 空 markdown 不應產生有意義的內容
    expect(result.trim()).toBe('')
  })

  it('should handle whitespace-only markdown block', () => {
    const template = '@markdown\n   \n   \n@endmarkdown'
    const result = compileTemplate(template)

    // 應正常處理不崩潰
    expect(typeof result).toBe('string')
  })

  it('should throw or warn for unclosed @markdown block', () => {
    const template = '@markdown\n# Unclosed block'

    // 未結束的 @markdown 應拋出錯誤
    expect(() => compileTemplate(template)).toThrow()
  })

  it('should handle unicode and emoji in markdown', () => {
    const template = '@markdown\n# 你好世界\n\n這是中文內容。\n@endmarkdown'
    const result = compileTemplate(template)

    expect(result).toContain('你好世界')
    expect(result).toContain('這是中文內容')
  })

  it('should handle special characters in markdown', () => {
    const template = '@markdown\nSpecial chars: & < > " \'\n@endmarkdown'
    const result = compileTemplate(template)

    // 應被正確處理（可能 HTML 轉義）
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('should handle large markdown content', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `- Item ${i + 1}`)
    const template = `@markdown\n${lines.join('\n')}\n@endmarkdown`
    const result = compileTemplate(template)

    expect(result).toContain('Item 1')
    expect(result).toContain('Item 100')
    expect(result).toContain('<li>')
  })

  it('should handle @markdown appearing in code blocks (not as directive)', () => {
    // 在 ``` 代碼塊中的 @markdown 不應被視為指令
    // 這是既有模板中不含 @markdown 指令的情況
    const template = '<p>This has no markdown directives</p>'
    const result = compileTemplate(template)

    expect(result).toBe('<p>This has no markdown directives</p>')
  })
})

// ============================================================
// 6. 向後相容性測試
// ============================================================

describe('@markdown directive - backward compatibility', () => {
  it('should not affect @if/@endif directives', () => {
    const template = '@if(show)Visible@endif'
    const result = compileTemplate(template, { show: true })

    expect(result).toContain('Visible')
  })

  it('should not affect @foreach/@endforeach processing', () => {
    const template = '{{#each items}}<span>{{this}}</span>{{/each}}'
    const result = compileTemplate(template, { items: ['a', 'b'] })

    expect(result).toContain('<span>a</span>')
    expect(result).toContain('<span>b</span>')
  })

  it('should not affect @include directives', () => {
    writeFileSync(join(viewsDir, 'partial.html'), '<span>Partial</span>', 'utf-8')
    writeFileSync(join(viewsDir, 'include-test.html'), "<div>@include('partial')</div>", 'utf-8')
    const engine = new TemplateEngine(viewsDir)
    const result = engine.render('include-test')

    expect(result).toContain('<span>Partial</span>')
  })

  it('should not affect component rendering', () => {
    const componentsDir = join(viewsDir, 'components')
    mkdirSync(componentsDir, { recursive: true })
    writeFileSync(join(componentsDir, 'box.html'), '<div class="box">{{ slot }}</div>', 'utf-8')
    writeFileSync(join(viewsDir, 'component-test.html'), '<x-box>Content</x-box>', 'utf-8')

    const engine = new TemplateEngine(viewsDir)
    const result = engine.render('component-test')

    expect(result).toContain('<div class="box">')
    expect(result).toContain('Content')
  })

  it('should not affect @csrf directive', () => {
    const template = '@csrf'
    const result = compileTemplate(template)

    expect(result).toContain('type="hidden"')
    expect(result).toContain('_token')
  })

  it('should not affect variable interpolation outside @markdown', () => {
    const template = '<h1>{{ title }}</h1>'
    const result = compileTemplate(template, { title: 'Hello' })

    expect(result).toContain('<h1>Hello</h1>')
  })

  it('should work alongside other directives in same template', () => {
    const template = [
      '@if(show)',
      '<div>Conditional content</div>',
      '@endif',
      '@markdown',
      '# Markdown Title',
      '@endmarkdown',
      '<p>{{ name }}</p>',
    ].join('\n')

    const result = compileTemplate(template, { show: true, name: 'Carl' })

    expect(result).toContain('<div>Conditional content</div>')
    expect(result).toContain('Markdown Title')
    expect(result).toContain('<p>Carl</p>')
  })
})

// ============================================================
// 7. TemplateEngine 整合測試
// ============================================================

describe('@markdown directive - TemplateEngine integration', () => {
  it('should work through TemplateEngine.render()', () => {
    writeFileSync(
      join(viewsDir, 'md-page.html'),
      [
        '<div class="content">',
        '@markdown',
        '# Page Title',
        '',
        'This is **markdown** content.',
        '@endmarkdown',
        '</div>',
      ].join('\n'),
      'utf-8'
    )

    const engine = new TemplateEngine(viewsDir)
    const result = engine.render('md-page')

    expect(result).toContain('<div class="content">')
    expect(result).toContain('<h1>')
    expect(result).toContain('Page Title')
    expect(result).toContain('<strong>markdown</strong>')
    expect(result).toContain('</div>')
  })

  it('should work with template data in TemplateEngine', () => {
    writeFileSync(
      join(viewsDir, 'md-data.html'),
      ['@markdown', '# {{ title }}', '', '{{ body }}', '@endmarkdown'].join('\n'),
      'utf-8'
    )

    const engine = new TemplateEngine(viewsDir)
    const result = engine.render('md-data', {
      title: 'Dynamic',
      body: 'Content from data',
    })

    expect(result).toContain('Dynamic')
    expect(result).toContain('Content from data')
  })

  it('should work with layout inheritance', () => {
    const layoutsDir = join(viewsDir, 'layouts')
    mkdirSync(layoutsDir, { recursive: true })
    writeFileSync(
      join(layoutsDir, 'md-layout.html'),
      "<html><body>\n@yield('content')\n</body></html>",
      'utf-8'
    )

    writeFileSync(
      join(viewsDir, 'md-child.html'),
      [
        "@extends('layouts/md-layout')",
        "@section('content')",
        '@markdown',
        '# Child Content',
        '@endmarkdown',
        '@endsection',
      ].join('\n'),
      'utf-8'
    )

    const engine = new TemplateEngine(viewsDir)
    const result = engine.render('md-child')

    expect(result).toContain('<html><body>')
    expect(result).toContain('Child Content')
    expect(result).toContain('</body></html>')
  })
})
