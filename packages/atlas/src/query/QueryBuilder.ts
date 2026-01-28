/**
 * Query Builder
 * @description Fluent query builder for constructing SQL queries
 */

import { DB } from '../DB'
import type { Model, ModelConstructor } from '../orm/model/Model'
import type {
  BooleanOperator,
  CompiledQuery,
  ConnectionContract,
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

/**
 * Query Builder Error
 */
export class QueryBuilderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QueryBuilderError'
  }
}

/**
 * Record Not Found Error
 */
export class RecordNotFoundError extends Error {
  constructor(message = 'Record not found') {
    super(message)
    this.name = 'RecordNotFoundError'
  }
}

/**
 * Query Builder
 * @description Provides a fluent interface for building and executing SQL queries.
 * Supports complex filtering, joining, ordering, and pagination.
 *
 * @template T - The type of the records returned by the query (defaults to Record<string, unknown>)
 */
export class QueryBuilder<T = Record<string, unknown>> implements QueryBuilderContract<T> {
  /** The name of the table being queried */
  protected tableName: string
  /** Optional model class associated with the query */
  protected modelClass?: ModelConstructor<Model>

  // Clauses
  protected selectClause = new SelectClause()
  protected whereClause = new WhereClause()
  protected joinManager = new JoinManager()
  protected groupByClause = new GroupByClause()
  protected havingClause = new HavingClause()
  protected orderByClause = new OrderByClause()
  protected limitClause = new LimitClause()

  /** Whether the query is in read-only mode */
  protected isReadOnly = false
  /** Map of relationships to eager load */
  // biome-ignore lint/suspicious/noExplicitAny: Eager loads need any for flexibility
  protected eagerLoads = new Map<string, (query: QueryBuilderContract<any>) => void>()
  /** Cache configuration for the query results */
  protected _cache?: { ttl: number; key?: string }

  /** Whether this instance is a clone of another query builder */
  protected _isClone = false
  /** Whether the state has been modified since cloning */
  protected _isModified = false
  /** Counter to track number of clones sharing this instance's arrays (for copy-on-write) */
  private _cloneCount = 0

  /** Map of global scopes to apply to the query */
  // biome-ignore lint/suspicious/noExplicitAny: Global scopes need any for flexibility
  protected globalScopes = new Map<string, (query: QueryBuilderContract<any>) => void>()
  /** Set of global scopes that have been explicitly removed */
  protected removedScopes = new Set<string>()
  /** Whether global scopes are currently being applied (to prevent recursion) */
  protected _isApplyingScopes = false

  /**
   * Create a new QueryBuilder instance
   *
   * @param connection - The database connection to use
   * @param grammar - The SQL grammar to use for compilation
   * @param table - The name of the table
   */
  constructor(
    protected readonly connection: ConnectionContract,
    protected readonly grammar: GrammarContract,
    table: string
  ) {
    this.tableName = table
  }

  /**
   * Ensure this query has its own state copy
   * Only performs the copy on first modification after clone
   * Also handles the case where original query is modified and has clones
   *
   * @internal
   */
  protected ensureOwnState(): void {
    if (this._isClone && !this._isModified) {
      // First access/modification - perform actual copy of shared clauses
      this.selectClause = this.selectClause.clone()
      this.whereClause = this.whereClause.clone()
      this.joinManager = this.joinManager.clone()
      this.groupByClause = this.groupByClause.clone()
      this.havingClause = this.havingClause.clone()
      this.orderByClause = this.orderByClause.clone()
      this.limitClause = this.limitClause.clone()

      // Mark as modified so we don't copy again
      this._isModified = true
      // Clear clone flag since we now have our own state
      this._isClone = false
    } else if (!this._isClone && this._cloneCount > 0 && !this._isModified) {
      // Original query is being modified for the first time and has clones
      this.selectClause = this.selectClause.clone()
      this.whereClause = this.whereClause.clone()
      this.joinManager = this.joinManager.clone()
      this.groupByClause = this.groupByClause.clone()
      this.havingClause = this.havingClause.clone()
      this.orderByClause = this.orderByClause.clone()
      this.limitClause = this.limitClause.clone()

      // Mark as modified and clear clone count
      this._isModified = true
      this._cloneCount = 0
    }
  }

  /**
   * Set the model class for this query
   *
   * @param model - The model constructor
   * @returns The current QueryBuilder instance
   */
  setModel<M extends Model>(model: ModelConstructor<M>): this {
    this.ensureOwnState()
    this.modelClass = model
    return this
  }

  /**
   * Get the model class associated with this query
   *
   * @returns The model constructor or undefined
   */
  getModel<M extends Model>(): ModelConstructor<M> | undefined {
    return this.modelClass as ModelConstructor<M> | undefined
  }

  /**
   * Get the wheres from the where clause (compatibility getter)
   * @internal
   */
  get wheres(): import('./clauses/WhereClause').WhereCondition[] {
    return this.whereClause.getWheres()
  }

  // ============================================================================
  // SELECT Methods
  // ============================================================================

  /**
   * Set the columns to be retrieved by the query.
   *
   * @param columns - List of column names or raw expressions.
   * @returns The current QueryBuilder instance for chaining.
   */
  select(...columns: string[]): this {
    this.ensureOwnState()
    this.selectClause.setColumns(...columns)
    return this
  }

