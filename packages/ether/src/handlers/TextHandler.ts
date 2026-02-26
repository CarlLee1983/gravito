/**
 * 文字節點處理器基礎類
 * 對應 HTMLRewriter 的 TextHandler
 */

import type { Text, TransformRule } from '../core/types'

/**
 * 文字節點處理器基礎類
 * 提供標準化的文字節點處理方式
 */
export abstract class TextHandler {
  /**
   * 處理文字節點
   * @param text HTMLRewriter 文字物件
   */
  abstract text(text: Text): void | Promise<void>
}

/**
 * 規則型文字處理器
 * 直接從 TransformRule 建立
 */
export class RuleBasedTextHandler extends TextHandler {
  constructor(private readonly rule: TransformRule) {
    super()
  }

  async text(text: Text): Promise<void> {
    if (this.rule.text) {
      await this.rule.text(text)
    }
  }

  get name(): string {
    return this.rule.name
  }

  get selector(): string {
    return this.rule.selector
  }
}
