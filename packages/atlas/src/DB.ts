/**
 * DB Facade
 * @description Static entry point for database operations (Laravel-style)
 */

import { ConnectionManager } from './connection/ConnectionManager'
import { Grammar } from './grammar/Grammar'
import type {
  CacheInterface,
  ConnectionConfig,
  ConnectionContract,
  QueryBuilderContract,
  QueryResult,
} from './types'

/**
 * DB Facade
 * Provides a static interface for database operations
 *
 * @example
 * ```typescript
 * // Initialize
 * DB.addConnection('default', {
 *   driver: 'postgres',
 *   host: 'localhost',
 *   database: 'myapp'
 * })
 *
 * // Query
 * const users = await DB.table('users').where('active', true).get()
 * const user = await DB.table('users').find(1)
 *
 * // Insert
 * await DB.table('users').insert({ name: 'John', email: 'john@example.com' })
 *
 * // Transaction
 * await DB.transaction(async (db) => {
 *   await db.table('accounts').where('id', 1).decrement('balance', 100)
 *   await db.table('accounts').where('id', 2).increment('balance', 100)
 * })
 *
 * // Raw SQL
 * const results = await DB.raw('SELECT * FROM users WHERE id = $1', [1])
 * ```
 */
export class DB {
  private static manager: ConnectionManager = new ConnectionManager()
  private static initialized = false
  private static cache: CacheInterface | undefined
  private static _debug = false
  private static _queryLog: Array<{
    sql: string
    bindings: unknown[]
    duration: number
    timestamp: number
  }> = []
  private static readonly MAX_LOG_SIZE = 1000

  /**
   * Set global cache provider
   */
  static setCache(cache: CacheInterface) {
    DB.cache = cache
  }

  /**
   * Get global cache provider
   */
  static getCache(): CacheInterface | undefined {
    return DB.cache
  }

  /**
   * Enable/disable debug mode with query logging
   */
  static debug(enabled = true): void {
    this._debug = enabled
    if (!enabled) {
      this._queryLog = []
    }
  }

  /**
   * Check if debug mode is enabled
   */
  static isDebug(): boolean {
    return this._debug
  }

  /**
   * Get the last executed query
   */
  static getLastQuery(): string | null {
    const last = this._queryLog[this._queryLog.length - 1]
    return last ? this.interpolateBindings(last.sql, last.bindings) : null
  }

  /**
   * Get query log
   */
  static getQueryLog(): typeof this._queryLog {
    return [...this._queryLog]
  }

  /**
   * Clear query log
   */
  static clearQueryLog(): void {
    this._queryLog = []
  }

  /**
   * Log a query (internal use)
   */
  static logQuery(sql: string, bindings: unknown[], duration: number): void {
    if (!this._debug) return

    this._queryLog.push({
      sql,
      bindings,
      duration,
      timestamp: Date.now(),
    })

    // Prevent memory leak - keep only last N queries
    if (this._queryLog.length > this.MAX_LOG_SIZE) {
      this._queryLog.shift()
    }
  }

