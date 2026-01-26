import type { z } from 'zod'

/**
 * Type utility to check if a type extends Zod schema.
 *
 * @public
 * @since 3.1.0
 */
export type IsZodSchema<T> = T extends z.ZodType ? true : false

/**
 * Extract type from Zod schema for type inference.
 *
 * @public
 * @since 3.1.0
 */
export type InferZodType<T extends z.ZodType> = z.infer<T>

/**
 * Generic validation result with proper typing.
 *
 * @public
 * @since 3.1.0
 */
export type ValidationResult<TData> = ValidationSuccess<TData> | ValidationFailure

/**
 * Successful validation result with typed data.
 *
 * @public
 * @since 3.1.0
 */
export interface ValidationSuccess<TData> {
  readonly success: true
  readonly data: TData
}

/**
 * Failed validation result with structured errors.
 *
 * @public
 * @since 3.1.0
 */
export interface ValidationFailure {
  readonly success: false
  readonly error: {
    success: false
    error: {
      code: 'VALIDATION_ERROR' | 'AUTHORIZATION_ERROR'
      message: string
      details: Array<{
        field: string
        message: string
        code?: string
      }>
    }
  }
}
