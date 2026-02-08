import type { ContentfulStatusCode } from '@gravito/core'
import { AuthorizationException, ValidationException } from '@gravito/core'
import type { Context, MiddlewareHandler } from '@gravito/core/compat'
import { BlueprintGenerator } from './core/BlueprintGenerator'
import { DataExtractor, type DataSource } from './core/DataExtractor'
import { SchemaValidatorFactory } from './validation/SchemaValidator'
// Initialize validators (this must happen for the factory to work)
import './validation/index'

/**
 * Detailed validation error information for a single field.
 *
 * @public
 */
export interface ValidationErrorDetail {
  /**
   * The dot-notation path to the field (e.g., 'user.profile.email').
   */
  field: string
  /**
   * Human-readable description of the validation failure.
   */
  message: string
  /**
   * Machine-readable error code (e.g., 'too_small', 'invalid_email').
   */
  code?: string | undefined
}

/**
 * Standardized validation error response structure.
 *
 * @public
 */
export interface ValidationErrorResponse {
  /**
   * Always false for error responses.
   */
  success: false
  /**
   * Error payload containing classification and details.
   */
  error: {
    /**
     * High-level classification of the failure.
     */
    code: 'VALIDATION_ERROR' | 'AUTHORIZATION_ERROR'
    /**
     * Summary message of the error.
     */
    message: string
    /**
     * Collection of field-specific validation errors.
     */
    details: ValidationErrorDetail[]
  }
}

/**
 * Interface for resolving machine-readable error codes into localized messages.
 *
 * @public
 */
export interface MessageProvider {
  /**
   * Resolves a specific error into a localized string.
   *
   * @param code - The error code from the validator.
   * @param field - The field name that failed validation.
   * @param defaultMessage - The fallback message provided by the validator.
   * @returns The localized error message.
   */
  getMessage(code: string, field: string, defaultMessage: string): string
  /**
   * Returns the summary message for validation failures.
   */
  getValidationFailedMessage(): string
  /**
   * Returns the summary message for authorization failures.
   */
  getUnauthorizedMessage(): string
}

/**
 * Default message provider that returns validator messages as-is.
 *
 * @public
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
 * Customization options for the FormRequest lifecycle.
 *
 * @public
 */
export interface FormRequestOptions {
  /**
   * HTTP status code for validation failures.
   * @defaultValue 422
   */
  errorStatus?: ContentfulStatusCode
  /**
   * HTTP status code for authorization failures.
   * @defaultValue 403
   */
  authErrorStatus?: ContentfulStatusCode
  /**
   * Provider for localized error messages.
   */
  messageProvider?: MessageProvider
}

/**
 * Base class for declarative request validation.
 *
 * FormRequest encapsulates validation rules, authorization logic, and data
 * transformation for a specific request. It supports both Zod and Valibot.
 *
 * @typeParam T - The schema type (ZodObject, Valibot schema, etc.)
 * @public
 *
 * @example
 * ```typescript
 * class StoreUserRequest extends FormRequest {
 *   schema = z.object({
 *     email: z.string().email(),
 *     password: z.string().min(8)
 *   })
 *
 *   authorize(ctx) {
 *     return ctx.get('user').isAdmin
 *   }
 * }
 * ```
 */
export abstract class FormRequest<T = unknown> {
  /**
   * The validation schema definition.
   */
  abstract schema: T

  /**
   * The source of data to validate.
   * @defaultValue 'json'
   */
  source: DataSource = 'json'

  /**
   * Configuration overrides for this request.
   */
  options: FormRequestOptions = {}

  private dataExtractor = new DataExtractor()

  /**
   * Determines if the current request is authorized to proceed.
   *
   * Called before validation. If it returns false, an AuthorizationException is thrown.
   *
   * @param ctx - The request context.
   * @returns True if authorized, false otherwise.
   */
  authorize?(ctx: Context): boolean | Promise<boolean>

  /**
   * Custom message for authorization failures.
   */
  authorizationMessage?(): string

