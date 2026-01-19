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
  query(sql: string, values?: unknown[]): Promise<{ rows: unknown[]; rowCount: number }>
  release(): void
}

/**
 * PostgreSQL Pool
 */
export interface PostgresPool {
  connect(): Promise<PostgresPoolClient>
  query(sql: string, values?: unknown[]): Promise<{ rows: unknown[]; rowCount: number }>
  end(): Promise<void>
}

/**
 * SQLite Database Client (Bun)
 */
export interface SQLiteClient {
  prepare(sql: string): SQLiteStatement
  query(sql: string, ...params: unknown[]): unknown[]
  run(sql: string, ...params: unknown[]): { changes: number; lastInsertRowid: number }
  exec?(sql: string): void
  close(): void
}

/**
 * SQLite Statement
 */
export interface SQLiteStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number }
  all(...params: unknown[]): unknown[]
  get(...params: unknown[]): unknown
}

/**
 * Redis Client
 */
export interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  keys(pattern: string): Promise<string[]>
  exists(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  quit(): Promise<void>
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
  find(filter?: Record<string, unknown>): MongoCursor
  findOne(filter?: Record<string, unknown>): Promise<Record<string, unknown> | null>
  insertOne(doc: Record<string, unknown>): Promise<{ insertedId: unknown }>
  insertMany(docs: Record<string, unknown>[]): Promise<{ insertedIds: unknown[] }>
  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{ modifiedCount: number }>
  updateMany(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{ modifiedCount: number }>
  deleteOne(filter: Record<string, unknown>): Promise<{ deletedCount: number }>
  deleteMany(filter: Record<string, unknown>): Promise<{ deletedCount: number }>
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
 * Bun SQL Client
 */
export interface BunSQLClient {
  query?(sql: string, bindings?: unknown[]): Promise<unknown>
  unsafe?(sql: string, bindings?: unknown[]): Promise<unknown>
  all?(sql: string, bindings?: unknown[]): Promise<unknown[]>
  run?(sql: string, bindings?: unknown[]): Promise<unknown>
  close?(): void
  end?(): void
  (sql: string, ...bindings: unknown[]): Promise<unknown>
}
