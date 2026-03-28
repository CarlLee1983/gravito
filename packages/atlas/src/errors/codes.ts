/**
 * Structured error codes for @gravito/atlas database operations.
 * Follows fortify's dot-separated namespace convention.
 *
 * @public
 */
export const DatabaseErrorCodes = {
  // Connection errors
  CONNECTION_FAILED: 'db.connection_failed',
  CONNECTION_TIMEOUT: 'db.connection_timeout',
  POOL_EXHAUSTED: 'db.pool_exhausted',

  // Query errors
  QUERY_FAILED: 'db.query_failed',
  TABLE_NOT_FOUND: 'db.table_not_found',

  // Constraint errors
  UNIQUE_CONSTRAINT: 'db.unique_constraint',
  FOREIGN_KEY_CONSTRAINT: 'db.foreign_key_constraint',
  NOT_NULL_CONSTRAINT: 'db.not_null_constraint',

  // Transaction errors
  TRANSACTION_FAILED: 'db.transaction_failed',
  DEADLOCK: 'db.deadlock',
} as const

export type DatabaseErrorCode = (typeof DatabaseErrorCodes)[keyof typeof DatabaseErrorCodes]

/**
 * Structured error codes for @gravito/atlas ORM model operations.
 * @public
 */
export const OrmErrorCodes = {
  COLUMN_NOT_FOUND: 'db.column_not_found',
  TYPE_MISMATCH: 'db.type_mismatch',
  NULLABLE_CONSTRAINT: 'db.nullable_constraint',
  MODEL_NOT_FOUND: 'db.model_not_found',
  STALE_MODEL: 'db.stale_model',
} as const

export type OrmErrorCode = (typeof OrmErrorCodes)[keyof typeof OrmErrorCodes]
