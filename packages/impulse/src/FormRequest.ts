import type { ContentfulStatusCode } from '@gravito/core'
import { AuthorizationException, ValidationException } from '@gravito/core'
import type { Context, MiddlewareHandler } from '@gravito/core/compat'
import type { z } from 'zod'
import { BlueprintGenerator } from './core/BlueprintGenerator'
// Import extracted components
import { DataExtractor, type DataSource } from './core/DataExtractor'
import { type SchemaValidationResult, SchemaValidatorFactory } from './validation/SchemaValidator'
// Initialize validators (this must happen for the factory to work)
import './validation/index'

/**
 * Validation error detail for a single field.
 *
 * @public
 * @since 3.0.0
 */
export interface ValidationErrorDetail {
  /** The dot-notated field name where the error occurred. */
  field: string
  /** The human-readable error message. */
  message: string
  /** Optional error code for machine readability (e.g., 'too_small'). */
  code?: string | undefined
}

/**
 * Structured validation error response returned in JSON responses.
 *
 * @public
 * @since 3.0.0
 */
export interface ValidationErrorResponse {
  /** Always false for error responses. */
  success: false
  /** Error container. */
  error: {
    /** High-level error code. */
    code: 'VALIDATION_ERROR' | 'AUTHORIZATION_ERROR'
    /** General error message. */
    message: string
    /** Detailed array of field-level validation errors. */
    details: ValidationErrorDetail[]
  }
}

/**
 * Data source for validation.
 *
 * @public
 * @since 3.0.0
 */

/**
 * i18n message provider interface for resolving localized error messages.
 *
 * @public
 * @since 3.0.0
 */
export interface MessageProvider {
  /**
   * Get localized message for a specific validation error.
   *
   * @param code - The error code from the validator.
   * @param field - The name of the field.
   * @param defaultMessage - Fallback message if no localization is found.
   * @returns The localized error message.
   */
  getMessage(code: string, field: string, defaultMessage: string): string
  /** Get the generic "Validation failed" summary message. */
  getValidationFailedMessage(): string
  /** Get the generic "Unauthorized" summary message. */
  getUnauthorizedMessage(): string
}

/**
 * Default message provider that returns original validator messages.
 *
 * @public
 * @since 3.0.0
 */
export class DefaultMessageProvider implements MessageProvider {
  getMessage(_code: string, _field: string, defaultMessage: string): string {
    return defaultMessage
  }
  getValidationFailedMessage(): string {
    return 'Validation failed'
  }
  getUnauthorizedMessage(): string {
    return 'Unauthorized'
  }
}

/**
 * Configuration options for the FormRequest.
 *
 * @public
 * @since 3.0.0
 */
export interface FormRequestOptions {
  /** HTTP status code for validation errors. @default 422 */
  errorStatus?: ContentfulStatusCode
  /** HTTP status code for authorization errors. @default 403 */
  authErrorStatus?: ContentfulStatusCode
  /** Custom i18n message provider for localized error messages. */
  messageProvider?: MessageProvider
}

/**
 * Base class for Form Request validation.
 * Supports both Zod and Valibot schemas.
 *
 * @example
 * ```typescript
 * // With Zod
 * import { FormRequest } from '@gravito/impulse'
 * import { z } from 'zod'
 *
 * export class StoreUserRequest extends FormRequest {
 *   schema = z.object({
 *     name: z.string().min(2),
 *     email: z.string().email(),
 *   })
 *
 *   authorize(ctx: Context) {
 *     return ctx.get('user')?.role === 'admin'
 *   }
 * }
 *
 * // With Valibot
 * import { FormRequest } from '@gravito/impulse'
 * import * as v from 'valibot'
 *
 * export class StoreUserRequest extends FormRequest {
 *   schema = v.object({
 *     name: v.pipe(v.string(), v.minLength(2)),
 *     email: v.pipe(v.string(), v.email()),
 *   })
 * }
 * ```
 */
export abstract class FormRequest<T = unknown> {
  /** Schema for request validation (Zod or Valibot) */
  abstract schema: T

  /** Data source: 'json' | 'form' | 'query' | 'param' */
  source: DataSource = 'json'

  /** Configuration options */
  options: FormRequestOptions = {}

  /** Data extractor instance for getting raw data from context */
  private dataExtractor = new DataExtractor()

  /**
   * Authorization check (optional).
   * Return false to reject the request with 403.
   *
   * @example
   * ```typescript
   * authorize(ctx: Context) {
   *   const user = ctx.get('user')
   *   return user?.role === 'admin'
   * }
   * ```
   */
  authorize?(ctx: Context): boolean | Promise<boolean>

  /**
   * Custom authorization error message (optional).
   * Override for custom messages.
   */
  authorizationMessage?(): string

  /**
   * Transform data before validation (optional).
   * Useful for coercing types or adding defaults.
   */
  transform?(data: unknown): unknown

  /**
   * Custom error messages (optional).
   * Map field.code to custom message.
   *
   * @example
   * ```typescript
   * messages() {
   *   return {
   *     'email.invalid_string': 'Please enter a valid email address',
   *     'name.too_small': 'Name must be at least 2 characters',
   *   }
   * }
   * ```
   */
  messages?(): Record<string, string>

  /**
   * Custom redirect URL for HTML validation failures (optional).
   */
  redirect?(): string

