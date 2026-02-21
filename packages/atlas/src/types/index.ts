/**
 * @gravito/atlas - Type Definitions
 * @description Core types for the database query builder and ORM
 */

// ============================================================================
// Database Configuration
// ============================================================================

/**
 * Supported database driver types
 */
export type DriverType = 'postgres' | 'mysql' | 'mariadb' | 'sqlite' | 'mongodb' | 'redis'

import type { AtlasMetrics, AtlasTracer } from '../observability'

/**
 * Base connection interface
 */
export interface BaseConnectionConfig {
  /**
   * The database driver to use
   */
  driver: DriverType

  /**
   * Database host address
   * @default 'localhost'
   */
  host?: string

  /**
   * Database port number
   */
  port?: number

  /**
   * Database name
   */
  database?: string

  /**
   * Database username
   */
  username?: string

  /**
   * Database password
   */
  password?: string

  /**
   * Database character set
   * @default 'utf8mb4'
   */
  charset?: string

  /**
   * Database timezone
   * @default 'UTC'
   */
  timezone?: string

  /**
   * Connection pool configuration
   */
  pool?: PoolConfig

  /**
   * SSL configuration for secure connections
   */
  ssl?: SSLConfig | boolean

  /**
   * Whether to use the native driver (e.g., Bun.sql) if available
   * @default false
   */
  useNativeDriver?: boolean

  /**
   * Pre-initialized tracer instance
   * @internal
   */
  tracer?: AtlasTracer

  /**
   * Pre-initialized metrics instance
   * @internal
   */
  metrics?: AtlasMetrics
}

/**
 * Union type for all connection configurations
 */
export type ConnectionConfig =
  | PostgresConfig
  | MySQLConfig
  | SQLiteConfig
  | MongoDBConfig
  | RedisConfig
  | BaseConnectionConfig

/**
 * Read/Write Replica configuration
 * Defines a primary (write) node and one or more read replicas.
 */
export interface ReadWriteConnectionConfig {
  /**
   * Primary write node configuration
   */
  write: ConnectionConfig

  /**
   * Read replica configurations (Round-robin selected)
   */
  read: ConnectionConfig[]
}

/**
 * Union type for Atlas connection entry (standard or replica)
 */
export type AtlasConnectionEntry = ConnectionConfig | ReadWriteConnectionConfig

/**
 * Type guard to check if a connection config is a read/write replica config
 */
export function isReadWriteConfig(
  config: AtlasConnectionEntry
): config is ReadWriteConnectionConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'write' in config &&
    'read' in config &&
    Array.isArray((config as ReadWriteConnectionConfig).read)
  )
}

export interface AtlasObservabilityConfig {
  enabled: boolean
  tracing?: boolean
  metrics?: boolean
  serviceName?: string
}

export interface AtlasConfig {
  default: string
  connections: Record<string, AtlasConnectionEntry>
  observability?: AtlasObservabilityConfig
}

/**
 * PostgreSQL specific configuration
 */
export interface PostgresConfig extends BaseConnectionConfig {
  /**
   * Driver identifier
   */
  driver: 'postgres'

  /**
   * Default database schema
   * @default 'public'
   */
  schema?: string

  /**
   * Application name for connection tracking
   */
  applicationName?: string
}

/**
 * MySQL/MariaDB specific configuration
 */
export interface MySQLConfig extends BaseConnectionConfig {
  /**
   * Driver identifier
   */
  driver: 'mysql' | 'mariadb'

  /**
   * Path to Unix domain socket
   */
  socketPath?: string

  /**
   * Whether to allow multiple SQL statements in a single query
   * @default false
   */
  multipleStatements?: boolean
}

/**
 * SQLite specific configuration
 */
export interface SQLiteConfig {
  /**
   * Driver identifier
   */
  driver: 'sqlite'

  /**
   * Database file path or ':memory:' for in-memory database
   */
  database: string

  /**
   * Whether to open the database in read-only mode
   * @default false
   */
  readonly?: boolean

  /**
   * Whether to use the native driver (e.g., Bun.sql) if available
   * @default false
   */
  useNativeDriver?: boolean
}

