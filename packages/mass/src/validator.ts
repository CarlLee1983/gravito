import type { GravitoContext, GravitoMiddleware } from '@gravito/core'
import type { Static, TSchema } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import type { Context as HonoContext } from 'hono'

export type {
  ValidationError,
  ValidationHook,
  ValidationResult,
  ValidationSource,
} from './types'

/**
 * Creates a validation middleware using TypeBox schemas.
 *
 * This middleware validates incoming request data against the provided schema.
 * It integrates seamlessly with Photon's type system, providing full type safety
 * for validated data in the request context.
 *
 * @param source - The request data source to validate (json, query, param, form)
 * @param schema - The TypeBox schema defining the expected data structure
 * @param hook - Optional callback to handle validation results manually
 * @returns A Gravito middleware handler that enforces the schema
 *
 * @example Validating a JSON body
 * ```typescript
 * app.post('/users',
 *   validate('json', Schema.Object({
 *     name: Schema.String(),
 *     age: Schema.Number()
 *   })),
 *   (c) => {
 *     const user = c.req.valid('json')
 *     return c.json({ created: user.name })
 *   }
 * )
 * ```
 *
 * @example Custom error handling with hook
 * ```typescript
 * validate('query', schema, (result, c) => {
 *   if (!result.success) {
 *     return c.json({ error: 'Invalid query params' }, 400)
 *   }
 * })
 * ```
 */
export function validate<T extends TSchema>(
  source: 'json' | 'query' | 'param' | 'form',
  schema: T,
  hook?: (result: unknown, c: GravitoContext) => Response | Promise<Response> | undefined
): GravitoMiddleware {
  return tbValidator(source, schema, hook)
}

/**
 * Internal TypeBox validator middleware implementation.
 *
 * Uses @sinclair/typebox/value for schema validation without Hono dependency.
 *
 * @internal
 */
function tbValidator<T extends TSchema>(
  source: 'json' | 'query' | 'param' | 'form',
  schema: T,
  hook?: (result: unknown, c: GravitoContext) => Response | Promise<Response> | undefined
): GravitoMiddleware {
  return async (ctx: GravitoContext, next) => {
    // Handle both Hono native context and Gravito wrapped context
    const honoCtx = (ctx.native || ctx) as HonoContext
    let data: unknown

    // Extract data from request based on source
    switch (source) {
      case 'json':
        try {
          data = await honoCtx.req.json()
        } catch (_error) {
          const errorRes = await hook?.({ success: false }, ctx)
          return errorRes || honoCtx.json({ error: 'Invalid JSON' }, 400)
        }
        break

      case 'query':
        data = honoCtx.req.query()
        break

      case 'param':
        data = honoCtx.req.param()
        break

      case 'form':
        try {
          data = await honoCtx.req.parseBody()
        } catch (_error) {
          const errorRes = await hook?.({ success: false }, ctx)
          return errorRes || honoCtx.json({ error: 'Invalid form data' }, 400)
        }
        break

      default:
        data = {}
    }

    // Validate data using TypeBox
    const isValid = Value.Check(schema, data)

    if (!isValid) {
      const errors = Array.from(Value.Errors(schema, data))
      const result = { success: false, errors }
      const errorRes = await hook?.(result, ctx)
      return errorRes || honoCtx.json({ error: 'Validation failed' }, 400)
    }

    // Store validated data in context using Hono's native valid() method
    const validated = data as Static<T>

    // Use Hono's native request.valid() method to store validated data
    ;(honoCtx.req as any).valid = (target: string) => {
      if (target === source) {
        return validated
      }
      throw new Error(`Validation data for '${target}' not available`)
    }

    // Call hook with success result if provided
    if (hook) {
      const successRes = await hook({ success: true }, ctx)
      if (successRes) {
        return successRes
      }
    }

    // Continue to next middleware
    await next()
  }
}
