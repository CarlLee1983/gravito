/**
 * Runtime markdown adapter implementations.
 *
 * Provides unified Markdown -> HTML rendering across Bun and Node.js runtimes.
 * Bun uses the native C++ Markdown parser (Bun.markdown) for 10-100x better performance.
 * Node.js falls back to the `marked` library (lazy-loaded optional dependency).
 *
 * @module runtime/markdown
 * @since 3.3.0
 */

import { getRuntimeKind } from './detection'
import type {
  MarkdownRenderCallbacks,
  MarkdownRenderOptions,
  RuntimeMarkdownAdapter,
} from './types'

// ============ Default HTML Render Callbacks ============

/**
 * 建立預設的 HTML 渲染回調集合。
 *
 * 提供完整的 HTML 元素生成回調，產生與 `html()` 相同的 HTML 輸出。
 * 使用者可透過覆寫個別回調來自訂特定元素的渲染行為（例如 XSS 防護、
 * 自訂 CSS class 等），同時保留其他元素的預設 HTML 渲染。
 *
 * @param overrides - 要覆寫的回調。未指定的回調使用預設 HTML 渲染。
 * @returns 完整的 MarkdownRenderCallbacks 物件
 *
 * @example
 * ```typescript
 * // 自訂 link 和 html 渲染（XSS 防護）
 * const callbacks = createHtmlRenderCallbacks({
 *   html: (raw) => escapeHtml(raw),
 *   link: (content, { href }) => `<a href="${href}" rel="noopener">${content}</a>`,
 * })
 * const result = adapter.render(markdown, callbacks)
 * ```
 *
 * @public
 */
export function createHtmlRenderCallbacks(
  overrides: Partial<MarkdownRenderCallbacks> = {}
): MarkdownRenderCallbacks {
  const defaults: MarkdownRenderCallbacks = {
    heading: (content, opts) => `<h${opts.level}>${content}</h${opts.level}>\n`,
    paragraph: (content) => `<p>${content}</p>\n`,
    code: (code, opts) => {
      const lang = opts.language ? ` class="language-${opts.language}"` : ''
      return `<pre><code${lang}>${code}</code></pre>\n`
    },
    codespan: (code) => `<code>${code}</code>`,
    strong: (content) => `<strong>${content}</strong>`,
    em: (content) => `<em>${content}</em>`,
    del: (content) => `<del>${content}</del>`,
    link: (content, opts) => {
      const titleAttr = opts.title ? ` title="${opts.title}"` : ''
      return `<a href="${opts.href}"${titleAttr}>${content}</a>`
    },
    image: (alt, opts) => {
      const titleAttr = opts.title ? ` title="${opts.title}"` : ''
      return `<img src="${opts.src}" alt="${alt}"${titleAttr} />`
    },
    list: (content, opts) => {
      if (opts.ordered) {
        const start = opts.start && opts.start !== 1 ? ` start="${opts.start}"` : ''
        return `<ol${start}>\n${content}</ol>\n`
      }
      return `<ul>\n${content}</ul>\n`
    },
    listItem: (content) => `<li>${content}</li>\n`,
    blockquote: (content) => `<blockquote>\n${content}</blockquote>\n`,
    table: (content) => `<table>\n${content}</table>\n`,
    hr: () => '<hr />\n',
    html: (rawHtml) => rawHtml,
  }

  return { ...defaults, ...overrides }
}

// ============ Callback Adapter ============

/**
 * 將 MarkdownRenderCallbacks 轉換為 Bun.markdown.render 的 RenderCallbacks 格式。
 *
 * 我們的介面設計與 Bun 原生回調高度相似但有微小差異（如 code 的 meta 參數可選性），
 * 此函式負責建立轉接層以確保型別安全。
 *
 * @internal
 */
