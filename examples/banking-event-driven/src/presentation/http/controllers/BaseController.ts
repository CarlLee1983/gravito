import type { GravitoContext } from '@gravito/core'
import type { FormRequest } from '@gravito/impulse'
import { HttpError } from '#presentation/http/errors'

/**
 * Base controller providing shared utilities for HTTP request handling.
 */
export abstract class BaseController {
  /**
   * Unified error handler that formats exceptions into consistent JSON responses.
   * Maps domain errors to appropriate HTTP status codes without relying on string patterns.
   *
   * @param c - The Gravito context for the current request.
   * @param error - The caught error object.
   * @returns A Response object with appropriate status code and error message.
   */
  protected handleError(c: GravitoContext, error: unknown): Response {
    // Handle HttpError subclasses (typed exceptions)
    if (error instanceof HttpError) {
      return c.json({ success: false, error: error.message }, error.statusCode)
    }

    // Handle domain validation errors
    if (error instanceof Error) {
      const message = error.message

      // Domain error classification by exception type name or message start
      if (error.name === 'ValidationError' || message.startsWith('Validation failed')) {
        return c.json({ success: false, error: message }, 400)
      }

      // Business rule violations (frozen account, insufficient funds, etc.)
      if (
        error.name === 'BusinessRuleError' ||
        message.includes('frozen') ||
        message.includes('Insufficient funds') ||
        message.includes('not found') ||
        message.includes('Account is')
      ) {
        return c.json({ success: false, error: message }, 422)
      }
    }

    // Fallback for unknown error types
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    return c.json({ success: false, error: message }, 500)
  }

  /**
   * Validates the request data using a specified FormRequest class.
   *
   * @param c - The Gravito context.
   * @param RequestClass - The FormRequest class to use for validation.
   * @returns The validated and typed request data.
   * @throws {Error} If validation fails, containing detailed error messages.
   */
  protected async validate<T>(
    c: GravitoContext,
    RequestClass: new () => FormRequest<T>
  ): Promise<any> {
    const req = new RequestClass()
    const result = await req.validate(c)

    if (!result.success) {
      // Defensive access to nested error structure
      const details = result.error?.error?.details
      if (Array.isArray(details) && details.length > 0) {
        const messages = details
          .map((d: { field: string; message: string }) => `${d.field}: ${d.message}`)
          .join(', ')
        throw new Error(`Validation failed: ${messages}`)
      }
      const errorMessage = result.error?.error?.message ?? 'Validation failed'
      throw new Error(errorMessage)
    }

    return result.data
  }
}
