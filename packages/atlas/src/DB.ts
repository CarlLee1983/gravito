import { CacheRegistry } from './CacheRegistry'
import { fromEnv } from './config/defineConfig'
import { Connection } from './connection/Connection'
import { ConnectionManager } from './connection/ConnectionManager'
import { Grammar } from './grammar/Grammar'
import { type AtlasMetrics, AtlasObservability, type AtlasTracer } from './observability'
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
export class DB {
  private static manager: ConnectionManager = new ConnectionManager()
  private static shardingManagers: Map<string, ShardingManager> = new Map()
  private static initialized = false
  private static _debug = false
  private static _queryLog: Array<{
    sql: string
    bindings: unknown[]
    duration: number
    timestamp: number
  }> = []
  private static readonly MAX_LOG_SIZE = 1000
  private static queryListener?: (query: {
    connection: string
    sql: string
    bindings: unknown[]
    duration: number
    timestamp: number
  }) => void

  /**
   * Registers a ShardingManager for distributed database architectures.
   *
   * @param name - Unique identifier for the sharding cluster
   * @param manager - The initialized ShardingManager instance
   */
  static addShardingManager(name: string, manager: ShardingManager): void {
    DB.shardingManagers.set(name, manager)
  }

  /**
   * Retrieves a registered ShardingManager.
   *
   * @param name - Name of the sharding cluster (defaults to 'default')
   * @throws Error if the manager is not found
   */
  static getShardingManager(name = 'default'): ShardingManager {
    const manager = DB.shardingManagers.get(name)
    if (!manager) {
      throw new Error(`ShardingManager '${name}' is not registered.`)
    }
    return manager
  }

  /**
   * Sets the global cache provider for query results.
   *
   * @param cache - Implementation of CacheInterface (e.g., Redis, In-Memory).
   */
  static setCache(cache: CacheInterface) {
    CacheRegistry.setCache(cache)
  }

  /**
   * Retrieves the active global cache provider.
   *
   * @returns The cache interface or undefined if none is configured.
   */
  static getCache(): CacheInterface | undefined {
    return CacheRegistry.getCache()
  }

  /**
   * Toggles debug mode for query logging.
   *
   * When enabled, executed queries are stored in an internal log with
   * performance metrics.
   *
   * @param enabled - Whether to enable logging.
   */
  static debug(enabled = true): void {
    this._debug = enabled
    if (enabled) {
      if (!this.queryListener) {
        this.queryListener = (query) => {
          this.logQuery(query.sql, query.bindings, query.duration)
        }
        Connection.queryListeners.push(this.queryListener)
      }
    } else {
      if (this.queryListener) {
        const index = Connection.queryListeners.indexOf(this.queryListener)
        if (index > -1) {
          Connection.queryListeners.splice(index, 1)
        }
        this.queryListener = undefined
      }
      this._queryLog = []
    }
  }

  /**
   * Indicates if debug mode is currently active.
   */
  static isDebug(): boolean {
    return this._debug
  }

  /**
   * Retrieves the last executed SQL statement with interpolated values.
   *
   * Useful for debugging and integration testing.
   *
   * @returns The full SQL string or null if no queries were run.
   */
  static getLastQuery(): string | null {
    const last = this._queryLog[this._queryLog.length - 1]
    return last ? this.interpolateBindings(last.sql, last.bindings) : null
  }

  /**
   * Retrieves the complete query log for the current session.
   *
   * @returns A copy of the query log array.
   */
  static getQueryLog(): typeof this._queryLog {
    return [...this._queryLog]
  }

  /**
   * Flushes the internal query log.
   */
  static clearQueryLog(): void {
    this._queryLog = []
  }

