import type { Context, Env } from '@gravito/photon'
import type { Static, TSchema } from '@sinclair/typebox'

/**
 * Supported data sources for validation.
 *
 * Determines which part of the HTTP request should be validated against the schema.
 */
export type ValidationSource = 'json' | 'query' | 'param' | 'form'

/**
 * Details of a validation error.
 *
 * Provides structured information about why a specific field failed validation.
 */
export interface ValidationError {
  /** The path to the invalid field (e.g., "/user/name") */
  path: string
  /** A human-readable description of the error */
  message: string
  /** The value or type that was expected */
  expected?: string
  /** The value or type that was actually received */
  received?: string
}

/**
 * The outcome of a validation attempt.
 *
 * Passed to validation hooks to allow custom handling of success or failure states.
 *
 * @template T - The TypeBox schema type used for validation
 */
export interface ValidationResult<T extends TSchema> {
  /** Indicates whether the data satisfied the schema */
  success: boolean
  /** The validated and typed data (only present if success is true) */
  data?: Static<T>
  /** A list of validation errors (only present if success is false) */
  errors?: ValidationError[]
}

/**
 * A callback function for intercepting validation results.
 *
 * Use this hook to customize error responses, log failures, or transform data
 * after validation but before the main route handler.
 *
 * @template T - The TypeBox schema type
 * @template E - The Photon environment type
 *
 * @param result - The outcome of the validation
 * @param context - The Photon request context
 * @returns A Response object to short-circuit the request, or undefined to proceed
 */
export type ValidationHook<T extends TSchema, E extends Env = Env> = (
  result: ValidationResult<T>,
  context: Context<E>
) => Response | Promise<Response> | undefined
