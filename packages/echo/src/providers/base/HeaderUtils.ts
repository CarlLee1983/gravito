/**
 * Webhook Header 處理工具
 * @module @gravito/echo/providers/base
 */

/**
 * 從 headers 物件中取得指定 header 的值
 * 支援大小寫不敏感的查找
 */
export function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  // 先嘗試原始名稱，再嘗試小寫
  const value = headers[name] ?? headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

/**
 * 取得多個 header 值
 */
export function getHeaders(
  headers: Record<string, string | string[] | undefined>,
  names: string[]
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {}
  for (const name of names) {
    result[name] = getHeader(headers, name)
  }
  return result
}

/**
 * 檢查是否存在指定 header
 */
export function hasHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): boolean {
  return getHeader(headers, name) !== undefined
}
