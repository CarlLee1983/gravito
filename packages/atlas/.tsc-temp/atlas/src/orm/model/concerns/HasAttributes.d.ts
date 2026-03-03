import type { ColumnType, TableSchema } from '../../schema/types'
import { DirtyTracker } from '../DirtyTracker'
export type ModelAttributes = Record<string, unknown>
/**
 * HasAttributes Concern
 * @description Provides attribute management functionality including getting/setting, casting, and dirty tracking.
 */
export declare class HasAttributes {
  /**
   * Static schema registry for JIT validation.
   * @internal
   */
  static schemaRegistry?: any
  /**
   * Static error classes for validation.
   * @internal
   */
  static validationErrors?: {
    ColumnNotFoundError: any
    NullableConstraintError: any
    TypeMismatchError: any
  }
  /**
   * Model attributes storage
   * @internal
   */
  protected _attributes: ModelAttributes
  /**
   * Dirty tracker instance
   * @internal
   */
  protected _dirtyTracker: DirtyTracker<ModelAttributes>
  /**
   * Cached table schema
   * @internal
   */
  protected _schema?: TableSchema
  constructor()
  /**
   * Get an attribute value from the model.
   *
   * @param key - The attribute name to retrieve
   * @returns The raw attribute value
   *
   * @example
   * ```typescript
   * const name = user.getAttribute('name')
   * ```
   */
  getAttribute(key: string): unknown
  /**
   * Set an attribute value on the model with automatic casting.
   *
   * @param key - The attribute name to set
   * @param value - The value to assign
   *
   * @example
   * ```typescript
   * user.setAttribute('email', 'carl@example.com')
   * ```
   */
  setAttribute(key: string, value: unknown): void
  /**
   * Fill the model with an object of attributes.
   *
   * @param attributes - Key-value pairs of attributes to set
   *
   * @example
   * ```typescript
   * user.fill({ name: 'Carl', email: 'carl@example.com' })
   * ```
   */
  fill(attributes: Partial<ModelAttributes>): void
  /**
   * Get all attributes currently set on the model.
   *
   * @returns A shallow copy of the model's attributes
   */
  getAttributes(): Partial<ModelAttributes>
  /**
   * Get only the attributes that have been modified since the last sync.
   *
   * @returns An object containing only modified attributes and their current values
   */
  getDirtyAttributes(): Partial<ModelAttributes>
  /**
   * Get the original value of an attribute before it was modified.
   *
   * @param key - The attribute name
   * @returns The original value from the last sync
   */
  getOriginal(key: string): unknown
  /**
   * Check if an attribute (or the entire model) has been modified.
   *
   * @param key - Optional attribute name to check specifically
   * @returns True if the attribute or model is dirty
   */
  isDirty(key?: string): boolean
  /**
   * Check if the model has no modified attributes.
   *
   * @returns True if the model is clean
   */
  isClean(): boolean
  /**
   * Determine the JavaScript type of a given value.
   *
   * @param value - The value to inspect
   * @returns A string representing the JS type (e.g., 'null', 'array', 'date', 'string')
   * @internal
   */
  protected _getJSType(value: unknown): string
  /**
   * Cast an attribute value to a specific type.
   *
   * @param _key - The attribute name (reserved for future use)
   * @param value - The value to cast
   * @param type - The target type (e.g., 'integer', 'boolean', 'json', 'date')
   * @returns The casted value
   * @internal
   */
  protected _castAttribute(_key: string, value: unknown, type: string): unknown
  /**
   * Get the expected JavaScript types for a given database column type.
   *
   * @param columnType - The database column type
   * @returns An array of valid JavaScript type strings
   * @internal
   */
  protected _getExpectedJSTypes(columnType: ColumnType): string[]
  /**
   * Retrieve the table schema for the model.
   *
   * @returns A promise that resolves to the table schema
   * @internal
   */
  protected _getSchema(): Promise<TableSchema>
  /**
   * Validate an attribute value against the table schema.
   *
   * @param key - The attribute name to validate
   * @param value - The value to check
   * @throws {ColumnNotFoundError} If the column does not exist in strict mode
   * @throws {NullableConstraintError} If a non-nullable column is set to null
   * @throws {TypeMismatchError} If the value type does not match the column type
   * @internal
   */
  protected _validateAttribute(key: string, value: unknown): Promise<void>
}
