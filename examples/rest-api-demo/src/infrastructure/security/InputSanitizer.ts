/**
 * Input Sanitizer
 *
 * 清理和驗證用戶輸入，防止 XSS、注入攻擊等安全問題
 */

/**
 * XSS 防護：HTML 實體編碼
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  const entityMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  }

  return input.replace(/[&<>"'/]/g, (char) => entityMap[char])
}

/**
 * 日誌轉義：為安全日誌記錄轉義特殊字符
 *
 * 此函數用於在日誌中安全地記錄用戶輸入，防止日誌注入攻擊。
 * 注意：此函數僅用於日誌輸出，不適合用於 SQL 防護。
 * SQL 防護應使用參數化查詢，而不是手動轉義。
 */
export function escapeForLogging(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input
    .replace(/'/g, "\\'") // 轉義單引號
    .replace(/"/g, '\\"') // 轉義雙引號
    .replace(/\0/g, '') // 移除空字節
    .replace(/\n/g, '\\n') // 轉義換行符
    .replace(/\r/g, '\\r') // 轉義回車符
    .replace(/\t/g, '\\t') // 轉義製表符
    .slice(0, 1000) // 限制長度
}

/**
 * 正則表達式 ReDoS 防護：限制正則表達式複雜度
 */
export function sanitizeRegex(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  // 限制長度
  if (input.length > 100) {
    return input.slice(0, 100)
  }

  // 移除可能引起 ReDoS 的模式
  return input
    .replace(/(\.\*){2,}/g, '.*') // 防止重複的 .*
    .replace(/(\.\+){2,}/g, '.+') // 防止重複的 .+
}

/**
 * URL 參數清理
 */
export function sanitizeUrl(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  // 拒絕危險協議
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:']

  const lowerInput = input.toLowerCase().trim()
  for (const protocol of dangerousProtocols) {
    if (lowerInput.startsWith(protocol)) {
      return '' // 拒絕危險協議
    }
  }

  try {
    // 驗證 URL 格式
    new URL(input)
    return input
  } catch {
    // 如果不是有效的 URL，進行編碼
    return encodeURI(input).slice(0, 500)
  }
}

/**
 * 文件名清理
 */
export function sanitizeFilename(input: string): string {
  if (!input || typeof input !== 'string') {
    return 'file'
  }

  return input
    .replace(/[^a-zA-Z0-9._-]/g, '_') // 只允許字母、數字和特定符號
    .replace(/^\.+/, '') // 移除前導點
    .replace(/\.{2,}/g, '.') // 防止多個連續的點
    .slice(0, 255) // 限制長度
}

/**
 * 郵箱地址清理
 */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w@.-]/g, '') // 只允許字母、數字、@、.、-
    .slice(0, 254) // RFC 5321 郵箱長度限制
}

/**
 * 電話號碼清理
 */
export function sanitizePhone(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input
    .replace(/[^\d+\-().\s]/g, '') // 只允許數字和常見電話符號
    .replace(/\s+/g, '') // 移除空格
    .slice(0, 20) // 限制長度
}

/**
 * JSON 清理：移除可能的危險代碼
 */
export function sanitizeJson(json: string): string {
  if (!json || typeof json !== 'string') {
    return '{}'
  }

  try {
    // 解析並重新序列化，移除任何額外的代碼
    const parsed = JSON.parse(json)
    return JSON.stringify(parsed)
  } catch {
    return '{}'
  }
}

/**
 * 通用清理函數
 */
export function sanitize(
  input: any,
  type: 'html' | 'logging' | 'url' | 'email' | 'phone' | 'json' = 'html'
): string {
  switch (type) {
    case 'html':
      return sanitizeHtml(String(input))
    case 'logging':
      return escapeForLogging(String(input))
    case 'url':
      return sanitizeUrl(String(input))
    case 'email':
      return sanitizeEmail(String(input))
    case 'phone':
      return sanitizePhone(String(input))
    case 'json':
      return sanitizeJson(String(input))
    default:
      return sanitizeHtml(String(input))
  }
}

/**
 * 深度清理對象
 */
export function sanitizeObject(obj: any, type: 'html' | 'logging' = 'html'): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'string') {
    return type === 'html' ? sanitizeHtml(obj) : escapeForLogging(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, type))
  }

  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {}
    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
        cleaned[key] = sanitizeObject(obj[key], type)
      }
    }
    return cleaned
  }

  return obj
}

/**
 * 移除 HTML 標籤
 */
export function stripTags(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input
    .replace(/<[^>]*>/g, '') // 移除所有 HTML 標籤
    .replace(/\s+/g, ' ') // 多個空白合併為單一空格
    .trim()
}

/**
 * 移除前導和尾隨空白
 */
export function trim(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input.trim()
}

/**
 * 正規化空白字符
 */
export function normalizeWhitespace(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input
    .replace(/[\t\n\r]/g, ' ') // 將 tab、換行、回車轉換為空格
    .replace(/\s+/g, ' ') // 多個空白合併為單一空格
    .trim()
}

/**
 * 驗證電子郵件地址格式
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }

  // RFC 5322 簡化版本
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(email)) {
    return false
  }

  // 額外檢查
  if (email.includes('..')) {
    return false // 連續點不允許
  }

  if (email.startsWith('.') || email.endsWith('.')) {
    return false // 開始或結束不能是點
  }

  if (email.length > 254) {
    return false // RFC 5321 限制
  }

  return true
}
