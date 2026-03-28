import { DatabaseException } from '@gravito/core'
import { DatabaseErrorCodes } from './codes'

/**
 * Base Database Error.
 * Extends DatabaseException for unified error handling.
 * @public
 */
export class DatabaseError extends DatabaseException {
  public readonly originalError: unknown
  public readonly query?: string
  public readonly bindings?: unknown[]

  constructor(
    message: string,
    originalError?: unknown,
    query?: string,
    bindings?: unknown[],
    retryable = false,
    code: string = DatabaseErrorCodes.QUERY_FAILED,
  ) {
    super(503, code, {
      message,
      cause: originalError,
      retryable,
    })
    this.name = 'DatabaseError'
    this.originalError = originalError
    this.query = query
    this.bindings = bindings
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Constraint Violation Error (Base).
 * @public
 */
export class ConstraintViolationError extends DatabaseError {
  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[]) {
    super(message, originalError, query, bindings)
    this.name = 'ConstraintViolationError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Unique Constraint Violation.
 * @public
 */
export class UniqueConstraintError extends ConstraintViolationError {
  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[]) {
    super(message, originalError, query, bindings)
    this.name = 'UniqueConstraintError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Foreign Key Constraint Violation.
 * @public
 */
export class ForeignKeyConstraintError extends ConstraintViolationError {
  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[]) {
    super(message, originalError, query, bindings)
    this.name = 'ForeignKeyConstraintError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Not Null Constraint Violation.
 * @public
 */
export class NotNullConstraintError extends ConstraintViolationError {
  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[]) {
    super(message, originalError, query, bindings)
    this.name = 'NotNullConstraintError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Table Not Found Error.
 * @public
 */
export class TableNotFoundError extends DatabaseError {
  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[]) {
    super(message, originalError, query, bindings)
    this.name = 'TableNotFoundError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Connection Error — retryable (transient network failure).
 * @public
 */
export class ConnectionError extends DatabaseError {
  constructor(message: string, originalError?: unknown) {
    super(message, originalError, undefined, undefined, true, DatabaseErrorCodes.CONNECTION_FAILED)
    this.name = 'ConnectionError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export * from './codes'
