import type { Model, ModelConstructor } from '../orm/model/Model'
import type {
  BooleanOperator,
  CompiledQuery,
  ConnectionContract,
  CursorPaginateResult,
  GrammarContract,
  JoinType,
  Operator,
  OrderDirection,
  PaginateResult,
  QueryBuilderContract,
} from '../types'
import {
  GroupByClause,
  HavingClause,
  JoinManager,
  LimitClause,
  OrderByClause,
  SelectClause,
  WhereClause,
} from './clauses'
import { Expression } from './Expression'
import type { RelationshipResolver } from './RelationshipResolver'
export declare class QueryBuilderError extends Error {
  constructor(message: string)
}
export declare class RecordNotFoundError extends Error {
  constructor(message?: string)
}
/**
 * Fluent Query Builder for constructing SQL queries.
 *
 * Provides a chainable interface for building complex SELECT, INSERT, UPDATE,
 * and DELETE statements. Supports advanced features like subqueries, joins,
 * global scopes, and copy-on-write optimization.
 *
 * @template T - The structure of the resulting records.
 *
 * @example
 * ```typescript
 * const users = await DB.table<User>('users')
 *   .select('id', 'name')
 *   .where('status', 'active')
 *   .orderBy('created_at', 'desc')
 *   .limit(10)
 *   .get();
 * ```
 */