  /**
   * Get raw data from context based on source.
   *
   * @param ctx - The request context.
   * @returns A promise that resolves to the raw data object.
   */
  public async getData(ctx: Context): Promise<unknown> {
    return this.dataExtractor.extract(ctx, this.source)
  }

  /**
   * Get localized error message for a field with performance caching.
   *
   * Resolution order:
   * 1. Custom messages from messages() method (cached)
   * 2. MessageProvider (if configured)
   * 3. Default validator message
   */
  private getMessage(field: string, code: string | undefined, defaultMessage: string): string {
    // Import MessageCache lazily to avoid circular dependency
    const { MessageCache } = require('./core/MessageCache')

    // Create cache key including instance reference via constructor name
    const instanceId = this.constructor.name
    const cacheKey = MessageCache.createCacheKey(instanceId, field, code, defaultMessage)

    // Use cached message resolution
    return MessageCache.getCachedMessage(cacheKey, () => {
      // 1. Check cached custom messages from messages() method
      if (this.messages) {
        const customMessages = MessageCache.getInstanceMessages(this)
        if (customMessages) {
          const key = code ? `${field}.${code}` : field
          if (customMessages[key]) {
            return customMessages[key]
          }
          // Try field-only key
          if (customMessages[field]) {
            return customMessages[field]
          }
        }
      }

      // 2. Check i18n message provider
      if (this.options.messageProvider) {
        return this.options.messageProvider.getMessage(code ?? '', field, defaultMessage)
      }

      // 3. Return default message
      return defaultMessage
    })
  }

  private getErrorMessage(field: string, code: string | undefined, message: string): string {
    return this.getMessage(field, code, message)
  }

  /**
   * Validate request data.
   *
   * @param ctx - The request context.
   * @returns A promise resolving to a success object with data or an error object.
   */
  async validate(
    ctx: Context
  ): Promise<
    { success: true; data: unknown } | { success: false; error: ValidationErrorResponse }
  > {
    const messageProvider = this.options.messageProvider ?? new DefaultMessageProvider()

    // 1. Authorization check
    if (this.authorize) {
      const authorized = await this.authorize(ctx)
      if (!authorized) {
        const authMessage =
          this.authorizationMessage?.() ?? messageProvider.getUnauthorizedMessage()
        return {
          success: false,
          error: {
            success: false,
            error: {
              code: 'AUTHORIZATION_ERROR',
              message: authMessage,
              details: [],
            },
          },
        }
      }
    }

    // 2. Get data
    let data = await this.getData(ctx)

    // 3. Transform if needed
    if (this.transform) {
      data = this.transform(data)
    }

    // 4. Validate with appropriate schema library
    const validator = SchemaValidatorFactory.getValidator(this.schema)
    const result = await validator.validate(this.schema, data)

    if (!result.success) {
      const details: ValidationErrorDetail[] = (result.errors ?? []).map((err) => ({
        field: err.path.join('.'),
        message: this.getErrorMessage(err.path.join('.'), err.code, err.message),
        code: err.code,
      }))

      return {
        success: false,
        error: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: messageProvider.getValidationFailedMessage(),
            details,
          },
        },
      }
    }

    return { success: true, data: result.data }
  }

  /**
   * Extract validation metadata for frontend consumption (Blueprint).
   * This allows the frontend to replicate validation logic without code duplication.
   */
  getBlueprint(): Record<string, any> {
    return BlueprintGenerator.generateBlueprint(this.schema, this.source)
  }
}

/**
 * Create a middleware to validate requests with a FormRequest class.
 *
 * @param RequestClass - The FormRequest class constructor.
 * @returns A Photon middleware handler.
 */
export function validateRequest<T>(RequestClass: new () => FormRequest<T>): MiddlewareHandler {
  return async (ctx, next) => {
    // Import FormRequestInstanceCache lazily to avoid circular dependency
    const { FormRequestInstanceCache } = require('./core/FormRequestInstanceCache')

    // Use cached instance instead of creating new one every time
    const request = FormRequestInstanceCache.getInstance(RequestClass)
    const result = await request.validate(ctx)

    if (!result.success) {
      const errorData = result.error.error

      if (errorData.code === 'AUTHORIZATION_ERROR') {
        throw new AuthorizationException(errorData.message)
      }

      if (errorData.code === 'VALIDATION_ERROR') {
        const exception = new ValidationException(
          errorData.details.map((d: any) => ({
            field: d.field,
            message: d.message,
            ...(d.code !== undefined ? { code: d.code } : {}),
          })),
          errorData.message
        )

        if (request.redirect) {
          const url = request.redirect()
          if (url) {
            exception.withRedirect(url)
          }
        }

        // Attach input data for flashing
        exception.withInput(await request.getData(ctx))

        throw exception
      }

      // Fallback for unknown errors (shouldn't happen with current implementation)
      const status: ContentfulStatusCode = request.options.errorStatus ?? 422
      return ctx.json(result.error, status)
    }

    // Store validated data in context
    ctx.set('validated', result.data)
    await next()
    return undefined
  }
}

// Module augmentation for GravitoVariables (new abstraction)
declare module '@gravito/core' {
  interface GravitoVariables {
    /** Validated request data from FormRequest */
    validated?: unknown
  }
}
