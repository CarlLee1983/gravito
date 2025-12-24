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

/**
 * Base connection interface
 */
export interface BaseConnectionConfig {
  driver: DriverType
  host?: string
  port?: number
  database?: string
  username?: string
  password?: string
  charset?: string
  timezone?: string
  pool?: PoolConfig
  ssl?: SSLConfig | boolean
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
 * PostgreSQL specific configuration
 */
export interface PostgresConfig extends BaseConnectionConfig {
  driver: 'postgres'
  schema?: string
  applicationName?: string
}

/**
 * MySQL/MariaDB specific configuration
 */
export interface MySQLConfig extends BaseConnectionConfig {
  driver: 'mysql' | 'mariadb'
  socketPath?: string
  multipleStatements?: boolean
}

/**
 * SQLite specific configuration
 */
export interface SQLiteConfig {
  driver: 'sqlite'
  database: string // file path or ':memory:'
  readonly?: boolean
}

/**
 * MongoDB specific configuration
 */
export interface MongoDBConfig extends BaseConnectionConfig {
  driver: 'mongodb'
  uri: string
  options?: any
}

/**
 * Redis specific configuration
 */
export interface RedisConfig extends BaseConnectionConfig {
  driver: 'redis'
  host: string
  port?: number
  password?: string
  db?: number
}

/**
 * Connection pool configuration
 */
export interface PoolConfig {
  min?: number
  max?: number
  acquireTimeout?: number
  idleTimeout?: number
  reapInterval?: number
}

/**
 * SSL configuration
 */
export interface SSLConfig {
  rejectUnauthorized?: boolean
  ca?: string
  key?: string
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
  type: 'basic' | 'nested' | 'in' | 'null' | 'between' | 'raw' | 'exists' | 'column'
  column?: string
  operator?: Operator
  value?: unknown
  values?: unknown[]
  boolean: BooleanOperator
  not?: boolean
  query?: QueryBuilderContract
  sql?: string
  bindings?: unknown[]
}

/**
 * ORDER BY clause structure
 */
export interface OrderClause {
  column: string
  direction: OrderDirection
}

/**
 * JOIN clause structure
 */
export interface JoinClause {
  type: JoinType
  table: string
  first: string
  operator: string
  second: string
}

/**
 * HAVING clause structure
 */
export interface HavingClause {
  type: 'basic' | 'raw'
  column?: string
  operator?: Operator
  value?: unknown
  boolean: BooleanOperator
  sql?: string
  bindings?: unknown[]
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Query execution result
 */
export interface QueryResult<T = Record<string, unknown>> {
  rows: T[]
  rowCount: number
  fields?: FieldInfo[]
}

/**
 * Field information from query result
 */
export interface FieldInfo {
  name: string
  dataType?: string | undefined
  tableId?: number | undefined
}

/**
 * Execution result (INSERT/UPDATE/DELETE)
 */
export interface ExecuteResult {
  affectedRows: number
  insertId?: number | bigint | undefined
  changedRows?: number | undefined
}

/**
 * Pagination result
 */
export interface PaginateResult<T> {
  data: T[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

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
   * Create a new query builder
   */
  table<T = Record<string, unknown>>(tableName: string): QueryBuilderContract<T>

  /**
   * Execute raw SQL
   */
  raw<T = Record<string, unknown>>(sql: string, bindings?: unknown[]): Promise<QueryResult<T>>

  /**
   * Run a callback within a transaction
   */
  transaction<T>(callback: (connection: ConnectionContract) => Promise<T>): Promise<T>

  /**
   * Disconnect
   */
  disconnect(): Promise<void>

  /**
   * Get the grammar instance
   */
  getGrammar(): GrammarContract
}

/**
 * Query Builder Contract
 */
export interface QueryBuilderContract<T = Record<string, unknown>> {
  // SELECT
  select(...columns: string[]): this
  selectRaw(sql: string, bindings?: unknown[]): this
  distinct(): this