  /**
   * Records a query execution event.
   *
   * @param sql - The SQL statement.
   * @param bindings - The parameter values.
   * @param duration - Time taken in ms.
   * @internal
   */
  static logQuery(sql: string, bindings: unknown[], duration: number): void {
    if (!this._debug) {
      return
    }

    this._queryLog.push({
      sql,
      bindings,
      duration,
      timestamp: Date.now(),
    })

    if (this._queryLog.length > this.MAX_LOG_SIZE) {
      this._queryLog.shift()
    }
  }

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
  private static interpolateBindings(sql: string, bindings: unknown[]): string {
    let index = 0
    return sql.replace(/\?/g, () => {
      if (index >= bindings.length) {
        return '?'
      }
      const binding = bindings[index++]

      if (binding === null || binding === undefined) {
        return 'NULL'
      }
      if (typeof binding === 'string') {
        return `'${binding.replace(/'/g, "''")}'`
      }
      if (binding instanceof Date) {
        return `'${binding.toISOString()}'`
      }
      return String(binding)
    })
  }

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
  static async pretend<T>(callback: () => Promise<T>): Promise<{ queries: string[]; result?: T }> {
    const originalDebug = this._debug
    this._debug = true
    this._queryLog = []

    const driver = this.connection().getDriver()
    const originalExecute = driver.execute.bind(driver)
    const originalQuery = driver.query.bind(driver)
    const queries: string[] = []

    driver.execute = async (sql: string, bindings?: unknown[]) => {
      queries.push(this.interpolateBindings(sql, bindings || []))
      return { rows: [], affectedRows: 0 }
    }

    driver.query = async (sql: string, bindings?: unknown[]) => {
      queries.push(this.interpolateBindings(sql, bindings || []))
      return { rows: [], rowCount: 0 } as any
    }

    try {
      const result = await callback()
      return { queries, result }
    } finally {
      driver.execute = originalExecute
      driver.query = originalQuery
      this._debug = originalDebug
    }
  }

  private constructor() {}

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Retrieves performance metrics from the SQL compiler cache.
   *
   * @returns Stats including hit rate and cache utilization.
   */
  static getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return Grammar.getCacheStats()
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
  static configure(config: AtlasConfig): void {
    DB.manager = new ConnectionManager(config.connections)
    if (config.default) {
      DB.manager.setDefaultConnection(config.default)
    }

    if (config.observability?.enabled) {
      AtlasObservability.getInstance().initialize({
        tracing: {
          enabled: config.observability.tracing !== false,
          serviceName: config.observability.serviceName,
        },
        metrics: {
          enabled: config.observability.metrics !== false,
        },
      })
    }

    DB.initialized = true
  }

  /**
   * Retrieves the global tracer for manual span creation.
   */
  static getTracer(): AtlasTracer | undefined {
    return AtlasObservability.getTracer()
  }

  /**
   * Retrieves the global metrics reporter.
   */
  static getMetrics(): AtlasMetrics | undefined {
    return AtlasObservability.getMetrics()
  }

  /**
   * Configures the database using environment variables.
   *
   * Looks for standard DB_* variables or DATABASE_URL.
   *
   * @param connectionName - The name to assign to the primary connection.
   */
  static configureFromEnv(connectionName = 'default'): void {
    const config = fromEnv(connectionName)
    DB.configure(config)
  }

  /**
   * Loads configuration from a file.
   *
   * Automatically detects common patterns like config/database.ts.
   *
   * @param configPath - Explicit path to the config file.
   */
  static async configureFromFile(configPath?: string): Promise<void> {
    const { loadConfigFile } = await import('./config/loadConfig')
    const config = await loadConfigFile(configPath)
    DB.configure(config)
  }

  /**
   * Best-effort configuration using file detection then environment variables.
   *
   * @param configPath - Optional path to try first.
   */
  static async autoConfigure(configPath?: string): Promise<void> {
    const { loadConfig } = await import('./config/loadConfig')
    const config = await loadConfig({ configPath, useEnv: true })
    this.configure(config)
  }

  /**
   * Manually adds a connection to the manager.
   *
   * @param name - Unique connection name.
   * @param config - Connection settings (standard or read/write replica).
   */
  static addConnection(name: string, config: AtlasConnectionEntry): void {
    DB.manager.addConnection(name, config)
    DB.initialized = true
  }

  /**
   * Adds a connection configured via prefixed environment variables.
   *
   * @param name - Connection name.
   * @param prefix - Env variable prefix (e.g. "READ_ONLY").
   */
  static addConnectionFromEnv(name: string, prefix = ''): void {
    const config = fromEnv(name, prefix)
    DB.manager.addConnection(name, config.connections[name])
    if (!DB.initialized) {
      DB.initialized = true
    }
  }

