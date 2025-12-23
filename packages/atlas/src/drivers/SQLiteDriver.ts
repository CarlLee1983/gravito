/**
 * SQLite Driver
 * @description Database driver implementation for SQLite using better-sqlite3
 */

import Database, { type Database as SQLiteDatabase } from 'better-sqlite3'
import { SQLiteGrammar } from '../grammar/SQLiteGrammar'
import type {
  ConnectionConfig,
  DriverContract,
  DriverType,
  ExecuteResult,
  QueryResult,
  SQLiteConfig,
} from '../types'

/**
 * SQLite Driver
 */
export class SQLiteDriver implements DriverContract {
  private config: SQLiteConfig
  private client: SQLiteDatabase | null = null
  private grammar = new SQLiteGrammar()
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
      this.client = new Database(this.config.database, {
        readonly: this.config.readonly,
        // verbose: console.log, // Debugging
      })
      this.client.pragma('journal_mode = WAL')
    } catch (error) {
      throw new Error(`Could not connect to SQLite database: ${error}`)
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.close()
      this.client = null
    }
  }

  isConnected(): boolean {
    return this.client !== null && this.client.open
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    if (!this.client) {
      await this.connect()
    }

    try {
      const stmt = this.client!.prepare(sql)
      const rows = stmt.all(...bindings) as T[]

      // For SQLite, better-sqlite3 returns column details in stmt.columns() after execution
      // but only if it's a select? 'all' executes it.
      // We can iterate columns if needed, but QueryResult usually just needs rows.
      
      return {
        rows,
        rowCount: rows.length,
      }
    } catch (error: any) {
      throw new Error(`SQLite Query Error: ${error.message} (SQL: ${sql})`)
    }
  }

  async execute(sql: string, bindings: unknown[] = []): Promise<ExecuteResult> {
    if (!this.client) {
      await this.connect()
    }

    try {
      const stmt = this.client!.prepare(sql)
      const result = stmt.run(...bindings)

      return {
        affectedRows: result.changes,
        insertId: result.lastInsertRowid,
        changedRows: result.changes,
      }
    } catch (error: any) {
      throw new Error(`SQLite Execute Error: ${error.message} (SQL: ${sql})`)
    }
  }

  async beginTransaction(): Promise<void> {
    if (!this.client) await this.connect()
    this.client!.prepare('BEGIN').run()
    this.inTransactionState = true
  }

  async commit(): Promise<void> {
    if (!this.client) return
    this.client!.prepare('COMMIT').run()
    this.inTransactionState = false
  }

  async rollback(): Promise<void> {
    if (!this.client) return
    this.client!.prepare('ROLLBACK').run()
    this.inTransactionState = false
  }

  inTransaction(): boolean {
    return this.inTransactionState || (this.client?.inTransaction ?? false)
  }
}