  /**
   * Set the source table for the query.
   *
   * @param table - The table name.
   * @returns The current QueryBuilder instance for chaining.
   */
  from(table: string): this {
    this.ensureOwnState()
    this.tableName = table
    return this
  }

  /**
   * Add a raw SQL expression to the SELECT clause.
   *
   * @param sql - The raw SQL string or Expression instance.
   * @param bindings - Optional array of values to bind to the expression.
   * @returns The current QueryBuilder instance for chaining.
   */
  selectRaw(sql: string | Expression, bindings: unknown[] = []): this {
    this.ensureOwnState()
    if (sql instanceof Expression) {
      this.selectClause.addRaw(sql.getValue(), sql.getBindings())
    } else {
      this.selectClause.addRaw(sql, bindings)
    }
    return this
  }

  /**
   * Add the DISTINCT keyword to the query
   *
   * @returns The current QueryBuilder instance
   */
  distinct(): this {
    this.ensureOwnState()
    this.selectClause.setDistinct()
    return this
  }

  /**
   * Cache the query results for a specified duration
   *
   * @param ttl - Time to live in seconds
   * @param key - Optional explicit cache key
   * @returns The current QueryBuilder instance
   */
  cache(ttl: number, key?: string): this {
    this.ensureOwnState()
    if (key !== undefined) {
      this._cache = { ttl, key }
    } else {
      this._cache = { ttl }
    }
    return this
  }

  // ============================================================================
  // WHERE Methods
  // ============================================================================

  /**
   * Add a basic WHERE clause to the query.
   *
   * @param column - Column name, callback for nested wheres, or object of conditions.
   * @param operatorOrValue - Comparison operator (e.g., '>', '<=', 'LIKE') or the value if using '='.
   * @param value - The value to compare against if an operator was provided.
   * @returns The current QueryBuilder instance for chaining.
   */
  where(
    column: string | ((query: QueryBuilderContract<T>) => void) | Record<string, unknown>,
    operatorOrValue?: Operator | unknown,
    value?: unknown
  ): this {
    this.ensureOwnState()
    // Handle callback for nested where
    if (typeof column === 'function') {
      return this.whereNested(column, 'and')
    }

    // Handle object of conditions
    if (typeof column === 'object' && column !== null) {
      for (const [key, val] of Object.entries(column)) {
        this.where(key, '=', val)
      }
      return this
    }

    // Handle 2 or 3 argument form
    let operator: Operator
    let finalValue: unknown

    if (value === undefined) {
      operator = '='
      finalValue = operatorOrValue
    } else {
      operator = operatorOrValue as Operator
      finalValue = value
    }

    this.whereClause.add(column, operator, finalValue, 'and')
    return this
  }

  /**
   * Add an OR WHERE clause to the query.
   *
   * @param column - Column name or callback for nested wheres.
   * @param operatorOrValue - Comparison operator or value.
   * @param value - Value to compare against.
   * @returns The current QueryBuilder instance for chaining.
   */
  orWhere(
    column: string | ((query: QueryBuilderContract<T>) => void),
    operatorOrValue?: Operator | unknown,
    value?: unknown
  ): this {
    this.ensureOwnState()
    if (typeof column === 'function') {
      return this.whereNested(column, 'or')
    }

    let operator: Operator
    let finalValue: unknown

    if (value === undefined) {
      operator = '='
      finalValue = operatorOrValue
    } else {
      operator = operatorOrValue as Operator
      finalValue = value
    }

    this.whereClause.add(column, operator, finalValue, 'or')
    return this
  }

  /**
   * Add a WHERE IN clause to the query.
   *
   * @param column - Column name.
   * @param values - Array of values or a subquery.
   * @returns The current QueryBuilder instance for chaining.
   */
  whereIn(column: string, values: unknown[] | QueryBuilderContract<any>): this {
    this.ensureOwnState()
    const finalValues = Array.isArray(values) ? values : [values]
    this.whereClause.addIn(column, finalValues, 'and', false)
    return this
  }

  /**
   * Add a WHERE NOT IN clause to the query.
   *
   * @param column - Column name.
   * @param values - Array of values or a subquery.
   * @returns The current QueryBuilder instance for chaining.
   */
  whereNotIn(column: string, values: unknown[] | QueryBuilderContract<any>): this {
    this.ensureOwnState()
    const finalValues = Array.isArray(values) ? values : [values]
    this.whereClause.addIn(column, finalValues, 'and', true)
    return this
  }

  /**
   * Add an OR WHERE IN clause to the query.
   *
   * @param column - Column name.
   * @param values - Array of values or a subquery.
   * @returns The current QueryBuilder instance for chaining.
   */
  orWhereIn(column: string, values: unknown[] | QueryBuilderContract<any>): this {
    this.ensureOwnState()
    const finalValues = Array.isArray(values) ? values : [values]
    this.whereClause.addIn(column, finalValues, 'or', false)
    return this
  }

  /**
   * Add an OR WHERE NOT IN clause to the query.
   *
   * @param column - Column name.
   * @param values - Array of values or a subquery.
   * @returns The current QueryBuilder instance for chaining.
   */
  orWhereNotIn(column: string, values: unknown[] | QueryBuilderContract<any>): this {
    this.ensureOwnState()
    const finalValues = Array.isArray(values) ? values : [values]
    this.whereClause.addIn(column, finalValues, 'or', true)
    return this
  }

