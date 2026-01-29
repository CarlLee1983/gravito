/**
 * SQLite Driver
 * @description Database driver implementation for SQLite using better-sqlite3
 */

import {
  ConnectionError,
  DatabaseError,
  ForeignKeyConstraintError,
  NotNullConstraintError,
  TableNotFoundError,
  UniqueConstraintError,
} from '../errors'

import type {
  ConnectionConfig,
  DriverContract,
  DriverType,
  ExecuteResult,
  QueryResult,
  SQLiteConfig,
} from '../types'
import type { SQLiteClient } from './types'

// biome-ignore lint/suspicious/noExplicitAny: Bun global type
declare const Bun: { sql: (path: string) => SQLiteClient } | undefined

/**

 * SQLite Driver

 */

/**
 * SQLite driver implementation for Atlas ORM.
 *
 * Automatically detects and uses `bun:sqlite` if running in Bun,
 * otherwise falls back to `better-sqlite3`.
 *
 * @public
 * @since 3.0.0
 */
export class SQLiteDriver implements DriverContract {
  private config: SQLiteConfig

  private client: SQLiteClient | null = null

  private inTransactionState = false

  constructor(config: ConnectionConfig) {
    if (config.driver !== 'sqlite') {
      throw new Error(`Invalid driver type '${config.driver}' for SQLiteDriver`)
    }

    this.config = config as SQLiteConfig
  }

  getDriverName(): DriverType {
    return 'sqlite'
  }

  async connect(): Promise<void> {
    if (this.client) {
      return
    }

    try {
      if (typeof Bun !== 'undefined') {
        const { Database } = await import('bun:sqlite')

        this.client = new Database(this.config.database, {
          readonly: this.config.readonly ?? false,

          create: true,
        }) as unknown as SQLiteClient

        if ('exec' in this.client && typeof this.client.exec === 'function') {
          this.client.exec('PRAGMA journal_mode = WAL;')
        }
      } else {
        try {
          const { default: Database } = await import('better-sqlite3')

          this.client = new Database(this.config.database, {
            readonly: this.config.readonly ?? false,
          }) as unknown as SQLiteClient

          if ('pragma' in this.client && typeof this.client.pragma === 'function') {
            this.client.pragma('journal_mode = WAL')
          }
        } catch (e) {
          throw new Error(
            `SQLite driver requires "better-sqlite3" when running in Node.js. Please install it: bun add better-sqlite3. Original Error: ${e}`
          )
        }
      }
    } catch (error) {
      throw new ConnectionError('Could not connect to SQLite database', error)
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.close()

      this.client = null
    }
  }

  isConnected(): boolean {
    if (!this.client) {
      return false
    }
    if ('open' in this.client) {
      return (this.client as { open?: boolean }).open !== false
    }
    return true
  }

  async query<T = Record<string, unknown>>(
    sql: string,

    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    if (!this.client) {
      await this.connect()
    }

    const params = bindings.map((b) => {
      if (b === undefined) {
        return null
      }

      if (b instanceof Date) {
        return b.toISOString()
      }

      if (typeof b === 'boolean') {
        return b ? 1 : 0
      }

      if (typeof b === 'object' && b !== null && !Array.isArray(b) && !ArrayBuffer.isView(b)) {
        return JSON.stringify(b)
      }

      return b
    })

    try {
      if (!this.client) {
        throw new Error('SQLite client not connected')
      }
      const stmt = this.client.prepare(sql)
      const rows = stmt.all(...params) as T[]
      return {
        rows,
        rowCount: rows.length,
      }
    } catch (error: unknown) {
      if (process.env.DEBUG_ATLAS) {
        console.error(`[SQLite Query Failed] ${sql}`, error)
      }
      throw this.normalizeError(error, sql, bindings)
    }
  }

  async execute(sql: string, bindings: unknown[] = []): Promise<ExecuteResult> {
    if (!this.client) {
      await this.connect()
    }

    const params = bindings.map((b) => {
      if (b instanceof Date) {
        return b.toISOString()
      }

      if (typeof b === 'boolean') {
        return b ? 1 : 0
      }

      if (typeof b === 'object' && b !== null && !Array.isArray(b) && !ArrayBuffer.isView(b)) {
        return JSON.stringify(b)
      }

      return b
    })

    try {
      const stmt = this.client?.prepare(sql)
      if (!stmt) {
        throw new Error('Failed to prepare SQL statement')
      }
      const result = stmt.run(...params)
      return {
        affectedRows: result.changes,
        insertId: result.lastInsertRowid,
        changedRows: result.changes,
      }
    } catch (error: unknown) {
      if (process.env.DEBUG_ATLAS) {
        console.error(`[SQLite Execute Failed] ${sql}`, error)
      }
      throw this.normalizeError(error, sql, bindings)
    }
  }

  async beginTransaction(): Promise<void> {
    if (!this.client) {
      await this.connect()
    }
    if (process.env.DEBUG_ATLAS) {
      // biome-ignore lint: Internal debug logging
      console.log('[SQLiteDriver] BEGIN')
    }
    this.client?.prepare('BEGIN').run()
    this.inTransactionState = true
  }

  async commit(): Promise<void> {
    if (!this.client) {
      return
    }
    if (process.env.DEBUG_ATLAS) {
      // biome-ignore lint: Internal debug logging
      console.log('[SQLiteDriver] COMMIT')
    }
    this.client?.prepare('COMMIT').run()
    this.inTransactionState = false
  }

  async rollback(): Promise<void> {
    if (!this.client) {
      return
    }
    if (process.env.DEBUG_ATLAS) {
      // biome-ignore lint: Internal debug logging
      console.log('[SQLiteDriver] ROLLBACK')
    }
    this.client?.prepare('ROLLBACK').run()
    this.inTransactionState = false
  }

  inTransaction(): boolean {
    return this.inTransactionState || (this.client?.inTransaction ?? false)
  }

  /**



     * Normalize SQLite errors



     */

  private normalizeError(error: unknown, sql: string, bindings: unknown[]): DatabaseError {
    const err = error as { message?: string }
    const errorMessage = err.message || String(error)
    const message = errorMessage.toLowerCase()

    if (message.includes('unique constraint failed') || message.includes('is not unique')) {
      return new UniqueConstraintError(errorMessage, error, sql, bindings)
    }

    if (message.includes('foreign key constraint failed')) {
      return new ForeignKeyConstraintError(errorMessage, error, sql, bindings)
    }

    if (message.includes('not null constraint failed')) {
      return new NotNullConstraintError(errorMessage, error, sql, bindings)
    }

    if (message.includes('no such table')) {
      return new TableNotFoundError(errorMessage, error, sql, bindings)
    }

    return new DatabaseError(errorMessage, error, sql, bindings)
  }
}
