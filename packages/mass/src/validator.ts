import { tbValidator } from '@hono/typebox-validator'
import type { Static, TSchema } from '@sinclair/typebox'
import type { Env, MiddlewareHandler } from 'hono'

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
 * @returns Hono middleware handler that validates the request.
 */
export function validate<
  T extends TSchema,
  S extends ValidationSource,
  E extends Env = any,
  P extends string = any,
>(
  source: S,
  schema: T
): MiddlewareHandler<
  E,
  P,
  {
    in: { [K in S]: Static<T> }
    out: { [K in S]: Static<T> }
  }
> {
  return tbValidator(source as any, schema) as any
}
