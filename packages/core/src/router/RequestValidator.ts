import type { GravitoMiddleware } from '../http/types'
import { FORM_REQUEST_SYMBOL, type FormRequestClass, type FormRequestLike } from '../Router'

/**
 * WeakMap cache for FormRequest class detection results.
 * Avoids re-instantiating classes on repeated checks.
 */
// biome-ignore lint/complexity/noBannedTypes: generic Function type needed here
const formRequestCache = new WeakMap<Function, boolean>()

/**
 * WeakMap cache for FormRequest instances.
 * Stores singleton instances to avoid re-instantiation on every request.
 */
const formRequestInstances = new WeakMap<FormRequestClass, FormRequestLike>()

/**
 * Handles validation of incoming requests using FormRequest classes.
 * Provides mechanisms to detect and convert FormRequest classes into Gravito middleware.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: utility class designed for static access
export class RequestValidator {
  /**
   * Check if a value is a FormRequest class.
   * Optimized with Symbol check, prototype check, and caching.
   * @internal
   */
  static isFormRequestClass(value: unknown): value is FormRequestClass {
    if (typeof value !== 'function') {
      return false
    }

    // Fast path 1: Check for Symbol marker (set by @gravito/impulse)
    if ((value as { [FORM_REQUEST_SYMBOL]?: boolean })[FORM_REQUEST_SYMBOL] === true) {
      return true
    }

    // Fast path 2: Filter out arrow functions (middleware)
    // Arrow functions do not have a prototype property
    if (!value.prototype) {
      return false
    }

    // Check cache to avoid re-computation
    const cached = formRequestCache.get(value)
    if (cached !== undefined) {
      return cached
    }

    // Slow path: Duck-type check with instantiation
    try {
      // Check prototype first to avoid instantiation if possible
      if ('validate' in value.prototype && typeof value.prototype.validate === 'function') {
        formRequestCache.set(value, true)
        return true
      }

      const instance = new (value as new () => unknown)()
      const isFormRequest =
        instance !== null &&
        typeof instance === 'object' &&
        'schema' in instance &&
        'validate' in instance &&
        typeof (instance as FormRequestLike).validate === 'function'

      // Cache the result
      formRequestCache.set(value, isFormRequest)
      return isFormRequest
    } catch (error) {
      // Handle different error types for better diagnostics
      if (error instanceof TypeError) {
        // Constructor doesn't exist or has wrong signature
      } else if (error instanceof ReferenceError) {
        // biome-ignore lint/suspicious/noConsole: Static utility — no Logger instance available in this scope
        console.warn('[Router] FormRequest detection failed: Missing dependencies', error)
      } else {
        // biome-ignore lint/suspicious/noConsole: Static utility — no Logger instance available in this scope
        console.warn('[Router] Unexpected error during FormRequest detection:', error)
      }
      formRequestCache.set(value, false)
      return false
    }
  }

  /**
   * Convert a FormRequest class to middleware.
   * Uses instance caching to avoid re-instantiation on every request.
   * @internal
   */
  static formRequestToMiddleware(RequestClass: FormRequestClass): GravitoMiddleware {
    // Get or create cached instance
    let request = formRequestInstances.get(RequestClass)
    if (!request) {
      request = new RequestClass()
      if (typeof request.validate !== 'function') {
        throw new Error('Invalid FormRequest: validate() is missing.')
      }
      formRequestInstances.set(RequestClass, request)
    }

    return async (ctx, next) => {
      const result = await request?.validate?.(ctx)

      if (!result) {
        await next()
        return undefined
      }

      if (!result.success) {
        const errorCode = (result.error as { error?: { code?: string } })?.error?.code
        const status = errorCode === 'AUTHORIZATION_ERROR' ? 403 : 422
        return ctx.json(result.error, status)
      }

      ctx.set('validated', result.data)
      await next()
      return undefined
    }
  }
}
