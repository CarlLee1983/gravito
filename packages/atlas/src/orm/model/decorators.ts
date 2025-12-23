/**
 * Relationship and Model Decorators
 */

import type { Model } from './Model'

/**
 * Soft Deletes Decorator Options
 */
export interface SoftDeletesOptions {
  column?: string
}

/**
 * Meta keys for decorators
 */
export const SOFT_DELETES_KEY = Symbol('soft_deletes')
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
  return (target: any) => {
    const column = options.column || 'deleted_at'

    // Store metadata on the model class
    target[SOFT_DELETES_KEY] = { column }

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
 * Marks a property as a database column
 */
export function column(options: ColumnOptions = {}): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const constructor = target.constructor
    if (!constructor[COLUMN_KEY]) {
      constructor[COLUMN_KEY] = {}
    }
    constructor[COLUMN_KEY][propertyKey] = options
  }
}

// Add type-specific helpers (chaining/static methods style)
;(column as any).dateTime = (options: ColumnOptions = {}) => {
    return column(options)
}