/**
 * Type Casting Utilities
 * @description Helper functions for casting and validating attribute types
 */

import type { ColumnType } from '../schema/types'

/**
 * Get JavaScript type of value
 *
 * @param value - Value to check
 * @returns JavaScript type string
 */
export function getJSType(value: unknown): string {
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
 * @param key - Attribute key (unused, kept for future use)
 * @param value - Value to cast
 * @param type - Target type
 * @returns Casted value
 */
export function castAttribute(_key: string, value: unknown, type: string): unknown {
  if (value === null || value === undefined) {
    return value
  }

  switch (type) {
    case 'int':
    case 'integer':
    case 'number':
    case 'smallint':
      return typeof value === 'string' ? parseFloat(value) : Number(value)

    case 'bigint':
      if (typeof value === 'bigint') return value
      if (typeof value === 'string') {
        const num = Number(value)
        return Number.isSafeInteger(num) ? num : BigInt(value)
      }
      return Number(value)

    case 'decimal':
      if (typeof value === 'string') return value
      return String(value)

    case 'real':
    case 'float':
    case 'double':
      return typeof value === 'string' ? parseFloat(value) : Number(value)

    case 'string':
      return String(value)

    case 'bool':
    case 'boolean':
      return [true, 1, '1', 'true', 'on', 'yes'].includes(value as string | number | boolean)

    case 'object':
    case 'json':
    case 'jsonb':
      if (typeof value === 'object' && value !== null) {
        return value
      }
      try {
        return JSON.parse(String(value))
      } catch (_e) {
        return value
      }

    case 'collection':
      return Array.isArray(value) ? value : [value]

    case 'date':
    case 'time':
    case 'datetime':
      if (value instanceof Date) {
        return value
      }
      return new Date(String(value))

    case 'timestamp':
      return value instanceof Date ? value.getTime() : new Date(String(value)).getTime()
  }

  return value
}

/**
 * Get expected JavaScript types for column type
 *
 * @param columnType - Database column type
 * @returns Array of expected JavaScript types
 */
export function getExpectedJSTypes(columnType: ColumnType): string[] {
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