/**
 * MongoDB specific configuration
 */
export interface MongoDBConfig extends BaseConnectionConfig {
  /**
   * Driver identifier
   */
  driver: 'mongodb'

  /**
   * MongoDB connection URI
   */
  uri: string

  /**
   * Additional MongoDB driver options
   */
  options?: Record<string, unknown>
}

/**
 * Redis specific configuration
 */
export interface RedisConfig extends BaseConnectionConfig {
  /**
   * Driver identifier
   */
  driver: 'redis'

  /**
   * Redis server host
   */
  host: string

  /**
   * Redis server port
   * @default 6379
   */
  port?: number

  /**
   * Redis server password
   */
  password?: string

  /**
   * Redis database index
   * @default 0
   */
  db?: number
}

/**
 * Connection pool configuration
 */
export interface PoolConfig {
  /**
   * Minimum number of connections in the pool
   */
  min?: number

  /**
   * Maximum number of connections in the pool
   */
  max?: number

  /**
   * Maximum time (ms) to wait for a connection from the pool
   */
  acquireTimeout?: number

  /**
   * Maximum time (ms) a connection can be idle before being released
   */
  idleTimeout?: number

  /**
   * Interval (ms) to check for idle connections to reap
   */
  reapInterval?: number
}

/**
 * SSL configuration
 */
export interface SSLConfig {
  /**
   * Whether to reject unauthorized connections
   */
  rejectUnauthorized?: boolean

  /**
   * Certificate Authority (CA) certificate
   */
  ca?: string

  /**
   * Client private key
   */
  key?: string

  /**
   * Client certificate
   */
  cert?: string
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * Supported comparison operators
 */
export type Operator =
  | '='
  | '!='
  | '<>'
  | '<'
  | '<='
  | '>'
  | '>='
  | 'like'
  | 'ilike'
  | 'not like'
  | 'in'
  | 'not in'
  | 'between'
  | 'not between'
  | 'is'
  | 'is not'

/**
 * Boolean operators for WHERE clauses
 */
export type BooleanOperator = 'and' | 'or'

/**
 * Order direction
 */
export type OrderDirection = 'asc' | 'desc'

/**
 * Join types
 */
export type JoinType = 'inner' | 'left' | 'right' | 'cross' | 'full'

/**
 * WHERE clause structure
 */
export interface WhereClause {
  /**
   * Type of the where clause
   */
  type: 'basic' | 'nested' | 'in' | 'null' | 'between' | 'raw' | 'exists' | 'column'

  /**
   * Column name
   */
  column?: string

  /**
   * Comparison operator
   */
  operator?: Operator

  /**
   * Value for basic comparison
   */
  value?: unknown

  /**
   * Values for IN or BETWEEN clauses
   */
  values?: unknown[]

  /**
   * Boolean operator (AND/OR)
   */
  boolean: BooleanOperator

  /**
   * Whether to negate the clause (NOT)
   */
  not?: boolean

  /**
   * Nested query builder for subqueries
   */
  query?: QueryBuilderContract

  /**
   * Raw SQL for raw clauses
   */
  sql?: string

  /**
   * Bindings for raw clauses
   */
  bindings?: unknown[]
}

/**
 * ORDER BY clause structure
 */
export interface OrderClause {
  /**
   * Column name
   */
  column: string

  /**
   * Sort direction
   */
  direction: OrderDirection
}

/**
 * JOIN clause structure
 */
export interface JoinClause {
  /**
   * Type of join
   */
  type: JoinType

  /**
   * Table to join
   */
  table: string

  /**
   * First column for join condition
   */
  first: string

  /**
   * Operator for join condition
   */
  operator: string

  /**
   * Second column for join condition
   */
  second: string
}

/**
 * HAVING clause structure
 */
export interface HavingClause {
  /**
   * Type of having clause
   */
  type: 'basic' | 'raw'

  /**
   * Column name
   */
  column?: string

  /**
   * Comparison operator
   */
  operator?: Operator

  /**
   * Value for comparison
   */
  value?: unknown

  /**
   * Boolean operator (AND/OR)
   */
  boolean: BooleanOperator

