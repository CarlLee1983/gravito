import type { GravitoContext } from '@gravito/core'
import type { FormRequest } from '@gravito/impulse'
import { HttpError } from '#presentation/http/errors'

/**
 * Base controller providing shared utilities for HTTP request handling.
 */
export abstract class BaseController {
  /**
   * Unified error handler that formats exceptions into consistent JSON responses.
   *
   * @param c - The Gravito context for the current request.
   * @param error - The caught error object.
   * @returns A Response object with appropriate status code and error message.
   */
  protected handleError(c: GravitoContext, error: unknown): Response {
    if (error instanceof HttpError) {
      return c.json({ success: false, error: error.message }, error.statusCode)
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    const statusCode = this.inferStatusFromMessage(message)
    return c.json({ success: false, error: message }, statusCode)
  }

  /**
   * Infers an appropriate HTTP status code based on common error message patterns.
   * Fallback logic when specific HttpErrors are not used.
   *
   * @param message - The error message string.
   * @returns A numeric HTTP status code.
   */
  private inferStatusFromMessage(message: string): number {
    if (message.startsWith('Validation failed')) return 400
    if (/not found|不存在/i.test(message)) return 404
    if (/insufficient|frozen|active|negative|allowed/i.test(message)) return 422
    return 500
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
      const details = result.error.error.details
      if (details && details.length > 0) {
        const messages = details.map((d: any) => `${d.field}: ${d.message}`).join(', ')
        throw new Error(`Validation failed: ${messages}`)
      }
      throw new Error(result.error.error.message || 'Validation failed')
    }

    return result.data
  }
}
