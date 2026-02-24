/**
 * Markdown helper 工廠函式。
 *
 * 提供 `{{ markdown content="..." }}` 行內語法，
 * 將 Markdown 內容渲染為經過 Sanitizer 淨化的 HTML。
 *
 * @module helpers/markdown
 * @since 3.3.0
 */

import { getMarkdownAdapter } from '@gravito/core'
import type { HelperFunction } from '../engine/TemplateEngine'
import { Sanitizer } from '../security/Sanitizer'

/**
 * 建立 markdown helper，供 TemplateEngine 註冊使用。
 *
 * 支援以下模板語法：
 * ```handlebars
 * {{ markdown content="# Title" }}
 * {{ markdown content="**bold** text" }}
 * ```
 *
 * @returns HelperFunction 用於 TemplateEngine.registerHelper()
 * @public
 */
export function createMarkdownHelper(): HelperFunction {
  const sanitizer = new Sanitizer()
  const mdAdapter = getMarkdownAdapter()

  return (args: Record<string, string | number | boolean>): string => {
    const contentArg = args.content

    if (contentArg === undefined || contentArg === null) {
      throw new Error('Markdown helper requires "content" parameter')
    }

    const markdown = String(contentArg).trim()

    if (!markdown) {
      return ''
    }

    // 渲染 Markdown -> HTML
    const rawHtml = mdAdapter.html(markdown)

    // 通過 Sanitizer 進行深度防禦
    return sanitizer.sanitize(rawHtml)
  }
}
