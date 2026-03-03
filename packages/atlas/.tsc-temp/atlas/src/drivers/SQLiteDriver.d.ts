/**
 * SQLite Driver
 * @description Database driver implementation for SQLite using better-sqlite3
 */
import type {
  ConnectionConfig,
  DriverContract,
  DriverType,
  ExecuteResult,
  QueryResult,
} from '../types'
/**

 * SQLite Driver

 */
/**
 * SQLite driver implementation for Atlas ORM.
 *
 * Automatically detects and uses `bun:sqlite` if running in Bun,
 * otherwise falls back to `better-sqlite3`.
 *
 * @public
 * @since 3.0.0
 */
export declare class SQLiteDriver implements DriverContract {
  private config
  private client
  private inTransactionState
  private preparedStatementCache?
  private cleanupTimer?
  /**
   * Transaction/Savepoint stack for nested transaction support
   * Level 0: No transaction
   * Level 1+: Savepoint depth (uses SAVEPOINT sp_N)
   */
  private transactionDepth
  constructor(config: ConnectionConfig)
  getDriverName(): DriverType
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  private normalizeBindings
  /**
   * Ensure prepared statement cache is initialized
   * @private
   */
  private ensurePreparedStatementCache
  query<T = Record<string, unknown>>(sql: string, bindings?: unknown[]): Promise<QueryResult<T>>
  execute(sql: string, bindings?: unknown[]): Promise<ExecuteResult>
  /**
   * Begin a transaction or create a savepoint for nested transactions
   *
   * Supports arbitrary nesting depth:
   * - Level 0→1: BEGIN transaction
   * - Level 1→2+: CREATE SAVEPOINT sp_N (nested)
   *
   * @example
   * ```typescript
   * await driver.beginTransaction()  // Level 1: BEGIN
   *   await driver.beginTransaction()  // Level 2: SAVEPOINT sp_1
   *     // nested operations
   *   await driver.commit()  // Level 2: RELEASE SAVEPOINT sp_1
   * await driver.commit()  // Level 1: COMMIT
   * ```
   */
  beginTransaction(): Promise<void>
  /**
   * Commit a transaction or release a savepoint
   *
   * - Level 1→0: COMMIT transaction
   * - Level 2+→Level-1: RELEASE SAVEPOINT sp_N
   */
  commit(): Promise<void>
  /**
   * Rollback a transaction or rollback to a savepoint
   *
   * - Level 1→0: ROLLBACK transaction
   * - Level 2+→Level-1: ROLLBACK TO SAVEPOINT sp_N
   */
  rollback(): Promise<void>
  /**
   * Check if currently in a transaction (including nested)
   * @returns true if transactionDepth > 0 or inTransactionState is true
   */
  inTransaction(): boolean
  /**
   * Get current transaction nesting depth
   * @returns 0 if no transaction, 1+ if in transaction/savepoint
   */
  getTransactionDepth(): number
  /**
   * Clear prepared statement cache
   * Useful for releasing memory or resetting cache state
   */
  clearPreparedStatementCache(): void
  /**
   * Get prepared statement cache statistics
   */
  getPreparedStatementCacheSize(): number
  /**
   * Tagged template literal for safe parameterized SELECT queries
   *
   * @example
   * ```typescript
   * const user = await driver.sql`SELECT * FROM users WHERE id = ${userId}`
   * const users = await driver.sql`SELECT * FROM users WHERE name LIKE ${pattern}`
   * ```
   *
   * This is the recommended way to execute queries in SQLiteDriver as it:
   * - Prevents SQL injection by automatically parameterizing values
   * - Improves performance through prepared statement caching
   * - Provides type safety with proper TypeScript support
   */
  sql<T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<QueryResult<T>>
  /**
   * Tagged template literal for safe parameterized INSERT/UPDATE/DELETE queries
   *
   * @example
   * ```typescript
   * const result = await driver.sqlExecute`INSERT INTO users (name, email) VALUES (${name}, ${email})`
   * const affected = await driver.sqlExecute`UPDATE users SET name = ${name} WHERE id = ${id}`
   * const deleted = await driver.sqlExecute`DELETE FROM users WHERE id = ${id}`
   * ```
   *
   * Provides the same safety and performance benefits as sql() but for write operations.
   */
  sqlExecute(strings: TemplateStringsArray, ...values: unknown[]): Promise<ExecuteResult>
  /**
   * Batch insert with multi-value INSERT and automatic chunking
   *
   * @param table Table name
   * @param rows Array of rows to insert
   * @param options Batch options (chunkSize override, etc.)
   * @returns BatchInsertResult with per-chunk statistics
   *
   * @example
   * ```typescript
   * const result = await driver.batchInsert(
   *   'users',
   *   [
   *     { name: 'Alice', email: 'alice@example.com' },
   *     { name: 'Bob', email: 'bob@example.com' }
   *   ]
   * )
   * console.log(`Inserted ${result.totalAffectedRows} rows in ${result.chunkCount} chunks`)
   * ```
   */
  batchInsert<T extends Record<string, unknown>>(
    table: string,
    rows: T[],
    options?: {
      chunkSize?: number
    }
  ): Promise<any>
  /**
   * Batch execute multiple statements transactionally
   *
   * @param statements Array of {sql, bindings} to execute
   * @returns BatchExecuteResult with total affected rows and per-statement results
   *
   * @example
   * ```typescript
   * const result = await driver.batchExecute([
   *   { sql: 'UPDATE users SET status = ? WHERE id = ?', bindings: ['active', 1] },
   *   { sql: 'DELETE FROM logs WHERE user_id = ?', bindings: [1] }
   * ])
   * console.log(`Total affected: ${result.totalAffectedRows}`)
   * ```
   */
  batchExecute(
    statements: Array<{
      sql: string
      bindings?: unknown[]
    }>
  ): Promise<any>
  /**
  
  
  
       * Normalize SQLite errors
  
  
  
       */
  private normalizeError
}
