/**
 * 文檔處理器基礎類
 * 對應 HTMLRewriter 的 DocumentHandler
 */

import type { Comment, Doctype, DocumentRule, End, Text } from '../core/types'

/**
 * 文檔處理器基礎類
 * 提供標準化的文檔級處理方式
 */
export abstract class DocumentHandler {
  /**
   * 處理 DOCTYPE
   * @param doctype HTMLRewriter DOCTYPE 物件
   */
  abstract doctype?(doctype: Doctype): void | Promise<void>

  /**
   * 處理頂層註解
   * @param comment HTMLRewriter 註解物件
   */
  abstract comments?(comment: Comment): void | Promise<void>

  /**
   * 處理頂層文字節點
   * @param text HTMLRewriter 文字物件
   */
  abstract text?(text: Text): void | Promise<void>

  /**
   * 處理文檔結束
   * @param end HTMLRewriter End 物件
   */
  abstract end?(end: End): void | Promise<void>
}

/**
 * 規則型文檔處理器
 * 直接從 DocumentRule 建立
 */
export class RuleBasedDocumentHandler extends DocumentHandler {
  constructor(private readonly rule: DocumentRule) {
    super()
  }

  async doctype(doctype: Doctype): Promise<void> {
    if (this.rule.doctype) {
      await this.rule.doctype(doctype)
    }
  }

  async comments(comment: Comment): Promise<void> {
    if (this.rule.comments) {
      await this.rule.comments(comment)
    }
  }

  async text(text: Text): Promise<void> {
    if (this.rule.text) {
      await this.rule.text(text)
    }
  }

  async end(end: End): Promise<void> {
    if (this.rule.end) {
      await this.rule.end(end)
    }
  }

  get name(): string {
    return this.rule.name
  }
}
