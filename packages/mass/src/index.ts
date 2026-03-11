/**
 * @gravito/mass - TypeBox-based validation for Gravito Galaxy Architecture.
 *
 * Mass provides high-performance schema validation with full TypeScript support,
 * seamlessly integrating with Photon middleware system. Named after the concept
 * of "mass" in physics, this package provides the "weight" of data integrity
 * to your API endpoints.
 *
 * ## Key Features
 *
 * - **Zero-overhead TypeBox validation** - Generates validators at build-time for faster runtime performance
 * - **Full TypeScript inference** - Validated data is fully typed without manual typings
 * - **Multiple validation sources** - Validate JSON, query, params, and form data
 * - **Custom error handling hooks** - Override default error responses
 * - **Seamless Photon/Hono integration** - Works out of the box with Gravito's HTTP layer
 *
 * @example Basic JSON validation
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { Schema, validate } from '@gravito/mass'
 *
 * const app = new Photon()
 *
 * const loginSchema = Schema.Object({
 *   username: Schema.String({ minLength: 3, maxLength: 50 }),
 *   password: Schema.String({ minLength: 8 })
 * })
 *
 * app.post('/login', validate('json', loginSchema), (c) => {
 *   const { username } = c.req.valid('json')
 *   // username is fully typed as string
 *   return c.json({ success: true, user: username })
 * })
 * ```
 *
 * @example Custom error handling
 * ```typescript
 * app.post('/register',
 *   validate('json', registerSchema, (result, c) => {
 *     if (!result.success) {
 *       return c.json({
 *         error: 'Validation failed',
 *         details: result.errors
 *       }, 400)
 *     }
 *   }),
 *   handler
 * )
 * ```
 *
 * @example Query parameter validation
 * ```typescript
 * const searchSchema = Schema.Object({
 *   q: Schema.String(),
 *   page: Schema.Optional(Schema.Number({ minimum: 1, default: 1 })),
 *   limit: Schema.Optional(Schema.Number({ minimum: 1, maximum: 100, default: 20 }))
 * })
 *
 * app.get('/search', validate('query', searchSchema), (c) => {
 *   const { q, page, limit } = c.req.valid('query')
 *   return c.json({ query: q, page, limit })
 * })
 * ```
 *
 * @see {@link validate} - Main validation middleware
 * @see {@link Schema} - TypeBox schema builders
 * @see {@link https://github.com/sinclairzx81/typebox | TypeBox Documentation}
 *
 * @packageDocumentation
 */

// Export TypeBox types
export type { Static, TSchema } from '@sinclair/typebox'
// Re-export TypeBox Schema builder as Schema
export * as Schema from '@sinclair/typebox'
// Export coercion helpers
export {
  CoercibleBoolean,
  CoercibleInteger,
  CoercibleNumber,
  coerceBoolean,
  coerceData,
  coerceDate,
  coerceInteger,
  coerceNumber,
  validateWithCoercion,
} from './coercion'
// Export error handling
export {
  createErrorFormatter,
  ERROR_MESSAGES_EN,
  ERROR_MESSAGES_ZH_TW,
  type ErrorFormatter,
  enhanceError,
  formatErrors,
  MassValidationError,
} from './errors'
// Export format registry
export {
  getFormatValidator,
  isFormatRegistered,
  REGISTERED_FORMATS,
  type RegisteredFormat,
  registerAllFormats,
  registerFormat,
  unregisterFormat,
} from './formats'
// Export OpenAPI utilities
export {
  type AstralResource,
  createAstralResource,
  createCrudResources,
  type OpenApiSchema,
  typeboxToOpenApi,
} from './openapi'
// Export types
export type {
  ValidationError,
  ValidationHook,
  ValidationResult,
} from './types'
// Export utility functions
export { partial } from './utils'
// Export validation functions
export { type ValidationSource, validate } from './validator'
