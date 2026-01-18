import type { Env, MiddlewareHandler } from '@gravito/photon'
import { tbValidator } from '@hono/typebox-validator'
import type { Static, TSchema } from '@sinclair/typebox'

/**
 * The source of the data to be validated.
 * @public
 */
export type ValidationSource = 'json' | 'query' | 'param' | 'form'

/**
 * Create a validation middleware using TypeBox.
 *
 * This function wraps the Hono TypeBox validator, providing a seamless
 * integration with Gravito Photon for high-performance schema validation.
 *
 * @param source - The request part to validate (json, query, param, form)
 * @param schema - The TypeBox schema to validate against
 * @param hook - Optional callback to handle validation results manually
 * @returns A Photon-compatible middleware handler.
 * @public
 */
export function validate<
  T extends TSchema,
  S extends ValidationSource,
  E extends Env = any,
  P extends string = any,
>(
  source: S,
  schema: T,
  hook?: (result: any, c: any) => any
): MiddlewareHandler<
  E,
  P,
  {
    in: { [K in S]: Static<T> }
    out: { [K in S]: Static<T> }
  }
> {
  return tbValidator(source as any, schema, hook) as any
}
