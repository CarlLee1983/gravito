/**
 * Bun Native SQL Driver
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
  PoolStats,
  QueryResult,
} from '../types'
import { BunSQLPreparedStatementManager } from './BunSQLPreparedStatement'

export class BunSQLDriver implements DriverContract {
  private client: any | null = null
  private sqliteClient: any | null = null
  private connected = false
  private transactionActive = false
  private preparedManager?: BunSQLPreparedStatementManager

  constructor(private readonly config: ConnectionConfig) {}

  getDriverName(): DriverType {
    return this.config.driver as DriverType
  }

  async connect(): Promise<void> {
    if (this.connected) return
    try {
      if (this.config.driver === 'sqlite') {
        const { Database } = await import('bun:sqlite')
        this.sqliteClient = new Database(
          this.config.database === ':memory:' ? ':memory:' : this.config.database
        )
      } else {
        const g = globalThis as any
        // biome-ignore lint/complexity/useLiteralKeys: Intentionally using bracket notation to hide 'Bun' symbol from tsc checks
        const bunSql = g['Bun']?.sql
        if (!bunSql) throw new Error('Bun.sql not found')
        this.client = bunSql(this.getConnectionUrl())
      }
      this.connected = true
    } catch (error) {
      throw new ConnectionError(`Failed to connect to ${this.config.driver}`, error)
    }
  }

  async disconnect(): Promise<void> {
    if (this.preparedManager) {
      await this.preparedManager.destroy()
      this.preparedManager = undefined
    }
    if (this.sqliteClient) {
      this.sqliteClient.close()
      this.sqliteClient = null
    }
    if (this.client) {
      if (typeof this.client.close === 'function') await this.client.close()
      this.client = null
    }
    this.connected = false
    this.transactionActive = false
  }

  isConnected(): boolean {
    return this.connected && (this.client !== null || this.sqliteClient !== null)
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    await this.ensureConnection()
    try {
      const normalized = bindings.map((b) => {
        if (b instanceof Date) return b.toISOString()
        if (b === undefined) return null
        if (typeof b === 'boolean') return b ? 1 : 0
        return b
      })

      let rows: T[] = []
      let lastInsertRowid: any

      if (this.sqliteClient) {
        const stmt = this.sqliteClient.query(sql)
        // Ensure parameters are correctly handled for SQLite
        rows = stmt.all(...normalized) as T[]
        try {
          const idRes = this.sqliteClient.query('SELECT last_insert_rowid() as id').get() as any
          lastInsertRowid = idRes?.id
        } catch {
          /* ignore */
        }
      } else {
        const result = await this.client.unsafe(sql, normalized)
        rows = Array.isArray(result)
          ? result
          : result && typeof result[Symbol.iterator] === 'function'
            ? Array.from(result)
            : result?.rows || []
        lastInsertRowid = result?.lastInsertRowid
      }

      return {
        rows,
        rowCount: rows.length,
        insertId: lastInsertRowid,
      }
    } catch (error) {
      throw this.normalizeError(error, sql, bindings)
    }
  }

  async execute(sql: string, bindings: unknown[] = []): Promise<ExecuteResult> {
    const res = await this.query(sql, bindings)
    return { affectedRows: res.rowCount ?? 0, insertId: res.insertId }
  }

  async beginTransaction(): Promise<void> {
    await this.ensureConnection()
    if (this.sqliteClient) this.sqliteClient.exec('BEGIN')
    else await this.query('BEGIN')
    this.transactionActive = true
  }

  async commit(): Promise<void> {
    if (!this.transactionActive) return
    if (this.sqliteClient) this.sqliteClient.exec('COMMIT')
    else await this.query('COMMIT')
    this.transactionActive = false
  }

  async rollback(): Promise<void> {
    if (!this.transactionActive) return
    if (this.sqliteClient) this.sqliteClient.exec('ROLLBACK')
    else await this.query('ROLLBACK')
    this.transactionActive = false
  }

  inTransaction(): boolean {
    return this.transactionActive
  }

  private async ensureConnection() {
    if (!this.connected || (!this.client && !this.sqliteClient)) await this.connect()
  }

  private getConnectionUrl(): string {
    const c = this.config as any
    const protocol =
      c.driver === 'postgres'
        ? 'postgres'
        : c.driver === 'mysql' || c.driver === 'mariadb'
          ? 'mysql'
          : 'sqlite'
    const auth = c.username
      ? c.password
        ? `${c.username}:${encodeURIComponent(c.password)}@`
        : `${c.username}@`
      : ''
    const params = new URLSearchParams()
    if (c.ssl) params.set('sslmode', 'require')
    if (c.pool?.max) params.set('max', String(c.pool.max))
    const q = params.toString()
    return `${protocol}://${auth}${c.host ?? 'localhost'}${c.port ? `:${c.port}` : ''}/${c.database}${q ? '?' + q : ''}`
  }

  async prepare(sql: string): Promise<string> {
    await this.ensureConnection()
    if (this.sqliteClient) throw new Error('Not supported for SQLite native yet')
    if (!this.client?.prepare) throw new Error('Not supported')
    if (!this.preparedManager)
      this.preparedManager = new BunSQLPreparedStatementManager(this.client)
    return this.preparedManager.prepare(sql)
  }

  async executePrepared<T = Record<string, unknown>>(
    name: string,
    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    if (!this.preparedManager) throw new Error('No manager')
    try {
      const rows = await this.preparedManager.execute<T>(name, bindings)
      return { rows, rowCount: rows.length }
    } catch (error) {
      throw this.normalizeError(error, `[Prepared: ${name}]`, bindings)
    }
  }

  async clearPreparedStatements(): Promise<void> {
    if (this.preparedManager) await this.preparedManager.clear()
  }

  async *stream<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): AsyncIterable<T> {
    await this.ensureConnection()
    try {
      const result = await this.query(sql, bindings)
      if (result.rows) {
        for (const row of result.rows) yield row as T
      }
    } catch (error) {
      throw this.normalizeError(error, sql, bindings)
    }
  }

  getPoolStats(): PoolStats | null {
    if (this.sqliteClient) return { idle: 0, pending: 0, active: 1, total: 1, max: 1 }
    if (!this.client) return null
    const c = this.client.connections
    return c
      ? {
          idle: c.idle,
          pending: c.pending,
          active: c.active,
          total: c.total,
          max: (this.config as any).pool?.max ?? 10,
        }
      : null
  }

  private normalizeError(error: any, sql: string, bindings: unknown[]): DatabaseError {
    const m = error.message?.toLowerCase() ?? ''
    if (m.includes('unique')) return new UniqueConstraintError(error.message, error, sql, bindings)
    if (m.includes('foreign key'))
      return new ForeignKeyConstraintError(error.message, error, sql, bindings)
    return new DatabaseError(error.message, error, sql, bindings)
  }
}