  /**
   * Raw SQL for raw clauses
   */
  sql?: string

  /**
   * Bindings for raw clauses
   */
  bindings?: unknown[]
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Query execution result
 */
export interface QueryResult<T = Record<string, unknown>> {
  /**
   * Result rows
   */
  rows: T[]

  /**
   * Number of rows returned
   */
  rowCount: number

  /**
   * Last inserted ID (if available)
   */
  insertId?: number | bigint | string | undefined

  /**
   * Field metadata
   */
  fields?: FieldInfo[]
}

/**
 * Field information from query result
 */
export interface FieldInfo {
  /**
   * Field name
   */
  name: string

  /**
   * Data type name
   */
  dataType?: string | undefined

  /**
   * Table ID (if available)
   */
  tableId?: number | undefined
}

/**
 * Execution result (INSERT/UPDATE/DELETE)
 */
export interface ExecuteResult {
  /**
   * Number of affected rows
   */
  affectedRows: number

  /**
   * Last inserted ID (for INSERT)
   */
  insertId?: number | bigint | string | undefined

  /**
   * Number of changed rows (for UPDATE)
   */
  changedRows?: number | undefined
}

/**
 * Pagination result
 */
export interface PaginateResult<T> {
  /**
   * Paginated data
   */
  data: T[]

  /**
   * Pagination metadata
   */
  pagination: {
    /**
     * Current page number
     */
    page: number

    /**
     * Number of items per page
     */
    perPage: number

    /**
     * Total number of items
     */
    total: number

    /**
     * Total number of pages
     */
    totalPages: number

    /**
     * Whether there is a next page
     */
    hasNext: boolean

    /**
     * Whether there is a previous page
     */
    hasPrev: boolean
  }
}

/**
 * Cursor-based pagination result
 * Provides O(1) performance regardless of dataset size.
 * Ideal for infinite scroll and large datasets.
 */
export interface CursorPaginateResult<T> {
  /**
   * Current page data
   */
  data: T[]

  /**
   * Opaque cursor pointing to the next page (null if no more data)
   */
  nextCursor: string | null

  /**
   * Opaque cursor pointing to the previous page (null if first page)
   */
  prevCursor: string | null

  /**
   * Whether more records exist beyond the current page
   */
  hasMore: boolean

  /**
   * Number of records returned
   */
  count: number
}

/**
 * Connection pool statistics
 */
export interface PoolStats {
  /**
   * Number of idle connections in the pool
   */
  idle: number

  /**
   * Number of connections waiting to be acquired
   */
  pending: number

  /**
   * Number of active connections currently in use
   */
  active: number

  /**
   * Total number of connections in the pool
   */
  total: number

  /**
   * Maximum number of connections allowed
   */
  max: number
}

/**
 * Connection pool health status
 */
export interface PoolHealth {
  /**
   * Health status: 'healthy' | 'warning' | 'critical' | 'disconnected'
   */
  status: 'healthy' | 'warning' | 'critical' | 'disconnected'

  /**
   * Human-readable health message
   */
  message: string

  /**
   * Pool statistics (when available)
   */
  stats?: PoolStats

  /**
   * Last health check timestamp
   */
  lastCheck?: Date
}

// ============================================================================
// Model Types (forward declarations to avoid circular dependencies)
// ============================================================================

/**
 * Model base class (forward declaration)
 * Actual implementation in src/orm/model/Model.ts
 */
export type Model = import('../orm/model/Model').Model

/**
 * Model constructor type (forward declaration)
 */
export type ModelConstructor<T extends Model> = import('../orm/model/Model').ModelConstructor<T>

// ============================================================================
// Contracts (Interfaces)
// ============================================================================

/**
 * Database Driver Contract
 */
export interface DriverContract {
  /**
   * Get driver name
   */
  getDriverName(): DriverType

  /**
   * Connect to the database
   */
  connect(): Promise<void>

  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>

  /**
   * Check if connected
   */
  isConnected(): boolean

  /**
   * Execute a query and return results
   */
  query<T = Record<string, unknown>>(sql: string, bindings?: unknown[]): Promise<QueryResult<T>>

