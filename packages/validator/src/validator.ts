import { tbValidator } from '@hono/typebox-validator'
import type { TSchema } from '@sinclair/typebox'
import type { Context, MiddlewareHandler } from 'hono'

/**
 * Validation source type.
 */
export type ValidationSource = 'json' | 'query' | 'param' | 'form'

/**
 * Create a validation middleware.
 *
 * @param source - Validation source (json, query, param, form)
 * @param schema - TypeBox Schema
 * @returns Hono middleware
 *
 * @example
 * ```typescript
 * import { Schema, validate } from '@gravito/validator'
 *
 * app.post('/users',
 *   validate('json', Schema.Object({
 *     username: Schema.String(),
 *     email: Schema.String({ format: 'email' })
 *   })),
 *   (c) => {
 *     const data = c.req.valid('json')
 *     return c.json({ success: true, data })
 *   }
 * )
 * ```
 */
export function validate(source: ValidationSource, schema: TSchema): MiddlewareHandler {
  return tbValidator(source, schema)
}
