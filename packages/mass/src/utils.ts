import type { TObject, TPartial } from '@sinclair/typebox'
import { Type } from '@sinclair/typebox'

/**
 * Creates a new schema with all properties of the original schema set to optional.
 *
 * This utility is useful for creating "update" schemas (e.g., for PATCH requests)
 * where clients can send a subset of fields to update.
 *
 * @param schema - The original TypeBox object schema
 * @returns A new schema with all properties marked as optional
 *
 * @example
 * ```typescript
 * const userSchema = Schema.Object({
 *   name: Schema.String(),
 *   email: Schema.String()
 * })
 *
 * // All fields in updateSchema are optional
 * const updateSchema = partial(userSchema)
 * ```
 */
export function partial<T extends TObject>(schema: T): TPartial<T> {
  return Type.Partial(schema)
}
