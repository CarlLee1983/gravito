/**
 * Connection
 * @description Represents a database connection
 */
import type { AtlasMetrics, AtlasTracer } from '../observability'
import type {
  ConnectionConfig,
  ConnectionContract,
  DriverContract,
  ExecuteResult,
  GrammarContract,
  PoolStats,
  QueryBuilderContract,
  QueryResult,
  SafeQueryBuilderContract,
} from '../types'
/**
 * Database Connection
 * Wraps a driver and grammar for query building and execution
 */
export declare class Connection implements ConnectionContract {
  protected readonly name: string
  protected readonly config: ConnectionConfig
  protected driver: DriverContract
  protected grammar: GrammarContract
  protected connected: boolean
  protected proxy?: ConnectionContract
  protected tracer: AtlasTracer | undefined
  protected metrics: AtlasMetrics | undefined
  /**
   * Static query listeners for global observation (e.g. debugging)
   */
  static queryListeners: Array<
    (query: {
      connection: string
      sql: string
      bindings: unknown[]
      duration: number
      timestamp: number
    }) => void
  >
  constructor(name: string, config: ConnectionConfig)
  /**
   * Set the proxy instance for this connection
   */
  setProxy(proxy: ConnectionContract): void
  /**
   * Get connection name
   */
  getName(): string
  /**
   * Get the underlying driver
   */
  getDriver(): DriverContract
  /**
   * Get connection configuration
   */
  getConfig(): ConnectionConfig
  /**
   * Get the grammar
   */
  getGrammar(): GrammarContract
  /**
   * Get the tracer
   */
  getTracer(): AtlasTracer | undefined
  /**
   * Get the metrics
   */
  getMetrics(): AtlasMetrics | undefined
  /**
   * Create a new query builder for a table
   */
  table<T = Record<string, unknown>>(tableName: string): QueryBuilderContract<T>
  /**
   * Alias for table() for NoSQL connections
   */
  collection<T = Record<string, unknown>>(name: string): QueryBuilderContract<T>
  /**
   * Safe query builder using tagged template literals
   * Automatically prevents SQL injection through parameter binding
   *
   * @example
   * ```typescript
   * const userId = 123
   * const users = await this.sql`SELECT * FROM users WHERE id = ${userId}`.all()
   * ```
   */
  sql<T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): SafeQueryBuilderContract<T>
  /**
   * Execute raw SQL
   */
  raw<T = Record<string, unknown>>(sql: string, bindings?: unknown[]): Promise<QueryResult<T>>
  /**
   * Execute raw SQL statement (INSERT/UPDATE/DELETE)
   */
  execute(sql: string, bindings?: unknown[]): Promise<ExecuteResult>
  /**
   * Run a callback within a transaction
   */
  transaction<T>(callback: (connection: ConnectionContract) => Promise<T>): Promise<T>
  /**
   * Stream query results for processing large datasets
   * @param sql - SQL query
   * @param bindings - Query parameters
   * @returns Async iterable of result rows
   */
  stream<T = Record<string, unknown>>(sql: string, bindings?: unknown[]): AsyncIterable<T>
  /**
   * Get connection pool statistics (if supported by driver)
   * @returns Pool statistics or null if not supported
   */
  getPoolStats(): PoolStats | null
  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>
  /**
   * Connect to the database
   */
  connect(): Promise<void>
  /**
   * Ensure connection is established
   */
  protected ensureConnected(): Promise<void>
  /**
   * Create the driver instance based on config
   * Automatically prefers Bun.sql native driver when available (unless explicitly disabled)
   */
  protected createDriver(): DriverContract
  /**
   * Create the grammar instance based on config
   */
  protected createGrammar(): GrammarContract
}
