import { z } from 'zod'
import type { ValidationResult } from '../types'
import { sanitizeHtml } from './sanitize'

/**
 * Zod schema for validating message content.
 * Ensures the message is not empty, does not exceed 2000 characters,
 * and automatically sanitizes HTML to prevent XSS.
 */
export const messageContentSchema = z
  .string()
  .min(1, 'Message cannot be empty')
  .max(2000, 'Message length cannot exceed 2000 characters')
  .transform(sanitizeHtml)

/**
 * Zod schema for validating conversation IDs.
 * Matches alphanumeric strings with hyphens, between 8 and 64 characters.
 */
export const conversationIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9-]{8,64}$/, 'Invalid conversation ID')

/**
 * Validates the text content of a chat message.
 *
 * @param content - The raw message text to validate.
 * @returns An object containing the success status, sanitized data, or an error message.
 *
 * @example
 * ```ts
 * const result = validateMessageContent('Hello, support!');
 * if (result.success) {
 *   console.log(`Clean content: ${result.data}`);
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
    error: result.error.issues[0]?.message || 'Validation failed',
  }
}

/**
 * Validates a conversation identifier string.
 *
 * @param id - The conversation ID to validate.
 * @returns An object containing the validation result.
 *
 * @example
 * ```ts
 * const result = validateConversationId('CONV-12345678');
 * if (!result.success) {
 *   showError(result.error);
 * }
 * ```
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
    error: result.error.issues[0]?.message || 'Validation failed',
  }
}