  /**
   * Sets the global default connection.
   *
   * @param name - The connection identifier.
   */
  static setDefaultConnection(name: string): void {
    DB.manager.setDefaultConnection(name)
  }

  /**
   * Returns the name of the current default connection.
   */
  static getDefaultConnection(): string {
    return DB.manager.getDefaultConnection()
  }

  // ============================================================================
  // Connection Access
  // ============================================================================

  /**
   * Retrieves a connection instance.
   *
   * @param name - Name of the connection (defaults to the global default).
   * @returns The active connection instance.
   * @throws {Error} If DB is not configured or connection name is unknown.
   */
  static connection(name?: string): ConnectionContract {
    DB.ensureConfigured()
    return DB.manager.connection(name)
  }

  /**
   * Retrieves the read replica connection for the given connection name.
   *
   * Uses round-robin selection across configured read replicas.
   * Falls back to the primary connection if no replicas are configured.
   *
   * @param name - Connection name (defaults to global default)
   */
  static readConnection(name?: string): ConnectionContract {
    DB.ensureConfigured()
    return DB.manager.readConnection(name)
  }

  /**
   * Retrieves the write (primary) connection for the given connection name.
   *
   * Use this to force a query to run on the primary even inside a read context.
   *
   * @param name - Connection name (defaults to global default)
   */
  static writeConnection(name?: string): ConnectionContract {
    DB.ensureConfigured()
    return DB.manager.writeConnection(name)
  }

  /**
   * Checks if a specific connection has been configured.
   */
  static hasConnection(name: string): boolean {
    return DB.manager.hasConnection(name)
  }

  /**
   * Lists all configured connection identifiers.
   */
  static getConnectionNames(): string[] {
    return DB.manager.getConnectionNames()
  }

  /**
   * Retrieves the raw configuration for a connection.
   */
  static getConnectionConfig(name?: string): AtlasConnectionEntry | undefined {
    const connectionName = name ?? DB.manager.getDefaultConnection()
    return DB.manager.getConfig(connectionName)
  }

  // ============================================================================
  // Query Building
  // ============================================================================

  /**
   * Initializes a fluent query builder for a specific table.
   *
   * @template T - The row type.
   * @param tableName - The database table name.
   * @returns A QueryBuilder instance.
   */
  static table<T = Record<string, unknown>>(tableName: string): QueryBuilderContract<T> {
    DB.ensureConfigured()
    return DB.manager.connection().table<T>(tableName)
  }

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
  static async raw<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    const tracer = DB.getTracer()
    const span = tracer?.startSpan('Atlas:Raw', {
      'db.operation': 'raw',
    })

