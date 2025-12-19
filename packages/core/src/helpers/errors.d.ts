import type { Context } from 'hono'
export interface ErrorBag {
  has(field: string): boolean
  first(field?: string): string | undefined
  get(field: string): string[]
  all(): Record<string, string[]>
  any(): boolean
  count(): number
}
export declare function createErrorBag(errors: Record<string, string[]>): ErrorBag
export declare function errors(c: Context): ErrorBag
export declare function old(c: Context, field: string, defaultValue?: unknown): unknown
//# sourceMappingURL=errors.d.ts.map
