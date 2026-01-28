/**
 * Model Errors
 * @description Custom error types for ORM model operations
 */

import { findSimilar } from '../../utils/levenshtein'

/**
 * Column Not Found Error
 * Thrown when accessing/setting a column that doesn't exist in schema
 */
export class ColumnNotFoundError extends Error {
  constructor(
    public readonly table: string,
    public readonly column: string,
    availableColumns: string[] = []
  ) {
    let message = `Column "${column}" does not exist on table "${table}".`

    // Add "Did you mean?" suggestions
    if (availableColumns.length > 0) {
      const similar = findSimilar(column, availableColumns)

      if (similar.length > 0) {
        message += `\n\n💡 Did you mean: ${similar.map((c) => `"${c}"`).join(', ')}?`
      }

      message += `\n\n📋 Available columns:\n   ${availableColumns.join(', ')}`
    }

    super(message)
    this.name = 'ColumnNotFoundError'
  }
}

/**
 * Type Mismatch Error
 * Thrown when setting a value with incompatible type
 */
export class TypeMismatchError extends Error {
  constructor(
    public readonly table: string,
    public readonly column: string,
    public readonly expectedType: string,
    public readonly actualType: string,
    public readonly value?: unknown
  ) {
    let message = `Type mismatch for column "${column}" on table "${table}".\n`
    message += `   Expected: ${expectedType}\n`
    message += `   Got: ${actualType}`

    if (value !== undefined) {
      const valuePreview =
        typeof value === 'string' && value.length > 50 ? `${value.slice(0, 50)}...` : String(value)
      message += `\n   Value: ${valuePreview}`
    }

    message += `\n\n💡 Tip: Check your model's casts configuration or ensure the value matches the expected type.`

    super(message)
    this.name = 'TypeMismatchError'
  }
}

/**
 * Nullable Constraint Error
 * Thrown when setting null on a non-nullable column
 */
export class NullableConstraintError extends Error {
  constructor(
    public readonly table: string,
    public readonly column: string
  ) {
    const message =
      `Column "${column}" on table "${table}" cannot be null.\n\n` +
      `💡 Tip: Either provide a non-null value or modify the column definition to allow null values.`

    super(message)
    this.name = 'NullableConstraintError'
  }
}

/**
 * Model Not Found Error
 * Thrown when a model is not found in the database
 */
export class ModelNotFoundError extends Error {
  constructor(
    public readonly model: string,
    public readonly key: unknown
  ) {
    const message =
      `${model} with key "${key}" not found.\n\n` +
      `💡 Tip: Use findOrFail() if you want to throw an error when a model is not found, ` +
      `or check the key value and ensure the record exists in the database.`

    super(message)
    this.name = 'ModelNotFoundError'
  }
}

/**
 * Stale Model Error
 * Thrown when an optimistic lock check fails (concurrent update)
 */
export class StaleModelError extends Error {
  constructor(
    public readonly model: string,
    public readonly key: unknown
  ) {
    const message =
      `Stale model "${model}" with key "${key}".\n\n` +
      `The record has been modified by another process since it was loaded.`

    super(message)
    this.name = 'StaleModelError'
  }
}
