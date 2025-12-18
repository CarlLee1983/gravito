import { tbValidator } from '@hono/typebox-validator'
import type { TSchema } from '@sinclair/typebox'
import type { Context, MiddlewareHandler } from 'hono'

/**
 * 驗證來源類型
 */
export type ValidationSource = 'json' | 'query' | 'param' | 'form'

/**
 * 建立驗證中間件
 *
 * @param source - 驗證資料來源（json、query、param、form）
 * @param schema - TypeBox Schema
 * @returns Hono 中間件
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
