/**
 * @gravito/freeze-react - Markdown 渲染元件
 *
 * 使用 Bun 原生 Markdown API 進行零依賴 Markdown 渲染。
 * 支援 SSR 和 React Server Components。
 *
 * - Bun 環境：使用 `Bun.markdown.react()` 原生 React 渲染
 * - Fallback：使用 `html()` + `dangerouslySetInnerHTML`
 *
 * @module markdown
 * @since 3.3.0
 */

import { getMarkdownAdapter } from '@gravito/core'
import type { ReactNode } from 'react'

/**
 * 支援作為容器的 HTML 標籤子集
 * @public
 */
export type MarkdownContainerTag =
  | 'div'
  | 'article'
  | 'section'
  | 'main'
  | 'aside'
  | 'nav'
  | 'header'
  | 'footer'
  | 'span'

/**
 * Markdown 元件的 Props 介面
 * @public
 */
export interface MarkdownProps {
  /** Markdown 內容字串 */
  readonly content: string
  /** CSS 類名（Tailwind/自訂樣式） */
  readonly className?: string
  /** 容器標籤（預設: 'div'） */
  readonly tag?: MarkdownContainerTag
}

/**
 * Markdown 渲染元件。
 *
 * 使用 Bun 原生 Markdown API 進行零依賴渲染。
 * 在 Bun 環境下優先使用 `react()` 取得原生 React 元素；
 * 非 Bun 環境或 `react()` 不可用時，fallback 至 `html()` + `dangerouslySetInnerHTML`。
 *
 * @param props - 元件屬性
 * @returns React 節點或 null（空內容時）
 *
 * @example
 * ```tsx
 * import { Markdown } from '@gravito/freeze-react'
 *
 * function ArticleView({ content }: { content: string }) {
 *   return (
 *     <div className="article">
 *       <Markdown
 *         content={content}
 *         className="prose prose-lg"
 *       />
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // 使用自訂容器標籤
 * <Markdown content={markdown} tag="article" className="prose" />
 * ```
 *
 * @public
 */
export function Markdown({ content, className, tag: Tag = 'div' }: MarkdownProps): ReactNode {
  if (!content) {
    return null
  }

  const md = getMarkdownAdapter()

  // Bun 環境：優先使用原生 React 渲染（SSR 相容）
  if (md.isNative) {
    const element = md.react(content)
    if (element) {
      return <Tag className={className}>{element as ReactNode}</Tag>
    }
  }

  // Fallback：使用 HTML 渲染 + dangerouslySetInnerHTML
  // adapter.html() 已透過 Bun.markdown 或 marked 進行基本淨化
  const html = md.html(content)
  // biome-ignore lint/security/noDangerouslySetInnerHtml: Markdown HTML fallback 需要注入已處理的 HTML 字串
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