  /**
   * Execute a statement (INSERT/UPDATE/DELETE)
   */
  execute(sql: string, bindings?: unknown[]): Promise<ExecuteResult>

  /**
   * Begin a transaction
   */
  beginTransaction(): Promise<void>

  /**
   * Commit the current transaction
   */
  commit(): Promise<void>

  /**
   * Rollback the current transaction
   */
  rollback(): Promise<void>

  /**
   * Check if currently in a transaction
   */
  inTransaction(): boolean

  // ============================================================================
  // Advanced Features (Optional - for drivers that support them)
  // ============================================================================

  /**
   * Prepare a statement for repeated execution
   * @optional Only implemented by drivers that support prepared statements
   * @param sql - SQL query to prepare
   * @returns Prepared statement identifier
   */
  prepare?(sql: string): Promise<string>

  /**
   * Execute a prepared statement
   * @optional Only implemented by drivers that support prepared statements
   * @param name - Prepared statement identifier
   * @param bindings - Query parameters
   * @returns Query result
   */
  executePrepared?<T = Record<string, unknown>>(
    name: string,
    bindings?: unknown[]
  ): Promise<QueryResult<T>>

  /**
   * Clear all prepared statements from cache
   * @optional Only implemented by drivers that support prepared statements
   */
  clearPreparedStatements?(): Promise<void>

  /**
   * Stream query results for processing large datasets
   * @optional Only implemented by drivers that support streaming
   * @param sql - SQL query
   * @param bindings - Query parameters
   * @returns Async iterable of result rows
   */
  stream?<T = Record<string, unknown>>(sql: string, bindings?: unknown[]): AsyncIterable<T>

  /**
   * Get connection pool statistics
   * @optional Only implemented by drivers that support connection pooling
   * @returns Pool statistics or null if not supported
   */
  getPoolStats?(): PoolStats | null

  /**
   * Get connection pool health status
   * @optional Only implemented by drivers that support connection pooling
   * @returns Pool health information
   */
  getPoolHealth?(): PoolHealth

  /**
   * Adjust the connection pool size dynamically
   * @optional Only implemented by drivers that support pool resizing
   * @param targetSize - Target number of connections
   */
  adjustPoolSize?(targetSize: number): Promise<void>
}

/**
 * Connection Contract
 */
export interface ConnectionContract {
  /**
   * Get connection name
   */
  getName(): string

  /**
   * Get the underlying driver
   */
  getDriver(): DriverContract

  /**
   * Get connection configuration
   */
  getConfig(): ConnectionConfig

  /**
   * Get the tracer instance for this connection
   */
  getTracer(): AtlasTracer | undefined

  /**
   * Create a new query builder for the given table
   */
  table<T = Record<string, unknown>>(tableName: string): QueryBuilderContract<T>

  /**
   * Execute raw SQL query and return results
   */
  raw<T = Record<string, unknown>>(sql: string, bindings?: unknown[]): Promise<QueryResult<T>>

  /**
   * Execute raw SQL statement (INSERT/UPDATE/DELETE)
   */
  execute(sql: string, bindings?: unknown[]): Promise<ExecuteResult>

  /**
   * Execute a callback within a database transaction
   */
  transaction<T>(callback: (connection: ConnectionContract) => Promise<T>): Promise<T>

  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>

  /**
   * Get the grammar instance for this connection
   */
  getGrammar(): GrammarContract
}

/**
 * Query Builder Contract
 */
export interface QueryBuilderContract<T = Record<string, unknown>> {
  // SETTINGS
  /**
   * Set the model for hydration
   */
  setModel<M extends Model = Model>(model: ModelConstructor<M>): this

  /**
   * Get the current model
   */
  getModel<M extends Model = Model>(): ModelConstructor<M> | undefined

  // SELECT
  /**
   * Select columns for the query
   */
  select(...columns: string[]): this

  /**
   * Set the table for the query
   */
  from(table: string): this

  /**
   * Add a raw select expression
   */
  selectRaw(sql: string, bindings?: unknown[]): this

  /**
   * Force the query to return distinct results
   */
  distinct(): this

