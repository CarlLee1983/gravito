import { SchemaRegistry } from '../../schema/SchemaRegistry'
import type { ColumnType, TableSchema } from '../../schema/types'
import { DirtyTracker } from '../DirtyTracker'
import { ColumnNotFoundError, NullableConstraintError, TypeMismatchError } from '../errors'

export type ModelAttributes = Record<string, unknown>

/**
 * HasAttributes Concern
 * @description Provides attribute management functionality including getting/setting, casting, and dirty tracking.
 */
export class HasAttributes {
  /**
   * Static schema registry for JIT validation.
   * @internal
   */
  public static schemaRegistry?: any

  /**
   * Static error classes for validation.
   * @internal
   */
  public static validationErrors?: {
    ColumnNotFoundError: any
    NullableConstraintError: any
    TypeMismatchError: any
  }

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

    // Mark dirty
    this._dirtyTracker.mark(key, value)

    // Cast value before setting
    const type = modelCtor.casts?.[key]
    const castedValue = type ? this._castAttribute(key, value, type) : value

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
    if (value === null) {
      return 'null'
    }
    if (Array.isArray(value)) {
      return 'array'
    }
    if (value instanceof Date) {
      return 'date'
    }
    return typeof value
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
  protected _castAttribute(_key: string, value: unknown, type: string): unknown {
    if (value === null || value === undefined) {
      return value
    }

    switch (type) {
      case 'integer':
      case 'bigint':
      case 'smallint':
      case 'decimal':
      case 'float':
        return typeof value === 'string' ? parseFloat(value) : Number(value)

      case 'string':
        return String(value)

      case 'boolean':
        return [true, 1, '1', 'true', 'on', 'yes'].includes(value as string | number | boolean)

      case 'json':
      case 'jsonb':
        if (typeof value === 'object') {
          return value
        }
        try {
          return JSON.parse(value as string)
        } catch (_e) {
          return value
        }

      case 'collection':
        // Placeholder for Collection support
        return Array.isArray(value) ? value : [value]

      case 'date':
      case 'time':
      case 'datetime':
        if (value instanceof Date) {
          return value
        }
        return new Date(value as string | number)

      case 'timestamp':
        return value instanceof Date
          ? value.getTime()
          : new Date(value as string | number).getTime()
    }

    return value
  }

  /**
   * Get the expected JavaScript types for a given database column type.
   *
   * @param columnType - The database column type
   * @returns An array of valid JavaScript type strings
   * @internal
   */
  protected _getExpectedJSTypes(columnType: ColumnType): string[] {
    const typeMap: Record<ColumnType, string[]> = {
      string: ['string'],
      text: ['string'],
      integer: ['number'],
      bigint: ['number', 'string'],
      smallint: ['number'],
      decimal: ['number', 'string'],
      float: ['number'],
      boolean: ['boolean'],
      date: ['date', 'string'],
      time: ['string'],
      datetime: ['date', 'string'],
      timestamp: ['number', 'date'],
      json: ['object', 'string'],
      jsonb: ['object', 'string'],
      uuid: ['string'],
      binary: ['string'],
      enum: ['string'],
      unknown: ['string'],
    }

    return typeMap[columnType] || ['string']
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
