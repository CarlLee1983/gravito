import type { ValidationSource } from './types'

/**
 * Custom error class thrown or returned when validation fails.
 *
 * This class encapsulates the validation error details and the source of the data
 * (e.g., 'json', 'query') that failed validation. It is suitable for use in
 * exception filters or global error handlers.
 *
 * @example
 * ```typescript
 * throw new MassValidationError('json', [
 *   { path: '/email', message: 'Invalid email format' }
 * ])
 * ```
 */
export class MassValidationError extends Error {
  /**
   * Creates a new MassValidationError instance.
   *
   * @param source - The source of the invalid data
   * @param errors - The list of validation errors
   */
  constructor(
    public readonly source: ValidationSource,
    public readonly errors: Array<{ path: string; message: string }>
  ) {
    super(`Validation failed for ${source}`)
    this.name = 'MassValidationError'
  }

  /**
   * Serializes the error to a JSON-compatible object.
   *
   * @returns A structured error object suitable for API responses
   */
  toJSON() {
    return {
      error: 'ValidationError',
      source: this.source,
      details: this.errors,
    }
  }
}

/**
 * Formats a flat list of validation errors into a field-grouped structure.
 *
 * This helper transforms TypeBox's error format into a more frontend-friendly
 * format where errors are grouped by field name.
 *
 * @param errors - The raw validation errors
 * @returns An object where keys are field names and values are arrays of error messages
 *
 * @example
 * ```typescript
 * const errors = [{ path: '/user/name', message: 'Required' }]
 * const formatted = formatErrors(errors)
 * // Result: { fields: { 'user.name': ['Required'] } }
 * ```
 */
export function formatErrors(errors: Array<{ path: string; message: string }>): {
  fields: Record<string, string[]>
} {
  const fields: Record<string, string[]> = {}

  for (const err of errors) {
    const fieldName = err.path.replace(/^\//, '').replace(/\//g, '.')
    if (!fields[fieldName]) {
      fields[fieldName] = []
    }
    fields[fieldName].push(err.message)
  }

  return { fields }
}