  /**
   * Add a WHERE NULL clause to the query.
   *
   * @param column - Column name.
   * @returns The current QueryBuilder instance for chaining.
   */
  whereNull(column: string): this {
    this.ensureOwnState()
    this.whereClause.addNull(column, 'and', false)
    return this
  }

  /**
   * Add a WHERE NOT NULL clause to the query.
   *
   * @param column - Column name.
   * @returns The current QueryBuilder instance for chaining.
   */
  whereNotNull(column: string): this {
    this.ensureOwnState()
    this.whereClause.addNull(column, 'and', true)
    return this
  }

  /**
   * Add an OR WHERE NULL clause to the query.
   *
   * @param column - Column name.
   * @returns The current QueryBuilder instance for chaining.
   */
  orWhereNull(column: string): this {
    this.ensureOwnState()
    this.whereClause.addNull(column, 'or', false)
    return this
  }

  /**
   * Add an OR WHERE NOT NULL clause to the query.
   *
   * @param column - Column name.
   * @returns The current QueryBuilder instance for chaining.
   */
  orWhereNotNull(column: string): this {
    this.ensureOwnState()
    this.whereClause.addNull(column, 'or', true)
    return this
  }

  /**
   * Add a WHERE BETWEEN clause to the query
   *
   * @param column - Column name
   * @param values - Tuple of [min, max] values
   * @returns The current QueryBuilder instance
   */
  whereBetween(column: string, values: [unknown, unknown]): this {
    this.ensureOwnState()
    this.whereClause.addBetween(column, values, 'and', false)
    return this
  }

  /**
   * Add a WHERE NOT BETWEEN clause to the query
   *
   * @param column - Column name
   * @param values - Tuple of [min, max] values
   * @returns The current QueryBuilder instance
   */
  whereNotBetween(column: string, values: [unknown, unknown]): this {
    this.ensureOwnState()
    this.whereClause.addBetween(column, values, 'and', true)
    return this
  }

  /**
   * Add a raw WHERE clause to the query
   *
   * @param sql - Raw SQL string or Expression instance
   * @param bindings - Optional array of bindings
   * @returns The current QueryBuilder instance
   */
  whereRaw(sql: string | Expression, bindings: unknown[] = []): this {
    this.ensureOwnState()
    if (sql instanceof Expression) {
      this.whereClause.addRaw(sql.getValue(), sql.getBindings(), 'and')
    } else {
      this.whereClause.addRaw(sql, bindings, 'and')
    }
    return this
  }

  /**
   * Add a raw OR WHERE clause to the query
   *
   * @param sql - Raw SQL string or Expression instance
   * @param bindings - Optional array of bindings
   * @returns The current QueryBuilder instance
   */
  orWhereRaw(sql: string | Expression, bindings: unknown[] = []): this {
    this.ensureOwnState()
    if (sql instanceof Expression) {
      this.whereClause.addRaw(sql.getValue(), sql.getBindings(), 'or')
    } else {
      this.whereClause.addRaw(sql, bindings, 'or')
    }
    return this
  }

  /**
   * Add a WHERE clause comparing two columns
   *
   * @param first - First column name
   * @param operator - Comparison operator
   * @param second - Second column name
   * @returns The current QueryBuilder instance
   */
  whereColumn(first: string, operator: Operator, second: string): this {
    this.ensureOwnState()
    this.whereClause.addColumn(first, operator, second, 'and')
    return this
  }

  /**
   * Add a WHERE EXISTS clause
   *
   * @param callback - Callback receiving a new QueryBuilder instance
   * @returns The current QueryBuilder instance
   */
  whereExists(callback: (query: QueryBuilderContract<any>) => void): this {
    this.ensureOwnState()
    const subQuery = new QueryBuilder(this.connection, this.grammar, '')
    callback(subQuery)
    const sql = subQuery.toSql()
    return this.whereRaw(`EXISTS (${sql})`, subQuery.getBindings())
  }

  /**
   * Add a WHERE NOT EXISTS clause
   *
   * @param callback - Callback receiving a new QueryBuilder instance
   * @returns The current QueryBuilder instance
   */
  whereNotExists(callback: (query: QueryBuilderContract<any>) => void): this {
    this.ensureOwnState()
    const subQuery = new QueryBuilder(this.connection, this.grammar, '')
    callback(subQuery)
    const sql = subQuery.toSql()
    return this.whereRaw(`NOT EXISTS (${sql})`, subQuery.getBindings())
  }

  // ============================================================================
  // JSON Methods
  // ============================================================================

  /**
   * Add a WHERE clause for a JSON path
   *
   * @param column - JSON column path (e.g., 'data->user->id')
   * @param value - Value to compare against
   * @returns The current QueryBuilder instance
   */
  whereJson(column: string, value: unknown): this {
    return this.whereRaw(this.grammar.compileJsonPath(column, value), [value])
  }

  /**
   * Add an OR WHERE clause for a JSON path
   *
   * @param column - JSON column path
   * @param value - Value to compare against
   * @returns The current QueryBuilder instance
   */
  orWhereJson(column: string, value: unknown): this {
    return this.orWhereRaw(this.grammar.compileJsonPath(column, value), [value])
  }

