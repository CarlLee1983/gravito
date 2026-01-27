/**
 * MySQL/MariaDB Driver
 * @description Database driver for MySQL and MariaDB using mysql2 package
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
  MySQLConfig,
  QueryResult,
} from '../types'

/**
 * MySQL Driver
 * Implements connection pooling and query execution for MySQL/MariaDB
 */
import type { MySQLConnection, MySQLModule, MySQLPool } from './types'

export class MySQLDriver implements DriverContract {
  private pool: MySQLPool | null = null
  private transactionConnection: MySQLConnection | null = null
  private connected = false
  private mysql: MySQLModule | null = null

  constructor(
    private readonly config: ConnectionConfig,
    private readonly driverType: 'mysql' | 'mariadb' = 'mysql'
  ) {}

  /**
   * Get the driver name
   */
  getDriverName(): DriverType {
    return this.driverType
  }

  /**
   * Connect to MySQL/MariaDB
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return
    }

    try {
      this.mysql = await this.loadMySQLModule()
      const myConfig = this.config as MySQLConfig

      const poolConfig: Record<string, unknown> = {
        host: myConfig.host ?? 'localhost',
        port: myConfig.port ?? 3306,
        database: myConfig.database,
        user: myConfig.username,
        password: myConfig.password,
        charset: myConfig.charset ?? 'utf8mb4',
        timezone: myConfig.timezone ?? 'local',
        connectionLimit: myConfig.pool?.max ?? 10,
        waitForConnections: true,
        queueLimit: 0,
      }

      // SSL configuration
      if (myConfig.ssl) {
        if (typeof myConfig.ssl === 'boolean') {
          poolConfig.ssl = myConfig.ssl ? {} : undefined
        } else {
          const sslConfig = myConfig.ssl as {
            rejectUnauthorized?: boolean
            ca?: string
            key?: string
            cert?: string
          }
          poolConfig.ssl = {
            rejectUnauthorized: sslConfig.rejectUnauthorized,
            ca: sslConfig.ca,
            key: sslConfig.key,
            cert: sslConfig.cert,
          }
        }
      }

      if (!this.mysql) {
        throw new Error('MySQL module not loaded')
      }
      this.pool = this.mysql.createPool(poolConfig)
      this.connected = true
    } catch (error) {
      throw new ConnectionError('Could not connect to MySQL', error)
    }
  }

  /**
   * Dynamically load mysql2 module
   */
  private async loadMySQLModule(): Promise<any> {
    try {
      const mysql2 = await import('mysql2/promise')
      return mysql2 as any
    } catch (e) {
      throw new Error(
        `MySQL driver requires the "mysql2" package. Please install it: bun add mysql2. Original Error: ${e}`
      )
    }
  }

  /**
   * Disconnect from MySQL
   */
  async disconnect(): Promise<void> {
    if (this.transactionConnection) {
      this.transactionConnection.release()
      this.transactionConnection = null
    }

    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }

    this.connected = false
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.pool !== null
  }

  /**
   * Execute a query
   */
  async query<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    const connection = this.transactionConnection ?? (await this.getConnection())

    const params = bindings.map((b) => {
      if (b === undefined) {
        return null
      }
      return b instanceof Date ? b.toISOString().slice(0, 19).replace('T', ' ') : b
    })

    try {
      const [result, fields] = await connection.execute(sql, params)

      // If it's a write operation (no fields), return the header as a single row
      if (!fields && result && typeof result === 'object' && 'insertId' in (result as any)) {
        const header = result as any
        const pseudoRow = { id: header.insertId, ...header }
        return {
          rows: [pseudoRow] as any,
          rowCount: 1,
        }
      }

      const rows = Array.isArray(result) ? (result as T[]) : []
      const fieldInfo = fields?.map(
        (f: { Field: string; Type: string; name?: string; type?: unknown } | string) => {
          const field = typeof f === 'string' ? { Field: f, Type: '' } : f
          return {
            name: field.name ?? field.Field,
            dataType: field.type?.toString() ?? field.Type,
            tableId: undefined,
          }
        }
      )

      return {
        rows,
        rowCount: rows.length,
        ...(fieldInfo ? { fields: fieldInfo } : {}),
      }
    } catch (error) {
      throw this.normalizeError(error, sql, bindings)
    } finally {
      if (!this.transactionConnection && connection) {
        connection.release()
      }
    }
  }

  /**
   * Execute a statement (INSERT/UPDATE/DELETE)
   */
  async execute(sql: string, bindings: unknown[] = []): Promise<ExecuteResult> {
    const connection = this.transactionConnection ?? (await this.getConnection())

    const params = bindings.map((b) => {
      if (b === undefined) {
        return null
      }
      return b instanceof Date ? b.toISOString().slice(0, 19).replace('T', ' ') : b
    })

    try {
      const [result] = await connection.execute(sql, params)
      const resultInfo = result as {
        affectedRows?: number
        insertId?: number
        changedRows?: number
      }

      return {
        affectedRows: resultInfo.affectedRows ?? 0,
        ...(resultInfo.insertId !== undefined && resultInfo.insertId !== 0
          ? { insertId: resultInfo.insertId }
          : {}),
        ...(resultInfo.changedRows !== undefined ? { changedRows: resultInfo.changedRows } : {}),
      }
    } catch (error) {
      throw this.normalizeError(error, sql, bindings)
    } finally {
      if (!this.transactionConnection && connection) {
        connection.release()
      }
    }
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<void> {
    if (this.transactionConnection) {
      throw new Error('Transaction already in progress')
    }

    this.transactionConnection = await this.getConnection()
    if (!this.transactionConnection) {
      throw new Error('Failed to get transaction connection')
    }
    await this.transactionConnection.beginTransaction()
  }

  /**
   * Commit the current transaction
   */
  async commit(): Promise<void> {
    if (!this.transactionConnection) {
      throw new Error('No transaction in progress')
    }

    await this.transactionConnection.commit()
    this.transactionConnection.release()
    this.transactionConnection = null
  }

  /**
   * Rollback the current transaction
   */
  async rollback(): Promise<void> {
    if (!this.transactionConnection) {
      throw new Error('No transaction in progress')
    }

    await this.transactionConnection.rollback()
    this.transactionConnection.release()
    this.transactionConnection = null
  }

  /**
   * Check if in transaction
   */
  inTransaction(): boolean {
    return this.transactionConnection !== null
  }

  /**
   * Get a connection from the pool
   */
  private async getConnection(): Promise<any> {
    if (!this.pool) {
      await this.connect()
    }

    if (!this.pool) {
      throw new Error('MySQL pool is not initialized')
    }

    return await this.pool.getConnection()
  }

  /**
   * Normalize MySQL/MariaDB errors
   */
  private normalizeError(error: unknown, sql: string, bindings: unknown[]): DatabaseError {
    const err = error as { errno?: number; code?: number; message?: string }
    const code = err.errno || err.code
    const message = err.message || String(error)

    if (code === 1062) {
      return new UniqueConstraintError(message, error, sql, bindings)
    }
    if (code === 1451 || code === 1452) {
      return new ForeignKeyConstraintError(message, error, sql, bindings)
    }
    if (code === 1048) {
      return new NotNullConstraintError(message, error, sql, bindings)
    }
    if (code === 1146) {
      return new TableNotFoundError(message, error, sql, bindings)
    }

    return new DatabaseError(message, error, sql, bindings)
  }
}