  /**
   * Transforms the raw input data before it is passed to the validator.
   *
   * @param data - Raw data from the request source.
   * @returns The transformed data.
   */
  transform?(data: unknown): unknown

  /**
   * Defines custom error messages for specific fields or codes.
   *
   * Keys can be 'field.code' or just 'field'.
   *
   * @example
   * ```typescript
   * messages() {
   *   return {
   *     'email.invalid_string': 'Please provide a valid email',
   *     'age': 'Age must be a number'
   *   }
   * }
   * ```
   */
  messages?(): Record<string, string>

  /**
   * Target URL to redirect to on validation failure (SSR only).
   */
  redirect?(): string

  /**
   * Extracts raw data from the request context.
   *
   * @param ctx - The request context.
   * @returns The raw data object.
   */
  public async getData(ctx: Context): Promise<unknown> {
    return this.dataExtractor.extract(ctx, this.source)
  }

  /**
   * Resolves a localized error message for a field.
   *
   * @internal
   */
  protected getMessage(field: string, code: string | undefined, defaultMessage: string): string {
    const { MessageCache } = require('./core/MessageCache')
    const instanceId = this.constructor.name
    const cacheKey = MessageCache.createCacheKey(instanceId, field, code, defaultMessage)

    return MessageCache.getCachedMessage(cacheKey, () => {
      if (this.messages) {
        const customMessages = MessageCache.getInstanceMessages(this)
        if (customMessages) {
          const key = code ? `${field}.${code}` : field
          if (customMessages[key]) {
            return customMessages[key]
          }
          if (customMessages[field]) {
            return customMessages[field]
          }
        }
      }

      if (this.options.messageProvider) {
        return this.options.messageProvider.getMessage(code ?? '', field, defaultMessage)
      }

      return defaultMessage
    })
  }

  /**
   * @internal
   */
  private getErrorMessage(field: string, code: string | undefined, message: string): string {
    return this.getMessage(field, code, message)
  }

  /**
   * Validates the request context against the defined schema and authorization rules.
   *
   * @param ctx - The request context.
   * @returns A result object containing either validated data or error details.
   */
  async validate(
    ctx: Context
  ): Promise<
    { success: true; data: unknown } | { success: false; error: ValidationErrorResponse }
  > {
    const messageProvider = this.options.messageProvider ?? new DefaultMessageProvider()

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

    let data = await this.getData(ctx)

    if (this.transform) {
      data = this.transform(data)
    }

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
   * Generates a serializable blueprint of the validation rules for frontend consumption.
   *
   * @returns A JSON-serializable object representing the schema.
   */
  getBlueprint(): Record<string, any> {
    return BlueprintGenerator.generateBlueprint(this.schema, this.source)
  }
}

/**
 * Middleware factory for automatic request validation.
 *
 * @param RequestClass - The FormRequest class to instantiate.
 * @param options - Middleware configuration.
 * @returns A middleware handler.
 *
 * @throws {AuthorizationException} If authorization fails.
 * @throws {ValidationException} If validation fails.
 *
 * @public
 */
export function validateRequest<T>(
  RequestClass: new () => FormRequest<T>,
  options: { partial?: boolean } = {}
): MiddlewareHandler {
  return async (ctx, next) => {
    const { FormRequestInstanceCache } = require('./core/FormRequestInstanceCache')
    const request = FormRequestInstanceCache.getInstance(RequestClass)

    const result = await ((request as any).validate.length >= 2 ||
    (request as any).validate.toString().includes('partial') ||
    (request as any).schema?.constructor?.name === 'ZodObject'
      ? (request as any).validate(ctx, {
          partial: options.partial ?? ctx.req.method === 'PATCH',
        })
      : request.validate(ctx))

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

        exception.withInput(await request.getData(ctx))
        throw exception
      }

      const status: ContentfulStatusCode = request.options.errorStatus ?? 422
      return ctx.json(result.error, status)
    }

    ctx.set('validated', result.data)
    await next()
    return undefined
  }
}

declare module '@gravito/core' {
  interface GravitoVariables {
    /** Validated request data from FormRequest */
    validated?: unknown
  }
}
