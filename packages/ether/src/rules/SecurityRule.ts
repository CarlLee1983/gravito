/**
 * SecurityRule - 安全轉換規則
 *
 * 實現常見的 Web 安全轉換：
 * - CSP nonce 注入
 * - 安全標籤加強
 */

import type { TransformRule } from '../core/types'

/**
 * SecurityRule 配置選項
 */
export interface SecurityRuleOptions {
  /**
   * 是否添加 CSP nonce 到 script/style 標籤
   */
  readonly cspNonce?: boolean

  /**
   * CSP nonce 值（如果 cspNonce 為 true）
   */
  readonly nonceValue?: string

  /**
   * 是否為外部資源添加 integrity 屬性
   */
  readonly integrity?: boolean

  /**
   * 是否為連結標籤添加安全屬性
   */
  readonly secureLinkAttrs?: boolean
}

/**
 * 建立安全轉換規則
 *
 * @param options - 安全規則配置
 * @returns 轉換規則
 *
 * @example
 * ```typescript
 * const securityRule = createSecurityRule({
 *   cspNonce: true,
 *   nonceValue: 'abc123xyz',
 *   secureLinkAttrs: true
 * })
 * ```
 */
export function createSecurityRule(options: SecurityRuleOptions = {}): TransformRule {
  const { cspNonce = false, nonceValue = '', secureLinkAttrs = false } = options

  return {
    name: 'security',
    selector: 'script, style, link[rel="stylesheet"], a',
    element(el) {
      // 檢查是否有 nonce 屬性
      if (cspNonce && nonceValue) {
        // 檢查當前元素是否為 script 或 style
        // 由於 HTMLRewriter 選擇器的侷限，我們通過 onEndTag 來識別
        const attrs = el.getAttributeNames()
        const hasScriptAttrs = attrs.some(
          (a) => a === 'type' && el.getAttribute(a)?.includes('text/')
        )

        if (hasScriptAttrs || !attrs.some((a) => a === 'href')) {
          el.setAttribute('nonce', nonceValue)
        }
      }

      // 為連結添加安全屬性
      if (secureLinkAttrs && el.getAttribute('href')) {
        const currentRel = el.getAttribute('rel') || ''
        const relSet = new Set(currentRel.split(' ').filter(Boolean))
        relSet.add('noopener')
        relSet.add('noreferrer')
        el.setAttribute('rel', Array.from(relSet).join(' '))
      }
    },
  }
}
