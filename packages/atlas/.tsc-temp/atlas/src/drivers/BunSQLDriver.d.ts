/**
 * Bun Native SQL Driver
 */
import type {
  ConnectionConfig,
  DriverContract,
  DriverType,
  ExecuteResult,
  PoolStats,
  QueryResult,
} from '../types'
export declare class BunSQLDriver implements DriverContract {
  private readonly config
  private client
  private sqliteClient
  private connected
  private transactionActive
  private preparedManager?
  constructor(config: ConnectionConfig)
  getDriverName(): DriverType
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  query<T = Record<string, unknown>>(sql: string, bindings?: unknown[]): Promise<QueryResult<T>>
  execute(sql: string, bindings?: unknown[]): Promise<ExecuteResult>
  private normalizeBindings
  beginTransaction(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  inTransaction(): boolean
  private ensureConnection
  private getConnectionUrl
  prepare(sql: string): Promise<string>
  executePrepared<T = Record<string, unknown>>(
    name: string,
    bindings?: unknown[]
  ): Promise<QueryResult<T>>
  clearPreparedStatements(): Promise<void>
  stream<T = Record<string, unknown>>(sql: string, bindings?: unknown[]): AsyncIterable<T>
  getPoolStats(): PoolStats | null
  /**
   * Adjust pool size for AdaptivePoolManager compatibility.
   * Note: Bun.sql does not support runtime connection pool resize.
   * Pool size is fixed at connect() time via the connection URL.
   */
  adjustPoolSize(targetSize: number): Promise<void>
  private normalizeError
}