  /**
   * Add a WHERE clause checking if a JSON column contains a value
   *
   * @param column - JSON column name
   * @param value - Value to check for
   * @returns The current QueryBuilder instance
   */
  whereJsonContains(column: string, value: unknown): this {
    return this.whereRaw(this.grammar.compileJsonContains(column, value), [JSON.stringify(value)])
  }

  /**
   * Add an OR WHERE clause checking if a JSON column contains a value
   *
   * @param column - JSON column name
   * @param value - Value to check for
   * @returns The current QueryBuilder instance
   */
  orWhereJsonContains(column: string, value: unknown): this {
    return this.orWhereRaw(this.grammar.compileJsonContains(column, value), [JSON.stringify(value)])
  }

  /**
   * Add a nested WHERE clause using a callback
   *
   * @param callback - Callback receiving a new QueryBuilder instance
   * @param boolean - Logical connector ('and' or 'or')
   * @returns The current QueryBuilder instance
   * @internal
   */
  protected whereNested(
    callback: (query: QueryBuilderContract<T>) => void,
    boolean: BooleanOperator
  ): this {
    const nestedQuery = new QueryBuilder<T>(this.connection, this.grammar, this.tableName)
    callback(nestedQuery)

    // Extract nested conditions from the nested query's WhereClause
    const nestedConditions = nestedQuery.whereClause.getWheres()

    if (nestedConditions.length > 0) {
      this.whereClause.addNested(nestedConditions, boolean)
    }

    return this
  }

  // ============================================================================
  // JOIN Methods
  // ============================================================================

  /**
   * Add an INNER JOIN to the query.
   */
  join(table: string, first: string, operator: string, second: string): this {
    return this.addJoin('inner', table, first, operator, second)
  }

  /**
   * Add a LEFT JOIN to the query.
   */
  leftJoin(table: string, first: string, operator: string, second: string): this {
    return this.addJoin('left', table, first, operator, second)
  }

  /**
   * Add a RIGHT JOIN to the query.
   */
  rightJoin(table: string, first: string, operator: string, second: string): this {
    return this.addJoin('right', table, first, operator, second)
  }

  /**
   * Add a CROSS JOIN to the query.
   */
  crossJoin(table: string): this {
    this.ensureOwnState()
    this.joinManager.cross(table, '', '', '')
    return this
  }

  /**
   * Internal helper to add a JOIN clause
   * @internal
   */
  protected addJoin(
    type: JoinType,
    table: string,
    first: string,
    operator: string,
    second: string
  ): this {
    this.ensureOwnState()
    this.joinManager.add(type, table, first, operator, second)
    return this
  }

  // ============================================================================
  // GROUP BY & HAVING Methods
  // ============================================================================

  /**
   * Add GROUP BY columns to the query
   */
  groupBy(...columns: string[]): this {
    this.ensureOwnState()
    this.groupByClause.groupBy(...columns)
    return this
  }

  /**
   * Add a HAVING clause to the query
   */
  having(column: string, operator: Operator, value: unknown): this {
    this.ensureOwnState()
    this.havingClause.having(column, operator, value)
    return this
  }

  /**
   * Add a raw HAVING clause to the query
   */
  havingRaw(sql: string | Expression, bindings: unknown[] = []): this {
    this.ensureOwnState()
    this.havingClause.havingRaw(sql, bindings)
    return this
  }

  // ============================================================================
  // ORDER BY Methods
  // ============================================================================

  /**
   * Add an ORDER BY clause to the query
   */
  orderBy(column: string, direction: OrderDirection = 'asc'): this {
    this.ensureOwnState()
    this.orderByClause.orderBy(column, direction)
    return this
  }

  /**
   * Add an ORDER BY DESC clause to the query
   */
  orderByDesc(column: string): this {
    return this.orderBy(column, 'desc')
  }

  /**
   * Add a raw ORDER BY clause to the query
   */
  orderByRaw(sql: string | Expression, bindings: unknown[] = []): this {
    this.ensureOwnState()
    this.orderByClause.orderByRaw(sql, bindings)
    return this
  }

  /**
   * Order the results by the latest records (created_at DESC)
   */
  latest(column = 'created_at'): this {
    return this.orderBy(column, 'desc')
  }

  /**
   * Order the results by the oldest records (created_at ASC)
   */
  oldest(column = 'created_at'): this {
    return this.orderBy(column, 'asc')
  }

  // ============================================================================
  // LIMIT & OFFSET Methods
  // ============================================================================

  /**
   * Set the maximum number of records to return
   */
  limit(value: number): this {
    this.ensureOwnState()
    this.limitClause.setLimit(value)
    return this
  }

  /**
   * Set the number of records to skip
   */
  offset(value: number): this {
    this.ensureOwnState()
    this.limitClause.setOffset(value)
    return this
  }

  /**
   * Alias for offset()
   */
  skip(value: number): this {
    return this.offset(value)
  }

  /**
   * Alias for limit()
   */
  take(value: number): this {
    return this.limit(value)
  }

  // ============================================================================
  // READ Execution Methods
  // ============================================================================

