/**
 * Driver Type Definitions
 * @description Type definitions for third-party database driver libraries
 */
/**
 * MySQL/MariaDB Pool Connection
 */
export interface MySQLPool {
  query(sql: string, values?: unknown[]): Promise<unknown>
  execute(sql: string, values?: unknown[]): Promise<unknown>
  getConnection(): Promise<MySQLConnection>
  end(): Promise<void>
}
/**
 * MySQL/MariaDB Connection
 */
export interface MySQLConnection {
  query(sql: string, values?: unknown[]): Promise<unknown>
  execute(sql: string, values?: unknown[]): Promise<unknown>
  beginTransaction(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  release(): void
}
/**
 * MySQL/MariaDB Module
 */
export interface MySQLModule {
  createPool(config: Record<string, unknown>): MySQLPool
  createConnection(config: Record<string, unknown>): Promise<MySQLConnection>
}
/**
 * PostgreSQL Pool Client
 */
export interface PostgresPoolClient {
  query(
    sql: string,
    values?: unknown[]
  ): Promise<{
    rows: unknown[]
    rowCount: number
  }>
  release(): void
}
/**
 * PostgreSQL Pool
 */
export interface PostgresPool {
  connect(): Promise<PostgresPoolClient>
  query(
    sql: string,
    values?: unknown[]
  ): Promise<{
    rows: unknown[]
    rowCount: number
  }>
  end(): Promise<void>
}
/**
 * SQLite Database Client (Bun)
 */
export interface SQLiteClient {
  prepare(sql: string): SQLiteStatement
  query(sql: string, ...params: unknown[]): unknown[]
  run(
    sql: string,
    ...params: unknown[]
  ): {
    changes: number
    lastInsertRowid: number
  }
  exec?(sql: string): void
  pragma?(name: string, value?: unknown): unknown
  open?: boolean
  inTransaction?: boolean
  close(): void
}
/**
 * SQLite Statement
 */
export interface SQLiteStatement {
  run(...params: unknown[]): {
    changes: number
    lastInsertRowid: number
  }
  all(...params: unknown[]): unknown[]
  get(...params: unknown[]): unknown
}
/**
 * Redis Client
 */
export interface RedisClient {
  connect(): Promise<void>
  get(key: string): Promise<string | null>
  set(key: string, value: string | number): Promise<'OK'>
  setex(key: string, seconds: number, value: string | number): Promise<'OK'>
  del(key: string): Promise<number>
  keys(pattern: string): Promise<string[]>
  exists(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  quit(): Promise<void>
  status?: string
}
/**
 * MongoDB Client
 */
export interface MongoClient {
  connect(): Promise<void>
  db(name?: string): MongoDatabase
  close(): Promise<void>
}
/**
 * MongoDB Database
 */
export interface MongoDatabase {
  collection(name: string): MongoCollection
}
/**
 * MongoDB Collection
 */
export interface MongoCollection {
  find(filter?: Record<string, unknown>, options?: Record<string, unknown>): MongoCursor
  findOne(filter?: Record<string, unknown>): Promise<Record<string, unknown> | null>
  insertOne(doc: Record<string, unknown>): Promise<{
    insertedId: unknown
  }>
  insertMany(docs: Record<string, unknown>[]): Promise<{
    insertedIds: unknown[]
    insertedCount: number
  }>
  countDocuments(filter?: Record<string, unknown>): Promise<number>
  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{
    modifiedCount: number
  }>
  updateMany(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{
    modifiedCount: number
  }>
  deleteOne(filter: Record<string, unknown>): Promise<{
    deletedCount: number
  }>
  deleteMany(filter: Record<string, unknown>): Promise<{
    deletedCount: number
  }>
}
/**
 * MongoDB Cursor
 */
export interface MongoCursor {
  toArray(): Promise<Record<string, unknown>[]>
  limit(n: number): MongoCursor
  skip(n: number): MongoCursor
  sort(sort: Record<string, 1 | -1>): MongoCursor
}
/**
 * Bun SQL Client (Enhanced for Bun 1.3+)
 * @description Comprehensive type definitions for Bun.sql native driver
 */
export interface BunSQLClient {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<BunSQLResult>
  unsafe?(sql: string, bindings?: unknown[]): Promise<BunSQLResult>
  query?(sql: string, bindings?: unknown[]): Promise<BunSQLResult>
  all?(sql: string, bindings?: unknown[]): Promise<unknown[]>
  run?(sql: string, bindings?: unknown[]): Promise<BunSQLResult>
  simple?(strings: TemplateStringsArray, ...values: unknown[]): Promise<BunSQLResult>
  prepare?(sql: string): BunSQLPreparedStatement
  transaction?<T>(callback: (sql: BunSQLClient) => Promise<T>): Promise<T>
  begin?(): Promise<BunSQLTransaction>
  close?(): Promise<void>
  end?(): Promise<void>
  readonly connections?: {
    idle: number
    pending: number
    active: number
    total: number
  }
}
/**
 * Bun SQL Query Result
 * @description Result structure returned by Bun.sql queries
 */
export interface BunSQLResult {
  /**
   * Result rows (iterable)
   */
  rows?: unknown[]
  /**
   * Number of rows affected/returned
   */
  rowCount?: number
  count?: number
  /**
   * Last inserted ID (for INSERT operations)
   */
  lastInsertRowid?: number | bigint
  /**
   * Number of changed rows (for UPDATE operations)
   */
  changes?: number
  /**
   * Iterator support for streaming
   */
  [Symbol.iterator](): Iterator<unknown>
}
/**
 * Bun SQL Prepared Statement
 * @description Prepared statement interface for query optimization
 */
export interface BunSQLPreparedStatement {
  /**
   * Execute prepared statement and return result
   */
  run(...params: unknown[]): Promise<BunSQLResult>
  /**
   * Execute and return all rows
   */
  all(...params: unknown[]): Promise<unknown[]>
  /**
   * Execute and return first row
   */
  get(...params: unknown[]): Promise<unknown | undefined>
  /**
   * Finalize and release the prepared statement
   */
  finalize(): void
}
/**
 * Bun SQL Transaction
 * @description Transaction handle for advanced transaction control
 */
export interface BunSQLTransaction {
  /**
   * Commit the transaction
   */
  commit(): Promise<void>
  /**
   * Rollback the transaction
   */
  rollback(): Promise<void>
  /**
   * Create a savepoint
   */
  savepoint?(name: string): Promise<void>
  /**
   * Rollback to a savepoint
   */
  rollbackTo?(name: string): Promise<void>
  /**
   * Release a savepoint
   */
  release?(name: string): Promise<void>
}
/**
 * Bun SQL Pool Configuration
 * @description Configuration options for connection pool
 */
export interface BunSQLPoolConfig {
  /**
   * Maximum number of connections in the pool
   */
  max?: number
  /**
   * Maximum time (ms) a connection can be idle before being released
   */
  idleTimeout?: number
  /**
   * Maximum time (ms) to wait for a connection from the pool
   */
  connectionTimeout?: number
}
