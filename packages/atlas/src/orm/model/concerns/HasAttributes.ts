import { DB } from '../../../DB'
import { SchemaRegistry } from '../../schema/SchemaRegistry'
import type { ColumnType, TableSchema } from '../../schema/types'
import { COLUMN_KEY } from '../decorators'
import { ColumnNotFoundError, NullableConstraintError, TypeMismatchError } from '../errors'
import type { Model, ModelAttributes } from '../Model'

/**
 * Trait for managing model attributes.
 *
 * @public
 * @since 3.0.0
 */
export abstract class HasAttributes {
  /**
   * Set attribute with validation (Smart Guard)
   */
  protected _setAttribute(this: any, key: string, value: unknown): void {
    const modelCtor = this.constructor as typeof Model

    if (modelCtor.strictMode) {
      void modelCtor.table
    }

    this._dirtyTracker.mark(key, value)

    const type = modelCtor.casts[key]
    const castedValue = type ? (this as any)._castAttribute(key, value, type) : value

    this._attributes[key] = castedValue
  }

  /**
   * Validate attribute against schema
   */
  protected async _validateAttribute(this: any, key: string, value: unknown): Promise<void> {
    const modelCtor = this.constructor as typeof Model
    const table = modelCtor.getTable()
    const schema = await this._getSchema()

    const column = schema.columns.get(key)

    if (!column) {
      if (modelCtor.strictMode) {
        throw new ColumnNotFoundError(table, key)
      }
      return
    }

    if (value === null && !column.nullable) {
      throw new NullableConstraintError(modelCtor.table, key)
    }

    if (value !== null && value !== undefined) {
      const jsType = (this as any)._getJSType(value)
      const expectedTypes = (this as any)._getExpectedJSTypes(column.type)

      if (jsType === 'object' && expectedTypes.includes('string')) {
        return
      }

      if (!expectedTypes.includes(jsType)) {
        throw new TypeMismatchError(table, key, expectedTypes.join(' | '), jsType)
      }
    }
  }

  /**
   * Get JavaScript type of value
   */
  private _getJSType(value: unknown): string {
    if (value === null) return 'null'
    if (Array.isArray(value)) return 'array'
    if (value instanceof Date) return 'date'
    return typeof value
  }

  /**
   * Cast attribute value to its type
   */
  private _castAttribute(_key: string, value: any, type: string): any {
    if (value === null || value === undefined) return value

    switch (type) {
      case 'int':
      case 'integer':
      case 'number':
        return typeof value === 'string' ? parseFloat(value) : Number(value)
      case 'real':
      case 'float':
      case 'double':
        return parseFloat(value)
      case 'string':
        return String(value)
      case 'bool':
      case 'boolean':
        return [true, 1, '1', 'true', 'on', 'yes'].includes(value)
      case 'object':
      case 'json':
        if (typeof value === 'object') return value
        try {
          return JSON.parse(value)
        } catch (_e) {
          return value
        }
      case 'collection':
        return Array.isArray(value) ? value : [value]
      case 'date':
      case 'datetime':
        return value instanceof Date ? value : new Date(value)
      case 'timestamp':
        return value instanceof Date ? value.getTime() : new Date(value).getTime()
    }
    return value
  }

  /**
   * Get expected JavaScript types for column type
   */
  private _getExpectedJSTypes(columnType: ColumnType): string[] {
    const typeMap: Record<ColumnType, string[]> = {
      string: ['string'],
      text: ['string'],
      integer: ['number'],
      bigint: ['number', 'bigint'],
      smallint: ['number'],
      decimal: ['number', 'string'],
      float: ['number'],
      boolean: ['boolean'],
      date: ['string', 'date'],
      time: ['string'],
      datetime: ['string', 'date'],
      timestamp: ['string', 'date', 'number'],
      json: ['object', 'array', 'string'],
      jsonb: ['object', 'array', 'string'],
      uuid: ['string'],
      binary: ['string', 'object'],
      enum: ['string'],
      unknown: ['string', 'number', 'boolean', 'object'],
    }
    return typeMap[columnType] ?? typeMap.unknown
  }

  /**
   * Get cached schema
   */
  protected async _getSchema(this: any): Promise<TableSchema> {
    if (!this._schema) {
      const modelCtor = this.constructor as any
      const connection = DB.connection(modelCtor.connection)
      const table = modelCtor.getTable()

      const driver = connection.getDriver()
      if (
        typeof driver.getDriverName === 'function' &&
        (driver.getDriverName() === 'mongodb' || driver.getDriverName() === 'redis')
      ) {
        return {
          table: table,
          columns: new Map(),
          primaryKey: [modelCtor.primaryKey],
          capturedAt: Date.now(),
        }
      }

      this._schema = await SchemaRegistry.getInstance().get(table)
    }
    return this._schema
  }

  /**
   * Check if model exists in database
   */
  get exists(): boolean {
    return (this as any)._exists
  }

  /**
   * Check if model is dirty
   */
  get isDirty(): boolean {
    return (this as any)._dirtyTracker.isDirty()
  }

  /**
   * Get dirty attributes
   */
  getDirty(this: any): Partial<ModelAttributes> {
    return this._dirtyTracker.getDirtyValues(this._attributes)
  }

  /**
   * Get original values
   */
  getOriginal(this: any): Partial<ModelAttributes> {
    return this._dirtyTracker.getOriginals()
  }

  /**
   * Get all attributes
   */
  getAttributes(this: any): ModelAttributes {
    return { ...this._attributes }
  }

  /**
   * Get primary key value
   */
  getKey(this: any): unknown {
    const modelCtor = this.constructor as typeof Model
    return this._attributes[modelCtor.primaryKey]
  }

  /**
   * Convert model to plain object via toJSON
   */
  toJSON(this: any): any {
    const modelCtor = this.constructor as typeof Model
    const attributes = { ...this._attributes }
    const result: any = {}

    for (const key of Object.keys(attributes)) {
      if (!key.startsWith('_')) {
        result[key] = (this as any)[key]
      }
    }

    for (const key of modelCtor.appends) {
      result[key] = (this as any)[key]
    }

    const instanceKeys = Object.keys(this)
    for (const key of instanceKeys) {
      if (!key.startsWith('_') && !(key in result)) {
        const value = (this as any)[key]
        if (
          value instanceof (modelCtor as any) ||
          (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') ||
          (Array.isArray(value) && value.length === 0)
        ) {
          result[key] = value
        }
      }
    }

    if (modelCtor.visible.length > 0) {
      const filtered: any = {}
      for (const key of modelCtor.visible) {
        if (key in result) filtered[key] = result[key]
      }
      return filtered
    }

    if (modelCtor.hidden.length > 0) {
      for (const key of modelCtor.hidden) {
        delete result[key]
      }
    }

    return result
  }
}
