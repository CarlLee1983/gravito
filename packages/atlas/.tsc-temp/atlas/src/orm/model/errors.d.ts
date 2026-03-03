/**
 * Model Errors
 * @description Custom error types for ORM model operations
 */
/**
 * Column Not Found Error
 * Thrown when accessing/setting a column that doesn't exist in schema
 */
export declare class ColumnNotFoundError extends Error {
  readonly table: string
  readonly column: string
  constructor(table: string, column: string, availableColumns?: string[])
}
/**
 * Type Mismatch Error
 * Thrown when setting a value with incompatible type
 */
export declare class TypeMismatchError extends Error {
  readonly table: string
  readonly column: string
  readonly expectedType: string
  readonly actualType: string
  readonly value?: unknown
  constructor(
    table: string,
    column: string,
    expectedType: string,
    actualType: string,
    value?: unknown
  )
}
/**
 * Nullable Constraint Error
 * Thrown when setting null on a non-nullable column
 */
export declare class NullableConstraintError extends Error {
  readonly table: string
  readonly column: string
  constructor(table: string, column: string)
}
/**
 * Model Not Found Error
 * Thrown when a model is not found in the database
 */
export declare class ModelNotFoundError extends Error {
  readonly model: string
  readonly key: unknown
  constructor(model: string, key: unknown)
}
/**
 * Stale Model Error
 * Thrown when an optimistic lock check fails (concurrent update)
 */
export declare class StaleModelError extends Error {
  readonly model: string
  readonly key: unknown
  constructor(model: string, key: unknown)
}