    try {
      if (span) {
        span.setAttribute('db.statement', sql)
      }
      return await DB.connection().raw<T>(sql, bindings)
    } finally {
      span?.end()
    }
  }

  /**
   * Alias for {@link raw}.
   */
  static async rawQuery<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    return DB.raw<T>(sql, bindings)
  }

  // ============================================================================
  // Transactions
  // ============================================================================

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
  static async transaction<T>(
    callback: (connection: ConnectionContract) => Promise<T>,
    connectionName?: string
  ): Promise<T> {
    const tracer = DB.getTracer()
    const span = tracer?.startSpan('Atlas:Transaction')

    try {
      return await DB.connection(connectionName).transaction(callback)
    } finally {
      span?.end()
    }
  }

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
  static async transactionWithRetry<T>(
    callback: (connection: ConnectionContract, attempt: number) => Promise<T>,
    connectionName?: string,
    options: {
      maxRetries?: number
      baseDelay?: number
      maxDelay?: number
      retryableErrors?: (error: any) => boolean
      onRetry?: (error: any, attempt: number, delay: number) => void
    } = {}
  ): Promise<T> {
    const { maxRetries = 5, baseDelay = 100, maxDelay = 30000 } = options
    let attempts = 0

    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

    while (attempts < maxRetries) {
      try {
        attempts++
        return await DB.transaction(async (conn) => {
          return await callback(conn, attempts)
        }, connectionName)
      } catch (error: any) {
        const isRetryable =
          error.name === 'StaleModelError' ||
          (error.code &&
            ['40001', 'ER_LOCK_DEADLOCK', 'SQLITE_BUSY', '40P01'].includes(error.code)) ||
          options.retryableErrors?.(error)

        if (!isRetryable || attempts >= maxRetries) {
          throw error
        }

        // Full Jitter: random(0, min(maxDelay, baseDelay * 2^attempt))
        const backoff = Math.min(maxDelay, baseDelay * 2 ** attempts)
        const jitteredDelay = Math.floor(Math.random() * backoff)

        // Trigger Retry Hook
        options.onRetry?.(error, attempts, jitteredDelay)

        await delay(jitteredDelay)
      }
    }

    throw new Error('Transaction failed after exceeding max retries')
  }

  /**
   * Manually starts a database transaction.
   *
   * Caller is responsible for calling commit() or rollback().
   *
   * @param connectionName - Connection to use.
   * @returns A transaction-scoped connection.
   * @throws {Error} If the driver does not support transactions.
   */
  static async beginTransaction(connectionName?: string): Promise<ConnectionContract> {
    const connection = DB.connection(connectionName)
    const driver = connection.getDriver()

    if ('beginTransaction' in driver && typeof driver.beginTransaction === 'function') {
      await driver.beginTransaction()
    } else {
      throw new Error(`Driver '${driver.getDriverName()}' does not support transactions`)
    }

    return connection
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Closes the specified connection.
   */
  static async disconnect(name?: string): Promise<void> {
    await DB.manager.disconnect(name)
  }

  /**
   * Closes all managed connections.
   */
  static async disconnectAll(): Promise<void> {
    await DB.manager.disconnectAll()
  }

  /**
   * Safely shuts down the database subsystem.
   */
  static async shutdown(): Promise<void> {
    await DB.manager.shutdown()
  }

  /**
   * Closes and re-opens a connection.
   */
  static async reconnect(name?: string): Promise<ConnectionContract> {
    return DB.manager.reconnect(name)
  }

  /**
   * Removes a connection from the internal cache without closing it.
   */
  static purge(name?: string): void {
    DB.manager.purge(name)
  }

  // ============================================================================
  // Quick Access Methods (Shortcuts)
  // ============================================================================

  /**
   * Shortcut for starting a query with specific columns.
   */
  static select<T = Record<string, unknown>>(
    tableName: string,
    columns: string[] = ['*']
  ): QueryBuilderContract<T> {
    return DB.table<T>(tableName).select(...columns)
  }

  /**
   * Shortcut for inserting records.
   */
  static async insert<T = Record<string, unknown>>(
    tableName: string,
    data: Partial<T> | Partial<T>[]
  ): Promise<T[]> {
    return DB.table<T>(tableName).insert(data)
  }

  /**
   * Shortcut for updating records based on key-value filters.
   */
  static async update<T = Record<string, unknown>>(
    tableName: string,
    where: Record<string, unknown>,
    data: Partial<T>
  ): Promise<number> {
    let query = DB.table<T>(tableName)
    for (const [key, value] of Object.entries(where)) {
      query = query.where(key, value)
    }
    return query.update(data)
  }

  /**
   * Shortcut for deleting records based on key-value filters.
   */
  static async delete(tableName: string, where: Record<string, unknown>): Promise<number> {
    let query = DB.table(tableName)
    for (const [key, value] of Object.entries(where)) {
      query = query.where(key, value)
    }
    return query.delete()
  }

  // ============================================================================
  // Internal
  // ============================================================================

  /**
   * Ensures the DB facade is ready for use.
   */
  private static ensureConfigured(): void {
    if (!DB.initialized) {
      throw new Error('Database not configured. Call DB.configure() or DB.addConnection() first.')
    }
  }

  /**
   * Internal reset for testing.
   * @internal
   */
  static async _reset(): Promise<void> {
    await DB.manager.disconnectAll()
    DB.manager = new ConnectionManager()
    DB.initialized = false
  }
}
