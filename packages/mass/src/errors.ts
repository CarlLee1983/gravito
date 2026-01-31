import type { ValueError } from '@sinclair/typebox/errors'
import type { ValidationSource } from './types'

/**
 * Error Messages - Traditional Chinese
 *
 * Provides common validation error messages in Traditional Chinese.
 */
export const ERROR_MESSAGES_ZH_TW = {
  REQUIRED: '此欄位為必填',
  INVALID_TYPE: '資料型別不正確',
  INVALID_EMAIL: '電子郵件格式不正確',
  INVALID_URL: '網址格式不正確',
  INVALID_UUID: 'UUID 格式不正確',
  INVALID_DATE: '日期格式不正確',
  TOO_SHORT: '長度過短',
  TOO_LONG: '長度過長',
  TOO_SMALL: '數值過小',
  TOO_LARGE: '數值過大',
  INVALID_PATTERN: '格式不符合規則',
  INVALID_FORMAT: '格式不正確',
} as const

/**
 * Error Messages - English
 *
 * Provides common validation error messages in English.
 */
export const ERROR_MESSAGES_EN = {
  REQUIRED: 'This field is required',
  INVALID_TYPE: 'Invalid data type',
  INVALID_EMAIL: 'Invalid email format',
  INVALID_URL: 'Invalid URL format',
  INVALID_UUID: 'Invalid UUID format',
  INVALID_DATE: 'Invalid date format',
  TOO_SHORT: 'Too short',
  TOO_LONG: 'Too long',
  TOO_SMALL: 'Value too small',
  TOO_LARGE: 'Value too large',
  INVALID_PATTERN: 'Does not match required pattern',
  INVALID_FORMAT: 'Invalid format',
} as const

/**
 * Error Formatter Function Type
 *
 * Function type for converting TypeBox errors into a custom format.
 */
export type ErrorFormatter = (error: ValueError) => {
  path: string
  message: string
  expected?: string
  received?: string
}

/**
 * Custom error class thrown or returned when validation fails.
 *
 * This class encapsulates the validation error details and the source of the data
 * (e.g., 'json', 'query') that failed validation. It is suitable for use in
 * exception filters or global error handlers.
 *
 * @example
 * ```typescript
 * throw new MassValidationError('json', [
 *   { path: '/email', message: 'Invalid email format' }
 * ])
 * ```
 */
export class MassValidationError extends Error {
  /**
   * Creates a new MassValidationError instance.
   *
   * @param source - The source of the invalid data
   * @param errors - The list of validation errors
   */
  constructor(
    public readonly source: ValidationSource,
    public readonly errors: Array<{ path: string; message: string }>
  ) {
    super(`Validation failed for ${source}`)
    this.name = 'MassValidationError'
  }

  /**
   * Serializes the error to a JSON-compatible object.
   *
   * @returns A structured error object suitable for API responses
   */
  toJSON() {
    return {
      error: 'ValidationError',
      source: this.source,
      details: this.errors,
    }
  }
}

/**
 * Enhances TypeBox Validation Errors.
 *
 * Converts raw TypeBox errors into structured error objects with more context,
 * suitable for returning directly to clients or logging.
 *
 * @param error - The raw TypeBox validation error
 * @param locale - Locale ('zh-TW' or 'en'), defaults to 'zh-TW'
 * @returns Enhanced error object
 *
 * @example
 * ```typescript
 * import { Value } from '@sinclair/typebox/value'
 *
 * const errors = [...Value.Errors(schema, data)]
 * const enhanced = errors.map(err => enhanceError(err, 'zh-TW'))
 * // [{ path: '/email', message: '電子郵件格式不正確', expected: 'string<email>', received: 'string' }]
 * ```
 */