  /**
   * Execute the query using a prepared statement
   */
  async getPrepared(): Promise<T[]> {
    const compiled = this.getCompiledQuery()
    const sql = this.grammar.compileSelect(compiled)
    const bindings = compiled.bindings
    const driver = this.connection.getDriver()

    if (
      typeof (driver as any).prepare === 'function' &&
      typeof (driver as any).executePrepared === 'function'
    ) {
      const stmtName = await (driver as any).prepare(sql)
      const result = await (driver as any).executePrepared(stmtName, bindings)
      return result.rows as T[]
    }

    return this.get()
  }

  /**
   * Execute the query and retrieve all matching records as raw objects.
   * This bypasses model hydration and is used for performance-critical paths.
   * @internal
   */
  async getRawResults(): Promise<Record<string, unknown>[]> {
    const compiled = this.getCompiledQuery()
    const sql = this.grammar.compileSelect(compiled)
    const bindings = compiled.bindings

    // Check cache
    const cache = DB.getCache()
    let cacheKey: string | undefined

    if (cache && this._cache) {
      cacheKey = this._cache.key ?? `orbit:query:${sql}:${JSON.stringify(bindings)}`
      const cached = await cache.get<Record<string, unknown>[]>(cacheKey)
      if (cached) {
        return cached
      }
    }

    const result = await this.connection.raw<Record<string, unknown>>(sql, bindings)

    // Store cache
    if (cache && this._cache && cacheKey) {
      await cache.set(cacheKey, result.rows, this._cache.ttl)
    }

    return result.rows
  }

  /**
   * Execute the query and retrieve all matching records.
   */
  async get(): Promise<T[]> {
    const rows = await this.getRawResults()
    return rows as unknown as T[]
  }

  /**
   * Stream query results for processing large datasets
   * Returns an async iterator that yields records one at a time,
   * which is memory-efficient for large result sets.
   *
   * @example
   * ```typescript
   * for await (const user of User.query().where('active', true).stream()) {
   *   await processUser(user)
   * }
   * ```
   */
  async *stream(): AsyncIterable<T> {
    const compiled = this.getCompiledQuery()
    const sql = this.grammar.compileSelect(compiled)
    const bindings = compiled.bindings

    // Access stream from connection if available
    const conn = this.connection as ConnectionContract & {
      stream?: <U>(sql: string, bindings: unknown[]) => AsyncIterable<U>
    }

    if (typeof conn.stream === 'function') {
      // Use native streaming if available
      for await (const row of conn.stream<T>(sql, bindings)) {
        // Hydrate row if model is set and not in readonly mode
        if (this._model && !this._readonly) {
          const model = this._model.hydrate([row])[0]
          yield model as unknown as T
        } else {
          yield row
        }
      }
    } else {
      // Fallback to regular query
      const rows = await this.get()
      for (const row of rows) {
        yield row
      }
    }
  }

  /**
   * Retrieve the first record matching the query.
   */
  async first(): Promise<T | null> {
    this.limit(1)
    const results = await this.get()
    return results[0] ?? null
  }

  /**
   * Retrieve the first record matching the query or throw an error.
   */
  async firstOrFail(): Promise<T> {
    const result = await this.first()
    if (result === null) {
      throw new RecordNotFoundError()
    }
    return result
  }

  /**
   * Find a record by its primary key value.
   */
  async find(id: unknown, primaryKey = 'id'): Promise<T | null> {
    return this.where(primaryKey, '=', id).first()
  }

  /**
   * Find a record by its primary key or throw an error.
   */
  async findOrFail(id: unknown, primaryKey = 'id'): Promise<T> {
    const result = await this.find(id, primaryKey)
    if (result === null) {
      throw new RecordNotFoundError(`Record with ${primaryKey}=${id} not found`)
    }
    return result
  }

  /**
   * Get a single column value from the first result
   */
  async value<V = unknown>(column: string): Promise<V | null> {
    const result = await this.select(column).first()
    if (result === null) {
      return null
    }
    return (result as Record<string, unknown>)[column] as V
  }

  /**
   * Get an array of values from a single column for all results
   */
  async pluck<V = unknown>(column: string): Promise<V[]> {
    const results = await this.select(column).get()
    return results.map((row) => (row as Record<string, unknown>)[column] as V)
  }

  /**
   * Check if any records exist matching the query
   */
  async exists(): Promise<boolean> {
    const compiled = this.getCompiledQuery()
    const sql = this.grammar.compileExists(compiled)
    const result = await this.connection.raw<{ exists: boolean }>(sql, compiled.bindings)
    return result.rows[0]?.exists ?? false
  }

  /**
   * Check if no records exist matching the query
   */
  async doesntExist(): Promise<boolean> {
    return !(await this.exists())
  }

  // ============================================================================
  // AGGREGATE Execution Methods
  // ============================================================================

  /**
   * Get the count of records matching the query
   */
  async count(column = '*'): Promise<number> {
    const result = await this.aggregate('count', column)
    return result ?? 0
  }

  /**
   * Get the maximum value of a column
   */
  async max<V = number>(column: string): Promise<V | null> {
    return this.aggregate('max', column) as Promise<V | null>
  }

  /**
   * Get the minimum value of a column
   */
  async min<V = number>(column: string): Promise<V | null> {
    return this.aggregate('min', column) as Promise<V | null>
  }

  /**
   * Get the average value of a column
   */
  async avg(column: string): Promise<number | null> {
    return this.aggregate('avg', column)
  }