  /**
   * Interpolate bindings into SQL (for display only, not execution)
   */
  private static interpolateBindings(sql: string, bindings: unknown[]): string {
    let index = 0
    return sql.replace(/\?/g, () => {
      if (index >= bindings.length) return '?'
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
   * Pretend mode: capture queries without executing
   */
  static async pretend<T>(callback: () => Promise<T>): Promise<{ queries: string[]; result?: T }> {
    const originalDebug = this._debug
    this._debug = true
    this._queryLog = []

    const driver = this.connection().getDriver()
    const originalExecute = driver.execute.bind(driver)
    const queries: string[] = []

    // Intercept execute calls
    driver.execute = async (sql: string, bindings?: unknown[]) => {
      queries.push(this.interpolateBindings(sql, bindings || []))
      // Return empty result
      return { rows: [], affectedRows: 0 }
    }

    try {
      await callback()
    } finally {
      driver.execute = originalExecute
      this._debug = originalDebug
    }

    return { queries }
  }

  /**
   * Prevent instantiation
   */
  private constructor() {}

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return Grammar.getCacheStats()
  }

  /**
   * Configure the database with connections
   */
  static configure(config: {
    default?: string
    connections: Record<string, ConnectionConfig>
  }): void {
    DB.manager = new ConnectionManager(config.connections)
    if (config.default) {
      DB.manager.setDefaultConnection(config.default)
    }
    DB.initialized = true
  }

  /**
   * Configure database from environment variables
   * Supports DATABASE_URL or individual DB_* variables
   *
   * @example
   * ```typescript
   * // Using DATABASE_URL
   * DB.configureFromEnv()
   *
   * // Using individual variables
   * // DB_DRIVER=postgres
   * // DB_HOST=localhost
   * // DB_DATABASE=myapp
   * DB.configureFromEnv()
   * ```
   */
  static configureFromEnv(connectionName = 'default'): void {
    const { fromEnv } = require('./config/defineConfig')
    const config = fromEnv(connectionName)
    DB.configure(config)
  }

  /**
   * Add a single connection
   */
  static addConnection(name: string, config: ConnectionConfig): void {
    DB.manager.addConnection(name, config)
    DB.initialized = true
  }

  /**
   * Add connection from environment variables with prefix
   * Useful for multiple connections from different env vars
   *
   * @example
   * ```typescript
   * // READ_DB_DRIVER=postgres
   * // READ_DB_HOST=read-replica.example.com
   * // READ_DB_DATABASE=myapp
   * DB.addConnectionFromEnv('read', 'READ')
   * ```
   */
  static addConnectionFromEnv(name: string, prefix = ''): void {
    const { fromEnv } = require('./config/defineConfig')
    const config = fromEnv(name, prefix)
    DB.manager.addConnection(name, config.connections[name])
    if (!DB.initialized) {
      DB.initialized = true
    }
  }

  /**
   * Set the default connection name
   */
  static setDefaultConnection(name: string): void {
    DB.manager.setDefaultConnection(name)
  }

  /**
   * Get the default connection name
   */
  static getDefaultConnection(): string {
    return DB.manager.getDefaultConnection()
  }

  // ============================================================================
  // Connection Access
  // ============================================================================

  /**
   * Get a connection by name
   */
  static connection(name?: string): ConnectionContract {
    DB.ensureConfigured()
    return DB.manager.connection(name)
  }

  /**
   * Check if a connection exists
   */
  static hasConnection(name: string): boolean {
    return DB.manager.hasConnection(name)
  }

  /**
   * Get all connection names
   */
  static getConnectionNames(): string[] {
    return DB.manager.getConnectionNames()
  }

  /**
   * Get connection configuration
   */
  static getConnectionConfig(name?: string): ConnectionConfig | undefined {
    const connectionName = name ?? DB.manager.getDefaultConnection()
    return DB.manager.getConfig(connectionName)
  }

  // ============================================================================
  // Query Building
  // ============================================================================

  /**
   * Begin a fluent query against a database table.
   *
   * @template T - The type of the record (defaults to Record<string, unknown>).
   * @param tableName - The name of the table to query.
   * @returns A new QueryBuilder instance for the specified table.
   *
   * @example
   * ```typescript
   * const users = await DB.table('users')
   *   .where('status', 'active')
   *   .orderBy('created_at', 'desc')
   *   .get();
   * ```
   */
  static table<T = Record<string, unknown>>(tableName: string): QueryBuilderContract<T> {
    DB.ensureConfigured()
    return DB.manager.connection().table<T>(tableName)
  }

  /**
   * Execute a raw SQL query against the database.
   *
   * @template T - The expected return type of the rows.
   * @param sql - The raw SQL string (can contain placeholders like $1 or ?).
   * @param bindings - Array of values to bind to the placeholders.
   * @returns The raw query result containing rows and metadata.
   *
   * @example
   * ```typescript
   * const result = await DB.raw('SELECT * FROM users WHERE id = ?', [1]);
   * const user = result.rows[0];
   * ```
   */
  static async raw<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    return DB.connection().raw<T>(sql, bindings)
  }

  /**
   * Create a raw SQL expression that will not be escaped.
   * Useful for complex `where` clauses or updates.
   */
  /**
   * Execute a raw SQL query against the database.
   * Alias for raw() to match Laravel Artisan/Eloquent style sometimes used in JS
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
   * Execute a callback within a database transaction.
   *
   * If the callback throws an exception, the transaction is automatically rolled back.
   * If the callback returns successfully, the transaction is committed.
   *
   * @template T - The return type of the callback.
   * @param callback - The function to execute within the transaction. Receives a transaction-scoped connection.
   * @param connectionName - Optional connection name to use.
   * @returns The value returned by the callback.
   *
   * @example
   * ```typescript
   * await DB.transaction(async (trx) => {
   *   await trx.table('accounts').where('id', 1).decrement('balance', 100);
   *   await trx.table('accounts').where('id', 2).increment('balance', 100);
   * });
   * ```
   */
  static async transaction<T>(
    callback: (connection: ConnectionContract) => Promise<T>,
    connectionName?: string
  ): Promise<T> {
    return DB.connection(connectionName).transaction(callback)
  }

  /**
   * Begin a transaction manually
   * @returns Transaction connection
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
   * Disconnect from a specific connection
   */
  static async disconnect(name?: string): Promise<void> {
    await DB.manager.disconnect(name)
  }

  /**
   * Disconnect from all connections
   */
  static async disconnectAll(): Promise<void> {
    await DB.manager.disconnectAll()
  }

  /**
   * Reconnect to a connection
   */
  static async reconnect(name?: string): Promise<ConnectionContract> {
    return DB.manager.reconnect(name)
  }

  /**
   * Purge a connection from cache
   */
  static purge(name?: string): void {
    DB.manager.purge(name)
  }

  // ============================================================================
  // Quick Access Methods (Shortcuts)
  // ============================================================================

  /**
   * Select records from a table
   */
  static select<T = Record<string, unknown>>(
    tableName: string,
    columns: string[] = ['*']
  ): QueryBuilderContract<T> {
    return DB.table<T>(tableName).select(...columns)
  }

  /**
   * Insert records into a table
   */
  static async insert<T = Record<string, unknown>>(
    tableName: string,
    data: Partial<T> | Partial<T>[]
  ): Promise<T[]> {
    return DB.table<T>(tableName).insert(data)
  }

  /**
   * Update records in a table
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
   * Delete records from a table
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
   * Ensure the database is configured
   */
  private static ensureConfigured(): void {
    if (!DB.initialized) {
      throw new Error('Database not configured. Call DB.configure() or DB.addConnection() first.')
    }
  }

  /**
   * Reset the facade (for testing)
   */
  static async _reset(): Promise<void> {
    await DB.manager.disconnectAll()
    DB.manager = new ConnectionManager()
    DB.initialized = false
  }
}
