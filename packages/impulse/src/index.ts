/**
 * @gravito/impulse
 *
 * Form Request validation for Gravito - Laravel-style request validation
 * Supports both Zod and Valibot schemas
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
