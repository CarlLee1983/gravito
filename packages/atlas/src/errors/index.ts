/**
 * Base Database Error
 */
export class DatabaseError extends Error {
  public readonly originalError: unknown
  public readonly query?: string
  public readonly bindings?: unknown[]

  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[]) {
    super(message)
    this.name = 'DatabaseError'
    this.originalError = originalError
    this.query = query
    this.bindings = bindings
  }
}

/**
 * Constraint Violation Error (Base)
 */
export class ConstraintViolationError extends DatabaseError {
  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[]) {
    super(message, originalError, query, bindings)
    this.name = 'ConstraintViolationError'
  }
}

/**
 * Unique Constraint Violation
 */
export class UniqueConstraintError extends ConstraintViolationError {
  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[]) {
    super(message, originalError, query, bindings)
    this.name = 'UniqueConstraintError'
  }
}

/**
 * Foreign Key Constraint Violation
 */
export class ForeignKeyConstraintError extends ConstraintViolationError {
  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[]) {
    super(message, originalError, query, bindings)
    this.name = 'ForeignKeyConstraintError'
  }
}

/**
 * Not Null Constraint Violation
 */
export class NotNullConstraintError extends ConstraintViolationError {
  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[]) {
    super(message, originalError, query, bindings)
    this.name = 'NotNullConstraintError'
  }
}

/**
 * Table Not Found Error
 */
export class TableNotFoundError extends DatabaseError {
  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[]) {
    super(message, originalError, query, bindings)
    this.name = 'TableNotFoundError'
  }
}

/**
 * Connection Error
 */
export class ConnectionError extends DatabaseError {
  constructor(message: string, originalError?: unknown) {
    super(message, originalError)
    this.name = 'ConnectionError'
  }
}
