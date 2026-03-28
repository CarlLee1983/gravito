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
