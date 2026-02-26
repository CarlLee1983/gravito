/**
 * SeoRule - SEO 元標籤優化規則
 *
 * 實現 SEO 標籤注入：
 * - Title 標籤更新
 * - Meta 標籤（description、robots、canonical）
 * - Open Graph 標籤
 * - Twitter Cards 標籤
 * - HTML lang 屬性
 */

import type { TransformRule } from '../core/types'

/**
 * SeoRule 配置選項
 */
export interface SeoRuleOptions {
  /**
   * 頁面標題
   */
  readonly title?: string

  /**
   * 頁面描述
   */
  readonly description?: string

  /**
   * 機器人指令 (robots meta 標籤)
   */
  readonly robots?: string

  /**
   * 規範 URL (canonical link)
   */
  readonly canonical?: string

  /**
   * Open Graph 標籤
   */
  readonly og?: Readonly<Record<string, string>>

  /**
   * Twitter Cards 標籤
   */
  readonly twitter?: Readonly<Record<string, string>>

  /**
   * 語言 (lang 屬性)
   */
  readonly lang?: string
}

/**
 * 轉義 HTML 特殊字符，防止 XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}

/**
 * 建立 SEO 優化規則
 *
 * @param options - SEO 規則配置
 * @returns 轉換規則陣列
 *
 * @example
 * ```typescript
 * const seoRules = createSeoRule({
 *   title: 'My Awesome Website',
 *   description: 'Welcome to my website',
 *   robots: 'index, follow',
 *   canonical: 'https://mysite.com/page',
 *   og: {
 *     title: 'My Awesome Website',
 *     image: 'https://mysite.com/og-image.jpg'
 *   },
 *   lang: 'en'
 * })
 * ```
 */
export function createSeoRule(options: SeoRuleOptions = {}): TransformRule[] {
  const rules: TransformRule[] = []

  // 1. Title 標籤
  if (options.title) {
    rules.push({
      name: 'seo:title',
      selector: 'title',
      element(el) {
        el.setInnerContent(options.title!, { html: false })
      },
    })
  }

  // 2. Meta 標籤集合（description、robots、canonical）
  if (options.description || options.robots || options.canonical) {
    rules.push({
      name: 'seo:meta-tags',
      selector: 'head',
      element(el) {
        let metaTags = ''

        // Description meta 標籤
        if (options.description) {
          metaTags += `<meta name="description" content="${escapeHtml(options.description)}" />`
        }

        // Robots meta 標籤
        if (options.robots) {
          metaTags += `<meta name="robots" content="${escapeHtml(options.robots)}" />`
        }

        // Canonical link
        if (options.canonical) {
          metaTags += `<link rel="canonical" href="${escapeHtml(options.canonical)}" />`
        }

        if (metaTags) {
          el.append(metaTags, { html: true })
        }
      },
    })
  }

  // 3. Open Graph 標籤
  if (options.og && Object.keys(options.og).length > 0) {
    rules.push({
      name: 'seo:og-tags',
      selector: 'head',
      element(el) {
        let ogTags = ''
        for (const [key, value] of Object.entries(options.og!)) {
          ogTags += `<meta property="og:${escapeHtml(key)}" content="${escapeHtml(value)}" />`
        }
        if (ogTags) {
          el.append(ogTags, { html: true })
        }
      },
    })
  }

  // 4. Twitter Cards 標籤
  if (options.twitter && Object.keys(options.twitter).length > 0) {
    rules.push({
      name: 'seo:twitter-tags',
      selector: 'head',
      element(el) {
        let twitterTags = ''
        for (const [key, value] of Object.entries(options.twitter!)) {
          twitterTags += `<meta name="twitter:${escapeHtml(key)}" content="${escapeHtml(value)}" />`
        }
        if (twitterTags) {
          el.append(twitterTags, { html: true })
        }
      },
    })
  }

  // 5. HTML lang 屬性
  if (options.lang) {
    rules.push({
      name: 'seo:lang',
      selector: 'html',
      element(el) {
        el.setAttribute('lang', options.lang!)
      },
    })
  }

  return rules
}
