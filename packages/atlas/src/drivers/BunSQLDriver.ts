/**
 * Bun Native SQL Driver
 * @description Driver implementation using Bun's native unified SQL API (Bun.sql)
 * Enhanced with prepared statements, streaming, and connection pool management
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
import type { BunSQLClient } from './types'

export class BunSQLDriver implements DriverContract {
  private client: BunSQLClient | null = null
  private connected = false
  private transactionActive = false
  private preparedManager?: BunSQLPreparedStatementManager

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
   * Disconnect and clean up resources
   */
  async disconnect(): Promise<void> {
    // Clean up prepared statements
    if (this.preparedManager) {
      await this.preparedManager.destroy()
      this.preparedManager = undefined
    }

    // Close client connection
    if (this.client) {
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
   * Execute a query using Bun.sql
   * Prioritizes the `unsafe()` method for optimal performance with dynamic SQL
   */
  async query<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    await this.ensureConnection()

    try {
      // biome-ignore lint/suspicious/noExplicitAny: Result type varies by driver
      let result: any

      // Priority 1: Use unsafe() for dynamic SQL (recommended for Bun 1.3+)
      if (this.client?.unsafe) {
        result = await this.client.unsafe(sql, bindings)
      }
      // Priority 2: Use query() method if available
      else if (this.client?.query) {
        result = await this.client.query(sql, bindings)
      }
      // Priority 3: Fallback to other execution methods
      else if (this.client?.all) {
        result = await this.client.all(sql, bindings)
      } else if (this.client?.run) {
        result = await this.client.run(sql, bindings)
      } else {
        throw new Error('Bun.sql does not support dynamic query execution in this environment')
      }

      // Normalize result to rows array
      let rows: T[] = []
      if (Array.isArray(result)) {
        rows = result
      } else if (result && typeof result === 'object') {
        // Handle iterable results
        if (typeof result[Symbol.iterator] === 'function') {
          rows = Array.from(result)
        } else {
          rows = (result.rows || result) as T[]
        }
      }

      return {
        rows,
        rowCount: result?.rowCount ?? result?.count ?? rows.length,
        insertId: result?.lastInsertRowid,
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

  /**
   * Build connection URL with pool and SSL configuration
   */
  private getConnectionUrl(): string {
    // biome-ignore lint/suspicious/noExplicitAny: Config is dynamic
    const { driver, host, port, database, username, password, ssl, pool } = this.config as any
    const protocol =
      driver === 'postgres'
        ? 'postgres'
        : driver === 'mysql' || driver === 'mariadb'
          ? 'mysql'
          : 'sqlite'

    if (protocol === 'sqlite') {
      return `sqlite:${database}`
    }

    const auth = username
      ? password
        ? `${username}:${encodeURIComponent(password)}@`
        : `${username}@`
      : ''
    const hostPart = host ?? 'localhost'
    const portPart = port ? `:${port}` : ''

    // Build query parameters
    const params = new URLSearchParams()

    // SSL configuration
    if (ssl) {
      params.set('sslmode', typeof ssl === 'object' ? 'require' : ssl ? 'require' : 'disable')
    }

    // Pool configuration
    if (pool?.max) {
      params.set('max', String(pool.max))
    }
    if (pool?.idleTimeout) {
      params.set('idle_timeout', String(pool.idleTimeout))
    }

    const queryString = params.toString()
    return `${protocol}://${auth}${hostPart}${portPart}/${database}${queryString ? '?' + queryString : ''}`
  }

  // ============================================================================
  // Advanced Features (Bun.sql 1.3+ enhancements)
  // ============================================================================

  /**
   * Prepare a statement for repeated execution
   * @param sql - SQL query to prepare
   * @returns Prepared statement identifier
   */
  async prepare(sql: string): Promise<string> {
    await this.ensureConnection()

    if (!this.client?.prepare) {
      throw new Error('Prepared statements are not supported by this Bun.sql version')
    }

    if (!this.preparedManager) {
      this.preparedManager = new BunSQLPreparedStatementManager(this.client)
    }

    return this.preparedManager.prepare(sql)
  }

  /**
   * Execute a prepared statement
   * @param name - Prepared statement identifier
   * @param bindings - Query parameters
   * @returns Query result
   */
  async executePrepared<T = Record<string, unknown>>(
    name: string,
    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    if (!this.preparedManager) {
      throw new Error('No prepared statements available. Call prepare() first.')
    }

    try {
      const rows = await this.preparedManager.execute<T>(name, bindings)
      return {
        rows,
        rowCount: rows.length,
      }
    } catch (error) {
      throw this.normalizeError(error, `[Prepared: ${name}]`, bindings)
    }
  }

  /**
   * Clear all prepared statements from cache
   */
  async clearPreparedStatements(): Promise<void> {
    if (this.preparedManager) {
      await this.preparedManager.clear()
    }
  }

  /**
   * Stream query results for processing large datasets
   * @param sql - SQL query
   * @param bindings - Query parameters
   * @returns Async iterable of result rows
   */
  async *stream<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): AsyncIterable<T> {
    await this.ensureConnection()

    try {
      // Execute query and get iterable result
      let result: any

      if (this.client?.unsafe) {
        result = await this.client.unsafe(sql, bindings)
      } else if (this.client?.query) {
        result = await this.client.query(sql, bindings)
      } else {
        throw new Error('Bun.sql does not support streaming in this environment')
      }

      // Bun.sql results are natively iterable
      if (result && typeof result[Symbol.iterator] === 'function') {
        for (const row of result) {
          yield row as T
        }
      } else if (result?.rows && Array.isArray(result.rows)) {
        for (const row of result.rows) {
          yield row as T
        }
      } else if (Array.isArray(result)) {
        for (const row of result) {
          yield row as T
        }
      } else {
        throw new Error('Query result is not iterable')
      }
    } catch (error) {
      throw this.normalizeError(error, sql, bindings)
    }
  }

  /**
   * Get connection pool statistics
   * @returns Pool statistics or null if not available
   */
  getPoolStats(): PoolStats | null {
    // biome-ignore lint/suspicious/noExplicitAny: Pool config is dynamic
    const poolConfig = (this.config as any).pool

    if (!this.client) {
      return {
        idle: 0,
        pending: 0,
        active: 0,
        total: 0,
        max: poolConfig?.max ?? 10,
      }
    }

    // Bun.sql exposes connection pool statistics
    const connections = this.client.connections
    if (connections) {
      return {
        idle: connections.idle,
        pending: connections.pending,
        active: connections.active,
        total: connections.total,
        max: poolConfig?.max ?? 10,
      }
    }

    return null
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
