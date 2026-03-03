/**
 * Base Database Error
 */
export declare class DatabaseError extends Error {
  readonly originalError: unknown
  readonly query?: string
  readonly bindings?: unknown[]
  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[])
}
/**
 * Constraint Violation Error (Base)
 */
export declare class ConstraintViolationError extends DatabaseError {
  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[])
}
/**
 * Unique Constraint Violation
 */
export declare class UniqueConstraintError extends ConstraintViolationError {
  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[])
}
/**
 * Foreign Key Constraint Violation
 */
export declare class ForeignKeyConstraintError extends ConstraintViolationError {
  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[])
}
/**
 * Not Null Constraint Violation
 */
export declare class NotNullConstraintError extends ConstraintViolationError {
  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[])
}
/**
 * Table Not Found Error
 */
export declare class TableNotFoundError extends DatabaseError {
  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[])
}
/**
 * Connection Error
 */
export declare class ConnectionError extends DatabaseError {
  constructor(message: string, originalError?: unknown)
}
