/**
 * SQLite Driver
 * @description Database driver implementation for SQLite using better-sqlite3
 */

import { LRUCache } from 'lru-cache'

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
  QueryResult,
  SQLiteConfig,
} from '../types'
import type { SQLiteClient, SQLiteStatement } from './types'

// biome-ignore lint/suspicious/noExplicitAny: Bun global type
declare const Bun: { sql: (path: string) => SQLiteClient } | undefined

/**
 * LRU cache for SQLite prepared statements using lru-cache package
 */
class SQLitePreparedStatementCache {
  private cache: LRUCache<string, SQLiteStatement>

  constructor(maxSize = 100, idleTimeout = 60000) {
    this.cache = new LRUCache<string, SQLiteStatement>({
      max: maxSize,
      ttl: idleTimeout,
      ttlAutopurge: false,
      allowStale: false,
    })
  }

  get(sql: string, client: SQLiteClient): SQLiteStatement {
    const stmt = this.cache.get(sql)
    if (stmt) {
      return stmt
    }

    // Cache miss - prepare new statement
    const newStmt = client.prepare(sql)
    this.cache.set(sql, newStmt)
    return newStmt
  }

  cleanup(): void {
    this.cache.purgeStale()
  }

  clear(): void {
    this.cache.clear()
  }

  getSize(): number {
    return this.cache.size
  }
}

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
export class SQLiteDriver implements DriverContract {
  private config: SQLiteConfig

  private client: SQLiteClient | null = null

  private inTransactionState = false

  private preparedStatementCache?: SQLitePreparedStatementCache

  private cleanupTimer?: Timer

  /**
   * Transaction/Savepoint stack for nested transaction support
   * Level 0: No transaction
   * Level 1+: Savepoint depth (uses SAVEPOINT sp_N)
   */
  private transactionDepth = 0

  constructor(config: ConnectionConfig) {
    if (config.driver !== 'sqlite') {
      throw new Error(`Invalid driver type '${config.driver}' for SQLiteDriver`)
    }

    this.config = config as SQLiteConfig
  }

  getDriverName(): DriverType {
    return 'sqlite'
  }

  async connect(): Promise<void> {
    if (this.client) {
      return
    }

    try {
      if (typeof Bun !== 'undefined') {
        const { Database } = await import('bun:sqlite')

        this.client = new Database(this.config.database, {
          readonly: this.config.readonly ?? false,

          create: true,
        }) as unknown as SQLiteClient

        if ('exec' in this.client && typeof this.client.exec === 'function') {
          this.client.exec('PRAGMA journal_mode = WAL;')
        }
      } else {
        try {
          const { default: Database } = await import('better-sqlite3')

          this.client = new Database(this.config.database, {
            readonly: this.config.readonly ?? false,
          }) as unknown as SQLiteClient

          if ('pragma' in this.client && typeof this.client.pragma === 'function') {
            this.client.pragma('journal_mode = WAL')
          }
        } catch (e) {
          throw new Error(
            `SQLite driver requires "better-sqlite3" when running in Node.js. Please install it: bun add better-sqlite3. Original Error: ${e}`
          )
        }
      }
    } catch (error) {
      throw new ConnectionError('Could not connect to SQLite database', error)
    }
  }

  async disconnect(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
    if (this.preparedStatementCache) {
      this.preparedStatementCache.clear()
      this.preparedStatementCache = undefined
    }
    if (this.client) {
      this.client.close()

      this.client = null
    }
  }

  isConnected(): boolean {
    if (!this.client) {
      return false
    }
    if ('open' in this.client) {
      return (this.client as { open?: boolean }).open !== false
    }
    return true
  }

  private normalizeBindings(bindings: unknown[]): unknown[] {
    return bindings.map((b) => {
      if (b === undefined) {
        return null
      }

      if (b instanceof Date) {
        return b.toISOString()
      }

      if (typeof b === 'boolean') {
        return b ? 1 : 0
      }

      if (typeof b === 'object' && b !== null && !Array.isArray(b) && !ArrayBuffer.isView(b)) {
        return JSON.stringify(b)
      }

      return b
    })
  }