  // WHERE
  /**
   * Add a basic where clause
   */
  where(column: string, value: unknown | QueryBuilderContract<any>): this
  where(column: string, operator: Operator, value: unknown | QueryBuilderContract<any>): this
  where(callback: (query: QueryBuilderContract<T>) => void): this
  where(conditions: Record<string, unknown | QueryBuilderContract<any>>): this

  /**
   * Add an "or where" clause
   */
  orWhere(column: string, value: unknown | QueryBuilderContract<any>): this
  orWhere(column: string, operator: Operator, value: unknown | QueryBuilderContract<any>): this
  orWhere(callback: (query: QueryBuilderContract<T>) => void): this

  /**
   * Add a "where in" clause
   */
  whereIn(column: string, values: unknown[] | QueryBuilderContract<any>): this

  /**
   * Add a "where not in" clause
   */
  whereNotIn(column: string, values: unknown[] | QueryBuilderContract<any>): this

  /**
   * Add an "or where in" clause
   */
  orWhereIn(column: string, values: unknown[] | QueryBuilderContract<any>): this

  /**
   * Add an "or where not in" clause
   */
  orWhereNotIn(column: string, values: unknown[] | QueryBuilderContract<any>): this

  /**
   * Add a "where null" clause
   */
  whereNull(column: string): this

  /**
   * Add a "where not null" clause
   */
  whereNotNull(column: string): this

  /**
   * Add an "or where null" clause
   */
  orWhereNull(column: string): this

  /**
   * Add an "or where not null" clause
   */
  orWhereNotNull(column: string): this

  /**
   * Add a "where between" clause
   */
  whereBetween(column: string, values: [unknown, unknown]): this

  /**
   * Add a "where not between" clause
   */
  whereNotBetween(column: string, values: [unknown, unknown]): this

  /**
   * Add a raw where clause
   */
  whereRaw(sql: string, bindings?: unknown[]): this

  /**
   * Add a raw "or where" clause
   */
  orWhereRaw(sql: string, bindings?: unknown[]): this

  /**
   * Add a "where column" clause (comparing two columns)
   */
  whereColumn(first: string, operator: Operator, second: string): this

  /**
   * Add a "where exists" clause
   */
  whereExists(callback: (query: QueryBuilderContract<unknown>) => void): this

  /**
   * Add a "where not exists" clause
   */
  whereNotExists(callback: (query: QueryBuilderContract<unknown>) => void): this

  // JSON
  /**
   * Add a where clause for JSON fields
   */
  whereJson(column: string, value: unknown): this

  /**
   * Add an "or where" clause for JSON fields
   */
  orWhereJson(column: string, value: unknown): this

  /**
   * Add a "where json contains" clause
   */
  whereJsonContains(column: string, value: unknown): this

  /**
   * Add an "or where json contains" clause
   */
  orWhereJsonContains(column: string, value: unknown): this

  // JOIN
  /**
   * Add an inner join clause
   */
  join(table: string, first: string, operator: string, second: string): this

  /**
   * Add a left join clause
   */
  leftJoin(table: string, first: string, operator: string, second: string): this

  /**
   * Add a right join clause
   */
  rightJoin(table: string, first: string, operator: string, second: string): this

  /**
   * Add a cross join clause
   */
  crossJoin(table: string): this

  // GROUP BY & HAVING
  /**
   * Add a group by clause
   */
  groupBy(...columns: string[]): this

  /**
   * Add a having clause
   */
  having(column: string, operator: Operator, value: unknown): this

  /**
   * Add a raw having clause
   */
  havingRaw(sql: string, bindings?: unknown[]): this

  // ORDER BY
  /**
   * Add an order by clause
   */
  orderBy(column: string, direction?: OrderDirection): this

  /**
   * Add a descending order by clause
   */
  orderByDesc(column: string): this

  /**
   * Add a raw order by clause
   */
  orderByRaw(sql: string, bindings?: unknown[]): this

  /**
   * Order by the latest record (created_at by default)
   */
  latest(column?: string): this

  /**
   * Order by the oldest record (created_at by default)
   */
  oldest(column?: string): this

  // LIMIT & OFFSET
  /**
   * Set the limit for the query
   */
  limit(value: number): this