function toBunRenderCallbacks(
  callbacks: MarkdownRenderCallbacks
): Record<string, (...args: unknown[]) => string | null | undefined> {
  const result: Record<string, (...args: unknown[]) => string | null | undefined> = {}

  if (callbacks.heading) {
    const cb = callbacks.heading
    result.heading = (children: unknown, meta: unknown) => {
      const m = meta as { level: number }
      return cb(children as string, { level: m.level })
    }
  }

  if (callbacks.link) {
    const cb = callbacks.link
    result.link = (children: unknown, meta: unknown) => {
      const m = meta as { href: string; title?: string }
      return cb(children as string, { href: m.href, title: m.title })
    }
  }

  if (callbacks.code) {
    const cb = callbacks.code
    result.code = (children: unknown, meta?: unknown) => {
      const m = (meta as { language?: string } | undefined) ?? {}
      return cb(children as string, { language: m.language })
    }
  }

  if (callbacks.codespan) {
    const cb = callbacks.codespan
    result.codespan = (children: unknown) => cb(children as string)
  }

  if (callbacks.image) {
    const cb = callbacks.image
    result.image = (alt: unknown, meta: unknown) => {
      const m = meta as { src: string; title?: string }
      return cb(alt as string, { src: m.src, title: m.title })
    }
  }

  if (callbacks.html) {
    const cb = callbacks.html
    result.html = (rawHtml: unknown) => cb(rawHtml as string)
  }

  if (callbacks.paragraph) {
    const cb = callbacks.paragraph
    result.paragraph = (children: unknown) => cb(children as string)
  }

  if (callbacks.strong) {
    const cb = callbacks.strong
    result.strong = (children: unknown) => cb(children as string)
  }

  if (callbacks.em) {
    const cb = callbacks.em
    result.em = (children: unknown) => cb(children as string)
  }

  if (callbacks.del) {
    const cb = callbacks.del
    result.del = (children: unknown) => cb(children as string)
  }

  if (callbacks.list) {
    const cb = callbacks.list
    result.list = (children: unknown, meta: unknown) => {
      const m = meta as { ordered: boolean; start?: number }
      return cb(children as string, { ordered: m.ordered, start: m.start })
    }
  }

  if (callbacks.listItem) {
    const cb = callbacks.listItem
    result.listItem = (children: unknown) => cb(children as string)
  }

  if (callbacks.blockquote) {
    const cb = callbacks.blockquote
    result.blockquote = (children: unknown) => cb(children as string)
  }

  if (callbacks.table) {
    const cb = callbacks.table
    result.table = (children: unknown) => cb(children as string)
  }

  if (callbacks.hr) {
    const cb = callbacks.hr
    result.hr = () => cb()
  }

  return result
}

// ============ Bun Markdown Adapter ============

/**
 * 建立 Bun 原生 Markdown adapter（使用 Bun.markdown API）
 * @internal
 */
function createBunMarkdownAdapter(): RuntimeMarkdownAdapter {
  // 驗證 Bun.markdown 是否可用
  if (
    typeof Bun === 'undefined' ||
    typeof Bun.markdown !== 'object' ||
    typeof Bun.markdown.html !== 'function'
  ) {
    throw new Error('[RuntimeMarkdownAdapter] Bun.markdown is not available in this Bun version')
  }

  const bunMd = Bun.markdown

  return {
    html(markdown: string, _options?: MarkdownRenderOptions): string {
      if (!markdown) {
        return ''
      }
      return bunMd.html(markdown)
    },

    render(markdown: string, callbacks?: MarkdownRenderCallbacks): string {
      if (!markdown) {
        return ''
      }
      if (!callbacks) {
        return bunMd.render(markdown)
      }
      // 透過轉接層將我們的回調格式映射到 Bun 原生格式
      const bunCallbacks = toBunRenderCallbacks(callbacks)
      return bunMd.render(markdown, bunCallbacks as unknown as Parameters<typeof bunMd.render>[1])
    },

    react(markdown: string): unknown | null {
      if (!markdown) {
        return null
      }
      return bunMd.react(markdown)
    },

    get isNative() {
      return true
    },
  }
}

// ============ Fallback Markdown Adapter (Node.js) ============

/**
 * 建立 Node.js Fallback Markdown adapter。
 * 使用 marked 函式庫進行延遲載入（optional dependency）。
 *
 * marked 不在 core 的硬性依賴中，僅在 Node.js 環境下需要。
 * 若 marked 不可用，html() 和 render() 會拋出錯誤。
 *
 * @internal
 */
