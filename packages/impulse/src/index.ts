/**
 * @gravito/impulse
 *
 * A declarative request validation library similar to Laravel FormRequest.
 *
 * Provides an elegant way to validate HTTP request data, separating validation logic from controllers.
 * Supports both Zod and Valibot, two mainstream TypeScript schema validation libraries.
 *
 * Core Features:
 * - **Declarative Validation**: Define validation rules using classes to improve code readability and maintainability.
 * - **Authorization Integration**: Handle authorization and validation logic within the same class.
 * - **Type Safety**: Full TypeScript type inference; validated data automatically obtains the correct type.
 * - **Custom Messages**: Support for field-level custom error messages and internationalization.
 * - **Blueprint**: Extract validation rules for frontend use, ensuring consistency between frontend and backend validation.
 * - **Performance Optimization**: Built-in multi-layer caching mechanisms significantly improve the performance of repeated validations.
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * // Basic usage example
 * import { ZodFormRequest, validateRequest } from '@gravito/impulse'
 * import { z } from 'zod'
 *
 * class CreateUserRequest extends ZodFormRequest {
 *   schema = z.object({
 *     name: z.string().min(2),
 *     email: z.string().email(),
 *   })
 *
 *   authorize(ctx: Context) {
 *     return ctx.get('user')?.role === 'admin'
 *   }
 * }
 *
 * app.post('/users', validateRequest(CreateUserRequest), (ctx) => {
 *   const data = ctx.get('validated')
 *   // data is validated and type-safe
 * })
 * ```
 */

// Re-export zod for convenience
export { z } from 'zod'

// Export core components
export * from './core/BlueprintGenerator'
export type { DataSource } from './core/DataExtractor'
export * from './core/DataExtractor'
// Export typed FormRequest base classes
export * from './core/FormRequestBase'
// Export performance optimization utilities
export * from './core/FormRequestInstanceCache'
export * from './core/MessageCache'
export * from './core/SchemaCache'
// Export type utilities for advanced usage
export * from './core/TypeUtils'
export * from './core/ValibotFormRequest'
export * from './core/ZodFormRequest'

// Export legacy FormRequest and related types
export type {
  FormRequestOptions,
  MessageProvider,
  ValidationErrorDetail,
  ValidationErrorResponse,
} from './FormRequest'
export {
  DefaultMessageProvider,
  FormRequest,
  validateRequest,
} from './FormRequest'

// Export validation components for advanced usage
export * from './validation/index'
