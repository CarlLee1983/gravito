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
import type { MarkdownRenderCallbacks, RuntimeMarkdownAdapter } from './types'
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
export declare function createHtmlRenderCallbacks(
  overrides?: Partial<MarkdownRenderCallbacks>
): MarkdownRenderCallbacks
/**
 * 取得 Markdown 操作 adapter（依運行時自動選擇最佳實作）
 *
 * - Bun: 使用原生 C++ Markdown 解析器（10-100x 更快）
 * - Node.js: 使用 marked 函式庫（延遲載入 optional dependency）
 * - Deno/Unknown: 拋出錯誤
 *
 * @public
 */
export declare function getMarkdownAdapter(): RuntimeMarkdownAdapter
