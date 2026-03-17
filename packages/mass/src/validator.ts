import type { GravitoContext, GravitoMiddleware } from '@gravito/core'
import type { Static, TSchema } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

export type {
  ValidationError,
  ValidationHook,
  ValidationResult,
} from './types'

/**
 * Validation source types.
 */
export type ValidationSource = 'json' | 'form' | 'query' | 'param' | 'header' | 'cookie'

/**
 * Validates request data using TypeBox schema.
 *
 * This middleware provides high-performance validation with full TypeScript
 * support. It leverages @hono/typebox-validator for runtime validation.
 *
 * @param source - The request data source to validate (json, query, param, form)
 * @param schema - The TypeBox schema defining the expected data structure
 * @param hook - Optional callback to handle validation results manually
 * @returns A Gravito middleware handler that enforces the schema
 *
 * @example Validating a JSON body
 * ```typescript
 * import { Type } from '@sinclair/typebox'
 * import { validate } from '@gravito/mass'
 *
 * const schema = Type.Object({
 *   name: Type.String()
 * })
 *
 * app.post('/users', validate('json', schema), (c) => {
 *   const data = c.req.valid('json')
 *   return c.json(data)
 * })
 * ```
 *
 * @param source - The data source to validate (json, query, param, etc.)
 * @param schema - TypeBox schema
 * @param hook - Optional validation hook for custom error handling
 * @returns Photon middleware handler
 * @public
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
function tbValidator(
  source: 'json' | 'query' | 'param' | 'form',
  schema: TSchema,
  hook?: (result: unknown, c: GravitoContext) => Response | Promise<Response> | undefined
): GravitoMiddleware {
  return async (ctx: GravitoContext, next) => {
    let data: unknown

    // Extract data from request based on source
    switch (source) {
      case 'json':
        try {
          data = await ctx.req.json()
        } catch (_error) {
          const errorRes = await hook?.({ success: false }, ctx)
          return errorRes || ctx.json({ error: 'Invalid JSON' }, 400)
        }
        break

      case 'query':
        data = ctx.req.queries()
        break

      case 'param':
        data = ctx.req.params()
        break

      case 'form':
        try {
          data = await ctx.req.parseBody()
        } catch (_error) {
          const errorRes = await hook?.({ success: false }, ctx)
          return errorRes || ctx.json({ error: 'Invalid form data' }, 400)
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
      return errorRes || ctx.json({ error: 'Validation failed' }, 400)
    }

    // Store validated data in context
    const validated = data as Static<TSchema>
    ctx.req.setValidated(source, validated)

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
