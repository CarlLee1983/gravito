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
export function createErrorBag(errors: Record<string, string[]>): ErrorBag {
  return {
    has: (field) => (errors[field]?.length ?? 0) > 0,
    first: (field) => {
      if (field) {
        return errors[field]?.[0]
      }
      for (const key of Object.keys(errors)) {
        if (errors[key]?.[0]) {
          return errors[key][0]
        }
      }
      return undefined
    },
    get: (field) => errors[field] ?? [],
    all: () => errors,
    any: () => Object.keys(errors).length > 0,
    count: () => Object.values(errors).flat().length,
  }
}

/**
 * Helper to retrieve the ErrorBag from session flash data.
 * @public
 */
export function errors(c: GravitoContext): ErrorBag {
  const session = c.get('session') as { getFlash?: (key: string) => unknown } | undefined
  const flashed = session?.getFlash?.('errors') ?? {}
  return createErrorBag(flashed as Record<string, string[]>)
}

/**
 * Helper to retrieve old input value from session flash.
 * @public
 */
export function old(c: GravitoContext, field: string, defaultValue?: unknown): unknown {
  const session = c.get('session') as { getFlash?: (key: string) => unknown } | undefined
  const oldInput = session?.getFlash?.('_old_input') ?? {}
  return (oldInput as Record<string, unknown>)[field] ?? defaultValue
}
