import type { Context, Env, MiddlewareHandler } from '@gravito/photon'
import { tbValidator } from '@hono/typebox-validator'
import type { Static, TSchema } from '@sinclair/typebox'

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
 * @example
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
export function validate<
  T extends TSchema,
  S extends string,
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
  return tbValidator(source as any, schema, hook as any) as any
}
