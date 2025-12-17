/**
 * @gravito/orbit-request
 *
 * Form Request validation for Gravito - Laravel-style request validation with Zod
 */

// Re-export zod for convenience
export { z } from 'zod';
export type {
  DataSource,
  FormRequestOptions,
  ValidationErrorDetail,
  ValidationErrorResponse,
} from './FormRequest';
export { FormRequest, validateRequest } from './FormRequest';