  /**
   * Get the sum of values in a column
   */
  async sum(column: string): Promise<number> {
    return (await this.aggregate('sum', column)) ?? 0
  }

  /**
   * Internal helper to execute an aggregate function
   */
  protected async aggregate(func: string, column: string): Promise<number | null> {
    const compiled = this.getCompiledQuery()
    const sql = this.grammar.compileAggregate(compiled, { function: func, column })
    const result = await this.connection.raw<{ aggregate: number | null }>(sql, compiled.bindings)
    const value = result.rows[0]?.aggregate
    return value === null || value === undefined ? null : Number(value)
  }

  // ============================================================================
  // WRITE Execution Methods
  // ============================================================================

  /**
   * Insert one or more records into the database.
   */
  async insert(data: Partial<T> | Partial<T>[]): Promise<T[]> {
    const values = Array.isArray(data) ? data : [data]
    if (values.length === 0) {
      return []
    }

    const chunkSize = this.calculateOptimalChunkSize(values)
    const results: T[] = []

    if (values.length > chunkSize) {
      return await this.connection.transaction(async (trx) => {
        for (let i = 0; i < values.length; i += chunkSize) {
          const chunk = values.slice(i, i + chunkSize)
          const chunkResult = await trx.table<T>(this.tableName).insert(chunk)
          results.push(...chunkResult)
        }
        return results
      })
    }

    const allBindings: unknown[] = []
    for (const row of values) {
      allBindings.push(...Object.values(row as Record<string, unknown>))
    }

    const sql = this.grammar.compileInsert(
      this.getCompiledQuery(),
      values as Record<string, unknown>[]
    )
    const result = await this.connection.raw<T>(sql, allBindings)
    return result.rows
  }

  /**
   * Insert a record and retrieve its auto-generated primary key.
   */
  async insertGetId(data: Partial<T>, primaryKey = 'id'): Promise<number | bigint> {
    const values = Object.values(data as Record<string, unknown>)
    const sql = this.grammar.compileInsertGetId(
      this.getCompiledQuery(),
      data as Record<string, unknown>,
      primaryKey
    )
    const result = await this.connection.raw<Record<string, number | bigint>>(sql, values)
    const id = result.rows[0]?.[primaryKey]
    if (id === undefined) {
      throw new QueryBuilderError('Failed to get insert ID')
    }
    return id
  }

  /**
   * Update records matching the current query conditions.
   */
  async update(data: Partial<T>): Promise<number> {
    const values: unknown[] = []
    for (const value of Object.values(data as Record<string, unknown>)) {
      if (value instanceof Expression) {
        values.push(...value.getBindings())
      } else {
        values.push(value)
      }
    }

    const allBindings = [...values, ...this.getBindings()]

    const compiled = this.getCompiledQuery()
    compiled.bindings = allBindings

    const sql = this.grammar.compileUpdate(compiled, data as Record<string, unknown>)
    const result = await this.connection.getDriver().execute(sql, allBindings)
    return result.affectedRows
  }

  /**
   * Partially update a JSON column
   */
  async updateJson(column: string, value: unknown): Promise<number> {
    const sql = this.grammar.compileUpdateJson(this.getCompiledQuery(), column, value)
    const result = await this.connection.getDriver().execute(sql, [value, ...this.getBindings()])
    return result.affectedRows
  }

  /**
   * Delete records matching the query
   */
  async delete(): Promise<number> {
    const sql = this.grammar.compileDelete(this.getCompiledQuery())
    const result = await this.connection.getDriver().execute(sql, this.getBindings())
    return result.affectedRows
  }

  /**
   * Truncate the table (remove all records and reset auto-increment)
   */
  async truncate(): Promise<void> {
    const sql = this.grammar.compileTruncate(this.getCompiledQuery())
    await this.connection.getDriver().execute(sql)
  }

  // ============================================================================
  // EAGER LOADING Methods
  // ============================================================================

  /**
   * Specify relationships to be eager loaded with the query results
   */
  with(
    // biome-ignore lint/suspicious/noExplicitAny: Eager loads need any for flexibility
    relation: string | string[] | Record<string, (query: QueryBuilderContract<unknown>) => void>
  ): this {
    this.ensureOwnState()
    if (typeof relation === 'string') {
      this.eagerLoads.set(relation, () => {
        /* noop */
      })
    } else if (Array.isArray(relation)) {
      for (const rel of relation) {
        this.eagerLoads.set(rel, () => {
          /* noop */
        })
      }
    } else {
      for (const [rel, callback] of Object.entries(relation)) {
        this.eagerLoads.set(rel, callback as any)
      }
    }
    return this
  }

