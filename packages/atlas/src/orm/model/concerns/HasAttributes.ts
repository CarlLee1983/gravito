import { SchemaRegistry } from '../../schema/SchemaRegistry'
import type { ColumnType, TableSchema } from '../../schema/types'
import { DirtyTracker } from '../DirtyTracker'
import { COLUMN_KEY } from '../decorators'
import { ColumnNotFoundError, NullableConstraintError, TypeMismatchError } from '../errors'
import { castAttribute, getExpectedJSTypes, getJSType } from '../TypeCaster'

export type ModelAttributes = Record<string, unknown>

/**
 * HasAttributes Concern
 * @description Provides attribute management functionality including getting/setting, casting, and dirty tracking.
 */
export class HasAttributes {
  /**
   * Model attributes storage
   * @internal
   */
  protected _attributes: ModelAttributes = {}

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

  constructor() {
    this._dirtyTracker = new DirtyTracker()
  }

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
  getAttribute(key: string): unknown {
    return this._attributes[key]
  }

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
  setAttribute(key: string, value: unknown): void {
    const modelCtor = this.constructor as any

    // Cast value before marking dirty and setting
    const type = modelCtor.casts?.[key]
    const castedValue = type ? this._castAttribute(key, value, type) : value

    // Mark dirty with casted value
    this._dirtyTracker.mark(key, castedValue)

    // Set value
    this._attributes[key] = castedValue
  }

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
  fill(attributes: Partial<ModelAttributes>): void {
    for (const [key, value] of Object.entries(attributes)) {
      this.setAttribute(key, value)
    }
  }

  /**
   * Get all attributes currently set on the model.
   *
   * @returns A shallow copy of the model's attributes
   */
  getAttributes(): Partial<ModelAttributes> {
    return { ...this._attributes }
  }

  /**
   * Get only the attributes that have been modified since the last sync.
   *
   * @returns An object containing only modified attributes and their current values
   */
  getDirtyAttributes(): Partial<ModelAttributes> {
    return this._dirtyTracker.getDirtyValues(this._attributes)
  }

  /**
   * Get the original value of an attribute before it was modified.
   *
   * @param key - The attribute name
   * @returns The original value from the last sync
   */
  getOriginal(key: string): unknown {
    return this._dirtyTracker.getOriginal(key)
  }

  /**
   * Check if an attribute (or the entire model) has been modified.
   *
   * @param key - Optional attribute name to check specifically
   * @returns True if the attribute or model is dirty
   */
  isDirty(key?: string): boolean {
    return this._dirtyTracker.isDirty(key)
  }

  /**
   * Check if the model has no modified attributes.
   *
   * @returns True if the model is clean
   */
  isClean(): boolean {
    return !this._dirtyTracker.isDirty()
  }

  /**
   * Determine the JavaScript type of a given value.
   *
   * @param value - The value to inspect
   * @returns A string representing the JS type (e.g., 'null', 'array', 'date', 'string')
   * @internal
   */
  protected _getJSType(value: unknown): string {
    return getJSType(value)
  }

  /**
   * Cast an attribute value to a specific type.
   *
   * @param _key - The attribute name (reserved for future use)
   * @param value - The value to cast
   * @param type - The target type (e.g., 'integer', 'boolean', 'json', 'date')
   * @returns The casted value
   * @internal
   */
  protected _castAttribute(key: string, value: unknown, type: string): unknown {
    return castAttribute(key, value, type)
  }

  /**
   * Get the expected JavaScript types for a given database column type.
   *
   * @param columnType - The database column type
   * @returns An array of valid JavaScript type strings
   * @internal
   */
  protected _getExpectedJSTypes(columnType: ColumnType): string[] {
    return getExpectedJSTypes(columnType)
  }

  /**
   * Retrieve the table schema for the model.
   *
   * @returns A promise that resolves to the table schema
   * @internal
   */
  protected async _getSchema(): Promise<TableSchema> {
    const modelCtor = this.constructor as any

    if (!this._schema) {
      const registry = SchemaRegistry.getInstance()
      this._schema = await registry.get(modelCtor.getTable())
    }

    return this._schema!
  }

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
  protected async _validateAttribute(key: string, value: unknown): Promise<void> {
    const modelCtor = this.constructor as any
    const table = modelCtor.getTable()
    const schema = await this._getSchema()

    const column = schema.columns.get(key)

    // Handle Deferred Columns (Vertical Partitioning)
    const columnMeta = modelCtor[COLUMN_KEY] || {}
    const options = columnMeta[key]
    if (options?.deferred) {
      // For now, we skip deep schema validation for deferred columns
      // if they aren't in the main table.
      // Ideally we should fetch the extension table schema too.
      return
    }

    if (!column) {
      if (modelCtor.strictMode) {
        // 提供可用欄位列表以改善錯誤訊息
        const availableColumns = Array.from(schema.columns.keys())
        throw new ColumnNotFoundError(table, key, availableColumns)
      }
      return
    }

    // Null check
    if (value === null && !column.nullable) {
      throw new NullableConstraintError(modelCtor.table, key)
    }

    // Type check (only if value is not null)
    if (value !== null && value !== undefined) {
      const jsType = this._getJSType(value)
      const expectedTypes = this._getExpectedJSTypes(column.type)

      // SQLite specific: if column is string but we get an object, check if it might be JSON
      if (jsType === 'object' && expectedTypes.includes('string')) {
        // Allow it - the driver will handle serialization
        return
      }

      if (!expectedTypes.includes(jsType)) {
        throw new TypeMismatchError(table, key, expectedTypes.join(' | '), jsType, value)
      }
    }
  }
}
