/**
 * Relationship and Model Decorators
 */
import { ModelRegistry } from './ModelRegistry'

/**
 * Options for the SoftDeletes decorator.
 */
export interface SoftDeletesOptions {
  /**
   * The name of the column used to store the deletion timestamp.
   * @default 'deleted_at'
   */
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
 * Metadata key for Version column.
 * @internal
 */
export const VERSION_KEY = Symbol('version')

/**
 * Soft Deletes Decorator
 *
 * Automatically adds a global scope to filter out deleted records.
 * When applied to a Model class, it ensures that queries only return records
 * where the deletion column (default 'deleted_at') is null.
 *
 * @param options - Configuration for soft deletes
 *
 * @example
 * ```typescript
 * @SoftDeletes({ column: 'deleted_at' })
 * class User extends Model {
 *   @column()
 *   declare deletedAt: Date | null
 * }
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
 * Options for the Column decorator.
 */
export interface ColumnOptions {
  /**
   * Whether the column is a primary key.
   * @default false
   */
  isPrimary?: boolean

  /**
   * Whether the column should be automatically populated with a timestamp on creation.
   * @default false
   */
  autoCreate?: boolean

  /**
   * Whether the column should be automatically updated with a timestamp on every update.
   * @default false
   */
  autoUpdate?: boolean

  /**
   * The name of the column in the database.
   * If not provided, the property name will be used.
   */
  name?: string

  /**
   * The name to use when serializing the model to JSON.
   * Set to null to hide the column from JSON output.
   */
  serializeAs?: string | null
}

/**
 * Column Decorator
 *
 * Marks a property as a database column. This decorator also triggers
 * the registration of the model in the global ModelRegistry.
 *
 * @param options - Configuration for the column
 *
 * @example
 * ```typescript
 * class User extends Model {
 *   @column({ isPrimary: true })
 *   declare id: number
 *
 *   @column({ name: 'email_address' })
 *   declare email: string
 *
 *   @column.dateTime({ autoCreate: true })
 *   declare createdAt: Date
 * }
 * ```
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

/**
 * Version Decorator for Optimistic Locking
 *
 * Marks a property as a version column for optimistic locking.
 * When a model updates, it checks if the version matches the one in the database.
 *
 * @param options - Configuration for the column (same as @column)
 */
export function version(options: ColumnOptions = {}): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    // Also apply regular column decorator logic
    column(options)(target, propertyKey)

    const ctor = (target as { constructor: Function }).constructor as unknown as Record<
      string | symbol,
      unknown
    >

    // Mark this property as the version column
    ctor[VERSION_KEY] = propertyKey
  }
}
