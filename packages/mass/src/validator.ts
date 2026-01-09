import type { Env, MiddlewareHandler } from '@gravito/photon'
import { tbValidator } from '@hono/typebox-validator'
import type { Static, TSchema } from '@sinclair/typebox'

/**
 * Validation source type.
 */
export type ValidationSource = 'json' | 'query' | 'param' | 'form'

/**
 * Create a validation middleware.
 *
 * Validates the request data against the provided TypeBox schema.
 *
 * @param source - Validation source (json, query, param, form)
 * @param schema - TypeBox Schema
 * @param hook - Optional callback to handle validation results
 * @returns Photon middleware handler that validates the request.
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
