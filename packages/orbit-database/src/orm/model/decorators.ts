/**
 * Relationship and Model Decorators
 */

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
