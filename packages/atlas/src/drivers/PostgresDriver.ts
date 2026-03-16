/**
 * PostgreSQL Driver
 * @description Database driver implementation for PostgreSQL using node-pg
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
  DriverContract,
  DriverType,
  ExecuteResult,
  PoolHealth,
  PoolStats,
  PostgresConfig,
  QueryResult,
} from '../types'

/**
 * PostgreSQL Driver
 * Connects and executes queries against PostgreSQL databases
 */
export class PostgresDriver implements DriverContract {
  private pool: PgPool | null = null
  private connected = false
  private transactionActive = false
  private transactionClient: PgClient | null = null
  private preparedStatements = new Map<string, string>()
  private statementCounter = 0
  private poolConfig: PostgresConfig

  constructor(config: PostgresConfig) {
    this.poolConfig = { ...config }
  }

  /**
   * Get driver name
   */
  getDriverName(): DriverType {
    return 'postgres'
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return
    }

    try {
      // Dynamic import of pg to avoid bundling issues
      const pg = await this.loadPgModule()

      // Build connection config
      const pgPoolConfig: PgPoolConfig = {
        host: this.poolConfig.host ?? 'localhost',
        port: this.poolConfig.port ?? 5432,
        database: this.poolConfig.database,
        user: this.poolConfig.username,
        password: this.poolConfig.password,
        // Pool settings
        min: this.poolConfig.pool?.min ?? 2,
        max: this.poolConfig.pool?.max ?? 10,
        idleTimeoutMillis: this.poolConfig.pool?.idleTimeout ?? 30000,
        connectionTimeoutMillis: this.poolConfig.pool?.acquireTimeout ?? 5000,
      }

      // Enhanced SSL configuration
      if (this.poolConfig.ssl) {
        if (typeof this.poolConfig.ssl === 'boolean') {
          // If ssl: true, default to rejectUnauthorized: false for easier cloud DB connection
          pgPoolConfig.ssl = this.poolConfig.ssl ? { rejectUnauthorized: false } : false
        } else {
          pgPoolConfig.ssl = this.poolConfig.ssl
        }
      }

      if (this.poolConfig.applicationName) {
        pgPoolConfig.application_name = this.poolConfig.applicationName
      }

      this.pool = new pg.Pool(pgPoolConfig)

      // Verify connection immediately to catch config errors early
      const client = await this.pool.connect()
      client.release()

      this.connected = true
    } catch (error) {
      this.connected = false
      this.pool = null
      throw new ConnectionError('Could not connect to PostgreSQL', error)
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    if (this.transactionClient) {
      await this.transactionClient.release()
      this.transactionClient = null
    }

    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }

    this.connected = false
    this.transactionActive = false
    this.preparedStatements.clear()
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.pool !== null
  }

  /**
   * Execute a query and return results
   */
  async query<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    const params = bindings.map((b) => {
      if (b === undefined) return null
      if (b instanceof Date) return b.toISOString()
      return b
    })

    if (this.transactionActive && this.transactionClient) {
      try {
        const result = await this.transactionClient.query(sql, params)
        return this.formatQueryResult<T>(result)
      } catch (error) {
        throw this.normalizeError(error, sql, bindings)
      }
    }

    if (!this.connected || !this.pool) {
      await this.connect()
    }

    try {
      // Use pool.query directly for better performance and automatic connection release
      const result = await this.pool!.query(sql, params)
      return this.formatQueryResult<T>(result)
    } catch (error) {
      throw this.normalizeError(error, sql, bindings)
    }
  }

  /**
   * Format pg result to Atlas QueryResult
   */
  private formatQueryResult<T>(result: PgResult): QueryResult<T> {
    const fields = result.fields?.map((f: PgFieldInfo) => ({
      name: f.name,
      dataType: f.dataTypeID?.toString(),
      tableId: f.tableID,
    }))

    return {
      rows: result.rows as T[],
      rowCount: result.rowCount ?? 0,
      ...(fields ? { fields } : {}),
    }
  }

  /**
   * Execute a statement (INSERT/UPDATE/DELETE)
   */
  async execute(sql: string, bindings: unknown[] = []): Promise<ExecuteResult> {
    const params = bindings.map((b) => {
      if (b === undefined) return null
      if (b instanceof Date) return b.toISOString()
      return b
    })

    if (this.transactionActive && this.transactionClient) {
      try {
        const result = await this.transactionClient.query(sql, params)
        return this.formatExecuteResult(result)
      } catch (error) {
        throw this.normalizeError(error, sql, bindings)
      }
    }

    if (!this.connected || !this.pool) {
      await this.connect()
    }

    try {
      const result = await this.pool!.query(sql, params)
      return this.formatExecuteResult(result)
    } catch (error) {
      throw this.normalizeError(error, sql, bindings)
    }
  }

  /**
   * Format pg result to Atlas ExecuteResult
   */
  private formatExecuteResult(result: PgResult): ExecuteResult {
    // Try to extract insert ID from RETURNING clause
    let insertId: number | bigint | undefined
    if (result.rows && result.rows.length > 0) {
      const firstRow = result.rows[0] as Record<string, unknown>
      // Look for common primary key column names
      insertId = (firstRow.id ?? firstRow.ID ?? firstRow[Object.keys(firstRow)[0] ?? '']) as
        | number
        | bigint
        | undefined
    }

    return {
      affectedRows: result.rowCount ?? 0,
      ...(insertId !== undefined ? { insertId } : {}),
    }
  }

  /**
   * Prepare a statement for repeated execution
   */
  async prepare(sql: string): Promise<string> {
    // Check if already prepared
    if (this.preparedStatements.has(sql)) {
      return this.preparedStatements.get(sql)!
    }

    const name = `stmt_${++this.statementCounter}`
    this.preparedStatements.set(sql, name)
    return name
  }

  /**
   * Execute a prepared statement
   */
  async executePrepared<T>(name: string, bindings: unknown[] = []): Promise<QueryResult<T>> {
    const params = bindings.map((b) => (b === undefined ? null : b))

    // Find original SQL for this name if available
    let sql = `EXECUTE ${name}`
    for (const [s, n] of this.preparedStatements.entries()) {
      if (n === name) {
        sql = s
        break
      }
    }

    if (this.transactionActive && this.transactionClient) {
      try {
        // Use pg's built-in prepared statement support via name and text
        const result = await this.transactionClient.query({
          name,
          text: sql,
          values: params,
        })
        return this.formatQueryResult<T>(result)
      } catch (error) {
        throw this.normalizeError(error, `EXECUTE ${name}`, bindings)
      }
    }

    if (!this.connected || !this.pool) {
      await this.connect()
    }

    try {
      const result = await this.pool!.query({
        name,
        text: sql,
        values: params,
      })
      return this.formatQueryResult<T>(result)
    } catch (error) {
      throw this.normalizeError(error, `EXECUTE ${name}`, bindings)
    }
  }

  /**
   * Clear all prepared statements
   */
  async clearPreparedStatements(): Promise<void> {
    this.preparedStatements.clear()
    // In pg, prepared statements with 'name' are managed automatically by the pool/client.
    // We don't need to manually DEALLOCATE unless we used raw SQL PREPARE.
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<void> {
    if (this.transactionActive) {
      throw new Error('Transaction already in progress')
    }

    if (!this.pool) {
      await this.connect()
    }
    if (!this.pool) {
      throw new Error('Database connection failed')
    }
    this.transactionClient = await this.pool.connect()
    await this.transactionClient.query('BEGIN')
    this.transactionActive = true
  }

  /**
   * Commit the current transaction
   */
  async commit(): Promise<void> {
    if (!this.transactionActive || !this.transactionClient) {
      throw new Error('No transaction in progress')
    }

    await this.transactionClient.query('COMMIT')
    this.transactionClient.release()
    this.transactionClient = null
    this.transactionActive = false
  }

  /**
   * Rollback the current transaction
   */
  async rollback(): Promise<void> {
    if (!this.transactionActive || !this.transactionClient) {
      throw new Error('No transaction in progress')
    }

    await this.transactionClient.query('ROLLBACK')
    this.transactionClient.release()
    this.transactionClient = null
    this.transactionActive = false
  }

  /**
   * Check if currently in a transaction
   */
  inTransaction(): boolean {
    return this.transactionActive
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats(): PoolStats | null {
    if (!this.pool) {
      return null
    }

    const poolInternal = this.pool as any
    const idle = poolInternal.idleCount ?? 0
    const total = poolInternal.totalCount ?? 0
    const pending = poolInternal.waitingCount ?? 0
    const active = total - idle

    return {
      idle,
      pending,
      active,
      total,
      max: this.poolConfig.pool?.max ?? 10,
    }
  }

  /**
   * Get connection pool health status
   */
  getPoolHealth(): PoolHealth {
    const stats = this.getPoolStats()
    if (!stats) {
      return {
        status: 'disconnected',
        message: 'Connection pool not initialized',
      }
    }

    const utilization = stats.active / stats.max
    const pendingRatio = stats.pending / stats.max

    if (utilization >= 0.9) {
      return {
        status: 'critical',
        message: `Connection pool utilization critical: ${(utilization * 100).toFixed(1)}%`,
        stats,
        lastCheck: new Date(),
      }
    }

    if (utilization >= 0.7 || pendingRatio > 0.5) {
      return {
        status: 'warning',
        message: `Connection pool utilization high: ${(utilization * 100).toFixed(1)}%`,
        stats,
        lastCheck: new Date(),
      }
    }

    return {
      status: 'healthy',
      message: 'Connection pool operating normally',
      stats,
      lastCheck: new Date(),
    }
  }

  /**
   * Adjust the connection pool size
   * Note: pg Pool doesn't support dynamic resizing, so we reconnect with new size
   */
  async adjustPoolSize(targetSize: number): Promise<void> {
    if (!this.pool) {
      return
    }

    const currentMax = this.poolConfig.pool?.max ?? 10
    if (targetSize === currentMax) {
      return
    }

    // Clamp target size to reasonable bounds
    const min = this.poolConfig.pool?.min ?? 2
    const max = 100
    const adjustedSize = Math.max(min, Math.min(max, targetSize))

    try {
      // Disconnect old pool
      await this.disconnect()

      // Update config with new pool size
      this.poolConfig = {
        ...this.poolConfig,
        pool: {
          ...this.poolConfig.pool,
          max: adjustedSize,
        },
      }

      // Reconnect with new size
      await this.connect()
    } catch (error) {
      console.error('Failed to adjust PostgreSQL pool size:', error)
      throw error
    }
  }

  /**
   * Normalize PostgreSQL errors
   */
  private normalizeError(error: unknown, sql: string, bindings: unknown[]): DatabaseError {
    // Postgres error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
    const err = error as { code?: string; message?: string }
    const code = err.code
    const message = err.message || String(error)

    if (code === '23505') {
      return new UniqueConstraintError(message, error, sql, bindings)
    }
    if (code === '23503') {
      return new ForeignKeyConstraintError(message, error, sql, bindings)
    }
    if (code === '23502') {
      return new NotNullConstraintError(message, error, sql, bindings)
    }
    if (code === '42P01') {
      return new TableNotFoundError(message, error, sql, bindings)
    }

    return new DatabaseError(message, error, sql, bindings)
  }

  /**
   * Dynamically load the pg module
   */
  private async loadPgModule(): Promise<PgModule> {
    try {
      const pg = await import('pg')
      return pg as unknown as PgModule
    } catch (e) {
      throw new Error(
        `PostgreSQL driver requires the "pg" package. Please install it: bun add pg. Original Error: ${e}`
      )
    }
  }
}

// ============================================================================
// Type definitions for pg module (to avoid direct dependency)
// ============================================================================

interface PgModule {
  Pool: new (config: PgPoolConfig) => PgPool
  Client: new (config: PgPoolConfig) => PgClient
}

interface PgPoolConfig {
  host?: string | undefined
  port?: number | undefined
  database?: string | undefined
  user?: string | undefined
  password?: string | undefined
  ssl?: boolean | object | undefined
  min?: number | undefined
  max?: number | undefined
  idleTimeoutMillis?: number | undefined
  connectionTimeoutMillis?: number | undefined
  application_name?: string | undefined
}

interface PgPool {
  connect(): Promise<PgPoolClient>
  end(): Promise<void>
  query(sql: string, values?: unknown[]): Promise<PgResult>
}

interface PgClient {
  query(sql: string, values?: unknown[]): Promise<PgResult>
  release(): void
}

interface PgPoolClient extends PgClient {
  release(): void
}

interface PgResult {
  rows: unknown[]
  rowCount: number | null
  fields?: PgFieldInfo[]
}

interface PgFieldInfo {
  name: string
  dataTypeID?: number
  tableID?: number
}
