/**
 * @gravito/mass
 *
 * TypeBox-based validation for Gravito
 * High-performance schema validation with full TypeScript support
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono'
 * import { Schema, validate } from '@gravito/mass'
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

// Export validator
export { tbValidator as validator } from '@hono/typebox-validator'

// Export TypeBox types
export type { Static, TSchema } from '@sinclair/typebox'
// Re-export TypeBox Schema builder as Schema
export * as Schema from '@sinclair/typebox'

// Export validate function
export { type ValidationSource, validate } from './validator'
