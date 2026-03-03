import type { GravitoContext } from '../http/types'
/**
 * Interface for displaying validation errors in views.
 * @public
 */
export interface ErrorBag {
  /** Check if a field has errors */
  has(field: string): boolean
  /** Get the first error message for a field (or any first error if no field specified) */
  first(field?: string): string | undefined
  /** Get all error messages for a field */
  get(field: string): string[]
  /** Get all errors for all fields */
  all(): Record<string, string[]>
  /** Check if there are any errors */
  any(): boolean
  /** Get total number of error messages */
  count(): number
}
/**
 * Create a new ErrorBag instance from raw errors.
 * @public
 */
export declare function createErrorBag(errors: Record<string, string[]>): ErrorBag
/**
 * Helper to retrieve the ErrorBag from session flash data.
 * @public
 */
export declare function errors(c: GravitoContext): ErrorBag
/**
 * Helper to retrieve old input value from session flash.
 * @public
 */
export declare function old(c: GravitoContext, field: string, defaultValue?: unknown): unknown
