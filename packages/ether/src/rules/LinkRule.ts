/**
 * LinkRule - 連結轉換規則
 *
 * 實現連結轉換：
 * - 外部連結添加安全屬性
 * - 連結開啟方式配置
 * - 相對 URL 轉換
 */

import type { TransformRule } from '../core/types'

/**
 * LinkRule 配置選項
 */
export interface LinkRuleOptions {
  /**
   * 外部連結配置
   */
  readonly external?: {
    /**
     * 是否在新標籤頁開啟
     */
    readonly target?: '_blank' | '_self' | '_parent' | '_top'

    /**
     * 是否添加 noopener 屬性
     */
    readonly noopener?: boolean

    /**
     * 是否添加 noreferrer 屬性
     */
    readonly noreferrer?: boolean
  }

  /**
   * 內部連結配置
   */
  readonly internal?: {
    /**
     * 是否保留相對 URL
     */
    readonly keepRelative?: boolean

    /**
     * URL 前綴（用於相對 URL 轉換）
     */
    readonly prefix?: string
  }
}

/**
 * 判斷 URL 是否為外部連結
 */
function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')
}

/**
 * 建立連結轉換規則
 *
 * @param options - 連結規則配置
 * @returns 轉換規則
 *
 * @example
 * ```typescript
 * const linkRule = createLinkRule({
 *   external: {
 *     target: '_blank',
 *     noopener: true,
 *     noreferrer: true
 *   }
 * })
 * ```
 */
export function createLinkRule(options: LinkRuleOptions = {}): TransformRule {
  const { external = {}, internal = {} } = options
  const { target = undefined, noopener = false, noreferrer = false } = external
  const { keepRelative = false, prefix = '' } = internal

  return {
    name: 'link',
    selector: 'a[href]',
    element(el) {
      const href = el.getAttribute('href')
      if (!href) {
        return
      }

      const isExternal = isExternalUrl(href)

      if (isExternal) {
        // 外部連結配置
        if (target) {
          el.setAttribute('target', target)
        }

        const relAttrs: string[] = []
        if (noopener) {
          relAttrs.push('noopener')
        }
        if (noreferrer) {
          relAttrs.push('noreferrer')
        }

        if (relAttrs.length > 0) {
          const existingRel = el.getAttribute('rel') || ''
          const newRel = (existingRel ? `${existingRel} ` : '') + relAttrs.join(' ')
          el.setAttribute('rel', newRel)
        }
      } else if (!keepRelative && prefix && !href.startsWith('/')) {
        // 內部連結轉換
        el.setAttribute('href', prefix + href)
      }
    },
  }
}