function createFallbackMarkdownAdapter(): RuntimeMarkdownAdapter {
  // 延遲載入 marked（避免型別依賴問題）
  // biome-ignore lint/suspicious/noExplicitAny: marked 為 optional dependency，無法保證型別
  let markedModule: any | null = null

  function loadMarkedSync(): {
    marked: { parse: (...args: unknown[]) => unknown }
    Renderer: new () => Record<string, unknown>
  } {
    if (!markedModule) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        markedModule = require('marked')
      } catch {
        throw new Error(
          '[RuntimeMarkdownAdapter] Node.js markdown support requires "marked" package. ' +
            'Install: npm install --save marked'
        )
      }
    }
    return markedModule as {
      marked: { parse: (...args: unknown[]) => unknown }
      Renderer: new () => Record<string, unknown>
    }
  }

  return {
    html(markdown: string, _options?: MarkdownRenderOptions): string {
      if (!markdown) {
        return ''
      }
      const { marked } = loadMarkedSync()
      const result = marked.parse(markdown, { async: false })
      return result as string
    },

    render(markdown: string, callbacks?: MarkdownRenderCallbacks): string {
      if (!markdown) {
        return ''
      }
      const { marked, Renderer } = loadMarkedSync()

      if (!callbacks) {
        // 無回調時回傳純文字（去除 HTML 標籤）
        const html = marked.parse(markdown, { async: false }) as string
        return html.replace(/<[^>]*>/g, '')
      }

      // 建立自訂 Renderer 並映射回調
      // biome-ignore lint/suspicious/noExplicitAny: marked Renderer 型別為 dynamic
      const renderer = new Renderer() as any

      if (callbacks.heading) {
        const cb = callbacks.heading
        renderer.heading = (text: string, level: number) => cb(text, { level })
      }

      if (callbacks.link) {
        const cb = callbacks.link
        renderer.link = (href: string, title: string | null, text: string) =>
          cb(text, { href, title: title ?? undefined })
      }

      if (callbacks.code) {
        const cb = callbacks.code
        renderer.code = (code: string, language: string | undefined) => cb(code, { language })
      }

      if (callbacks.image) {
        const cb = callbacks.image
        renderer.image = (href: string, title: string | null, text: string) =>
          cb(text, { src: href, title: title ?? undefined })
      }

      if (callbacks.html) {
        const cb = callbacks.html
        renderer.html = (html: string) => cb(html)
      }

      if (callbacks.paragraph) {
        const cb = callbacks.paragraph
        renderer.paragraph = (text: string) => cb(text)
      }

      if (callbacks.strong) {
        const cb = callbacks.strong
        renderer.strong = (text: string) => cb(text)
      }

      if (callbacks.em) {
        const cb = callbacks.em
        renderer.em = (text: string) => cb(text)
      }

      const result = marked.parse(markdown, { renderer, async: false })
      return result as string
    },

    react(_markdown: string): unknown | null {
      // Fallback 環境不支援 react()
      return null
    },

    get isNative() {
      return false
    },
  }
}

// ============ Unsupported Markdown Adapter ============

/**
 * 建立不支援的 Markdown adapter（Deno / Unknown runtime 共用）
 * @internal
 */
function createUnsupportedMarkdownAdapter(message: string): RuntimeMarkdownAdapter {
  return {
    html() {
      throw new Error(message)
    },
    render() {
      throw new Error(message)
    },
    react() {
      throw new Error(message)
    },
    get isNative() {
      return false
    },
  }
}

// ============ Singleton ============

let markdownAdapter: RuntimeMarkdownAdapter | null = null

/**
 * 取得 Markdown 操作 adapter（依運行時自動選擇最佳實作）
 *
 * - Bun: 使用原生 C++ Markdown 解析器（10-100x 更快）
 * - Node.js: 使用 marked 函式庫（延遲載入 optional dependency）
 * - Deno/Unknown: 拋出錯誤
 *
 * @public
 */
export function getMarkdownAdapter(): RuntimeMarkdownAdapter {
  if (markdownAdapter) {
    return markdownAdapter
  }
  const kind = getRuntimeKind()
  switch (kind) {
    case 'bun':
      markdownAdapter = createBunMarkdownAdapter()
      break
    case 'node':
      markdownAdapter = createFallbackMarkdownAdapter()
      break
    case 'deno':
      markdownAdapter = createUnsupportedMarkdownAdapter(
        '[RuntimeMarkdownAdapter] Deno markdown support not yet implemented. Use Bun or Node.js runtime.'
      )
      break
    default:
      markdownAdapter = createUnsupportedMarkdownAdapter(
        `[RuntimeMarkdownAdapter] Markdown support unavailable in unknown runtime. Detected: ${kind}`
      )
  }
  return markdownAdapter
}