export declare class QueryBuilder<T = Record<string, unknown>> implements QueryBuilderContract<T> {
  protected readonly connection: ConnectionContract
  protected readonly grammar: GrammarContract
  /**
   * Global relationship resolver to avoid circular dependencies and require() calls.
   * Injected by the Model layer.
   */
  static relationshipResolver?: RelationshipResolver
  /**
   * Name of the target database table.
   */
  protected tableName: string
  /**
   * Optional Model class for result hydration.
   */
  protected modelClass?: ModelConstructor<Model>
  protected selectClause: SelectClause
  protected whereClause: WhereClause
  protected joinManager: JoinManager
  protected groupByClause: GroupByClause
  protected havingClause: HavingClause
  protected orderByClause: OrderByClause
  protected limitClause: LimitClause
  /**
   * List of union queries.
   */
  protected unions: {
    query: QueryBuilderContract<any>
    all: boolean
  }[]
  /**
   * Read-only flag to bypass hydration for performance.
   */
  protected isReadOnly: boolean
  /**
   * When true, this query will always use the write (primary) connection,
   * even if read replicas are configured. Use after a write to avoid
   * replication lag issues.
   */
  protected _forceWrite: boolean
  /**
   * When true, includes deferred columns in the query.
   */
  protected _withDeferred: boolean
  /**
   * Internal helper to execute operations with automatic partition provisioning.
   *
   * @param fn - The operation to execute.
   * @returns The operation result.
   */
  protected runWithAutoProvisioning<R>(fn: () => Promise<R>): Promise<R>
  /**
   * Map of relationships to load alongside query results.
   */
  protected eagerLoads: Map<string, (query: QueryBuilderContract<any>) => void>
  /**
   * Result caching configuration.
   */
  protected _cache?: {
    ttl: number
    key?: string
  }
  /**
   * Internal flag for copy-on-write optimization.
   */
  protected _isClone: boolean
  /**
   * Tracks if clones have been modified.
   */
  protected _isModified: boolean
  /**
   * Tracks reference counts for shared state management.
   */
  private _cloneCount
  /**
   * Registered global query filters.
   */
  protected globalScopes: Map<string, (query: QueryBuilderContract<any>) => void>
  /**
   * Identifiers of scopes to bypass.
   */
  protected removedScopes: Set<string>
  /**
   * Prevents infinite recursion during scope application.
   */
  protected _isApplyingScopes: boolean
  /**
   * 聚合操作委派建構器（count/sum/avg/min/max）
   */
  private readonly aggregateBuilder
  /**
   * 寫入操作委派建構器（insert/update/delete/upsert/increment/decrement）
   */
  private readonly mutationBuilder
  /**
   * 分頁操作委派建構器（paginate/cursorPaginate/chunk）
   */
  private readonly paginationBuilder
  /**
   * Initializes a new query builder.
   *
   * @param connection - Active database connection.
   * @param grammar - SQL compiler instance.
   * @param table - Initial table name.
   */
  constructor(connection: ConnectionContract, grammar: GrammarContract, table: string)
  /**
   * Implements Copy-on-Write for query cloning.
   *
   * Shared state (clauses) is lazily copied only when a modification occurs.
   * This drastically reduces overhead for operations like .count() or .paginate()
   * that require cloning the builder.
   *
   * @internal
   */
  protected ensureOwnState(): void
  /**
   * Associates a Model with the query for automatic record hydration.
   *
   * @param model - The Model class constructor.
   */
  setModel<M extends Model>(model: ModelConstructor<M>): this
  /**
   * Includes deferred columns in the query result.
   *
   * @param value - Whether to include deferred columns (default true).
   */
  withDeferred(value?: boolean): this
  /**
   * Retrieves the associated Model class.
   */
  getModel<M extends Model>(): ModelConstructor<M> | undefined
  /**
   * Returns the resolved table name, including any partition routing logic.
   */
  getResolvedTableName(): string
  /**
   * Accesses raw WHERE conditions.
   * @internal
   */
  get wheres(): import('./clauses/WhereClause').WhereCondition[]
  /**
   * Specifies the columns to be retrieved.
   *
   * @param columns - List of column names.
   */
  select(...columns: string[]): this
  /**
   * Sets the target database table.
   */
  from(table: string): this
  /**
   * Adds a raw SQL expression to the SELECT clause.
   *
   * @param sql - Raw SQL template or Expression instance.
   * @param bindings - Binding values.
   */
  selectRaw(sql: string | Expression, bindings?: unknown[]): this
  /**
   * Adds the DISTINCT keyword to the selection.
   */
  distinct(): this
  /**
   * Configures query result caching.
   *
   * @param ttl - Duration in seconds.
   * @param key - Explicit cache identifier.
   */
  cache(ttl: number, key?: string): this
  /**
   * Adds a WHERE constraint to the query.
   *
   * Supports various formats:
   * - Key-value object: .where({ id: 1, active: true })
   * - Operator form: .where('age', '>', 18)
   * - Nested closure: .where(q => q.where('a', 1).orWhere('b', 2))
   *
   * @param column - Column name, closure, or object.
   * @param operatorOrValue - Comparison operator or value.
   * @param value - Value (if operator is provided).
   */
  where(
    column: string | ((query: QueryBuilderContract<T>) => void) | Record<string, unknown>,
    operatorOrValue?: Operator | unknown,
    value?: unknown
  ): this
  /**
   * Adds an OR WHERE constraint.
   */
  orWhere(
    column: string | ((query: QueryBuilderContract<T>) => void),
    operatorOrValue?: Operator | unknown,
    value?: unknown
  ): this
  /**
   * Adds a WHERE IN constraint.
   *
   * @param column - Target column.
   * @param values - Values array or subquery.
   */
  whereIn(column: string, values: unknown[] | QueryBuilderContract<any>): this
  /**
   * Adds a WHERE NOT IN constraint.
   */
  whereNotIn(column: string, values: unknown[] | QueryBuilderContract<any>): this
  /**
   * Adds an OR WHERE IN constraint.
   */
  orWhereIn(column: string, values: unknown[] | QueryBuilderContract<any>): this
  /**
   * Adds an OR WHERE NOT IN constraint.
   */
  orWhereNotIn(column: string, values: unknown[] | QueryBuilderContract<any>): this
  /**
   * Adds a WHERE column IS NULL constraint.
   */
  whereNull(column: string): this
  /**
   * Adds a WHERE column IS NOT NULL constraint.
   */
  whereNotNull(column: string): this
  /**
   * Adds an OR WHERE column IS NULL constraint.
   */
  orWhereNull(column: string): this
  /**
   * Adds an OR WHERE column IS NOT NULL constraint.
   */
  orWhereNotNull(column: string): this
  /**
   * Adds a WHERE BETWEEN constraint.
   */
  whereBetween(column: string, values: [unknown, unknown]): this
  /**
   * Adds a WHERE NOT BETWEEN constraint.
   */
  whereNotBetween(column: string, values: [unknown, unknown]): this
  /**
   * Adds a raw SQL WHERE constraint.
   */
  whereRaw(sql: string | Expression, bindings?: unknown[]): this
  /**
   * Adds an OR WHERE raw SQL constraint.
   */
  orWhereRaw(sql: string | Expression, bindings?: unknown[]): this
  /**
   * Compares two columns in a WHERE clause.
   */
  whereColumn(first: string, operator: Operator, second: string): this
  /**
   * Adds a WHERE EXISTS subquery constraint.
   *
   * @param callback - Logic for the subquery.
   */
  whereExists(callback: (query: QueryBuilderContract<any>) => void): this
  /**
   * Adds a WHERE NOT EXISTS subquery constraint.
   */
  whereNotExists(callback: (query: QueryBuilderContract<any>) => void): this
  /**
   * Adds a constraint for a nested JSON property.
   *
   * @param column - Path using "->" syntax.
   * @param value - Match value.
   */
  whereJson(column: string, value: unknown): this
  /**
   * Adds an OR WHERE constraint for a nested JSON property.
   */
  orWhereJson(column: string, value: unknown): this
  /**
   * Checks if a JSON column contains a specific value.
   */
  whereJsonContains(column: string, value: unknown): this
  /**
   * OR version of {@link whereJsonContains}.
   */
  orWhereJsonContains(column: string, value: unknown): this
  /**
   * Combines the current query with another one using UNION.
   */
  union(query: QueryBuilderContract<any>, all?: boolean): this
  /**
   * Combines the current query with another one using UNION ALL.
   */
  unionAll(query: QueryBuilderContract<any>): this
  /**
   * Spatial distance filter: matches records within a given radius.
   *
   * Generates dialect-appropriate SQL:
   * - **PostgreSQL**: `ST_DWithin(column::geography, ST_MakePoint(lng, lat)::geography, distance)`
   * - **MySQL**: `ST_Distance_Sphere(column, POINT(lng, lat)) <= distance`
   *
   * Requires a spatial/geometry column and a GIS extension.
   *
   * @param column - The geometry/geography column name
   * @param point - GPS point `{ lat, lng }` in decimal degrees
   * @param distanceMeters - Search radius in meters
   *
   * @example
   * ```typescript
   * // Find all stores within 5km of a location
   * await Store.query().whereDistanceWithin('location', { lat: 25.04, lng: 121.52 }, 5000).get()
   * ```
   */
  whereDistanceWithin(
    column: string,
    point: {
      lat: number
      lng: number
    },
    distanceMeters: number
  ): this
  /**
   * Groups constraints in parentheses.
   *
   * @param callback - Closure for nested builder.
   * @param boolean - Connector (and/or).
   * @internal
   */
  protected whereNested(
    callback: (query: QueryBuilderContract<T>) => void,
    boolean: BooleanOperator
  ): this
  /**
   * Adds an INNER JOIN.
   */
  join(table: string, first: string, operator: string, second: string): this
  /**
   * Adds a LEFT JOIN.
   */
  leftJoin(table: string, first: string, operator: string, second: string): this
  /**
   * Adds a RIGHT JOIN.
   */
  rightJoin(table: string, first: string, operator: string, second: string): this
  /**
   * Adds a CROSS JOIN.
   */
  crossJoin(table: string): this
  /**
   * Internal join registration.
   * @internal
   */
  protected addJoin(
    type: JoinType,
    table: string,
    first: string,
    operator: string,
    second: string
  ): this
  /**
   * Defines the GROUP BY clause.
   */
  groupBy(...columns: string[]): this
  /**
   * Defines a HAVING constraint.
   */
  having(column: string, operator: Operator, value: unknown): this
  /**
   * Defines a raw HAVING constraint.
   */
  havingRaw(sql: string | Expression, bindings?: unknown[]): this
  /**
   * Defines the ORDER BY clause.
   */
  orderBy(column: string, direction?: OrderDirection): this
  /**
   * Helper for DESC ordering.
   */
  orderByDesc(column: string): this
  /**
   * Adds a raw SQL ORDER BY clause.
   */
  orderByRaw(sql: string | Expression, bindings?: unknown[]): this
  /**
   * Orders results by the latest created_at timestamp.
   */
  latest(column?: string): this
  /**
   * Orders results by the oldest created_at timestamp.
   */
  oldest(column?: string): this
  /**
   * Constrains the number of results.
   */
  limit(value: number): this
  /**
   * Skips the specified number of results.
   */
  offset(value: number): this
  /**
   * Alias for {@link offset}.
   */
  skip(value: number): this
  /**
   * Alias for {@link limit}.
   */
  take(value: number): this
  /**
   * Executes the query using a server-side prepared statement for speed.
   */
  getPrepared(): Promise<T[]>
  /**
   * Fetches raw database rows, bypassing the Model hydration layer.
   *
   * @returns Array of plain objects.
   * @internal
   */
  getRawResults(): Promise<Record<string, unknown>[]>
  /**
   * Executes the query and returns hydrated records.
   */
  get(): Promise<T[]>
  /**
   * Provides an async iterator to stream results one by one.
   *
   * Essential for processing datasets that exceed memory capacity.
   */
  stream(): AsyncIterable<T>
  /**
   * Returns the first record matching the query.
   */
  first(): Promise<T | null>
  /**
   * Fails if no record matches the query.
   * @throws {RecordNotFoundError}
   */
  firstOrFail(): Promise<T>
  /**
   * Shortcut for searching by primary key.
   */
  find(id: unknown, primaryKey?: string): Promise<T | null>
  /**
   * Fails if primary key search yields no result.
   */
  findOrFail(id: unknown, primaryKey?: string): Promise<T>
  /**
   * Retrieves a single column value from the first matching record.
   */
  value<V = unknown>(column: string): Promise<V | null>
  /**
   * Retrieves an array of values for a single column.
   */
  pluck<V = unknown>(column: string): Promise<V[]>
  /**
   * Returns true if any records match the query.
   */
  exists(): Promise<boolean>
  /**
   * Inverse of {@link exists}.
   */
  doesntExist(): Promise<boolean>
  /**
   * Returns the count of matching records.
   */
  count(column?: string): Promise<number>
  /**
   * Returns the maximum value of a column.
   */
  max<V = number>(column: string): Promise<V | null>
  /**
   * Returns the minimum value of a column.
   */
  min<V = number>(column: string): Promise<V | null>
  /**
   * Returns the average value of a column.
   */
  avg(column: string): Promise<number | null>
  /**
   * Returns the sum of a column's values.
   */
  sum(column: string): Promise<number>
  /**
   * Internal generic aggregate execution.
   * @internal
   */
  protected aggregate(func: string, column: string): Promise<number | null>
  /**
   * Inserts data into the table.
   *
   * Automatically handles batching (chunking) to stay within binding limits.
   *
   * @param data - Single object or array of objects.
   * @returns Array of inserted objects (with generated IDs if supported).
   */
  insert(data: Partial<T> | Partial<T>[]): Promise<T[]>
  /**
   * Inserts data and returns the primary key.
   *
   * @param data - Record data.
   * @param primaryKey - Name of the auto-increment column.
   * @returns Generated ID.
   * @throws {QueryBuilderError} If ID retrieval fails.
   */
  insertGetId(data: Partial<T>, primaryKey?: string): Promise<number | bigint>
  /**
   * Updates records matching the current query state.
   *
   * @param data - Update values.
   * @returns Count of affected rows.
   */
  update(data: Partial<T>): Promise<number>
  /**
   * Specialized method for updating JSON fields.
   */
  updateJson(column: string, value: unknown): Promise<number>
  /**
   * Deletes records matching the query.
   *
   * Note: This performs a hard delete. For soft deletes, use the Model layer.
   */
  delete(): Promise<number>
  /**
   * Drops all records and resets auto-increment state.
   */
  truncate(): Promise<void>
  /**
   * Defines relationships to load in bulk after the primary query.
   */
  with(
    relation: string | string[] | Record<string, (query: QueryBuilderContract<unknown>) => void>
  ): this
  /**
   * Filters the query based on relationship existence.
   */
  whereHas(relation: string, callback?: (query: QueryBuilderContract<unknown>) => void): this
  /**
   * Retrieves eager load mapping.
   * @internal
   */
  getEagerLoads(): Map<string, (query: QueryBuilderContract<any>) => void>
  /**
   * Includes soft-deleted records (where deleted_at is not null).
   */
  withTrashed(): this
  /**
   * Excludes non-deleted records.
   */
  onlyTrashed(): this
  /**
   * Restores soft-deleted records to active state.
   */
  restore(): Promise<number>
  /**
   * Bypasses soft deletes to permanently remove records.
   */
  forceDelete(): Promise<number>
  /**
   * Atomically increments a numeric column.
   */
  increment(column: string, amount?: number, extra?: Partial<T>): Promise<number>
  /**
   * Atomically decrements a numeric column.
   */
  decrement(column: string, amount?: number, extra?: Partial<T>): Promise<number>
  /**
   * Inserts records or updates them if a uniqueness conflict occurs.
   *
   * @param data - Records to process.
   * @param uniqueBy - Column(s) that identify uniqueness.
   * @param update - Column(s) to update on conflict.
   * @returns Affected rows.
   */
  upsert(
    data: Partial<T> | Partial<T>[],
    uniqueBy: string | string[],
    update?: string[]
  ): Promise<number>
  /**
   * Alias for {@link paginate}.
   */
  simplePaginate(perPage?: number, page?: number, primaryKey?: string): Promise<PaginateResult<T>>
  /**
   * Forces this query to use the primary (write) connection.
   *
   * Essential after writes to avoid reading stale data from replicas.
   * Example: after saving a model, use `.useWriteConnection()` to read back.
   *
   * @example
   * ```typescript
   * await User.create({ name: 'Alice' })
   * const alice = await User.query().useWriteConnection().where('name', 'Alice').first()
   * ```
   */
  useWriteConnection(): this
  /**
   * Cursor-based pagination for large datasets.
   *
   * Achieves O(1) performance by using tuple comparison SQL instead of OFFSET.
   * Ideal for infinite scroll, API cursors, and feeds with millions of records.
   *
   * @param limit - Number of records to fetch per page
   * @param cursor - Opaque cursor from a previous page's `nextCursor` (undefined for first page)
   * @param sortColumn - Column to sort by (defaults to primary key 'id')
   * @param direction - Sort direction (defaults to 'asc')
   * @returns CursorPaginateResult with data and cursor metadata
   *
   * @example
   * ```typescript
   * // First page
   * const page1 = await User.query().orderBy('created_at').cursorPaginate(20)
   *
   * // Next page using cursor from previous result
   * const page2 = await User.query().orderBy('created_at').cursorPaginate(20, page1.nextCursor)
   * ```
   */
  cursorPaginate(
    limit?: number,
    cursor?: string,
    sortColumn?: string,
    direction?: 'asc' | 'desc'
  ): Promise<CursorPaginateResult<T>>
  /**
   * Processes the entire dataset in memory-efficient chunks.
   *
   * @param size - Chunk size.
   * @param callback - Logic for each chunk.
   */
  chunk(size: number, callback: (results: T[]) => Promise<undefined | boolean>): Promise<void>
  /**
   * Returns a paginated result set with metadata.
   */
  paginate(perPage?: number, page?: number, primaryKey?: string): Promise<PaginateResult<T>>
  /**
   * Force an ID sort if none exists to prevent skipping records during pagination.
   */
  ensureDeterministicOrder(primaryKey?: string): this
  /**
   * Sets the read-only flag for this query.
   */
  readonly(value?: boolean): this
  /**
   * Checks if read-only is active.
   * @internal
   */
  getIsReadOnly(): boolean
  /**
   * Creates a deep copy of the current builder.
   *
   * Leverages copy-on-write; state is initially shared.
   */
  clone(): QueryBuilderContract<T>
  /**
   * Returns a finalized query structure ready for compilation.
   *
   * Includes global scope application.
   */
  getCompiledQuery(): CompiledQuery
  /**
   * Internal query structural assembly.
   * @internal
   */
  protected getRawCompiledQuery(): CompiledQuery
  /**
   * Executes all registered global scope callbacks.
   * @internal
   */
  protected applyGlobalScopes(): void
  /**
   * Returns all bound values for the current state.
   */
  getBindings(): unknown[]
  /**
   * Checks for LIMIT or OFFSET definitions.
   */
  hasLimitOrOffset(): boolean
  /**
   * Returns the compiled SQL string.
   */
  toSql(): string
  /**
   * Logs SQL and Bindings to standard output.
   */
  dump(): this
  /**
   * Logs and exits process.
   */
  dd(): never
  /**
   * Registers a permanent filter for this builder instance.
   */
  applyScope(name: string, callback: (query: QueryBuilderContract<T>) => void): this
  /**
   * Bypasses a previously registered scope.
   */
  withoutGlobalScope(name: string): this
}
