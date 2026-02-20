import { ValidationError } from '../Application/Validation/ValidationError'

/**
 * Global Error Handler Middleware
 *
 * Maps domain-layer exceptions to appropriate HTTP status codes and response formats.
 * Provides consistent error responses across all API endpoints.
 *
 * **Error Mapping Strategy:**
 * - ValidationError（輸入驗證失敗）→ 400 Bad Request，包含詳細 violations
 * - Business validation errors (not found, insufficient balance, etc.) → 4xx
 * - Business rule violations (account frozen, limit exceeded) → 4xx
 * - System errors (unexpected exceptions) → 500
 *
 * **Response Format:**
 * ```json
 * {
 *   "success": false,
 *   "error": "User-friendly error message",
 *   "code": "ERROR_CODE"
 * }
 * ```
 *
 * **ValidationError Response Format:**
 * ```json
 * {
 *   "success": false,
 *   "error": "驗證失敗（CreateAccountCommand）：[field] message",
 *   "code": "VALIDATION_ERROR",
 *   "violations": [{ "field": "accountId", "message": "帳戶 ID 不得為空" }]
 * }
 * ```
 *
 * @since 1.0.0
 */

interface ErrorResponse {
  success: false
  error: string
  code?: string
}

interface ValidationErrorResponse extends ErrorResponse {
  violations: ReadonlyArray<{ readonly field: string; readonly message: string }>
}

/**
 * Error mapping from error message keywords to HTTP status codes
 *
 * **Pattern Matching:**
 * - Errors are matched by keyword substring (case-sensitive)
 * - Order matters: more specific errors should be listed first
 * - Single keyword per error type for simplicity
 */
const errorMap: Record<string, { status: number; code: string }> = {
  不存在: { status: 404, code: 'NOT_FOUND' },
  已存在: { status: 409, code: 'ALREADY_EXISTS' },
  餘額不足: { status: 422, code: 'INSUFFICIENT_BALANCE' },
  帳戶狀態: { status: 409, code: 'INVALID_ACCOUNT_STATUS' },
  已凍結: { status: 409, code: 'ACCOUNT_FROZEN' },
  已關閉: { status: 409, code: 'ACCOUNT_CLOSED' },
  不能超過: { status: 422, code: 'LIMIT_EXCEEDED' },
  金額不能為負: { status: 400, code: 'INVALID_AMOUNT' },
  貨幣不符: { status: 400, code: 'CURRENCY_MISMATCH' },
  貨幣代碼: { status: 400, code: 'INVALID_CURRENCY' },
}

/**
 * Creates error handler middleware for Photon/Hono
 *
 * @returns Error handler function
 *
 * @example
 * ```typescript
 * import { app } from '@gravito/photon'
 * const errorHandler = createErrorHandler()
 * app.onError((err, ctx) => errorHandler(err, ctx))
 * ```
 */
export function createErrorHandler() {
  return (err: Error, ctx: any) => {
    // 優先處理 ValidationError（輸入驗證失敗），回傳 400 Bad Request 及詳細 violations
    if (err instanceof ValidationError) {
      return ctx.json(
        {
          success: false,
          error: err.message,
          code: 'VALIDATION_ERROR',
          violations: err.violations,
        } as ValidationErrorResponse,
        400
      )
    }

    // Try to match known business errors
    for (const [keyword, { status, code }] of Object.entries(errorMap)) {
      if (err.message.includes(keyword)) {
        return ctx.json(
          {
            success: false,
            error: err.message,
            code,
          } as ErrorResponse,
          status
        )
      }
    }

    // Log unexpected errors for monitoring
    console.error('[UNHANDLED_ERROR]', {
      timestamp: new Date().toISOString(),
      message: err.message,
      stack: err.stack,
    })

    // Return generic error response for unknown errors
    return ctx.json(
      {
        success: false,
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
      } as ErrorResponse,
      500
    )
  }
}

/**
 * Error handler wrapper for async route handlers
 *
 * Catches exceptions from async handlers and passes them to error handler.
 *
 * **Usage:**
 * ```typescript
 * router.post('/api/endpoint', async (ctx) => {
 *   try {
 *     // handler logic
 *   } catch (err) {
 *     return errorHandler(err as Error, ctx)
 *   }
 * })
 * ```
 */
export const errorHandler = createErrorHandler()