  /**
   * Set the offset for the query
   */
  offset(value: number): this

  /**
   * Alias for offset
   */
  skip(value: number): this

  /**
   * Alias for limit
   */
  take(value: number): this

  // EXECUTION - Read
  /**
   * Execute the query and get all results
   */
  get(): Promise<T[]>

  /**
   * Stream query results for processing large datasets
   * Returns an async iterator that yields records one at a time
   *
   * @example
   * ```typescript
   * for await (const user of User.query().where('active', true).stream()) {
   *   await processUser(user)
   * }
   * ```
   */
  stream(): AsyncIterable<T>

  /**
   * Get the first result
   */
  first(): Promise<T | null>

  /**
   * Get the first result or throw an error
   */
  firstOrFail(): Promise<T>

  /**
   * Find a record by its primary key
   */
  find(id: unknown, primaryKey?: string): Promise<T | null>

  /**
   * Find a record by its primary key or throw an error
   */
  findOrFail(id: unknown, primaryKey?: string): Promise<T>

  /**
   * Get a single value from the first record
   */
  value<V = unknown>(column: string): Promise<V | null>

  /**
   * Get an array of values from a single column
   */
  pluck<V = unknown>(column: string): Promise<V[]>

  /**
   * Check if any records exist matching the query
   */
  exists(): Promise<boolean>

  /**
   * Check if no records exist matching the query
   */
  doesntExist(): Promise<boolean>

  // EXECUTION - Aggregates
  /**
   * Get the count of records
   */
  count(column?: string): Promise<number>

  /**
   * Get the maximum value of a column
   */
  max<V = number>(column: string): Promise<V | null>

  /**
   * Get the minimum value of a column
   */
  min<V = number>(column: string): Promise<V | null>

  /**
   * Get the average value of a column
   */
  avg(column: string): Promise<number | null>

  /**
   * Get the sum of a column
   */
  sum(column: string): Promise<number>

  // EXECUTION - Write
  /**
   * Insert new records
   */
  insert(data: Partial<T> | Partial<T>[]): Promise<T[]>

  /**
   * Insert a record and get its ID
   */
  insertGetId(data: Partial<T>, primaryKey?: string): Promise<number | bigint>

  /**
   * Update existing records
   */
  update(data: Partial<T>): Promise<number>

  /**
   * Update a JSON field
   */
  updateJson(column: string, value: unknown): Promise<number>

  /**
   * Delete records
   */
  delete(): Promise<number>

  /**
   * Truncate the table
   */
  truncate(): Promise<void>

  // EXECUTION - Increment/Decrement
  /**
   * Increment a column's value
   */
  increment(column: string, amount?: number, extra?: Partial<T>): Promise<number>

  /**
   * Decrement a column's value
   */
  decrement(column: string, amount?: number, extra?: Partial<T>): Promise<number>

  // EXECUTION - Upsert
  /**
   * Insert or update records
   */
  upsert(
    data: Partial<T> | Partial<T>[],
    uniqueBy: string | string[],
    update?: string[]
  ): Promise<number>

  // PAGINATION
  /**
   * Paginate the query results
   */
  paginate(perPage?: number, page?: number): Promise<PaginateResult<T>>

  /**
   * Simple pagination (no total count)
   */
  simplePaginate(perPage?: number, page?: number): Promise<PaginateResult<T>>

  // CHUNKING
  /**
   * Chunk the query results for processing large datasets
   */
  chunk(size: number, callback: (results: T[]) => Promise<undefined | boolean>): Promise<void>

  // DEBUGGING
  /**
   * Get the compiled SQL string
   */
  toSql(): string

  /**
   * Get the query bindings
   */
  getBindings(): unknown[]

  /**
   * Dump the query SQL and bindings
   */
  dump(): this

  /**
   * Dump the query SQL and bindings and terminate execution
   */
  dd(): never

  // CLONING
  /**
   * Clone the query builder instance
   */
  clone(): QueryBuilderContract<T>

  /**
   * Set the query to read-only mode to skip Model hydration overhead.
   */
  readonly(value?: boolean): this