  /**
   * Ensure prepared statement cache is initialized
   * @private
   */
  private ensurePreparedStatementCache(): void {
    if (!this.preparedStatementCache && this.client) {
      const cacheConfig = (this.config as any).preparedStatementCache ?? {}
      this.preparedStatementCache = new SQLitePreparedStatementCache(
        cacheConfig.maxStatements ?? 100,
        cacheConfig.idleTimeout ?? 60000
      )
      // Start periodic cleanup every 30 seconds
      this.cleanupTimer = setInterval(() => {
        this.preparedStatementCache?.cleanup()
      }, 30000)
    }
  }

  async query<T = Record<string, unknown>>(
    sql: string,

    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    if (!this.client) {
      await this.connect()
    }

    // Initialize prepared statement cache on first use
    this.ensurePreparedStatementCache()

    const params = this.normalizeBindings(bindings)

    try {
      if (!this.client) {
        throw new Error('SQLite client not connected')
      }

      // Use cache to get prepared statement
      const stmt = this.preparedStatementCache
        ? this.preparedStatementCache.get(sql, this.client)
        : this.client.prepare(sql)

      const rows = stmt.all(...params) as T[]

      let lastInsertId: any
      try {
        const idRes = this.client.prepare('SELECT last_insert_rowid() as id').get() as any
        lastInsertId = idRes?.id
      } catch {
        /* ignore */
      }

      return {
        rows,
        rowCount: rows.length,
        insertId: lastInsertId,
      }
    } catch (error: unknown) {
      if (process.env.DEBUG_ATLAS) {
        console.error(`[SQLite Query Failed] ${sql}`, error)
      }
      throw this.normalizeError(error, sql, bindings)
    }
  }

  async execute(sql: string, bindings: unknown[] = []): Promise<ExecuteResult> {
    if (!this.client) {
      await this.connect()
    }

    // Initialize prepared statement cache on first use
    this.ensurePreparedStatementCache()

    const params = this.normalizeBindings(bindings)

    try {
      if (!this.client) {
        throw new Error('SQLite client not connected')
      }

      // Use cache to get prepared statement
      const stmt = this.preparedStatementCache
        ? this.preparedStatementCache.get(sql, this.client)
        : this.client.prepare(sql)

      const result = stmt.run(...params)
      return {
        affectedRows: result.changes,
        insertId: result.lastInsertRowid,
        changedRows: result.changes,
      }
    } catch (error: unknown) {
      if (process.env.DEBUG_ATLAS) {
        console.error(`[SQLite Execute Failed] ${sql}`, error)
      }
      throw this.normalizeError(error, sql, bindings)
    }
  }

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
  async beginTransaction(): Promise<void> {
    if (!this.client) {
      await this.connect()
    }

    const isRootTransaction = this.transactionDepth === 0

    if (isRootTransaction) {
      if (process.env.DEBUG_ATLAS) {
        // biome-ignore lint: Internal debug logging
        console.log('[SQLiteDriver] BEGIN')
      }
      this.client?.prepare('BEGIN').run()
      this.inTransactionState = true
    } else {
      // Nested transaction - use SAVEPOINT
      const savepointName = `sp_${this.transactionDepth}`
      if (process.env.DEBUG_ATLAS) {
        // biome-ignore lint: Internal debug logging
        console.log(`[SQLiteDriver] SAVEPOINT ${savepointName}`)
      }
      this.client?.prepare(`SAVEPOINT ${savepointName}`).run()
    }

    this.transactionDepth++
  }

