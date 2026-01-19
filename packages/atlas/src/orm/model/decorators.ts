/**
 * Relationship and Model Decorators
 */
import { ModelRegistry } from './ModelRegistry'

/**
 * Soft Deletes Decorator Options
 */
export interface SoftDeletesOptions {
  column?: string
}

/**
 * Meta keys for decorators
 */
/**
 * Metadata key for Soft Deletes configuration.
 * @internal
 */
export const SOFT_DELETES_KEY = Symbol('soft_deletes')

/**
 * Metadata key for Column definitions.
 * @internal
 */
export const COLUMN_KEY = Symbol('column')

/**
 * Soft Deletes Decorator
 * @description Automatically adds a global scope to filter out deleted records
 * @example
 * ```typescript
 * @SoftDeletes()
 * class User extends Model {}
 * ```
 */
export function SoftDeletes(options: SoftDeletesOptions = {}): ClassDecorator {
  return (target: Function) => {
    const column = options.column || 'deleted_at'

    // Store metadata on the model class
    ;(target as unknown as Record<string | symbol, unknown>)[SOFT_DELETES_KEY] = { column }

    // Add boot method logic if needed, or we'll check this in Model.query()
  }
}

/**
 * Column Decorator Options
 */
export interface ColumnOptions {
  isPrimary?: boolean
  autoCreate?: boolean
  autoUpdate?: boolean
  name?: string
  serializeAs?: string | null // Name in JSON or null to hide
}

/**
 * Column Decorator
 * Marks a property as a database column.
 * Registers the model in the ModelRegistry.
 * @public
 */
export function column(options: ColumnOptions = {}): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const ctor = (target as { constructor: Function }).constructor as unknown as Record<
      string | symbol,
      unknown
    >
    if (!ctor[COLUMN_KEY]) {
      ctor[COLUMN_KEY] = {}
    }
    ;(ctor[COLUMN_KEY] as Record<string | symbol, ColumnOptions>)[propertyKey] = options

    // Auto-register in global registry
    ModelRegistry.register(ctor as unknown as typeof import('./Model').Model)
  }
}
// Add type-specific helpers (chaining/static methods style)
;(column as any).dateTime = (options: ColumnOptions = {}) => {
  return column(options)
}
