/**
 * HasAttributes Concern
 *
 * Provides attribute management functionality including:
 * - Getting and setting attributes
 * - Attribute casting
 * - Dirty tracking
 */

import type { ColumnType, TableSchema } from '../../schema/types'
import { DirtyTracker } from '../DirtyTracker'

export type ModelAttributes = Record<string, unknown>

export class HasAttributes {
  protected _attributes: ModelAttributes = {}
  protected _dirtyTracker: DirtyTracker<ModelAttributes>
  protected _schema?: TableSchema

  constructor() {
    this._dirtyTracker = new DirtyTracker()
  }

  /**
   * Get attribute value
   *
   * @param key - Attribute key
   * @returns Attribute value
   */
  getAttribute(key: string): unknown {
    return this._attributes[key]
  }

  /**
   * Set attribute value with casting
   *
   * @param key - Attribute key
   * @param value - Attribute value
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
   * Fill model with attributes
   *
   * @param attributes - Attributes to fill
   */
  fill(attributes: Partial<ModelAttributes>): void {
    for (const [key, value] of Object.entries(attributes)) {
      this.setAttribute(key, value)
    }
  }

  /**
   * Get all attributes
   *
   * @returns All attributes
   */
  getAttributes(): Partial<ModelAttributes> {
    return { ...this._attributes }
  }

  /**
   * Get only dirty attributes
   *
   * @returns Dirty attributes
   */
  getDirtyAttributes(): Partial<ModelAttributes> {
    return this._dirtyTracker.getDirtyValues(this._attributes)
  }

  /**
   * Get original attribute value
   *
   * @param key - Attribute key
   * @returns Original value
   */
  getOriginal(key: string): unknown {
    return this._dirtyTracker.getOriginal(key)
  }

  /**
   * Check if attribute is dirty
   *
   * @param key - Attribute key
   * @returns True if dirty
   */
  isDirty(key?: string): boolean {
    return this._dirtyTracker.isDirty(key)
  }

  /**
   * Check if model is clean (no changes)
   *
   * @returns True if clean
   */
  isClean(): boolean {
    return !this._dirtyTracker.isDirty()
  }

  /**
   * Get JavaScript type of value
   *
   * @param value - Value to check
   * @returns JavaScript type string
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
   * Cast attribute value to its type
   *
   * @param _key - Attribute key (unused)
   * @param value - Value to cast
   * @param type - Target type
   * @returns Casted value
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
   * Get expected JavaScript types for column type
   *
   * @param columnType - Column type
   * @returns Expected JavaScript types
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
   * Get the table schema
   *
   * @returns Table schema
   */
  protected async _getSchema(): Promise<TableSchema> {
    const modelCtor = this.constructor as any
    const { SchemaRegistry } = await import('../../schema/SchemaRegistry')

    if (!this._schema) {
      const registry = SchemaRegistry.getInstance()
      this._schema = await registry.get(modelCtor.getTable())
    }

    return this._schema!
  }

  /**
   * Validate attribute against schema
   *
   * @param key - Attribute key
   * @param value - Attribute value
   */
  protected async _validateAttribute(key: string, value: unknown): Promise<void> {
    const modelCtor = this.constructor as any
    const table = modelCtor.getTable()
    const schema = await this._getSchema()

    const column = schema.columns.get(key)

    if (!column) {
      if (modelCtor.strictMode) {
        const { ColumnNotFoundError } = await import('../errors')
        throw new ColumnNotFoundError(table, key)
      }
      return
    }

    // Null check
    if (value === null && !column.nullable) {
      const { NullableConstraintError } = await import('../errors')
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
        const { TypeMismatchError } = await import('../errors')
        throw new TypeMismatchError(table, key, expectedTypes.join(' | '), jsType)
      }
    }
  }
}
