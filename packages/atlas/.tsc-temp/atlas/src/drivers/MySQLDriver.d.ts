/**
 * MySQL/MariaDB Driver
 * @description Database driver for MySQL and MariaDB using mysql2 package
 */
import type {
  ConnectionConfig,
  DriverContract,
  DriverType,
  ExecuteResult,
  PoolHealth,
  PoolStats,
  QueryResult,
} from '../types'
export declare class MySQLDriver implements DriverContract {
  private pool
  private transactionConnection
  private connected
  private mysql
  private poolConfig
  private readonly driverType
  constructor(config: ConnectionConfig, driverType?: 'mysql' | 'mariadb')
  /**
   * Get the driver name
   */
  getDriverName(): DriverType
  /**
   * Connect to MySQL/MariaDB
   */
  connect(): Promise<void>
  /**
   * Dynamically load mysql2 module
   */
  private loadMySQLModule
  /**
   * Disconnect from MySQL
   */
  disconnect(): Promise<void>
  /**
   * Check if connected
   */
  isConnected(): boolean
  /**
   * Execute a query
   */
  query<T = Record<string, unknown>>(sql: string, bindings?: unknown[]): Promise<QueryResult<T>>
  /**
   * Execute a statement (INSERT/UPDATE/DELETE)
   */
  execute(sql: string, bindings?: unknown[]): Promise<ExecuteResult>
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
   * Check if in transaction
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
   * Note: mysql2 Pool doesn't support dynamic resizing, so we reconnect with new size
   */
  adjustPoolSize(targetSize: number): Promise<void>
  /**
   * Get a connection from the pool
   */
  private getConnection
  /**
   * Normalize MySQL/MariaDB errors
   */
  private normalizeError
}