  /**
   * Add a WHERE clause checking for the existence of a relationship
   */
  whereHas(relation: string, callback?: (query: QueryBuilderContract<unknown>) => void): this {
    if (!this.modelClass) {
      throw new Error(
        `whereHas() requires a model context. Ensure you are calling it from User.query().`
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getRelationships } = require('../orm/model/relationships')
    const relations = getRelationships(this.modelClass)
    const meta = relations.get(relation)

    if (!meta) {
      throw new Error(`Relationship '${relation}' not found on model '${this.modelClass.name}'`)
    }

    const Related = meta.related()
    const relatedTable = Related.getTable ? Related.getTable() : Related.table
    const subQuery = Related.query()

    // Resolve keys
    let foreignKey = meta.foreignKey
    let localKey = meta.localKey

    if (!foreignKey) {
      foreignKey =
        meta.type === 'belongsTo'
          ? `${relatedTable.replace(/s$/, '')}_id`
          : `${this.tableName.replace(/s$/, '')}_id`
    }
    if (!localKey) {
      localKey = meta.type === 'belongsTo' ? Related.primaryKey : 'id'
    }

    // Link subquery to parent: EXISTS (SELECT 1 FROM related WHERE related.fk = parent.pk)
    if (meta.type === 'belongsTo') {
      // For BelongsTo, the FK is on OUR table
      subQuery.whereColumn(`${relatedTable}.${localKey}`, '=', `${this.tableName}.${foreignKey}`)
    } else {
      // For HasMany/HasOne, the FK is on THEIR table
      subQuery.whereColumn(`${relatedTable}.${foreignKey}`, '=', `${this.tableName}.${localKey}`)
    }

    if (callback) {
      callback(subQuery)
    }

    // Use whereRaw with EXISTS
    this.whereClause.addRaw(`EXISTS (${subQuery.selectRaw('1').toSql()})`, subQuery.getBindings())
    return this
  }

  /**
   * Get the map of relationships to be eager loaded
   * @internal
   */
  getEagerLoads(): Map<string, (query: QueryBuilderContract<any>) => void> {
    return this.eagerLoads
  }

  // ============================================================================
  // SOFT DELETES
  // ============================================================================

  /**
   * Include soft-deleted records in the query results
   */
  withTrashed(): this {
    return this.withoutGlobalScope('softDeletes')
  }

  /**
   * Filter the query to only include soft-deleted records
   */
  onlyTrashed(): this {
    this.withTrashed()
    this.whereNotNull('deleted_at')
    return this
  }

  /**
   * Restore soft-deleted records matching the query
   */
  async restore(): Promise<number> {
    return this.withTrashed().update({ deleted_at: null } as never)
  }

  /**
   * Physically delete records matching the query (bypassing soft deletes)
   */
  async forceDelete(): Promise<number> {
    return this.withTrashed().delete()
  }

  // ============================================================================
  // INCREMENT/DECREMENT Methods
  // ============================================================================

  /**
   * Increment a column's value
   */
  async increment(column: string, amount = 1, extra: Partial<T> = {}): Promise<number> {
    const data = {
      ...extra,
      [column]: new Expression(`${this.grammar.wrapColumn(column)} + ${amount}`),
    } as Partial<T>
    return this.update(data)
  }

  /**
   * Decrement a column's value
   */
  async decrement(column: string, amount = 1, extra: Partial<T> = {}): Promise<number> {
    const data = {
      ...extra,
      [column]: new Expression(`${this.grammar.wrapColumn(column)} - ${amount}`),
    } as Partial<T>
    return this.update(data)
  }

  // ============================================================================
  // UPSERT Method
  // ============================================================================

  /**
   * Insert or update records (UPSERT)
   */
  async upsert(
    data: Partial<T> | Partial<T>[],
    uniqueBy: string | string[],
    update?: string[]
  ): Promise<number> {
    const values = (Array.isArray(data) ? data : [data]) as Record<string, unknown>[]
    if (values.length === 0) {
      return 0
    }

    const uniqueByArray = Array.isArray(uniqueBy) ? uniqueBy : [uniqueBy]
    const updateArray = update || Object.keys(values[0]).filter((k) => !uniqueByArray.includes(k))

    const allBindings: unknown[] = []
    for (const row of values) {
      allBindings.push(...Object.values(row))
    }

    const sql = this.grammar.compileUpsert(
      this.getCompiledQuery(),
      values,
      uniqueByArray,
      updateArray
    )
    const result = await this.connection.getDriver().execute(sql, allBindings)

    return result.affectedRows
  }

  // ============================================================================
  // PAGINATION Method
  // ============================================================================

  /**
   * Alias for paginate()
   */
  async simplePaginate(perPage = 15, page = 1, primaryKey = 'id'): Promise<PaginateResult<T>> {
    return this.paginate(perPage, page, primaryKey)
  }

  /**
   * Chunk the results of the query and execute a callback for each chunk
   */
  async chunk(
    size: number,
    callback: (results: T[]) => Promise<undefined | boolean>
  ): Promise<void> {
    let page = 1
    let count: number

    do {
      const results = await this.clone().paginate(size, page)
      count = results.data.length

      if (count === 0) {
        break
      }

      const result = await callback(results.data)

      if (result === false) {
        break
      }

      page++
    } while (count === size)
  }

  /**
   * Paginate the query results
   */
  async paginate(perPage = 15, page = 1, primaryKey = 'id'): Promise<PaginateResult<T>> {
    this.ensureDeterministicOrder(primaryKey)

    const total = await this.clone().count()

    const data = await this.limit(perPage)
      .offset((page - 1) * perPage)
      .get()

    const totalPages = Math.ceil(total / perPage)

    return {
      data,
      pagination: {
        page,
        perPage,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  }

  /**
   * Ensure deterministic ordering for stable pagination
   */
  ensureDeterministicOrder(primaryKey = 'id'): this {
    const hasIdOrder = this.orderByClause.getOrders().some((order) => order.column === primaryKey)

    if (!hasIdOrder) {
      this.ensureOwnState()
      this.orderByClause.orderBy(primaryKey, 'asc')
    }

    return this
  }

  // ============================================================================
  // CLONING Method
  // ============================================================================

  /**
   * Set the query to read-only mode
   */
  readonly(value = true): this {
    this.ensureOwnState()
    this.isReadOnly = value
    return this
  }

  /**
   * Check if the query is in read-only mode
   * @internal
   */
  getIsReadOnly(): boolean {
    return this.isReadOnly
  }

  /**
   * Create an independent clone of the current QueryBuilder instance
   */
  clone(): QueryBuilderContract<T> {
    const cloned = new QueryBuilder<T>(this.connection, this.grammar, this.tableName)

    // Copy-on-write optimization: share array references initially
    cloned.selectClause = this.selectClause
    cloned.whereClause = this.whereClause
    cloned.joinManager = this.joinManager
    cloned.groupByClause = this.groupByClause
    cloned.havingClause = this.havingClause
    cloned.orderByClause = this.orderByClause
    cloned.limitClause = this.limitClause

    cloned.modelClass = this.modelClass
    cloned.isReadOnly = this.isReadOnly
    cloned.eagerLoads = new Map(this.eagerLoads)
    cloned._cache = this._cache

    cloned.globalScopes = new Map(this.globalScopes)
    cloned.removedScopes = new Set(this.removedScopes)

    cloned._isClone = true
    this._cloneCount++

    return cloned
  }

  // ============================================================================
  // INTERNAL/ADVANCED
  // ============================================================================

  /**
   * Get the compiled query structure
   */
  getCompiledQuery(): CompiledQuery {
    // Apply global scopes before compilation
    // We clone first to avoid modifying the original query instance
    // unless we are already applying scopes
    if (this._isApplyingScopes) {
      return this.getRawCompiledQuery()
    }

    const query = this.clone() as QueryBuilder<T>
    query.applyGlobalScopes()
    return query.getRawCompiledQuery()
  }

  /**
   * Get the raw compiled query without applying scopes again
   * @internal
   */
  protected getRawCompiledQuery(): CompiledQuery {
    const selectBindings = this.selectClause.getBindings()
    const whereBindings = this.whereClause.getValues()
    const havingBindings = this.havingClause.getBindings()
    const orderBindings = this.orderByClause.getBindings()

    return {
      table: this.tableName,
      columns: this.selectClause.getColumns(),
      distinct: this.selectClause.isDistinct(),
      wheres: this.whereClause.getWheres(),
      orders: this.orderByClause.getOrders(),
      groups: this.groupByClause.getGroups(),
      havings: this.havingClause.getHavings(),
      joins: this.joinManager.getJoins(),
      limit: this.limitClause.getLimit(),
      offset: this.limitClause.getOffset(),
      bindings: [...selectBindings, ...whereBindings, ...havingBindings, ...orderBindings],
      bindingCounts: {
        select: selectBindings.length,
        where: whereBindings.length,
        join: 0, // JoinManager currently doesn't support bindings
        having: havingBindings.length,
        order: orderBindings.length,
      },
    }
  }

  /**
   * Apply all global scopes to the query
   * @internal
   */
  protected applyGlobalScopes(): void {
    if (this._isApplyingScopes) {
      return
    }

    this._isApplyingScopes = true

    for (const [name, scope] of this.globalScopes) {
      if (!this.removedScopes.has(name)) {
        scope(this)
      }
    }

    this._isApplyingScopes = false
  }

  /**
   * Get all bindings from clauses in SQL order
   */
  getBindings(): unknown[] {
    return [
      ...this.selectClause.getBindings(),
      ...this.whereClause.getValues(),
      ...this.havingClause.getBindings(),
      ...this.orderByClause.getBindings(),
    ]
  }

  /**
   * Check if the query has a limit or offset
   */
  hasLimitOrOffset(): boolean {
    return this.limitClause.hasLimit() || this.limitClause.hasOffset()
  }

  /**
   * Dump the query SQL and bindings
   */
  toSql(): string {
    return this.grammar.compileSelect(this.getCompiledQuery())
  }

  /**
   * Log the current SQL and bindings to the console
   */
  dump(): this {
    console.log('SQL:', this.toSql())
    console.log('Bindings:', this.getBindings())
    return this
  }

  /**
   * Log the current SQL and bindings, then terminate the process
   */
  dd(): never {
    this.dump()
    process.exit(1)
  }

  applyScope(name: string, callback: (query: QueryBuilderContract<T>) => void): this {
    this.ensureOwnState()
    // Cast to any because Map value type mismatch (unknown vs any in previous edits)
    this.globalScopes.set(name, callback as any)
    return this
  }

  withoutGlobalScope(name: string): this {
    this.ensureOwnState()
    this.removedScopes.add(name)
    return this
  }

  /**
   * Helper to calculate optimal chunk size based on data volume
   * @internal
   */
  private calculateOptimalChunkSize(values: Partial<T>[]): number {
    const MAX_BINDINGS = 65000
    const columnsCount = Object.keys(values[0] || {}).length || 1

    const safeChunkSize = Math.floor(MAX_BINDINGS / columnsCount)

    return Math.min(safeChunkSize, 1000)
  }
}
