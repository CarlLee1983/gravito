/**
 * @gravito/validator
 *
 * TypeBox-based validation for Gravito
 * High-performance schema validation with full TypeScript support
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono'
 * import { Schema, validate } from '@gravito/validator'
 *
 * const app = new Hono()
 *
 * app.post('/login',
 *   validate('json', Schema.Object({
 *     username: Schema.String(),
 *     password: Schema.String()
 *   })),
 *   (c) => {
 *     const { username } = c.req.valid('json')
 *     return c.json({ success: true, message: `Welcome ${username}` })
 *   }
 * )
 * ```
 */

// 導出驗證器
export { tbValidator as validator } from '@hono/typebox-validator'

// 導出 TypeBox 型別
export type { Static, TSchema } from '@sinclair/typebox'
// 重新導出 TypeBox Schema 建構器作為 Schema
export * as Schema from '@sinclair/typebox'

// 導出 validate 函數
export { type ValidationSource, validate } from './validator'
