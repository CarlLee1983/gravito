import { z } from 'zod'
import type { ValidationResult } from '../types'
import { sanitizeHtml } from './sanitize'

/**
 * 訊息內容驗證 Schema
 */
export const messageContentSchema = z
  .string()
  .min(1, '訊息不能為空')
  .max(2000, '訊息長度不能超過 2000 字')
  .transform(sanitizeHtml)

/**
 * 會話 ID 驗證 Schema
 */
export const conversationIdSchema = z.string().regex(/^[a-zA-Z0-9-]{8,64}$/, '無效的會話 ID')

/**
 * 驗證訊息內容
 *
 * @param content - 訊息內容
 * @returns 驗證結果
 *
 * @example
 * ```ts
 * const result = validateMessageContent('Hello!')
 * if (result.success) {
 *   console.log('清理後的內容:', result.data)
 * } else {
 *   console.error('驗證失敗:', result.error)
 * }
 * ```
 */
export function validateMessageContent(content: string): ValidationResult {
  const result = messageContentSchema.safeParse(content)

  if (result.success) {
    return {
      success: true,
      data: result.data,
    }
  }

  return {
    success: false,
    error: result.error.issues[0]?.message || '驗證失敗',
  }
}

/**
 * 驗證會話 ID
 *
 * @param id - 會話 ID
 * @returns 驗證結果
 */
export function validateConversationId(id: string): ValidationResult {
  const result = conversationIdSchema.safeParse(id)

  if (result.success) {
    return {
      success: true,
      data: result.data,
    }
  }

  return {
    success: false,
    error: result.error.issues[0]?.message || '驗證失敗',
  }
}
