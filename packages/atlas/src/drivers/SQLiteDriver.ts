/**
 * SQLite Driver
 * @description Database driver implementation for SQLite using better-sqlite3
 */

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
 * SQLite Prepared Statement Cache Entry
 */
interface PreparedStatementEntry {
  stmt: SQLiteStatement
  lastUsed: number
  useCount: number
}

/**
 * Simple LRU cache for SQLite prepared statements
 */
class SQLitePreparedStatementCache {
  private cache = new Map<string, PreparedStatementEntry>()
  private readonly maxSize: number
  private readonly idleTimeout: number

  constructor(maxSize = 100, idleTimeout = 60000) {
    this.maxSize = maxSize
    this.idleTimeout = idleTimeout
  }

  get(sql: string, client: SQLiteClient): SQLiteStatement {
    const entry = this.cache.get(sql)
    if (entry) {
      entry.lastUsed = Date.now()
      entry.useCount++
      return entry.stmt
    }

    // Cache miss - prepare new statement
    const stmt = client.prepare(sql)
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed()
    }

    this.cache.set(sql, {
      stmt,
      lastUsed: Date.now(),
      useCount: 0,
    })

    return stmt
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null
    let oldestTime = Number.POSITIVE_INFINITY

    for (const [key, entry] of this.cache) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  cleanup(): void {
    const now = Date.now()
    const toRemove: string[] = []

    for (const [key, entry] of this.cache) {
      if (now - entry.lastUsed > this.idleTimeout) {
        toRemove.push(key)
      }
    }

    for (const key of toRemove) {
      this.cache.delete(key)
    }
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

  async query<T = Record<string, unknown>>(
    sql: string,

    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    if (!this.client) {
      await this.connect()
    }

    // Initialize prepared statement cache on first use
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

  async beginTransaction(): Promise<void> {
    if (!this.client) {
      await this.connect()
    }
    if (process.env.DEBUG_ATLAS) {
      // biome-ignore lint: Internal debug logging
      console.log('[SQLiteDriver] BEGIN')
    }
    this.client?.prepare('BEGIN').run()
    this.inTransactionState = true
  }

  async commit(): Promise<void> {
    if (!this.client) {
      return
    }
    if (process.env.DEBUG_ATLAS) {
      // biome-ignore lint: Internal debug logging
      console.log('[SQLiteDriver] COMMIT')
    }
    this.client?.prepare('COMMIT').run()
    this.inTransactionState = false
  }

  async rollback(): Promise<void> {
    if (!this.client) {
      return
    }
    if (process.env.DEBUG_ATLAS) {
      // biome-ignore lint: Internal debug logging
      console.log('[SQLiteDriver] ROLLBACK')
    }
    this.client?.prepare('ROLLBACK').run()
    this.inTransactionState = false
  }

  inTransaction(): boolean {
    return this.inTransactionState || (this.client?.inTransaction ?? false)
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
