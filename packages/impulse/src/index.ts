/**
 * @gravito/impulse
 *
 * A declarative request validation library for the Gravito framework.
 *
 * Impulse provides a type-safe way to validate HTTP request data, separating validation
 * logic from controllers. It supports both Zod and Valibot for schema definition.
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
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
export * from './core/SchemaCompilationCache'

/**
 * Global management for Impulse internal state.
 *
 * Provides utilities to control caching behavior, which is essential for
 * development environments where schemas might change frequently (HMR).
 *
 * @public
 */
export class Impulse {
  /**
   * Purges all internal validation and schema caches.
   *
   * Forces re-instantiation of FormRequests and re-compilation of schemas.
   * Use this in HMR handlers to ensure code changes are reflected.
   *
   * @example
   * ```typescript
   * // In a Dev Server hook or HMR handler
   * Impulse.clearAllCaches()
   * ```
   */
  static clearAllCaches(): void {
    // Import lazily to avoid circular dependencies and ensure all modules are loaded
    const { FormRequestInstanceCache } = require('./core/FormRequestInstanceCache')
    const { SchemaCache } = require('./core/SchemaCache')
    const { SchemaCompilationCache } = require('./core/SchemaCompilationCache')
    const { MessageCache } = require('./core/MessageCache')

    FormRequestInstanceCache.clearCache()
    SchemaCache.clearCache()
    SchemaCompilationCache.clearCache()
    MessageCache.clearCache()
  }
}
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