  // WHERE
  where(column: string, value: unknown): this
  where(column: string, operator: Operator, value: unknown): this
  where(callback: (query: QueryBuilderContract<T>) => void): this
  where(conditions: Record<string, unknown>): this
  orWhere(column: string, value: unknown): this
  orWhere(column: string, operator: Operator, value: unknown): this
  orWhere(callback: (query: QueryBuilderContract<T>) => void): this
  whereIn(column: string, values: unknown[]): this
  whereNotIn(column: string, values: unknown[]): this
  orWhereIn(column: string, values: unknown[]): this
  orWhereNotIn(column: string, values: unknown[]): this
  whereNull(column: string): this
  whereNotNull(column: string): this
  orWhereNull(column: string): this
  orWhereNotNull(column: string): this
  whereBetween(column: string, values: [unknown, unknown]): this
  whereNotBetween(column: string, values: [unknown, unknown]): this
  whereRaw(sql: string, bindings?: unknown[]): this
  orWhereRaw(sql: string, bindings?: unknown[]): this
  whereColumn(first: string, operator: Operator, second: string): this

  // JSON
  whereJson(column: string, value: unknown): this
  orWhereJson(column: string, value: unknown): this
  whereJsonContains(column: string, value: unknown): this
  orWhereJsonContains(column: string, value: unknown): this

  // JOIN
  join(table: string, first: string, operator: string, second: string): this
  leftJoin(table: string, first: string, operator: string, second: string): this
  rightJoin(table: string, first: string, operator: string, second: string): this
  crossJoin(table: string): this

  // GROUP BY & HAVING
  groupBy(...columns: string[]): this
  having(column: string, operator: Operator, value: unknown): this
  havingRaw(sql: string, bindings?: unknown[]): this

  // ORDER BY
  orderBy(column: string, direction?: OrderDirection): this
  orderByDesc(column: string): this
  orderByRaw(sql: string, bindings?: unknown[]): this
  latest(column?: string): this
  oldest(column?: string): this

  // LIMIT & OFFSET
  limit(value: number): this
  offset(value: number): this
  skip(value: number): this
  take(value: number): this

  // EXECUTION - Read
  get(): Promise<T[]>
  first(): Promise<T | null>
  firstOrFail(): Promise<T>
  find(id: unknown, primaryKey?: string): Promise<T | null>
  findOrFail(id: unknown, primaryKey?: string): Promise<T>
  value<V = unknown>(column: string): Promise<V | null>
  pluck<V = unknown>(column: string): Promise<V[]>
  exists(): Promise<boolean>
  doesntExist(): Promise<boolean>

  // EXECUTION - Aggregates
  count(column?: string): Promise<number>
  max<V = number>(column: string): Promise<V | null>
  min<V = number>(column: string): Promise<V | null>
  avg(column: string): Promise<number | null>
  sum(column: string): Promise<number>

  // EXECUTION - Write
  insert(data: Partial<T> | Partial<T>[]): Promise<T[]>
  insertGetId(data: Partial<T>, primaryKey?: string): Promise<number | bigint>
  update(data: Partial<T>): Promise<number>
  updateJson(column: string, value: unknown): Promise<number>
  delete(): Promise<number>
  truncate(): Promise<void>

  // EXECUTION - Increment/Decrement
  increment(column: string, amount?: number, extra?: Partial<T>): Promise<number>
  decrement(column: string, amount?: number, extra?: Partial<T>): Promise<number>

  // EXECUTION - Upsert
  upsert(
    data: Partial<T> | Partial<T>[],
    uniqueBy: string | string[],
    update?: string[]
  ): Promise<number>

  // PAGINATION
  paginate(perPage?: number, page?: number): Promise<PaginateResult<T>>

  // DEBUGGING
  toSql(): string
  getBindings(): unknown[]
  dump(): this
  dd(): never

  // CLONING
  clone(): QueryBuilderContract<T>

  /**
   * Set the query to read-only mode to skip Model hydration overhead.
   */
  readonly(value?: boolean): this

  // INTERNAL/ADVANCED
  getCompiledQuery(): CompiledQuery
  hasLimitOrOffset(): boolean

  with(
    relation: string | string[] | Record<string, (query: QueryBuilderContract<any>) => void>
  ): this

  // SOFT DELETES
  withTrashed(): this
  onlyTrashed(): this
  restore(): Promise<number>
  forceDelete(): Promise<number>

  // SCOPES
  applyScope(name: string, callback: (query: QueryBuilderContract<T>) => void): this
  withoutGlobalScope(name: string): this

  // CACHING
  cache(ttl: number, key?: string): this
}

/**
 * Grammar Contract
 */

/**
 * Cache Interface
 */
export interface CacheInterface {
  get<T = any>(key: string): Promise<T | null>
  set(key: string, value: any, ttl?: number): Promise<void>
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
}