  /**
   * Commit a transaction or release a savepoint
   *
   * - Level 1→0: COMMIT transaction
   * - Level 2+→Level-1: RELEASE SAVEPOINT sp_N
   */
  async commit(): Promise<void> {
    if (!this.client) {
      return
    }

    if (this.transactionDepth === 0) {
      // No active transaction
      return
    }

    this.transactionDepth--

    if (this.transactionDepth === 0) {
      // Committing root transaction
      if (process.env.DEBUG_ATLAS) {
        // biome-ignore lint: Internal debug logging
        console.log('[SQLiteDriver] COMMIT')
      }
      this.client?.prepare('COMMIT').run()
      this.inTransactionState = false
    } else {
      // Releasing savepoint (nested)
      const savepointName = `sp_${this.transactionDepth}`
      if (process.env.DEBUG_ATLAS) {
        // biome-ignore lint: Internal debug logging
        console.log(`[SQLiteDriver] RELEASE SAVEPOINT ${savepointName}`)
      }
      this.client?.prepare(`RELEASE SAVEPOINT ${savepointName}`).run()
    }
  }

  /**
   * Rollback a transaction or rollback to a savepoint
   *
   * - Level 1→0: ROLLBACK transaction
   * - Level 2+→Level-1: ROLLBACK TO SAVEPOINT sp_N
   */
  async rollback(): Promise<void> {
    if (!this.client) {
      return
    }

    if (this.transactionDepth === 0) {
      // No active transaction
      return
    }

    this.transactionDepth--

    if (this.transactionDepth === 0) {
      // Rolling back root transaction
      if (process.env.DEBUG_ATLAS) {
        // biome-ignore lint: Internal debug logging
        console.log('[SQLiteDriver] ROLLBACK')
      }
      this.client?.prepare('ROLLBACK').run()
      this.inTransactionState = false
    } else {
      // Rolling back to savepoint (nested)
      const savepointName = `sp_${this.transactionDepth}`
      if (process.env.DEBUG_ATLAS) {
        // biome-ignore lint: Internal debug logging
        console.log(`[SQLiteDriver] ROLLBACK TO SAVEPOINT ${savepointName}`)
      }
      this.client?.prepare(`ROLLBACK TO SAVEPOINT ${savepointName}`).run()
    }
  }

  /**
   * Check if currently in a transaction (including nested)
   * @returns true if transactionDepth > 0 or inTransactionState is true
   */
  inTransaction(): boolean {
    return (
      this.transactionDepth > 0 || this.inTransactionState || (this.client?.inTransaction ?? false)
    )
  }

  /**
   * Get current transaction nesting depth
   * @returns 0 if no transaction, 1+ if in transaction/savepoint
   */
  getTransactionDepth(): number {
    return this.transactionDepth
  }

  /**
   * Clear prepared statement cache
   * Useful for releasing memory or resetting cache state
   */
  clearPreparedStatementCache(): void {
    if (this.preparedStatementCache) {
      this.preparedStatementCache.clear()
    }
  }

