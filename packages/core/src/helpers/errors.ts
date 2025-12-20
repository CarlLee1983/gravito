import type { Context } from 'hono'

export interface ErrorBag {
  has(field: string): boolean
  first(field?: string): string | undefined
  get(field: string): string[]
  all(): Record<string, string[]>
  any(): boolean
  count(): number
}

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

// Helper to get errors from session flash
export function errors(c: Context): ErrorBag {
  const session = c.get('session') as { getFlash?: (key: string) => unknown } | undefined
  const flashed = session?.getFlash?.('errors') ?? {}
  return createErrorBag(flashed as Record<string, string[]>)
}

// Helper to get old input value
export function old(c: Context, field: string, defaultValue?: unknown): unknown {
  const session = c.get('session') as { getFlash?: (key: string) => unknown } | undefined
  const oldInput = session?.getFlash?.('_old_input') ?? {}
  return (oldInput as Record<string, unknown>)[field] ?? defaultValue
}
