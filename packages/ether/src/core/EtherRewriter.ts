/**
 * EtherRewriter - Bun HTMLRewriter 的 Gravito 封裝
 *
 * 提供不可變的流式 HTML 轉換管道，基於 Bun 原生 HTMLRewriter API。
 * 支援規則組合、條件啟用、錯誤恢復。
 */

import type { DocumentRule, TransformRule } from './types'

/**
 * EtherRewriter - HTML 轉換引擎的核心類
 *
 * 基於 Bun HTMLRewriter 提供流式、記憶體效率高的 HTML 轉換。
 * 採用不可變設計，addRule() 和 addDocumentRule() 回傳新實例。
 *
 * @example
 * ```typescript
 * const rewriter = new EtherRewriter()
 *   .addRule(securityRule)
 *   .addRule(sanitizeRule)
 *   .addDocumentRule(documentRule)
 *
 * const transformed = rewriter.transform(response)
 * const html = await rewriter.transformHtml('<div>test</div>')
 * ```
 */
export class EtherRewriter {
  private readonly rules: readonly TransformRule[]
  private readonly documentRules: readonly DocumentRule[]

  /**
   * 建立 EtherRewriter 實例
   *
   * @param rules - 轉換規則陣列（預設空）
   * @param documentRules - 文檔級規則陣列（預設空）
   */
  constructor(rules: TransformRule[] = [], documentRules: DocumentRule[] = []) {
    this.rules = Object.freeze([...rules])
    this.documentRules = Object.freeze([...documentRules])
  }

  /**
   * 新增轉換規則（回傳新實例，不可變）
   *
   * 此方法不修改原實例，而是建立新實例並附加規則。
   * 支援鏈式呼叫。
   *
   * @param rule - 轉換規則
   * @returns 新的 EtherRewriter 實例
   *
   * @example
   * ```typescript
   * const rewriter = new EtherRewriter()
   *   .addRule(rule1)
   *   .addRule(rule2)
   * ```
   */
  addRule(rule: TransformRule): EtherRewriter {
    const newRules = [...this.rules, rule]
    return new EtherRewriter(newRules, this.documentRules as DocumentRule[])
  }

  /**
   * 新增文檔級規則（回傳新實例，不可變）
   *
   * 此方法不修改原實例，而是建立新實例並附加規則。
   * 支援鏈式呼叫。
   *
   * @param rule - 文檔級規則
   * @returns 新的 EtherRewriter 實例
   *
   * @example
   * ```typescript
   * const rewriter = new EtherRewriter()
   *   .addDocumentRule(docRule)
   * ```
   */
  addDocumentRule(rule: DocumentRule): EtherRewriter {
    const newDocumentRules = [...this.documentRules, rule]
    return new EtherRewriter(this.rules as TransformRule[], newDocumentRules)
  }

  /**
   * 轉換 Response 物件
   *
   * 建立 Bun HTMLRewriter 實例，為每個規則註冊 handler，
   * 然後調用 rewriter.transform(response) 進行流式轉換。
   * 返回轉換後的 Response 物件，記憶體使用恆定。
   *
   * @param response - 待轉換的 Response 物件
   * @returns 轉換後的 Response 物件（流式）
   *
   * @example
   * ```typescript
   * const response = new Response('<div>test</div>', {
   *   headers: { 'Content-Type': 'text/html' }
   * })
   * const transformed = rewriter.transform(response)
   * ```
   */
  transform(response: Response): Response {
    // 建立 Bun HTMLRewriter 實例
    // biome-ignore lint/correctness/noUndeclaredVariables: HTMLRewriter is a global Bun API
    const rewriter = new HTMLRewriter()

    // 為每個 TransformRule 註冊 handler
    for (const rule of this.rules) {
      // biome-ignore lint/suspicious/noExplicitAny: Bun HTMLRewriter API uses dynamic handlers
      const handlers: any = {}

      // 只有當規則定義了對應的回調時，才註冊 handler
      if (rule.element) {
        // biome-ignore lint/suspicious/noExplicitAny: Bun HTMLRewriter API element parameter
        handlers.element = (el: any) => rule.element?.(el)
      }

      if (rule.text) {
        // biome-ignore lint/suspicious/noExplicitAny: Bun HTMLRewriter API text parameter
        handlers.text = (text: any) => rule.text?.(text)
      }

      if (rule.comments) {
        // biome-ignore lint/suspicious/noExplicitAny: Bun HTMLRewriter API comment parameter
        handlers.comments = (comment: any) => rule.comments?.(comment)
      }

      // 只有當至少有一個回調時，才調用 on()
      if (Object.keys(handlers).length > 0) {
        rewriter.on(rule.selector, handlers)
      }
    }

    // 為每個 DocumentRule 註冊 document handler
    // biome-ignore lint/suspicious/noExplicitAny: Bun HTMLRewriter API uses dynamic handlers
    const documentHandlers: any = {}

    for (const rule of this.documentRules) {
      if (rule.doctype) {
        // biome-ignore lint/suspicious/noExplicitAny: Bun HTMLRewriter API doctype parameter
        documentHandlers.doctype = (doctype: any) => rule.doctype?.(doctype)
      }

      if (rule.comments) {
        // biome-ignore lint/suspicious/noExplicitAny: Bun HTMLRewriter API comment parameter
        documentHandlers.comments = (comment: any) => rule.comments?.(comment)
      }

      if (rule.text) {
        // biome-ignore lint/suspicious/noExplicitAny: Bun HTMLRewriter API text parameter
        documentHandlers.text = (text: any) => rule.text?.(text)
      }

      if (rule.end) {
        // biome-ignore lint/suspicious/noExplicitAny: Bun HTMLRewriter API end parameter
        documentHandlers.end = (end: any) => rule.end?.(end)
      }
    }

    // 只有當至少有一個 document handler 時，才調用 onDocument()
    if (Object.keys(documentHandlers).length > 0) {
      rewriter.onDocument(documentHandlers)
    }

    // 執行流式轉換並回傳 Response
    return rewriter.transform(response)
  }

  /**
   * 轉換 HTML 字串
   *
   * 將 HTML 字串包裝為 Response，調用 this.transform()，
   * 然後取得轉換後的 HTML 字串。
   * 可用於測試或非 HTTP 場景。
   *
   * @param html - 待轉換的 HTML 字串
   * @returns Promise<string> - 轉換後的 HTML 字串
   *
   * @example
   * ```typescript
   * const html = '<div>test</div>'
   * const transformed = await rewriter.transformHtml(html)
   * ```
   */
  async transformHtml(html: string): Promise<string> {
    // 將 HTML 字串包裝為 Response
    const response = new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })

    // 調用 transform() 進行流式轉換
    const transformed = this.transform(response)

    // 取得轉換後的 HTML 字串
    return await transformed.text()
  }

  /**
   * 取得當前已註冊的轉換規則列表（唯讀）
   *
   * @returns 轉換規則陣列（唯讀）
   */
  getRules(): readonly TransformRule[] {
    return this.rules
  }

  /**
   * 取得當前已註冊的文檔級規則列表（唯讀）
   *
   * @returns 文檔級規則陣列（唯讀）
   */
  getDocumentRules(): readonly DocumentRule[] {
    return this.documentRules
  }
}
