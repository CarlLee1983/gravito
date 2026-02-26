/**
 * SanitizeRule - 淨化轉換規則
 *
 * 實現內容淨化：
 * - 移除危險指令碼
 * - 移除內聯事件處理程式
 * - 移除危險標籤
 */

import type { TransformRule } from '../core/types'

/**
 * SanitizeRule 配置選項
 */
export interface SanitizeRuleOptions {
  /**
   * 是否移除 script 標籤
   */
  readonly stripScripts?: boolean

  /**
   * 是否移除事件處理程式屬性（onclick, onerror 等）
   */
  readonly stripEventHandlers?: boolean

  /**
   * 是否移除危險屬性（onclick, onload, onerror 等）
   */
  readonly stripDangerousAttrs?: boolean

  /**
   * 危險標籤清單（預設：script, iframe, object, embed）
   */
  readonly dangerousTags?: readonly string[]
}

const DEFAULT_DANGEROUS_TAGS = ['script', 'iframe', 'object', 'embed', 'applet']
const DANGEROUS_ATTRS = [
  'onclick',
  'onerror',
  'onload',
  'onmouseover',
  'onmouseout',
  'onchange',
  'onsubmit',
  'onfocus',
  'onblur',
]

/**
 * 建立淨化轉換規則
 *
 * @param options - 淨化規則配置
 * @returns 轉換規則
 *
 * @example
 * ```typescript
 * const sanitizeRule = createSanitizeRule({
 *   stripScripts: true,
 *   stripEventHandlers: true
 * })
 * ```
 */
export function createSanitizeRule(options: SanitizeRuleOptions = {}): TransformRule {
  const {
    stripScripts = false,
    stripEventHandlers = false,
    stripDangerousAttrs = false,
    dangerousTags = DEFAULT_DANGEROUS_TAGS,
  } = options

  return {
    name: 'sanitize',
    selector: 'script, iframe, object, embed, applet, *[onclick], *[onerror], *[onload]',
    element(el) {
      const attrs = el.getAttributeNames()

      // 檢查屬性以識別標籤類型
      const hasDataAttr = attrs.some((a) => a === 'data')
      const hasTypeAttr = attrs.some((a) => a === 'type')
      const hasSrcAttr = attrs.some((a) => a === 'src')

      // 識別危險標籤並移除
      if (stripScripts) {
        const isDangerousTag =
          hasTypeAttr || // likely script or style
          hasSrcAttr || // likely iframe, embed, etc
          hasDataAttr // likely object

        if (isDangerousTag) {
          for (const tag of dangerousTags) {
            const tagLower = tag.toLowerCase()
            if (
              (tagLower === 'script' && hasTypeAttr) ||
              (tagLower === 'iframe' && hasSrcAttr && attrs.some((a) => a === 'sandbox')) ||
              (tagLower === 'object' && hasDataAttr) ||
              (tagLower === 'embed' && hasSrcAttr) ||
              (tagLower === 'applet' && hasDataAttr)
            ) {
              el.remove()
              return
            }
          }
        }
      }

      // 移除危險屬性
      if (stripDangerousAttrs || stripEventHandlers) {
        for (const attr of attrs) {
          const attrLower = attr.toLowerCase()

          if (stripDangerousAttrs && DANGEROUS_ATTRS.includes(attrLower)) {
            el.removeAttribute(attr)
          } else if (stripEventHandlers && attrLower.startsWith('on')) {
            el.removeAttribute(attr)
          }
        }
      }
    },
  }
}
