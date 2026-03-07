import type { Context, Env, MiddlewareHandler } from '@gravito/photon'
import { tbValidator } from '@hono/typebox-validator'
import type { Static, TSchema } from '@sinclair/typebox'

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
 * @returns A Photon middleware handler that enforces the schema
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
export function validate<
  T extends TSchema,
  S extends 'json' | 'query' | 'param' | 'form',
  E extends Env = Env,
  P extends string = string,
>(
  source: S,
  schema: T,
  hook?: (result: unknown, c: Context<E>) => Response | Promise<Response> | undefined
): MiddlewareHandler<
  E,
  P,
  {
    in: { [K in S]: Static<T> }
    out: { [K in S]: Static<T> }
  }
> {
  return tbValidator(source, schema, hook) as any
}
