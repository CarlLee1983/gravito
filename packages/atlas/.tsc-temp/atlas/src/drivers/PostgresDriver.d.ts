/**
 * PostgreSQL Driver
 * @description Database driver implementation for PostgreSQL using node-pg
 */
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
export declare class PostgresDriver implements DriverContract {
  private pool
  private connected
  private transactionActive
  private transactionClient
  private preparedStatements
  private statementCounter
  private poolConfig
  constructor(config: PostgresConfig)
  /**
   * Get driver name
   */
  getDriverName(): DriverType
  /**
   * Connect to the database
   */
  connect(): Promise<void>
  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>
  /**
   * Check if connected
   */
  isConnected(): boolean
  /**
   * Execute a query and return results
   */
  query<T = Record<string, unknown>>(sql: string, bindings?: unknown[]): Promise<QueryResult<T>>
  /**
   * Execute a statement (INSERT/UPDATE/DELETE)
   */
  execute(sql: string, bindings?: unknown[]): Promise<ExecuteResult>
  /**
   * Prepare a statement for repeated execution
   */
  prepare(sql: string): Promise<string>
  /**
   * Execute a prepared statement
   */
  executePrepared<T>(name: string, bindings?: unknown[]): Promise<QueryResult<T>>
  /**
   * Clear all prepared statements
   */
  clearPreparedStatements(): Promise<void>
  /**
   * Begin a transaction
   */
  beginTransaction(): Promise<void>
  /**
   * Commit the current transaction
   */
  commit(): Promise<void>
  /**
   * Rollback the current transaction
   */
  rollback(): Promise<void>
  /**
   * Check if currently in a transaction
   */
  inTransaction(): boolean
  /**
   * Get connection pool statistics
   */
  getPoolStats(): PoolStats | null
  /**
   * Get connection pool health status
   */
  getPoolHealth(): PoolHealth
  /**
   * Adjust the connection pool size
   * Note: pg Pool doesn't support dynamic resizing, so we reconnect with new size
   */
  adjustPoolSize(targetSize: number): Promise<void>
  /**
   * Get a client for executing queries
   */
  private getClient
  /**
   * Normalize PostgreSQL errors
   */
  private normalizeError
  /**
   * Dynamically load the pg module
   */
  private loadPgModule
}
