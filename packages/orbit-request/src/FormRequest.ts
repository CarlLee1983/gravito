import { AuthorizationException, ValidationException } from 'gravito-core'
import type { Context, MiddlewareHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { z } from 'zod'

/**
 * Validation error detail for a single field
 */
export interface ValidationErrorDetail {
  field: string
  message: string
  code?: string | undefined
}

/**
 * Structured validation error response
 */
export interface ValidationErrorResponse {
  success: false
  error: {
    code: 'VALIDATION_ERROR' | 'AUTHORIZATION_ERROR'
    message: string
    details: ValidationErrorDetail[]
  }
}

/**
 * Data source for validation
 */
export type DataSource = 'json' | 'form' | 'query' | 'param'

/**
 * i18n message provider interface
 */
export interface MessageProvider {
  /** Get localized message for a validation error */
  getMessage(code: string, field: string, defaultMessage: string): string
  /** Get the "Validation failed" message */
  getValidationFailedMessage(): string
  /** Get the "Unauthorized" message */
  getUnauthorizedMessage(): string
}

/**
 * Default message provider (passthrough)
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
 * FormRequest configuration options
 */
export interface FormRequestOptions {
  /** HTTP status code for validation errors (default: 422) */
  errorStatus?: ContentfulStatusCode
  /** HTTP status code for authorization errors (default: 403) */
  authErrorStatus?: ContentfulStatusCode
  /** i18n message provider for localized error messages */
  messageProvider?: MessageProvider
}

/**
 * Schema-agnostic validation result interface
 */
interface SchemaValidationResult {
  success: boolean
  data?: unknown
  errors?: Array<{ path: string[]; message: string; code?: string | undefined }>
}

/**
 * Valibot-like schema interface (for duck-typing)
 */
interface ValibotLikeSchema {
  _run?(
    dataset: unknown,
    config?: unknown
  ): { issues?: Array<{ path?: Array<{ key: string }>; message: string; type?: string }> }
  parse?(data: unknown): unknown
}

/**
 * Check if schema is Zod-like
 */
function isZodSchema(schema: unknown): schema is z.ZodType {
  return (
    schema !== null &&
    typeof schema === 'object' &&
    'safeParse' in schema &&
    typeof (schema as { safeParse: unknown }).safeParse === 'function'
  )
}

/**
 * Check if schema is Valibot-like
 */
function isValibotSchema(schema: unknown): schema is ValibotLikeSchema {
  return (
    schema !== null &&
    typeof schema === 'object' &&
    ('_run' in schema || ('parse' in schema && !('safeParse' in schema)))
  )
}

/**
 * Validate data with Zod schema
 */
function validateWithZod(schema: z.ZodType, data: unknown): SchemaValidationResult {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return {
    success: false,
    errors: result.error.errors.map((err) => ({
      path: err.path.map(String),
      message: err.message,
      code: err.code,
    })),
  }
}

/**
 * Validate data with Valibot schema (dynamic import not needed, uses duck-typing)
 */
function validateWithValibot(schema: ValibotLikeSchema, data: unknown): SchemaValidationResult {
  try {
    // Try using _run for Valibot v1+
    if (schema._run) {
      const result = schema._run({ typed: false, value: data }, {})
      if (!result.issues || result.issues.length === 0) {
        return { success: true, data }
      }
      return {
        success: false,
        errors: result.issues.map((issue) => ({
          path: issue.path?.map((p) => p.key) ?? [],
          message: issue.message,
          code: issue.type,
        })),
      }
    }
    // Fallback to parse (throws on error)
    if (schema.parse) {
      const data2 = schema.parse(data)
      return { success: true, data: data2 }
    }
    return { success: false, errors: [{ path: [], message: 'Invalid schema' }] }
  } catch (err: unknown) {
    const error = err as {
      issues?: Array<{ path?: Array<{ key: string }>; message: string; type?: string }>
    }
    if (error.issues) {
      return {
        success: false,
        errors: error.issues.map((issue) => ({
          path: issue.path?.map((p) => p.key) ?? [],
          message: issue.message,
          code: issue.type,
        })),
      }
    }
    return { success: false, errors: [{ path: [], message: String(err) }] }
  }
}

/**
 * Base class for Form Request validation.
 * Supports both Zod and Valibot schemas.
 *
 * @example
 * ```typescript
 * // With Zod
 * import { FormRequest } from '@gravito/orbit-request'
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
 * import { FormRequest } from '@gravito/orbit-request'
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
   * Get raw data from context based on source
   */
  public async getData(ctx: Context): Promise<unknown> {
    switch (this.source) {
      case 'json':
        return ctx.req.json().catch(() => ({}))
      case 'form': {
        const fd = await ctx.req.formData().catch(() => null)
        if (!fd) {
          return {}
        }
        const obj: Record<string, unknown> = {}
        fd.forEach((value, key) => {
          obj[key] = value
        })
        return obj
      }
      case 'query':
        return ctx.req.query()
      case 'param':
        return ctx.req.param()
      default:
        return {}
    }
  }

  /**
   * Get localized/custom message for a validation error
   */
  protected getErrorMessage(
    field: string,
    code: string | undefined,
    defaultMessage: string
  ): string {
    // 1. Check custom messages from messages() method
    if (this.messages) {
      const customMessages = this.messages()
      const key = code ? `${field}.${code}` : field
      if (customMessages[key]) {
        return customMessages[key]
      }
      // Try field-only key
      if (customMessages[field]) {
        return customMessages[field]
      }
    }

    // 2. Check i18n message provider
    if (this.options.messageProvider) {
      return this.options.messageProvider.getMessage(code ?? '', field, defaultMessage)
    }

    // 3. Return default
    return defaultMessage
  }

  /**
   * Validate request data
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
    let result: SchemaValidationResult

    if (isZodSchema(this.schema)) {
      result = validateWithZod(this.schema, data)
    } else if (isValibotSchema(this.schema)) {
      result = validateWithValibot(this.schema, data)
    } else {
      // Unknown schema type, try duck-typing for safeParse
      const schemaAny = this.schema as {
        safeParse?: (data: unknown) => {
          success: boolean
          data?: unknown
          error?: { errors: Array<{ path: unknown[]; message: string; code?: string }> }
        }
      }
      if (schemaAny.safeParse) {
        const r = schemaAny.safeParse(data)
        if (r.success) {
          result = { success: true, data: r.data }
        } else {
          result = {
            success: false,
            errors:
              r.error?.errors.map((e) => ({
                path: e.path.map(String),
                message: e.message,
                code: e.code,
              })) ?? [],
          }
        }
      } else {
        throw new Error('Unsupported schema type. Use Zod or Valibot.')
      }
    }

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
}

/**
 * Create a Hono middleware from a FormRequest class
 */
export function validateRequest<T>(RequestClass: new () => FormRequest<T>): MiddlewareHandler {
  return async (ctx, next) => {
    const request = new RequestClass()
    const result = await request.validate(ctx)

    if (!result.success) {
      const errorData = result.error.error

      if (errorData.code === 'AUTHORIZATION_ERROR') {
        throw new AuthorizationException(errorData.message)
      }

      if (errorData.code === 'VALIDATION_ERROR') {
        const exception = new ValidationException(
          errorData.details.map((d) => ({
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
    return next()
  }
}

// Type augmentation for Hono context (backward compatibility)
declare module 'hono' {
  interface ContextVariableMap {
    validated: unknown
  }
}

// Module augmentation for GravitoVariables (new abstraction)
declare module 'gravito-core' {
  interface GravitoVariables {
    /** Validated request data from FormRequest */
    validated?: unknown
  }
}
