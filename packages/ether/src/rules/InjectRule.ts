/**
 * InjectRule - 動態內容注入規則
 *
 * 實現內容注入：
 * - 注入到 <head> 末尾
 * - 注入到 <body> 開頭
 * - 注入到 </body> 前
 */

import type { TransformRule } from '../core/types'

/**
 * InjectRule 配置選項
 */
export interface InjectRuleOptions {
  /**
   * 注入到 <head> 末尾的 HTML
   */
  readonly headEnd?: string

  /**
   * 注入到 <body> 開頭的 HTML
   */
  readonly bodyStart?: string

  /**
   * 注入到 </body> 前的 HTML
   */
  readonly bodyEnd?: string
}

/**
 * 建立動態內容注入規則
 *
 * @param options - 注入規則配置
 * @returns 轉換規則陣列
 *
 * @example
 * ```typescript
 * // 注入分析腳本
 * const injectRules = createInjectRule({
 *   headEnd: '<script async src="https://cdn.example.com/analytics.js"></script>',
 *   bodyEnd: '<script src="app.js"></script>'
 * })
 * ```
 */
export function createInjectRule(options: InjectRuleOptions = {}): TransformRule[] {
  const rules: TransformRule[] = []

  // 1. <head> 末尾注入
  if (options.headEnd) {
    rules.push({
      name: 'inject:head-end',
      selector: 'head',
      element(el) {
        el.append(options.headEnd!, { html: true })
      },
    })
  }

  // 2. <body> 開頭注入
  if (options.bodyStart) {
    rules.push({
      name: 'inject:body-start',
      selector: 'body',
      element(el) {
        el.prepend(options.bodyStart!, { html: true })
      },
    })
  }

  // 3. </body> 前注入
  if (options.bodyEnd) {
    rules.push({
      name: 'inject:body-end',
      selector: 'body',
      element(el) {
        el.append(options.bodyEnd!, { html: true })
      },
    })
  }

  return rules
}
