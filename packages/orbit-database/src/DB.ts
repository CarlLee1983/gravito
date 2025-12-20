/**
 * DB Facade
 * @description Static entry point for database operations (Laravel-style)
 */

import { ConnectionManager } from './connection/ConnectionManager'
import { raw } from './query/Expression'
import type {
  ConnectionConfig,
  ConnectionContract,
  QueryBuilderContract,
  QueryResult,
  CacheInterface,
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
   * Prevent instantiation
   */
  private constructor() { }

  // ============================================================================
  // Configuration
  // ============================================================================

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
   * Add a single connection
   */
  static addConnection(name: string, config: ConnectionConfig): void {
    DB.manager.addConnection(name, config)
    DB.initialized = true
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
   * Create a query builder for a table
   */
  static table<T = Record<string, unknown>>(tableName: string): QueryBuilderContract<T> {
    return DB.connection().table<T>(tableName)
  }

  /**
   * Execute raw SQL
   */
  static async raw<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    return DB.connection().raw<T>(sql, bindings)
  }

  /**
   * Create a raw expression
   */
  static raw_expr = raw

  // ============================================================================
  // Transactions
  // ============================================================================

  /**
   * Run a callback within a transaction
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
    await connection.getDriver().beginTransaction()
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