  /**
   * Get prepared statement cache statistics
   */
  getPreparedStatementCacheSize(): number {
    return this.preparedStatementCache?.getSize() ?? 0
  }

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
  async sql<T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<QueryResult<T>> {
    // Build SQL string with placeholders
    let sql = ''
    for (let i = 0; i < strings.length; i++) {
      sql += strings[i]
      if (i < values.length) {
        sql += '?'
      }
    }

    // Execute as parameterized query
    return this.query(sql, values)
  }

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
  async sqlExecute(strings: TemplateStringsArray, ...values: unknown[]): Promise<ExecuteResult> {
    // Build SQL string with placeholders
    let sql = ''
    for (let i = 0; i < strings.length; i++) {
      sql += strings[i]
      if (i < values.length) {
        sql += '?'
      }
    }

    // Execute as parameterized statement
    return this.execute(sql, values)
  }

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
  async batchInsert<T extends Record<string, unknown>>(
    table: string,
    rows: T[],
    options?: { chunkSize?: number }
  ): Promise<any> {
    if (rows.length === 0) {
      return {
        totalAffectedRows: 0,
        firstInsertId: undefined,
        lastInsertId: undefined,
        chunkCount: 0,
        chunks: [],
      }
    }

    if (!this.client) {
      await this.connect()
    }

    // Ensure cache is ready
    this.ensurePreparedStatementCache()

    const columns = Object.keys(rows[0])
    // Conservative chunk size: SQLite supports up to 999 parameters per statement
    // With multi-value INSERT (?,?),(?,?), we need colCount * rowCount <= 999
    const maxColumnsPerChunk = Math.floor(999 / columns.length)
    const chunkSize = Math.min(options?.chunkSize ?? maxColumnsPerChunk, maxColumnsPerChunk)

    const result: any = {
      totalAffectedRows: 0,
      firstInsertId: undefined,
      lastInsertId: undefined,
      chunkCount: 0,
      chunks: [],
    }

    // Open transaction if not already in one
    const wasInTransaction = this.inTransaction()
    if (!wasInTransaction) {
      await this.beginTransaction()
    }

    try {
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize)

        // Build multi-value INSERT: INSERT INTO table (col1,col2) VALUES (?,?),(?,?)
        const quotedColumns = columns.map((c) => `"${c}"`).join(',')
        const placeholders = chunk.map(() => `(${columns.map(() => '?').join(',')})`).join(',')
        const sql = `INSERT INTO "${table}" (${quotedColumns}) VALUES ${placeholders}`

        // Flatten bindings: [row1.col1, row1.col2, row2.col1, row2.col2, ...]
        const flatBindings = chunk.flatMap((row) => columns.map((col) => row[col]))

        try {
          const chunkResult = await this.execute(sql, flatBindings)
          result.totalAffectedRows += chunkResult.affectedRows

          if (result.chunkCount === 0) {
            // First chunk - capture first insert ID
            result.firstInsertId = chunkResult.insertId
          }
          // Always update lastInsertId to track progression
          result.lastInsertId = chunkResult.insertId

          result.chunks.push({
            affectedRows: chunkResult.affectedRows,
            insertId: chunkResult.insertId,
          })
          result.chunkCount++
        } catch (error) {
          if (!wasInTransaction) {
            await this.rollback()
          }
          throw error
        }
      }

      if (!wasInTransaction) {
        await this.commit()
      }
      return result
    } catch (error) {
      if (!wasInTransaction) {
        await this.rollback()
      }
      throw error
    }
  }

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
  async batchExecute(statements: Array<{ sql: string; bindings?: unknown[] }>): Promise<any> {
    if (statements.length === 0) {
      return {
        totalAffectedRows: 0,
        results: [],
      }
    }

    if (!this.client) {
      await this.connect()
    }

    // Ensure cache is ready
    this.ensurePreparedStatementCache()

    const result: any = {
      totalAffectedRows: 0,
      results: [],
    }

    // Open transaction if not already in one
    const wasInTransaction = this.inTransaction()
    if (!wasInTransaction) {
      await this.beginTransaction()
    }

    try {
      for (const statement of statements) {
        try {
          const execResult = await this.execute(statement.sql, statement.bindings ?? [])
          result.totalAffectedRows += execResult.affectedRows
          result.results.push(execResult)
        } catch (error) {
          if (!wasInTransaction) {
            await this.rollback()
          }
          throw error
        }
      }

      if (!wasInTransaction) {
        await this.commit()
      }
      return result
    } catch (error) {
      if (!wasInTransaction) {
        await this.rollback()
      }
      throw error
    }
  }

  /**



     * Normalize SQLite errors



     */

  private normalizeError(error: unknown, sql: string, bindings: unknown[]): DatabaseError {
    const err = error as { message?: string }
    const errorMessage = err.message || String(error)
    const message = errorMessage.toLowerCase()

    if (message.includes('unique constraint failed') || message.includes('is not unique')) {
      return new UniqueConstraintError(errorMessage, error, sql, bindings)
    }

    if (message.includes('foreign key constraint failed')) {
      return new ForeignKeyConstraintError(errorMessage, error, sql, bindings)
    }

    if (message.includes('not null constraint failed')) {
      return new NotNullConstraintError(errorMessage, error, sql, bindings)
    }

    if (message.includes('no such table')) {
      return new TableNotFoundError(errorMessage, error, sql, bindings)
    }

    return new DatabaseError(errorMessage, error, sql, bindings)
  }
}
