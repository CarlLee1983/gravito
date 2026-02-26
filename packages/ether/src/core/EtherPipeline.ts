/**
 * EtherPipeline - 管道組合系統
 *
 * 管道是一組預配置的規則集合，可以按名稱、路由或條件啟用。
 * 採用不可變設計，addRule() 和 enableWhen() 回傳新實例。
 */

import { EtherRewriter } from './EtherRewriter'
import type { DocumentRule, PipelineContext, TransformRule } from './types'

/**
 * EtherPipeline - 轉換管道
 *
 * 管道組織一組轉換規則，並提供條件啟用機制。
 * 採用不可變設計確保狀態安全。
 *
 * @example
 * ```typescript
 * const securityPipeline = EtherPipeline.create('security')
 *   .addRule(createSecurityRule({ cspNonce: true }))
 *   .addRule(createSanitizeRule({ stripScripts: true }))
 *   .enableWhen(ctx => ctx.contentType?.includes('text/html'))
 *
 * if (securityPipeline.shouldApply(ctx)) {
 *   const transformed = securityPipeline.transform(response)
 * }
 * ```
 */
export class EtherPipeline {
  /**
   * 建立新命名管道
   *
   * @param name - 管道名稱
   * @returns 新的 EtherPipeline 實例
   */
  static create(name: string): EtherPipeline {
    const rewriter = new EtherRewriter()
    return new EtherPipeline(name, rewriter)
  }

  private constructor(
    readonly name: string,
    private readonly rewriter: EtherRewriter,
    private readonly condition?: (ctx: PipelineContext) => boolean
  ) {
    Object.freeze(this)
  }

  /**
   * 新增規則到管道
   *
   * 支援單個規則或規則陣列。
   * 採用不可變設計，回傳新實例。
   *
   * @param rule - 轉換規則或規則陣列
   * @returns 新的 EtherPipeline 實例
   */
  addRule(rule: TransformRule | TransformRule[]): EtherPipeline {
    const rules = Array.isArray(rule) ? rule : [rule]
    let updatedRewriter = this.rewriter

    for (const r of rules) {
      updatedRewriter = updatedRewriter.addRule(r)
    }

    return new EtherPipeline(this.name, updatedRewriter, this.condition)
  }

  /**
   * 新增文檔級規則到管道
   *
   * 採用不可變設計，回傳新實例。
   *
   * @param rule - 文檔級規則
   * @returns 新的 EtherPipeline 實例
   */
  addDocumentRule(rule: DocumentRule): EtherPipeline {
    const updatedRewriter = this.rewriter.addDocumentRule(rule)
    return new EtherPipeline(this.name, updatedRewriter, this.condition)
  }

  /**
   * 設定管道啟用條件
   *
   * 採用不可變設計，回傳新實例。
   * 如果 condition 為 undefined，管道總是啟用。
   *
   * @param condition - 啟用條件函式
   * @returns 新的 EtherPipeline 實例
   */
  enableWhen(condition: (ctx: PipelineContext) => boolean): EtherPipeline {
    return new EtherPipeline(this.name, this.rewriter, condition)
  }

  /**
   * 檢查管道是否應該啟用
   *
   * 如果未設定 condition，始終回傳 true。
   *
   * @param ctx - 管道執行上下文
   * @returns 管道是否應該啟用
   */
  shouldApply(ctx: PipelineContext): boolean {
    return this.condition ? this.condition(ctx) : true
  }

  /**
   * 轉換 Response
   *
   * 委派給內部 EtherRewriter 進行實際轉換。
   *
   * @param response - 待轉換的 Response
   * @returns 轉換後的 Response
   */
  transform(response: Response): Response {
    return this.rewriter.transform(response)
  }

  /**
   * 轉換 HTML 字串
   *
   * 委派給內部 EtherRewriter。
   *
   * @param html - 待轉換的 HTML 字串
   * @returns Promise<string> 轉換後的 HTML 字串
   */
  async transformHtml(html: string): Promise<string> {
    return await this.rewriter.transformHtml(html)
  }

  /**
   * 取得管道的所有轉換規則
   *
   * @returns 規則陣列（唯讀）
   */
  getRules(): readonly TransformRule[] {
    return this.rewriter.getRules()
  }
}
