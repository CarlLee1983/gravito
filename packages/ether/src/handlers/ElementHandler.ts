/**
 * 元素處理器基礎類
 * 對應 HTMLRewriter 的 ElementHandler
 */

import type { Element, TransformRule } from '../core/types'

/**
 * 元素處理器基礎類
 * 提供標準化的元素處理方式
 */
export abstract class ElementHandler {
  /**
   * 處理元素
   * @param element HTMLRewriter 元素物件
   */
  abstract element(element: Element): void | Promise<void>

  /**
   * 標籤結束時的回調（可選）
   */
  onEndTag?: (name: string) => void | Promise<void>
}

/**
 * 規則型元素處理器
 * 直接從 TransformRule 建立
 */
export class RuleBasedElementHandler extends ElementHandler {
  constructor(private readonly rule: TransformRule) {
    super()
  }

  async element(element: Element): Promise<void> {
    if (this.rule.element) {
      await this.rule.element(element)
    }
  }

  get name(): string {
    return this.rule.name
  }

  get selector(): string {
    return this.rule.selector
  }
}