  // INTERNAL/ADVANCED
  /**
   * Get the compiled query structure
   */
  getCompiledQuery(): CompiledQuery

  /**
   * Check if the query has a limit or offset
   */
  hasLimitOrOffset(): boolean

  /**
   * Eager load relationships
   */
  with(
    relation: string | string[] | Record<string, (query: QueryBuilderContract<unknown>) => void>
  ): this

  /**
   * Add a WHERE HAS relationship existence clause
   */
  whereHas(relation: string, callback?: (query: QueryBuilderContract<unknown>) => void): this

  // SOFT DELETES
  /**
   * Include soft-deleted records in the query
   */
  withTrashed(): this

  /**
   * Only include soft-deleted records in the query
   */
  onlyTrashed(): this

  /**
   * Restore soft-deleted records
   */
  restore(): Promise<number>

  /**
   * Permanently delete records (bypass soft deletes)
   */
  forceDelete(): Promise<number>

  // SCOPES
  /**
   * Apply a query scope
   */
  applyScope(name: string, callback: (query: QueryBuilderContract<T>) => void): this

  /**
   * Remove a global scope
   */
  withoutGlobalScope(name: string): this

  // CACHING
  /**
   * Cache the query results
   */
  cache(ttl: number, key?: string): this
}

/**
 * Grammar Contract
 */

/**
 * Cache Interface
 */
export interface CacheInterface {
  get<T = unknown>(key: string): Promise<T | null>
  set(key: string, value: unknown, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

/**
 * Grammar Contract
 */
export interface GrammarContract {
  /**
   * Compile a SELECT statement
   */
  compileSelect(query: CompiledQuery): string

  /**
   * Compile an INSERT statement
   */
  compileInsert(query: CompiledQuery, values: Record<string, unknown>[]): string

  /**
   * Compile an INSERT and get ID statement
   */
  compileInsertGetId(
    query: CompiledQuery,
    values: Record<string, unknown>,
    primaryKey: string
  ): string

  /**
   * Compile an UPDATE statement
   */
  compileUpdate(query: CompiledQuery, values: Record<string, unknown>): string

  /**
   * Compile a DELETE statement
   */
  compileDelete(query: CompiledQuery): string

  /**
   * Compile a TRUNCATE statement
   */
  compileTruncate(query: CompiledQuery): string

  /**
   * Compile an aggregate query
   */
  compileAggregate(query: CompiledQuery, aggregate: { function: string; column: string }): string

  /**
   * Compile an EXISTS query
   */
  compileExists(query: CompiledQuery): string

  /**
   * Get placeholder for binding
   */
  getPlaceholder(index: number): string

  /**
   * Wrap a column name
   */
  wrapColumn(column: string): string

  /**
   * Wrap a table name
   */
  wrapTable(table: string): string

  /**
   * Quote a value
   */
  quoteValue(value: unknown): string

  /**
   * Compile a lateral eager load query
   */
  compileLateralEagerLoad(
    table: string,
    foreignKey: string,
    parentKeys: unknown[],
    query: CompiledQuery
  ): { sql: string; bindings: unknown[] }

  getStructuralKey(query: CompiledQuery): string

  /**
   * Compile a JSON path query
   */
  compileJsonPath(column: string, value: unknown): string

  /**
   * Compile a JSON contains query
   */
  compileJsonContains(column: string, value: unknown): string
  /**
   * Compile a JSON update statement
   */
  compileUpdateJson(query: CompiledQuery, column: string, value: unknown): string

  /**
   * Compile an UPSERT statement
   */
  compileUpsert(
    query: CompiledQuery,
    values: Record<string, unknown>[],
    uniqueBy: string[],
    update: string[]
  ): string
}

/**
 * Compiled query structure (used by Grammar)
 */
export interface CompiledQuery {
  table: string
  columns: string[]
  distinct: boolean
  wheres: WhereClause[]
  orders: OrderClause[]
  groups: string[]
  havings: HavingClause[]
  joins: JoinClause[]
  limit?: number | undefined
  offset?: number | undefined
  bindings: unknown[]
  bindingCounts?: {
    select: number
    where: number
    join: number
    having: number
    order: number
  }
}
