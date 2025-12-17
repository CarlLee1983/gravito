import type { Context, MiddlewareHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { z } from 'zod';

/**
 * Validation error detail for a single field
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code?: string;
}

/**
 * Structured validation error response
 */
export interface ValidationErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR' | 'AUTHORIZATION_ERROR';
    message: string;
    details: ValidationErrorDetail[];
  };
}

/**
 * Data source for validation
 */
export type DataSource = 'json' | 'form' | 'query' | 'param';

/**
 * FormRequest configuration options
 */
export interface FormRequestOptions {
  /** HTTP status code for validation errors (default: 422) */
  errorStatus?: ContentfulStatusCode;
  /** HTTP status code for authorization errors (default: 403) */
  authErrorStatus?: ContentfulStatusCode;
}

/**
 * Base class for Form Request validation.
 * Extend this class to create validated request handlers.
 *
 * @example
 * ```typescript
 * import { FormRequest } from '@gravito/orbit-request'
 * import { z } from 'zod'
 *
 * export class StoreUserRequest extends FormRequest {
 *   schema = z.object({
 *     name: z.string().min(2),
 *     email: z.string().email(),
 *   })
 * }
 * ```
 */
export abstract class FormRequest<T extends z.ZodType = z.ZodType> {
  /** Zod schema for request validation */
  abstract schema: T;

  /** Data source: 'json' | 'form' | 'query' | 'param' */
  source: DataSource = 'json';

  /** Configuration options */
  options: FormRequestOptions = {};

  /**
   * Authorization check (optional).
   * Return false to reject the request with 403.
   */
  authorize?(ctx: Context): boolean | Promise<boolean>;

  /**
   * Transform data before validation (optional).
   * Useful for coercing types or adding defaults.
   */
  transform?(data: unknown): unknown;

  /**
   * Get raw data from context based on source
   */
  protected async getData(ctx: Context): Promise<unknown> {
    switch (this.source) {
      case 'json':
        return ctx.req.json().catch(() => ({}));
      case 'form': {
        const fd = await ctx.req.formData().catch(() => null);
        if (!fd) return {};
        const obj: Record<string, unknown> = {};
        fd.forEach((value, key) => {
          obj[key] = value;
        });
        return obj;
      }
      case 'query':
        return ctx.req.query();
      case 'param':
        return ctx.req.param();
      default:
        return {};
    }
  }

  /**
   * Validate request data
   */
  async validate(
    ctx: Context
  ): Promise<
    { success: true; data: z.infer<T> } | { success: false; error: ValidationErrorResponse }
  > {
    // 1. Authorization check
    if (this.authorize) {
      const authorized = await this.authorize(ctx);
      if (!authorized) {
        return {
          success: false,
          error: {
            success: false,
            error: {
              code: 'AUTHORIZATION_ERROR',
              message: 'Unauthorized',
              details: [],
            },
          },
        };
      }
    }

    // 2. Get data
    let data = await this.getData(ctx);

    // 3. Transform if needed
    if (this.transform) {
      data = this.transform(data);
    }

    // 4. Validate with Zod
    const result = this.schema.safeParse(data);

    if (!result.success) {
      const details: ValidationErrorDetail[] = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      return {
        success: false,
        error: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details,
          },
        },
      };
    }

    return { success: true, data: result.data };
  }
}

/**
 * Create a Hono middleware from a FormRequest class
 */
export function validateRequest<T extends z.ZodType>(
  RequestClass: new () => FormRequest<T>
): MiddlewareHandler {
  return async (ctx, next) => {
    const request = new RequestClass();
    const result = await request.validate(ctx);

    if (!result.success) {
      const status: ContentfulStatusCode =
        result.error.error.code === 'AUTHORIZATION_ERROR'
          ? (request.options.authErrorStatus ?? 403)
          : (request.options.errorStatus ?? 422);

      return ctx.json(result.error, status);
    }

    // Store validated data in context
    ctx.set('validated', result.data);
    return next();
  };
}

// Type augmentation for Hono context
declare module 'hono' {
  interface ContextVariableMap {
    validated: unknown;
  }
}
