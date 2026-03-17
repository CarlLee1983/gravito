/**
 * Relay Cursor 編碼/解碼工具
 * 使用 Base64 編碼實現 opaque cursor
 */

export interface CursorData {
  id: unknown
  offset: number
}

/**
 * 將 cursor 資料編碼為 Base64 字串
 */
export function encodeCursor(data: CursorData): string {
  const json = JSON.stringify(data)

  // 使用 Buffer 進行 Base64 編碼
  // 並轉換為 URL-safe 格式（替換 +/= 為 -_）
  return Buffer.from(json, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * 將 Base64 cursor 解碼為資料
 */
export function decodeCursor(cursor: string): CursorData {
  try {
    // 還原 URL-safe Base64 為標準 Base64
    const base64 = cursor.replace(/-/g, '+').replace(/_/g, '/')

    // 補齊 padding
    const padding = '='.repeat((4 - (base64.length % 4)) % 4)
    const paddedBase64 = base64 + padding

    // 解碼
    const json = Buffer.from(paddedBase64, 'base64').toString('utf-8')
    const data = JSON.parse(json)

    // 驗證資料結構
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid cursor data structure')
    }

    if (!('id' in data) || !('offset' in data)) {
      throw new Error('Cursor missing required fields')
    }

    if (typeof data.offset !== 'number' || !Number.isFinite(data.offset) || data.offset < 0) {
      throw new Error('Cursor offset must be a non-negative finite number')
    }

    return data as CursorData
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to decode cursor: ${message}`)
  }
}

/**
 * 驗證 cursor 是否有效
 */
export function isValidCursor(cursor: string): boolean {
  try {
    decodeCursor(cursor)
    return true
  } catch {
    return false
  }
}
