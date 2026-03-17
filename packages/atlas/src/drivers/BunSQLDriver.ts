/**
 * Bun Native SQL Driver
 */

import {
  ConnectionError,
  DatabaseError,
  ForeignKeyConstraintError,
  TableNotFoundError,
  UniqueConstraintError,
} from '../errors'
import type {
  ConnectionConfig,
  DriverContract,
  DriverType,
  ExecuteResult,
  PoolStats,
  QueryResult,
} from '../types'
import { BunSQLPreparedStatementManager } from './BunSQLPreparedStatement'

export class BunSQLDriver implements DriverContract {
  private client: unknown | null = null
  private sqliteClient: unknown | null = null
  private currentTx: unknown | null = null
  private connected = false
  private transactionActive = false
  private preparedManager?: BunSQLPreparedStatementManager

  constructor(private readonly config: ConnectionConfig) {}

  getDriverName(): DriverType {
    return this.config.driver as DriverType
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return
    }
    try {
      const { SQL } = await import('bun')

      if (this.config.driver === 'sqlite') {
        const { Database } = await import('bun:sqlite')
        this.sqliteClient = new Database(
          this.config.database === ':memory:' ? ':memory:' : this.config.database
        )
      } else if (
        this.config.driver === 'postgres' ||
        this.config.driver === 'mysql' ||
        this.config.driver === 'mariadb'
      ) {
        // 使用 Bun.sql 連接字符串 (URL 優先)
        const connUrl = this.buildConnectionUrl()
        if (!connUrl) {
          throw new ConnectionError(
            `Failed to build connection URL for ${this.config.driver}`,
            null
          )
        }

        try {
          if (process.env.DEBUG_ATLAS) {
            const c = this.config as any
            console.debug?.(`[BunSQLDriver] Connecting to ${this.config.driver}`)
            console.debug?.(`[BunSQLDriver] URL: ${connUrl?.replace(/:[^@]*@/, ':***@')}`)
            console.debug?.(
              `[BunSQLDriver] Config: host=${c.host}, port=${c.port}, db=${c.database}, user=${c.username}`
            )
            console.debug?.(`[BunSQLDriver] Creating Bun.sql instance for ${this.config.driver}`)
          }
          // 使用 URL 字符串初始化 (最簡單的方式)
          this.client = new SQL(connUrl)
          if (process.env.DEBUG_ATLAS) {
            console.debug?.(`[BunSQLDriver] Bun.sql instance created successfully`)
          }
        } catch (e) {
          if (process.env.DEBUG_ATLAS) {
            console.debug?.(`[BunSQLDriver] Failed to create SQL instance:`, e)
          }
          throw new ConnectionError(`Failed to initialize Bun.sql ${this.config.driver}: ${e}`, e)
        }
      } else {
        throw new ConnectionError(`BunSQLDriver does not support ${this.config.driver}`, null)
      }
      this.connected = true
    } catch (error) {
      throw new ConnectionError(`Failed to connect to ${this.config.driver}`, error)
    }
  }

  async disconnect(): Promise<void> {
    if (this.preparedManager) {
      await this.preparedManager.destroy()
      this.preparedManager = undefined
    }
    if (this.sqliteClient) {
      ;(this.sqliteClient as any).close()
      this.sqliteClient = null
    }
    if (this.client) {
      if (typeof (this.client as any).close === 'function') {
        await (this.client as any).close()
      }
      this.client = null
    }
    this.connected = false
    this.transactionActive = false
    this.currentTx = null
  }

  isConnected(): boolean {
    return this.connected && (this.client !== null || this.sqliteClient !== null)
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    await this.ensureConnection()
    try {
      const normalized = this.normalizeBindings(bindings)

      if (this.sqliteClient) {
        // @ts-expect-error
        const stmt = this.sqliteClient.query(sql)
        const rows = stmt.all(...normalized) as T[]

        let lastInsertRowid: any
        try {
          // @ts-expect-error
          const idRes = this.sqliteClient.query('SELECT last_insert_rowid() as id').get() as any
          lastInsertRowid = idRes?.id
        } catch {
          /* ignore */
        }

        return { rows, rowCount: rows.length, insertId: lastInsertRowid }
      }

      // PostgreSQL/MySQL: 使用 Bun.sql 原生 unsafe 查詢
      const client = (this.currentTx || this.client) as any

      if (process.env.DEBUG_ATLAS) {
        console.debug?.(`[BunSQLDriver] Query: ${sql.substring(0, 80)}...`)
        console.debug?.(`[BunSQLDriver] Client type:`, typeof client)
        console.debug?.(
          `[BunSQLDriver] Client.unsafe exists:`,
          typeof client?.unsafe === 'function'
        )
      }

      if (!client || typeof client.unsafe !== 'function') {
        throw new Error(
          `Client is not valid or unsafe() method not available. Client type: ${typeof client}`
        )
      }

      // Bun.sql 的 result 本身就是 rows (陣列)
      // 同時包含 metadata 如 columns, count 等
      const result = await client.unsafe(sql, normalized)
      if (process.env.DEBUG_ATLAS) {
        console.debug?.(`[BunSQLDriver] Query executed, rows:`, result?.length ?? 0)
      }

      const rows = Array.isArray(result) ? result : result?.rows || []
      let lastInsertRowid = result.insertId || result.lastInsertRowid

      // 若無原生 insertId，嘗試從第一行提取 id (PostgreSQL RETURNING 模式)
      if (!lastInsertRowid && rows.length > 0) {
        const firstRow = rows[0] as any
        if (firstRow) {
          // 常見的 ID 欄位名稱
          lastInsertRowid = firstRow.id ?? firstRow.ID ?? firstRow.insertId
        }
      }

      return {
        rows: rows as T[],
        rowCount: result.count ?? rows.length,
        insertId: lastInsertRowid,
      }
    } catch (error) {
      throw this.normalizeError(error, sql, bindings)
    }
  }

  async execute(sql: string, bindings: unknown[] = []): Promise<ExecuteResult> {
    await this.ensureConnection()
    try {
      if (this.sqliteClient) {
        const normalized = this.normalizeBindings(bindings)
        // @ts-expect-error
        const stmt = this.sqliteClient.query(sql)
        const result = stmt.run(...normalized)
        return {
          affectedRows: result.changes,
          insertId: result.lastInsertRowid,
        }
      } else {
        // PostgreSQL/MySQL：使用 Bun.sql
        const normalized = this.normalizeBindings(bindings)
        const res = await this.query(sql, normalized)
        return { affectedRows: res.rowCount ?? 0, insertId: res.insertId }
      }
    } catch (error) {
      throw this.normalizeError(error, sql, bindings)
    }
  }

  async values<T = unknown[]>(sql: string, bindings: unknown[] = []): Promise<T[]> {
    await this.ensureConnection()
    try {
      const normalized = this.normalizeBindings(bindings)

      if (this.sqliteClient) {
        // @ts-expect-error
        const stmt = this.sqliteClient.query(sql)
        return stmt.values(...normalized) as T[]
      } else {
        const client = (this.currentTx || this.client) as any
        let result: T[] = []

        if (typeof client.unsafe === 'function') {
          const query = client.unsafe(sql, normalized)
          result = (await query.values()) as T[]
        } else if (typeof client.prepare === 'function') {
          const stmt = client.prepare(sql)
          result = stmt.values(...normalized) as T[]
        } else {
          throw new Error('Bun.sql client does not have unsafe() or prepare() method')
        }

        return result
      }
    } catch (error) {
      throw this.normalizeError(error, sql, bindings)
    }
  }

  private normalizeBindings(bindings: unknown[]): unknown[] {
    return bindings.map((b) => {
      if (b instanceof Date) {
        // MySQL/MariaDB 原生驅動不喜歡 ISO8601 中的 'T' 和 'Z'
        if (this.config.driver === 'mysql' || this.config.driver === 'mariadb') {
          return b.toISOString().slice(0, 19).replace('T', ' ')
        }
        return b.toISOString()
      }
      if (b === undefined) {
        return null
      }
      // 不要轉換布林值為整數，Bun.sql 原生支援布林類型
      // 且 PostgreSQL 嚴格區分布林與整數
      return b
    })
  }

  async beginTransaction(): Promise<void> {
    await this.ensureConnection()
    if (this.sqliteClient) {
      // @ts-expect-error
      this.sqliteClient.exec('BEGIN')
    } else {
      await this.query('BEGIN')
    }
    this.transactionActive = true
  }

  async commit(): Promise<void> {
    if (!this.transactionActive) {
      return
    }
    if (this.sqliteClient) {
      // @ts-expect-error
      this.sqliteClient.exec('COMMIT')
    } else {
      await this.query('COMMIT')
    }
    this.transactionActive = false
  }

  async rollback(): Promise<void> {
    if (!this.transactionActive) {
      return
    }
    if (this.sqliteClient) {
      // @ts-expect-error
      this.sqliteClient.exec('ROLLBACK')
    } else {
      await this.query('ROLLBACK')
    }
    this.transactionActive = false
  }

  /**
   * Run callback within a native Bun.sql transaction
   */
  async runTransaction<T>(callback: () => Promise<T>): Promise<T> {
    if (this.sqliteClient) {
      // Fallback to legacy transaction for SQLite (bun:sqlite doesn't have closure-based tx)
      await this.beginTransaction()
      try {
        const result = await callback()
        await this.commit()
        return result
      } catch (error) {
        await this.rollback()
        throw error
      }
    }

    await this.ensureConnection()
    const client = this.client as any
    if (!client?.transaction) {
      throw new Error('Native transaction not supported')
    }

    return await client.transaction(async (tx: any) => {
      const prevTx = this.currentTx
      const prevActive = this.transactionActive
      this.currentTx = tx
      this.transactionActive = true
      try {
        return await callback()
      } finally {
        this.currentTx = prevTx
        this.transactionActive = prevActive
      }
    })
  }

  inTransaction(): boolean {
    return this.transactionActive
  }

  private async ensureConnection() {
    if (!this.connected || (!this.client && !this.sqliteClient)) {
      await this.connect()
    }
  }

  private buildConnectionUrl(): string | undefined {
    const c = this.config as any
    if (c.url) return c.url

    const protocol =
      c.driver === 'postgres'
        ? 'postgres'
        : c.driver === 'mysql' || c.driver === 'mariadb'
          ? 'mysql'
          : null

    if (!protocol) return undefined

    const auth = c.username
      ? c.password
        ? `${c.username}:${encodeURIComponent(c.password)}@`
        : `${c.username}@`
      : ''

    const params = new URLSearchParams()
    if (c.ssl) {
      params.set(c.driver === 'postgres' ? 'sslmode' : 'ssl', 'require')
    }
    if (c.pool?.max) {
      params.set('max', String(c.pool.max))
    }
    if (c.pool?.idleTimeout) {
      params.set('idle_timeout', String(Math.floor(c.pool.idleTimeout / 1000)))
    }

    const q = params.toString()
    const defaultPort = c.driver === 'postgres' ? '5432' : '3306'

    return `${protocol}://${auth}${c.host ?? 'localhost'}:${c.port ?? defaultPort}/${c.database}${q ? `?${q}` : ''}`
  }

  async prepare(sql: string): Promise<string> {
    await this.ensureConnection()
    if (this.sqliteClient) {
      throw new Error('Not supported for SQLite native yet')
    }
    // @ts-expect-error
    if (!this.client?.prepare) {
      throw new Error('Not supported')
    }
    if (!this.preparedManager) {
      // @ts-expect-error
      this.preparedManager = new BunSQLPreparedStatementManager(this.client)
    }
    return this.preparedManager.prepare(sql)
  }

  async executePrepared<T = Record<string, unknown>>(
    name: string,
    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    if (!this.preparedManager) {
      throw new Error('No manager')
    }
    try {
      const rows = await this.preparedManager.execute<T>(name, bindings)
      return { rows, rowCount: rows.length }
    } catch (error) {
      throw this.normalizeError(error, `[Prepared: ${name}]`, bindings)
    }
  }

  async clearPreparedStatements(): Promise<void> {
    if (this.preparedManager) {
      await this.preparedManager.clear()
    }
  }

  async *stream<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): AsyncIterable<T> {
    await this.ensureConnection()
    try {
      if (this.sqliteClient) {
        // Fallback for SQLite as it might not support native async streaming the same way
        const result = await this.query<T>(sql, bindings)
        if (result.rows) {
          for (const row of result.rows) {
            yield row
          }
        }
      } else {
        const normalized = this.normalizeBindings(bindings)
        const client = (this.currentTx || this.client) as any

        if (typeof client.unsafe === 'function') {
          // Use native Bun.sql non-awaited iterator for true streaming
          const query = client.unsafe(sql, normalized)
          for await (const row of query) {
            yield row as T
          }
        } else if (typeof client.prepare === 'function') {
          // Fallback: use prepare() + iterate
          const stmt = client.prepare(sql)
          const rows = stmt.all(...normalized) as T[]
          for (const row of rows) {
            yield row
          }
        } else {
          throw new Error('Bun.sql client does not have unsafe() or prepare() method')
        }
      }
    } catch (error) {
      throw this.normalizeError(error, sql, bindings)
    }
  }

  getPoolStats(): PoolStats | null {
    if (this.sqliteClient) {
      return { idle: 0, pending: 0, active: 1, total: 1, max: 1 }
    }
    if (!this.client) {
      return null
    }
    // @ts-expect-error
    const c = this.client.connections
    return c
      ? {
          idle: c.idle,
          pending: c.pending,
          active: c.active,
          total: c.total,
          max: (this.config as any).pool?.max ?? 10,
        }
      : null
  }

  /**
   * Adjust pool size for AdaptivePoolManager compatibility.
   * Note: Bun.sql does not support runtime connection pool resize.
   * Pool size is fixed at connect() time via the connection URL.
   */
  async adjustPoolSize(targetSize: number): Promise<void> {
    if (process.env.DEBUG_ATLAS) {
      // biome-ignore lint: Internal debug logging
      console.log(
        `[BunSQLDriver] adjustPoolSize(${targetSize}) — Bun.sql does not support runtime resize`
      )
    }
  }

  private normalizeError(error: any, sql: string, bindings: unknown[]): DatabaseError {
    const m = error.message?.toLowerCase() ?? ''
    if (m.includes('unique')) {
      return new UniqueConstraintError(error.message, error, sql, bindings)
    }
    if (m.includes('foreign key')) {
      return new ForeignKeyConstraintError(error.message, error, sql, bindings)
    }
    if (m.includes('no such table')) {
      return new TableNotFoundError(error.message, error, sql, bindings)
    }
    return new DatabaseError(error.message, error, sql, bindings)
  }
}
