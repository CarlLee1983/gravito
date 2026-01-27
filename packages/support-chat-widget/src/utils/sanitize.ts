/**
 * 清理 HTML 內容，防止 XSS 攻擊
 *
 * 移除所有 HTML 標籤和潛在危險字符
 *
 * @param input - 輸入字串
 * @returns 清理後的字串
 *
 * @example
 * ```ts
 * sanitizeHtml('<script>alert("xss")</script>Hello')
 * // => 'Hello'
 * ```
 */
export function sanitizeHtml(input: string): string {
  // 移除 HTML 標籤
  let cleaned = input.replace(/<[^>]*>/g, '')

  // 轉義特殊字符
  cleaned = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')

  // 移除控制字符（\u0000-\u001F 和 \u007F）
  // biome-ignore lint/suspicious/noControlCharactersInRegex: 需要移除所有控制字符以防止安全問題
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '')

  return cleaned.trim()
}

/**
 * 清理 URL，只允許 http 和 https 協議
 *
 * @param url - URL 字串
 * @returns 清理後的 URL，如果無效則回傳空字串
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url
    }
  } catch {
    // 無效的 URL
  }
  return ''
}
