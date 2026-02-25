/**
 * SQLite Satellite Errors
 */

export class SQLiteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SQLiteError'
    Object.setPrototypeOf(this, SQLiteError.prototype)
  }
}

export class SQLiteConnectionError extends SQLiteError {
  constructor(
    message: string,
    public code?: number
  ) {
    super(message)
    this.name = 'SQLiteConnectionError'
    Object.setPrototypeOf(this, SQLiteConnectionError.prototype)
  }
}

export class SQLiteExecutionError extends SQLiteError {
  constructor(
    message: string,
    public sql?: string
  ) {
    super(message)
    this.name = 'SQLiteExecutionError'
    Object.setPrototypeOf(this, SQLiteExecutionError.prototype)
  }
}