export function enhanceError(
  error: ValueError,
  locale: 'zh-TW' | 'en' = 'zh-TW'
): {
  path: string
  message: string
  expected?: string
  received?: string
} {
  const messages = locale === 'zh-TW' ? ERROR_MESSAGES_ZH_TW : ERROR_MESSAGES_EN
  const { path, message, schema, value } = error

  // Provide friendlier messages based on error type
  let enhancedMessage = message

  // Handle common error types (based on actual TypeBox error messages)
  if (message.includes('required property')) {
    enhancedMessage = messages.REQUIRED
  } else if (message.includes('email')) {
    enhancedMessage = messages.INVALID_EMAIL
  } else if (message.includes('url')) {
    enhancedMessage = messages.INVALID_URL
  } else if (message.includes('uuid')) {
    enhancedMessage = messages.INVALID_UUID
  } else if (message.includes('date-time') || message.includes('date')) {
    enhancedMessage = messages.INVALID_DATE
  } else if (message.includes('length greater or equal')) {
    const minLength = schema.minLength
    enhancedMessage =
      locale === 'zh-TW'
        ? `${messages.TOO_SHORT}（最少 ${minLength} 個字元）`
        : `${messages.TOO_SHORT} (minimum ${minLength} characters)`
  } else if (message.includes('length less or equal')) {
    const maxLength = schema.maxLength
    enhancedMessage =
      locale === 'zh-TW'
        ? `${messages.TOO_LONG}（最多 ${maxLength} 個字元）`
        : `${messages.TOO_LONG} (maximum ${maxLength} characters)`
  } else if (message.includes('greater or equal')) {
    const minimum = schema.minimum
    enhancedMessage =
      locale === 'zh-TW'
        ? `${messages.TOO_SMALL}（最小值：${minimum}）`
        : `${messages.TOO_SMALL} (minimum: ${minimum})`
  } else if (message.includes('less or equal')) {
    const maximum = schema.maximum
    enhancedMessage =
      locale === 'zh-TW'
        ? `${messages.TOO_LARGE}（最大值：${maximum}）`
        : `${messages.TOO_LARGE} (maximum: ${maximum})`
  } else if (message.includes('to match')) {
    enhancedMessage = messages.INVALID_PATTERN
  } else if (message.includes('format')) {
    enhancedMessage = messages.INVALID_FORMAT
  }

  return {
    path,
    message: enhancedMessage,
    expected: schema.type ? String(schema.type) : undefined,
    received: typeof value,
  }
}

/**
 * Creates Custom Error Formatter.
 *
 * High-order function that allows creating custom error formatting logic for TypeBox validation errors.
 * Useful for standardizing error formats or supporting multiple languages.
 *
 * @param formatter - Custom formatter function
 * @returns Error formatter function
 *
 * @example
 * ```typescript
 * const myFormatter = createErrorFormatter((error) => ({
 *   path: error.path,
 *   message: `Custom Message: ${error.message}`,
 *   code: 'VALIDATION_ERROR'
 * }))
 *
 * const errors = [...Value.Errors(schema, data)]
 * const formatted = errors.map(myFormatter)
 * ```
 */
export function createErrorFormatter(
  formatter: (error: ValueError) => {
    path: string
    message: string
    [key: string]: unknown
  }
): ErrorFormatter {
  return (error: ValueError) => {
    const formatted = formatter(error)
    return {
      path: formatted.path,
      message: formatted.message,
      expected: formatted.expected as string | undefined,
      received: formatted.received as string | undefined,
    }
  }
}

/**
 * Formats a flat list of validation errors into a field-grouped structure.
 *
 * This helper transforms TypeBox's error format into a more frontend-friendly
 * format where errors are grouped by field name.
 *
 * @param errors - The raw validation errors
 * @returns An object where keys are field names and values are arrays of error messages
 *
 * @example
 * ```typescript
 * const errors = [{ path: '/user/name', message: 'Required' }]
 * const formatted = formatErrors(errors)
 * // Result: { fields: { 'user.name': ['Required'] } }
 * ```
 */
export function formatErrors(errors: Array<{ path: string; message: string }>): {
  fields: Record<string, string[]>
} {
  const fields: Record<string, string[]> = {}

  for (const err of errors) {
    const fieldName = err.path.replace(/^\//, '').replace(/\//g, '.')
    if (!fields[fieldName]) {
      fields[fieldName] = []
    }
    fields[fieldName].push(err.message)
  }

  return { fields }
}
