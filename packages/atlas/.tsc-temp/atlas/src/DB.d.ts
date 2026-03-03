import { type AtlasMetrics, type AtlasTracer } from './observability'
import type { ShardingManager } from './sharding/ShardingManager'
import type {
  AtlasConfig,
  AtlasConnectionEntry,
  CacheInterface,
  ConnectionContract,
  QueryBuilderContract,
  QueryResult,
} from './types'
/**
 * DB Facade - Static entry point for database operations.
 *
 * Provides a Laravel-style static interface for managing connections,
 * building queries, and executing transactions. Acts as the primary
 * gateway for application-level database interaction.
 *
 * @example
 * ```typescript
 * // Setup
 * DB.configure({
 *   default: 'main',
 *   connections: { main: { driver: 'sqlite', database: ':memory:' } }
 * });
 *
 * // Fluent Querying
 * const users = await DB.table('users').where('id', 1).get();
 *
 * // Raw Execution
 * const stats = await DB.raw('SELECT count(*) FROM users');
 * ```
 */
export declare class DB {
  private static manager
  private static shardingManagers
  private static initialized
  private static _debug
  private static _queryLog
  private static readonly MAX_LOG_SIZE
  private static queryListener?
  /**
   * Registers a ShardingManager for distributed database architectures.
   *
   * @param name - Unique identifier for the sharding cluster
   * @param manager - The initialized ShardingManager instance
   */
  static addShardingManager(name: string, manager: ShardingManager): void
  /**
   * Retrieves a registered ShardingManager.
   *
   * @param name - Name of the sharding cluster (defaults to 'default')
   * @throws Error if the manager is not found
   */
  static getShardingManager(name?: string): ShardingManager
  /**
   * Sets the global cache provider for query results.
   *
   * @param cache - Implementation of CacheInterface (e.g., Redis, In-Memory).
   */
  static setCache(cache: CacheInterface): void
  /**
   * Retrieves the active global cache provider.
   *
   * @returns The cache interface or undefined if none is configured.
   */
  static getCache(): CacheInterface | undefined
  /**
   * Toggles debug mode for query logging.
   *
   * When enabled, executed queries are stored in an internal log with
   * performance metrics.
   *
   * @param enabled - Whether to enable logging.
   */
  static debug(enabled?: boolean): void
  /**
   * Indicates if debug mode is currently active.
   */
  static isDebug(): boolean
  /**
   * Retrieves the last executed SQL statement with interpolated values.
   *
   * Useful for debugging and integration testing.
   *
   * @returns The full SQL string or null if no queries were run.
   */
  static getLastQuery(): string | null
  /**
   * Retrieves the complete query log for the current session.
   *
   * @returns A copy of the query log array.
   */
  static getQueryLog(): typeof this._queryLog
  /**
   * Flushes the internal query log.
   */
  static clearQueryLog(): void
  /**
   * Records a query execution event.
   *
   * @param sql - The SQL statement.
   * @param bindings - The parameter values.
   * @param duration - Time taken in ms.
   * @internal
   */
  static logQuery(sql: string, bindings: unknown[], duration: number): void
  /**
   * Interpolates bindings into a SQL string for display purposes.
   *
   * Warning: This is only for logging/debugging and NOT for execution
   * to avoid SQL injection risks.
   *
   * @param sql - The SQL template with placeholders.
   * @param bindings - The values to inject.
   * @returns The readable SQL string.
   */
  private static interpolateBindings
  /**
   * Executes a callback in "pretend" mode where queries are captured but not run.
   *
   * Ideal for verifying generated SQL without side effects.
   *
   * @param callback - Logic to simulate.
   * @returns Captured SQL strings and the callback result.
   *
   * @example
   * ```typescript
   * const { queries } = await DB.pretend(() => User.create({ name: 'Test' }));
   * ```
   */
  static pretend<T>(callback: () => Promise<T>): Promise<{
    queries: string[]
    result?: T
  }>
  private constructor()
  /**
   * Retrieves performance metrics from the SQL compiler cache.
   *
   * @returns Stats including hit rate and cache utilization.
   */
  static getCacheStats(): {
    size: number
    maxSize: number
    hitRate: number
  }
  /**
   * Initializes the database subsystem with the provided configuration.
   *
   * Configures the connection manager and observability (Tracing/Metrics).
   * This method must be called before any database operations.
   *
   * @param config - The Atlas configuration object.
   * @throws {Error} If configuration is invalid.
   */
  static configure(config: AtlasConfig): void
  /**
   * Retrieves the global tracer for manual span creation.
   */
  static getTracer(): AtlasTracer | undefined
  /**
   * Retrieves the global metrics reporter.
   */
  static getMetrics(): AtlasMetrics | undefined
  /**
   * Configures the database using environment variables.
   *
   * Looks for standard DB_* variables or DATABASE_URL.
   *
   * @param connectionName - The name to assign to the primary connection.
   */
  static configureFromEnv(connectionName?: string): void
  /**
   * Loads configuration from a file.
   *
   * Automatically detects common patterns like config/database.ts.
   *
   * @param configPath - Explicit path to the config file.
   */
  static configureFromFile(configPath?: string): Promise<void>
  /**
   * Best-effort configuration using file detection then environment variables.
   *
   * @param configPath - Optional path to try first.
   */
  static autoConfigure(configPath?: string): Promise<void>
  /**
   * Manually adds a connection to the manager.
   *
   * @param name - Unique connection name.
   * @param config - Connection settings (standard or read/write replica).
   */
  static addConnection(name: string, config: AtlasConnectionEntry): void
  /**
   * Adds a connection configured via prefixed environment variables.
   *
   * @param name - Connection name.
   * @param prefix - Env variable prefix (e.g. "READ_ONLY").
   */
  static addConnectionFromEnv(name: string, prefix?: string): void
  /**
   * Sets the global default connection.
   *
   * @param name - The connection identifier.
   */
  static setDefaultConnection(name: string): void
  /**
   * Returns the name of the current default connection.
   */
  static getDefaultConnection(): string
  /**
   * Retrieves a connection instance.
   *
   * @param name - Name of the connection (defaults to the global default).
   * @returns The active connection instance.
   * @throws {Error} If DB is not configured or connection name is unknown.
   */
  static connection(name?: string): ConnectionContract
  /**
   * Retrieves the read replica connection for the given connection name.
   *
   * Uses round-robin selection across configured read replicas.
   * Falls back to the primary connection if no replicas are configured.
   *
   * @param name - Connection name (defaults to global default)
   */
  static readConnection(name?: string): ConnectionContract
  /**
   * Retrieves the write (primary) connection for the given connection name.
   *
   * Use this to force a query to run on the primary even inside a read context.
   *
   * @param name - Connection name (defaults to global default)
   */
  static writeConnection(name?: string): ConnectionContract
  /**
   * Checks if a specific connection has been configured.
   */
  static hasConnection(name: string): boolean
  /**
   * Lists all configured connection identifiers.
   */
  static getConnectionNames(): string[]
  /**
   * Retrieves the raw configuration for a connection.
   */
  static getConnectionConfig(name?: string): AtlasConnectionEntry | undefined
  /**
   * Initializes a fluent query builder for a specific table.
   *
   * @template T - The row type.
   * @param tableName - The database table name.
   * @returns A QueryBuilder instance.
   */
  static table<T = Record<string, unknown>>(tableName: string): QueryBuilderContract<T>
  /**
   * Executes a raw SQL statement with telemetry tracking.
   *
   * @template T - The expected row type.
   * @param sql - The SQL string with placeholders.
   * @param bindings - Array of values.
   * @returns The raw query result.
   *
   * @example
   * ```typescript
   * const users = await DB.raw('SELECT * FROM users WHERE active = ?', [true]);
   * ```
   */
  static raw<T = Record<string, unknown>>(
    sql: string,
    bindings?: unknown[]
  ): Promise<QueryResult<T>>
  /**
   * Alias for {@link raw}.
   */
  static rawQuery<T = Record<string, unknown>>(
    sql: string,
    bindings?: unknown[]
  ): Promise<QueryResult<T>>
  /**
   * Executes logic within a managed database transaction.
   *
   * Automatically commits on success and rolls back on error.
   * Receives a connection instance scoped to the transaction.
   *
   * @template T - Logic result type.
   * @param callback - The transactional logic.
   * @param connectionName - Optional specific connection.
   * @returns The callback's return value.
   */
  static transaction<T>(
    callback: (connection: ConnectionContract) => Promise<T>,
    connectionName?: string
  ): Promise<T>
  /**
   * Executes logic within a managed database transaction with automatic retry on serialization/stale data failures.
   *
   * Particularly useful for high-concurrency environments utilizing optimistic locking,
   * where `StaleModelError` is thrown due to concurrent writes.
   *
   * ### ⚠️ CONCURRENCY WARNING:
   * 1. The `callback` MUST be idempotent. It will be re-executed on failure.
   * 2. Avoid external side effects (Email, Slack, HTTP calls) inside the callback.
   * 3. Do not modify external state variables that are not reset between retries.
   *
   * @template T - Logic result type.
   * @param callback - The transactional logic. Receives the connection and current attempt.
   * @param connectionName - Optional specific connection name.
   * @param options - Retry configuration (maxRetries, baseDelay, maxDelay, retryableErrors, onRetry).
   * @returns The callback's return value.
   * @throws Rethrows the last error if max retries are exceeded.
   */
  static transactionWithRetry<T>(
    callback: (connection: ConnectionContract, attempt: number) => Promise<T>,
    connectionName?: string,
    options?: {
      maxRetries?: number
      baseDelay?: number
      maxDelay?: number
      retryableErrors?: (error: any) => boolean
      onRetry?: (error: any, attempt: number, delay: number) => void
    }
  ): Promise<T>
  /**
   * Manually starts a database transaction.
   *
   * Caller is responsible for calling commit() or rollback().
   *
   * @param connectionName - Connection to use.
   * @returns A transaction-scoped connection.
   * @throws {Error} If the driver does not support transactions.
   */
  static beginTransaction(connectionName?: string): Promise<ConnectionContract>
  /**
   * Closes the specified connection.
   */
  static disconnect(name?: string): Promise<void>
  /**
   * Closes all managed connections.
   */
  static disconnectAll(): Promise<void>
  /**
   * Safely shuts down the database subsystem.
   */
  static shutdown(): Promise<void>
  /**
   * Closes and re-opens a connection.
   */
  static reconnect(name?: string): Promise<ConnectionContract>
  /**
   * Removes a connection from the internal cache without closing it.
   */
  static purge(name?: string): void
  /**
   * Shortcut for starting a query with specific columns.
   */
  static select<T = Record<string, unknown>>(
    tableName: string,
    columns?: string[]
  ): QueryBuilderContract<T>
  /**
   * Shortcut for inserting records.
   */
  static insert<T = Record<string, unknown>>(
    tableName: string,
    data: Partial<T> | Partial<T>[]
  ): Promise<T[]>
  /**
   * Shortcut for updating records based on key-value filters.
   */
  static update<T = Record<string, unknown>>(
    tableName: string,
    where: Record<string, unknown>,
    data: Partial<T>
  ): Promise<number>
  /**
   * Shortcut for deleting records based on key-value filters.
   */
  static delete(tableName: string, where: Record<string, unknown>): Promise<number>
  /**
   * Ensures the DB facade is ready for use.
   */
  private static ensureConfigured
  /**
   * Internal reset for testing.
   * @internal
   */
  static _reset(): Promise<void>
}
