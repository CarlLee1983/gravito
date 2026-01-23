/**
 * @gravito/impulse
 *
 * Form Request validation for Gravito - Laravel-style request validation
 * Supports both Zod and Valibot schemas
 */

// Re-export zod for convenience
export { z } from 'zod'
export * from './core/BlueprintGenerator'
// Export DataSource from the correct location now
export type { DataSource } from './core/DataExtractor'
export * from './core/DataExtractor'
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
