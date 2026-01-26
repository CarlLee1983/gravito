/**
 * Bun Native SQL Driver
 * @description Driver implementation using Bun's native unified SQL API (Bun.sql)
 */

import {
  ConnectionError,
  DatabaseError,
  ForeignKeyConstraintError,
  UniqueConstraintError,
} from '../errors'
import type {
  ConnectionConfig,
  DriverContract,
  DriverType,
  ExecuteResult,
  QueryResult,
} from '../types'

export class BunSQLDriver implements DriverContract {
  // biome-ignore lint/suspicious/noExplicitAny: Client type is dynamic
  private client: any | null = null
  private connected = false
  private transactionActive = false

  constructor(private readonly config: ConnectionConfig) {}

  /**
   * Get driver name
   */
  getDriverName(): DriverType {
    return this.config.driver as DriverType
  }

  /**
   * Connect to the database using Bun.sql
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return
    }

    try {
      // Access via bracket notation to completely bypass tsc checks for the global Bun object
      const g = globalThis as any
      // biome-ignore lint/complexity/useLiteralKeys: Intentionally using bracket notation to hide 'Bun' symbol from tsc
      const bunSql = g['Bun']?.sql

      if (!bunSql) {
        throw new Error('Bun.sql is not available in this environment')
      }

      const url = this.getConnectionUrl()
      // Initialize Bun.sql client
      this.client = bunSql(url)

      this.connected = true
    } catch (error) {
      throw new ConnectionError(`Could not connect to ${this.config.driver} using Bun.sql`, error)
    }
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      // Bun.sql connection pool closing
      if (typeof this.client.close === 'function') await this.client.close()
      else if (typeof this.client.end === 'function') await this.client.end()
      this.client = null
    }
    this.connected = false
    this.transactionActive = false
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.client !== null
  }

  /**
   * Execute a query
   */
  async query<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    await this.ensureConnection()

    try {
      // The definitive Bun 1.3 way to run dynamic SQL strings with parameters:
      // Using Bun.sql.raw or the instance's unsafe method.
      // If the client itself is not callable, we must find the execution method.

      let result: any
      if (typeof this.client === 'function') {
        // If it's a callable template function, we try to use it with raw
        result = await this.client(sql, ...bindings)
      } else {
        // Look for common execution methods in Bun's SQL Query instance
        const exec = this.client.query || this.client.unsafe || this.client.all || this.client.run
        if (typeof exec === 'function') {
          result = await exec.call(this.client, sql, bindings)
        } else {
          // Absolute fallback: If Bun.sql is strictly tagged template, we can't easily
          // use it with dynamic strings without Bun.sql.raw (which is unsafe for production)
          // or a more complex template reconstruction.
          throw new Error(
            'Native Bun.sql does not support dynamic string execution in this version.'
          )
        }
      }

      let rows: T[] = []
      if (Array.isArray(result)) {
        rows = result
      } else if (result && typeof result === 'object') {
        rows = (result.rows || result) as T[]
        if (!Array.isArray(rows) && typeof (rows as any)[Symbol.iterator] === 'function') {
          rows = Array.from(rows as any)
        }
      }

      return {
        rows,
        rowCount: result?.rowCount ?? result?.count ?? rows.length,
      }
    } catch (error) {
      throw this.normalizeError(error, sql, bindings)
    }
  }

  /**
   * Execute a statement (INSERT/UPDATE/DELETE)
   */
  async execute(sql: string, bindings: unknown[] = []): Promise<ExecuteResult> {
    const res = await this.query(sql, bindings)
    const raw = (res as any)._raw || res
    return {
      affectedRows: res.rowCount ?? raw.count ?? raw.affectedRows ?? 0,
      insertId: (res.rows?.[0] as any)?.id ?? raw.insertId ?? raw.lastInsertId,
    }
  }

  /**
   * Begin transaction
   */
  async beginTransaction(): Promise<void> {
    await this.ensureConnection()
    await this.query('BEGIN')
    this.transactionActive = true
  }

  /**
   * Commit transaction
   */
  async commit(): Promise<void> {
    if (!this.transactionActive) return
    await this.query('COMMIT')
    this.transactionActive = false
  }

  /**
   * Rollback transaction
   */
  async rollback(): Promise<void> {
    if (!this.transactionActive) return
    await this.query('ROLLBACK')
    this.transactionActive = false
  }

  /**
   * Check transaction state
   */
  inTransaction(): boolean {
    return this.transactionActive
  }

  private async ensureConnection() {
    if (!this.connected || !this.client) {
      await this.connect()
    }
  }

  private getConnectionUrl(): string {
    // biome-ignore lint/suspicious/noExplicitAny: Config is dynamic
    const { driver, host, port, database, username, password } = this.config as any
    const protocol =
      driver === 'postgres'
        ? 'postgres'
        : driver === 'mysql' || driver === 'mariadb'
          ? 'mysql'
          : 'sqlite'

    if (protocol === 'sqlite') {
      return `sqlite:${database}`
    }

    const auth = username ? (password ? `${username}:${password}@` : `${username}@`) : ''
    const hostPart = host ?? 'localhost'
    const portPart = port ? `:${port}` : ''

    return `${protocol}://${auth}${hostPart}${portPart}/${database}`
  }

  // biome-ignore lint/suspicious/noExplicitAny: Error handling generic
  private normalizeError(error: any, sql: string, bindings: unknown[]): DatabaseError {
    const msg = error.message?.toLowerCase() ?? ''

    if (msg.includes('unique') || error.code === '23505') {
      return new UniqueConstraintError(error.message, error, sql, bindings)
    }
    if (msg.includes('foreign key') || error.code === '23503') {
      return new ForeignKeyConstraintError(error.message, error, sql, bindings)
    }

    return new DatabaseError(error.message, error, sql, bindings)
  }
}
