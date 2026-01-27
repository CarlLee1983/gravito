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
  HavingClause,
  JoinClause,
  JoinType,
  Operator,
  OrderClause,
  OrderDirection,
  PaginateResult,
  QueryBuilderContract,
  WhereClause,
} from '../types'
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
  /** Array of columns to select */
  protected columns: string[] = ['*']
  /** Whether to apply the DISTINCT keyword */
  protected distinctValue = false
  /** Array of WHERE clauses */
  protected wheres: WhereClause[] = []
  /** Array of ORDER BY clauses */
  protected orders: OrderClause[] = []
  /** Array of GROUP BY columns */
  protected groups: string[] = []
  /** Array of HAVING clauses */
  protected havings: HavingClause[] = []
  /** Array of JOIN clauses */
  protected joins: JoinClause[] = []
  /** Maximum number of records to return */
  protected limitValue: number | undefined = undefined
  /** Number of records to skip */
  protected offsetValue: number | undefined = undefined
  /** List of query bindings */
  protected bindingsList: unknown[] = []
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
   *
   * @internal
   */
  protected ensureOwnState(): void {
    if (this._isClone && !this._isModified) {
      // First access/modification - perform actual copy of shared arrays
      // This ensures the clone has its own independent state
      this.columns = [...this.columns]
      this.wheres = [...this.wheres]
      this.orders = [...this.orders]
      this.groups = [...this.groups]
      this.havings = [...this.havings]
      this.joins = [...this.joins]
      this.bindingsList = [...this.bindingsList]
      // Note: Maps and Sets are already copied in clone() since they're mutable
      // and shared references would cause issues even for read-only operations

      // Mark as modified so we don't copy again
      this._isModified = true
      // Clear clone flag since we now have our own state
      this._isClone = false
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

  // ============================================================================
  // SELECT Methods
  // ============================================================================

  /**
   * Set the columns to be retrieved by the query.
   *
   * @param columns - List of column names or raw expressions.
   * @returns The current QueryBuilder instance for chaining.
   * @example
   * ```typescript
   * query.select('id', 'name', 'email')
   * ```
   */
  select(...columns: string[]): this {
    this.ensureOwnState()
    this.columns = columns.length > 0 ? columns : ['*']
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
   * @example
   * ```typescript
   * query.selectRaw('COUNT(*) as total')
   * ```
   */
  selectRaw(sql: string | Expression, bindings: unknown[] = []): this {
    this.ensureOwnState()
    if (sql instanceof Expression) {
      this.columns.push(sql.getValue())
      this.bindingsList.push(...sql.getBindings())
    } else {
      this.columns.push(new Expression(sql, bindings).getValue())
      this.bindingsList.push(...bindings)
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
    this.distinctValue = true
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
   * @example
   * ```typescript
   * query.where('id', 1)
   * query.where('age', '>', 18)
   * query.where({ status: 'active', type: 'user' })
   * query.where(q => q.where('id', 1).orWhere('id', 2))
   * ```
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

    this.wheres.push({
      type: 'basic',
      column,
      operator,
      value: finalValue,
      boolean: 'and',
    })
    this.bindingsList.push(finalValue)

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

    this.wheres.push({
      type: 'basic',
      column,
      operator,
      value: finalValue,
      boolean: 'or',
    })
    this.bindingsList.push(finalValue)

    return this
  }

  /**
   * Add a WHERE IN clause to the query.
   *
   * @param column - Column name.
   * @param values - Array of values to match.
   * @returns The current QueryBuilder instance for chaining.
   */
  whereIn(column: string, values: unknown[]): this {
    this.ensureOwnState()
    this.wheres.push({
      type: 'in',
      column,
      values,
      boolean: 'and',
      not: false,
    })
    this.bindingsList.push(...values)
    return this
  }

  /**
   * Add a WHERE NOT IN clause to the query.
   *
   * @param column - Column name.
   * @param values - Array of values to exclude.
   * @returns The current QueryBuilder instance for chaining.
   */
  whereNotIn(column: string, values: unknown[]): this {
    this.ensureOwnState()
    this.wheres.push({
      type: 'in',
      column,
      values,
      boolean: 'and',
      not: true,
    })
    this.bindingsList.push(...values)
    return this
  }

  /**
   * Add an OR WHERE IN clause to the query.
   *
   * @param column - Column name.
   * @param values - Array of values to match.
   * @returns The current QueryBuilder instance for chaining.
   */
  orWhereIn(column: string, values: unknown[]): this {
    this.ensureOwnState()
    this.wheres.push({
      type: 'in',
      column,
      values,
      boolean: 'or',
      not: false,
    })
    this.bindingsList.push(...values)
    return this
  }

  /**
   * Add an OR WHERE NOT IN clause to the query.
   *
   * @param column - Column name.
   * @param values - Array of values to exclude.
   * @returns The current QueryBuilder instance for chaining.
   */
  orWhereNotIn(column: string, values: unknown[]): this {
    this.ensureOwnState()
    this.wheres.push({
      type: 'in',
      column,
      values,
      boolean: 'or',
      not: true,
    })
    this.bindingsList.push(...values)
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
    this.wheres.push({
      type: 'null',
      column,
      boolean: 'and',
      not: false,
    })
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
    this.wheres.push({
      type: 'null',
      column,
      boolean: 'and',
      not: true,
    })
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
    this.wheres.push({
      type: 'null',
      column,
      boolean: 'or',
      not: false,
    })
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
    this.wheres.push({
      type: 'null',
      column,
      boolean: 'or',
      not: true,
    })
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
    this.wheres.push({
      type: 'between',
      column,
      values,
      boolean: 'and',
      not: false,
    })
    this.bindingsList.push(...values)
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
    this.wheres.push({
      type: 'between',
      column,
      values,
      boolean: 'and',
      not: true,
    })
    this.bindingsList.push(...values)
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
      this.wheres.push({
        type: 'raw',
        sql: sql.getValue(),
        bindings: sql.getBindings(),
        boolean: 'and',
      })
      this.bindingsList.push(...sql.getBindings())
    } else {
      this.wheres.push({
        type: 'raw',
        sql,
        bindings,
        boolean: 'and',
      })
      this.bindingsList.push(...bindings)
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
      this.wheres.push({
        type: 'raw',
        sql: sql.getValue(),
        bindings: sql.getBindings(),
        boolean: 'or',
      })
      this.bindingsList.push(...sql.getBindings())
    } else {
      this.wheres.push({
        type: 'raw',
        sql,
        bindings,
        boolean: 'or',
      })
      this.bindingsList.push(...bindings)
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
    this.wheres.push({
      type: 'column',
      operator,
      values: [first, second],
      boolean: 'and',
    })
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
   * @example
   * ```typescript
   * query.whereJson('settings->theme', 'dark')
   * ```
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

    if (nestedQuery.wheres.length > 0) {
      // Compile the nested wheres
      const compiled = nestedQuery.getCompiledQuery()
      const nestedSql = this.grammar
        .compileSelect(compiled)
        .replace(/^SELECT \* FROM .+ WHERE /, '')

      this.wheres.push({
        type: 'nested',
        sql: nestedSql,
        bindings: nestedQuery.bindingsList,
        boolean,
      })
      this.bindingsList.push(...nestedQuery.bindingsList)
    }

    return this
  }

  // ============================================================================
  // JOIN Methods
  // ============================================================================

  /**
   * Add an INNER JOIN to the query.
   *
   * @param table - Table to join.
   * @param first - First column for the ON condition.
   * @param operator - Join operator.
   * @param second - Second column for the ON condition.
   * @returns The current QueryBuilder instance for chaining.
   */
  join(table: string, first: string, operator: string, second: string): this {
    return this.addJoin('inner', table, first, operator, second)
  }

  /**
   * Add a LEFT JOIN to the query.
   *
   * @param table - Table to join.
   * @param first - First column for the ON condition.
   * @param operator - Join operator.
   * @param second - Second column for the ON condition.
   * @returns The current QueryBuilder instance for chaining.
   */
  leftJoin(table: string, first: string, operator: string, second: string): this {
    return this.addJoin('left', table, first, operator, second)
  }

  /**
   * Add a RIGHT JOIN to the query.
   *
   * @param table - Table to join.
   * @param first - First column for the ON condition.
   * @param operator - Join operator.
   * @param second - Second column for the ON condition.
   * @returns The current QueryBuilder instance for chaining.
   */
  rightJoin(table: string, first: string, operator: string, second: string): this {
    return this.addJoin('right', table, first, operator, second)
  }

  /**
   * Add a CROSS JOIN to the query.
   *
   * @param table - Table to join.
   * @returns The current QueryBuilder instance for chaining.
   */
  crossJoin(table: string): this {
    this.joins.push({
      type: 'cross',
      table,
      first: '',
      operator: '',
      second: '',
    })
    return this
  }

  /**
   * Internal helper to add a JOIN clause
   *
   * @param type - Join type
   * @param table - Table to join
   * @param first - First column
   * @param operator - Join operator
   * @param second - Second column
   * @returns The current QueryBuilder instance
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
    this.joins.push({ type, table, first, operator, second })
    return this
  }

  // ============================================================================
  // GROUP BY & HAVING Methods
  // ============================================================================

  /**
   * Add GROUP BY columns to the query
   *
   * @param columns - List of column names
   * @returns The current QueryBuilder instance
   */
  groupBy(...columns: string[]): this {
    this.ensureOwnState()
    this.groups.push(...columns)
    return this
  }

  /**
   * Add a HAVING clause to the query
   *
   * @param column - Column name
   * @param operator - Comparison operator
   * @param value - Value to compare against
   * @returns The current QueryBuilder instance
   */
  having(column: string, operator: Operator, value: unknown): this {
    this.ensureOwnState()
    this.havings.push({
      type: 'basic',
      column,
      operator,
      value,
      boolean: 'and',
    })
    this.bindingsList.push(value)
    return this
  }

  /**
   * Add a raw HAVING clause to the query
   *
   * @param sql - Raw SQL string or Expression instance
   * @param bindings - Optional array of bindings
   * @returns The current QueryBuilder instance
   */
  havingRaw(sql: string | Expression, bindings: unknown[] = []): this {
    this.ensureOwnState()
    if (sql instanceof Expression) {
      this.havings.push({
        type: 'raw',
        sql: sql.getValue(),
        bindings: sql.getBindings(),
        boolean: 'and',
      })
      this.bindingsList.push(...sql.getBindings())
    } else {
      this.havings.push({
        type: 'raw',
        sql,
        bindings,
        boolean: 'and',
      })
      this.bindingsList.push(...bindings)
    }
    return this
  }

  // ============================================================================
  // ORDER BY Methods
  // ============================================================================

  /**
   * Add an ORDER BY clause to the query
   *
   * @param column - Column name
   * @param direction - Sort direction ('asc' or 'desc')
   * @returns The current QueryBuilder instance
   */
  orderBy(column: string, direction: OrderDirection = 'asc'): this {
    this.ensureOwnState()
    this.orders.push({ column, direction })
    return this
  }

  /**
   * Add an ORDER BY DESC clause to the query
   *
   * @param column - Column name
   * @returns The current QueryBuilder instance
   */
  orderByDesc(column: string): this {
    return this.orderBy(column, 'desc')
  }

  /**
   * Add a raw ORDER BY clause to the query
   *
   * @param sql - Raw SQL string or Expression instance
   * @param bindings - Optional array of bindings
   * @returns The current QueryBuilder instance
   */
  orderByRaw(sql: string | Expression, bindings: unknown[] = []): this {
    this.ensureOwnState()
    if (sql instanceof Expression) {
      this.orders.push({ column: sql.getValue(), direction: 'asc' })
      this.bindingsList.push(...sql.getBindings())
    } else {
      this.orders.push({ column: new Expression(sql, bindings).getValue(), direction: 'asc' })
      this.bindingsList.push(...bindings)
    }
    return this
  }

  /**
   * Order the results by the latest records (created_at DESC)
   *
   * @param column - Column name to use for ordering
   * @returns The current QueryBuilder instance
   */
  latest(column = 'created_at'): this {
    return this.orderBy(column, 'desc')
  }

  /**
   * Order the results by the oldest records (created_at ASC)
   *
   * @param column - Column name to use for ordering
   * @returns The current QueryBuilder instance
   */
  oldest(column = 'created_at'): this {
    return this.orderBy(column, 'asc')
  }

  // ============================================================================
  // LIMIT & OFFSET Methods
  // ============================================================================

  /**
   * Set the maximum number of records to return
   *
   * @param value - Limit value
   * @returns The current QueryBuilder instance
   */
  limit(value: number): this {
    this.ensureOwnState()
    this.limitValue = value
    return this
  }

  /**
   * Set the number of records to skip
   *
   * @param value - Offset value
   * @returns The current QueryBuilder instance
   */
  offset(value: number): this {
    this.ensureOwnState()
    this.offsetValue = value
    return this
  }

  /**
   * Alias for offset()
   *
   * @param value - Number of records to skip
   * @returns The current QueryBuilder instance
   */
  skip(value: number): this {
    return this.offset(value)
  }

  /**
   * Alias for limit()
   *
   * @param value - Maximum number of records
   * @returns The current QueryBuilder instance
   */
  take(value: number): this {
    return this.limit(value)
  }

  // ============================================================================
  // READ Execution Methods
  // ============================================================================

  /**
   * Execute the query using a prepared statement
   * Useful for repeated queries with different bindings
   *
   * @returns Promise resolving to an array of results
   */
  async getPrepared(): Promise<T[]> {
    const sql = this.grammar.compileSelect(this.getCompiledQuery())
    const driver = this.connection.getDriver()

    if (
      typeof (driver as any).prepare === 'function' &&
      typeof (driver as any).executePrepared === 'function'
    ) {
      const stmtName = await (driver as any).prepare(sql)
      const result = await (driver as any).executePrepared(stmtName, this.bindingsList)
      return result.rows as T[]
    }

    // Fallback to normal execution
    return this.get()
  }

  /**
   * Execute the query and retrieve all matching records.
   *
   * @returns Promise resolving to an array of results.
   */
  async get(): Promise<T[]> {
    const sql = this.grammar.compileSelect(this.getCompiledQuery())

    // Check cache
    const cache = DB.getCache()
    let cacheKey: string | undefined

    if (cache && this._cache) {
      cacheKey = this._cache.key ?? `orbit:query:${sql}:${JSON.stringify(this.bindingsList)}`
      const cached = await cache.get<T[]>(cacheKey)
      if (cached) {
        return cached
      }
    }

    const result = await this.connection.raw<T>(sql, this.bindingsList)

    // Store cache
    if (cache && this._cache && cacheKey) {
      await cache.set(cacheKey, result.rows, this._cache.ttl)
    }

    return result.rows
  }

  /**
   * Retrieve the first record matching the query.
   *
   * @returns Promise resolving to the first result or null if none found.
   */
  async first(): Promise<T | null> {
    this.limit(1)
    const results = await this.get()
    return results[0] ?? null
  }

  /**
   * Retrieve the first record matching the query or throw an error.
   *
   * @returns Promise resolving to the first result.
   * @throws RecordNotFoundError if no record matches the query.
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
   *
   * @param id - The primary key value to search for.
   * @param primaryKey - The name of the primary key column (defaults to 'id').
   * @returns Promise resolving to the record or null.
   */
  async find(id: unknown, primaryKey = 'id'): Promise<T | null> {
    return this.where(primaryKey, '=', id).first()
  }

  /**
   * Find a record by its primary key or throw an error.
   *
   * @param id - The primary key value.
   * @param primaryKey - The name of the primary key column.
   * @returns Promise resolving to the record.
   * @throws RecordNotFoundError if no record is found.
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
   *
   * @template V - The type of the value
   * @param column - Column name
   * @returns Promise resolving to the value or null
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
   *
   * @template V - The type of the values
   * @param column - Column name
   * @returns Promise resolving to an array of values
   */
  async pluck<V = unknown>(column: string): Promise<V[]> {
    const results = await this.select(column).get()
    return results.map((row) => (row as Record<string, unknown>)[column] as V)
  }

  /**
   * Check if any records exist matching the query
   *
   * @returns Promise resolving to true if records exist
   */
  async exists(): Promise<boolean> {
    const sql = this.grammar.compileExists(this.getCompiledQuery())
    const result = await this.connection.raw<{ exists: boolean }>(sql, this.bindingsList)
    return result.rows[0]?.exists ?? false
  }

  /**
   * Check if no records exist matching the query
   *
   * @returns Promise resolving to true if no records exist
   */
  async doesntExist(): Promise<boolean> {
    return !(await this.exists())
  }

  // ============================================================================
  // AGGREGATE Execution Methods
  // ============================================================================

  /**
   * Get the count of records matching the query
   *
   * @param column - Column to count (defaults to '*')
   * @returns Promise resolving to the count
   */
  async count(column = '*'): Promise<number> {
    const result = await this.aggregate('count', column)
    return result ?? 0
  }

  /**
   * Get the maximum value of a column
   *
   * @template V - The type of the value
   * @param column - Column name
   * @returns Promise resolving to the maximum value or null
   */
  async max<V = number>(column: string): Promise<V | null> {
    return this.aggregate('max', column) as Promise<V | null>
  }

  /**
   * Get the minimum value of a column
   *
   * @template V - The type of the value
   * @param column - Column name
   * @returns Promise resolving to the minimum value or null
   */
  async min<V = number>(column: string): Promise<V | null> {
    return this.aggregate('min', column) as Promise<V | null>
  }

  /**
   * Get the average value of a column
   *
   * @param column - Column name
   * @returns Promise resolving to the average value or null
   */
  async avg(column: string): Promise<number | null> {
    return this.aggregate('avg', column)
  }

  /**
   * Get the sum of values in a column
   *
   * @param column - Column name
   * @returns Promise resolving to the sum
   */
  async sum(column: string): Promise<number> {
    return (await this.aggregate('sum', column)) ?? 0
  }

  /**
   * Internal helper to execute an aggregate function
   *
   * @param func - Aggregate function name (e.g., 'count', 'sum')
   * @param column - Column name
   * @returns Promise resolving to the aggregate value or null
   * @internal
   */
  protected async aggregate(func: string, column: string): Promise<number | null> {
    const sql = this.grammar.compileAggregate(this.getCompiledQuery(), { function: func, column })
    const result = await this.connection.raw<{ aggregate: number | null }>(sql, this.bindingsList)
    const value = result.rows[0]?.aggregate
    return value === null || value === undefined ? null : Number(value)
  }

  // ============================================================================
  // WRITE Execution Methods
  // ============================================================================

  /**
   * Insert one or more records into the database.
   *
   * @param data - A single record object or an array of record objects.
   * @returns Promise resolving to the inserted records (including generated IDs if supported).
   */
  async insert(data: Partial<T> | Partial<T>[]): Promise<T[]> {
    const values = Array.isArray(data) ? data : [data]
    if (values.length === 0) {
      return []
    }

    // Determine chunk size based on driver or default to 1000
    // To be perfectly safe, we use a conservative 1000 to avoid parameter limits (e.g. 65535 in some DBs)
    const chunkSize = 1000
    const results: T[] = []

    if (values.length > chunkSize) {
      // Run in a transaction if we are doing multiple chunks to ensure atomicity
      return await this.connection.transaction(async (trx) => {
        for (let i = 0; i < values.length; i += chunkSize) {
          const chunk = values.slice(i, i + chunkSize)
          const chunkResult = await trx.table<T>(this.tableName).insert(chunk)
          results.push(...chunkResult)
        }
        return results
      })
    }

    // Original single-batch logic
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
   *
   * @param data - The record object to insert.
   * @param primaryKey - The name of the primary key column.
   * @returns Promise resolving to the generated ID.
   * @throws QueryBuilderError if the ID could not be retrieved.
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
   *
   * @param data - Object containing column-value pairs to update.
   * @returns Promise resolving to the number of affected rows.
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

    const allBindings = [...values, ...this.bindingsList]

    const compiled = this.getCompiledQuery()
    compiled.bindings = allBindings

    const sql = this.grammar.compileUpdate(compiled, data as Record<string, unknown>)
    const result = await this.connection.getDriver().execute(sql, allBindings)
    return result.affectedRows
  }

  /**
   * Partially update a JSON column
   *
   * @param column - JSON column path
   * @param value - New value for the path
   * @returns Promise resolving to the number of affected rows
   */
  async updateJson(column: string, value: unknown): Promise<number> {
    const sql = this.grammar.compileUpdateJson(this.getCompiledQuery(), column, value)
    // For JSON updates, the value is often embedded in SQL or passed as a single binding
    const result = await this.connection.getDriver().execute(sql, [value, ...this.bindingsList])
    return result.affectedRows
  }

  /**
   * Delete records matching the query
   *
   * @returns Promise resolving to the number of affected rows
   */
  async delete(): Promise<number> {
    const sql = this.grammar.compileDelete(this.getCompiledQuery())
    const result = await this.connection.getDriver().execute(sql, this.bindingsList)
    return result.affectedRows
  }

  /**
   * Truncate the table (remove all records and reset auto-increment)
   *
   * @returns Promise resolving when finished
   */
  async truncate(): Promise<void> {
    const sql = this.grammar.compileTruncate(this.getCompiledQuery())
    await this.connection.getDriver().execute(sql)
  }

  // ============================================================================
  // INCREMENT/DECREMENT Methods
  // ============================================================================

  /**
   * Increment a column's value
   *
   * @param column - Column name
   * @param amount - Amount to increment by (defaults to 1)
   * @param extra - Optional additional columns to update
   * @returns Promise resolving to the number of affected rows
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
   *
   * @param column - Column name
   * @param amount - Amount to decrement by (defaults to 1)
   * @param extra - Optional additional columns to update
   * @returns Promise resolving to the number of affected rows
   */
  async decrement(column: string, amount = 1, extra: Partial<T> = {}): Promise<number> {
    const data = {
      ...extra,
      [column]: new Expression(`${this.grammar.wrapColumn(column)} - ${amount}`),
    } as Partial<T>
    return this.update(data)
  }

  /**
   * Specify relationships to be eager loaded with the query results
   *
   * @param relation - Relationship name, array of names, or object with callbacks
   * @returns The current QueryBuilder instance
   * @example
   * ```typescript
   * query.with('posts', 'profile')
   * query.with({ posts: q => q.where('active', true) })
   * ```
   */
  with(
    // biome-ignore lint/suspicious/noExplicitAny: Eager loads need any for flexibility
    relation: string | string[] | Record<string, (query: QueryBuilderContract<any>) => void>
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
        this.eagerLoads.set(rel, callback)
      }
    }
    return this
  }

  /**
   * Add a WHERE clause checking for the existence of a relationship
   *
   * @param relation - Relationship name
   * @param callback - Optional callback to further filter the related records
   * @returns The current QueryBuilder instance
   * @throws Error if called without a model context or relationship not found
   */
  whereHas(relation: string, callback?: (query: QueryBuilderContract<any>) => void): this {
    if (!this.modelClass) {
      throw new Error(
        `whereHas() requires a model context. Ensure you are calling it from User.query().`
      )
    }

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

    return this.whereRaw(`EXISTS (${subQuery.selectRaw('1').toSql()})`, subQuery.getBindings())
  }

  /**
   * Get the map of relationships to be eager loaded
   *
   * @returns Map of relationship names to callbacks
   * @internal
   */
  // biome-ignore lint/suspicious/noExplicitAny: Eager loads need any for flexibility
  getEagerLoads(): Map<string, (query: QueryBuilderContract<any>) => void> {
    return this.eagerLoads
  }

  // ============================================================================
  // SOFT DELETES
  // ============================================================================

  /**
   * Include soft-deleted records in the query results
   *
   * @returns The current QueryBuilder instance
   */
  withTrashed(): this {
    return this.withoutGlobalScope('softDeletes')
  }

  /**
   * Filter the query to only include soft-deleted records
   *
   * @returns The current QueryBuilder instance
   */
  onlyTrashed(): this {
    this.withTrashed()
    this.whereNotNull('deleted_at')
    return this
  }

  /**
   * Restore soft-deleted records matching the query
   *
   * @returns Promise resolving to the number of restored rows
   */
  async restore(): Promise<number> {
    return this.withTrashed().update({ deleted_at: null } as never)
  }

  /**
   * Physically delete records matching the query (bypassing soft deletes)
   *
   * @returns Promise resolving to the number of affected rows
   */
  async forceDelete(): Promise<number> {
    return this.withTrashed().delete()
  }

  // ============================================================================
  // UPSERT Method
  // ============================================================================

  /**
   * Insert or update records (UPSERT)
   *
   * @param data - Record or array of records
   * @param _uniqueBy - Columns that define uniqueness
   * @param _update - Columns to update on conflict
   * @returns Promise resolving to the number of affected rows
   */
  async upsert(
    data: Partial<T> | Partial<T>[],
    _uniqueBy: string | string[],
    _update?: string[]
  ): Promise<number> {
    // This is a simplified implementation
    // Full implementation would use database-specific UPSERT syntax
    const values = Array.isArray(data) ? data : [data]
    const result = await this.insert(values)
    return result.length
  }

  // ============================================================================
  // PAGINATION Method
  // ============================================================================

  /**
   * Alias for paginate()
   *
   * @param perPage - Records per page
   * @param page - Current page number
   * @param primaryKey - Primary key for deterministic ordering
   * @returns Promise resolving to pagination results
   */
  async simplePaginate(perPage = 15, page = 1, primaryKey = 'id'): Promise<PaginateResult<T>> {
    return this.paginate(perPage, page, primaryKey)
  }

  /**
   * Chunk the results of the query and execute a callback for each chunk
   *
   * @param size - Number of records per chunk
   * @param callback - Callback receiving the chunk results
   * @returns Promise resolving when all chunks are processed
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
   *
   * @param perPage - Records per page (defaults to 15)
   * @param page - Current page number (defaults to 1)
   * @param primaryKey - Primary key for deterministic ordering
   * @returns Promise resolving to pagination results including data and metadata
   */
  async paginate(perPage = 15, page = 1, primaryKey = 'id'): Promise<PaginateResult<T>> {
    // Ensure deterministic ordering for stable pagination
    this.ensureDeterministicOrder(primaryKey)

    // Get total count
    const total = await this.clone().count()

    // Get paginated data
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
   * Appends primary key to ORDER BY if not already present
   *
   * This prevents row duplication/skipping when paginating on non-unique columns
   * @param primaryKey - The primary key column name
   * @returns The current QueryBuilder instance
   * @example Without deterministic order: ORDER BY created_at (rows may shift)
   * @example With deterministic order: ORDER BY created_at, id (stable pagination)
   */
  ensureDeterministicOrder(primaryKey = 'id'): this {
    // Check if primary key is already in the ORDER BY
    const hasIdOrder = this.orders.some((order) => order.column === primaryKey)

    if (!hasIdOrder) {
      this.ensureOwnState()
      // Append primary key as tie-breaker
      this.orders.push({ column: primaryKey, direction: 'asc' })
    }

    return this
  }

  // ============================================================================
  // DEBUGGING Methods
  // ============================================================================

  /**
   * Get the compiled SQL string for the current query state
   *
   * @returns The SQL string
   */
  toSql(): string {
    return this.grammar.compileSelect(this.getCompiledQuery())
  }

  /**
   * Get the current query bindings
   *
   * @returns Array of bindings
   */
  getBindings(): unknown[] {
    return [...this.bindingsList]
  }

  /**
   * Log the current SQL and bindings to the console
   *
   * @returns The current QueryBuilder instance
   */
  dump(): this {
    console.log('SQL:', this.toSql())
    console.log('Bindings:', this.getBindings())
    return this
  }

  /**
   * Log the current SQL and bindings, then terminate the process
   *
   * @returns never
   */
  dd(): never {
    this.dump()
    process.exit(1)
  }

  // ============================================================================
  // CLONING Method
  // ============================================================================

  /**
   * Set the query to read-only mode
   *
   * @param value - Whether to enable read-only mode
   * @returns The current QueryBuilder instance
   */
  readonly(value = true): this {
    this.ensureOwnState()
    this.isReadOnly = value
    return this
  }

  /**
   * Check if the query is in read-only mode
   *
   * @returns True if read-only
   * @internal
   */
  getIsReadOnly(): boolean {
    return this.isReadOnly
  }

  /**
   * Create an independent clone of the current QueryBuilder instance
   *
   * @returns A new QueryBuilder instance with the same state
   */
  clone(): QueryBuilderContract<T> {
    const cloned = new QueryBuilder<T>(this.connection, this.grammar, this.tableName)

    // Copy arrays immediately to ensure independence
    // This prevents issues when the original query is modified after cloning
    cloned.columns = [...this.columns]
    cloned.wheres = [...this.wheres]
    cloned.orders = [...this.orders]
    cloned.groups = [...this.groups]
    cloned.havings = [...this.havings]
    cloned.joins = [...this.joins]
    cloned.bindingsList = [...this.bindingsList]

    // Copy primitive values (these are immutable)
    cloned.distinctValue = this.distinctValue
    cloned.limitValue = this.limitValue
    cloned.offsetValue = this.offsetValue
    cloned.isReadOnly = this.isReadOnly

    // Maps and Sets must be copied (they're mutable)
    cloned.globalScopes = new Map(this.globalScopes)
    cloned.removedScopes = new Set(this.removedScopes)
    cloned.eagerLoads = new Map(this.eagerLoads)

    // Reference types (shared is safe, they're not mutated directly)
    cloned.modelClass = this.modelClass
    cloned._cache = this._cache

    // Not a clone anymore since we copied immediately
    cloned._isClone = false
    cloned._isModified = false

    return cloned
  }

  /**
   * Apply a global scope to the query
   *
   * @param name - Unique name for the scope
   * @param callback - Callback receiving the QueryBuilder instance
   * @returns The current QueryBuilder instance
   */
  applyScope(name: string, callback: (query: QueryBuilderContract<T>) => void): this {
    this.ensureOwnState()
    this.globalScopes.set(name, callback)
    return this
  }

  /**
   * Explicitly remove a global scope from the query
   *
   * @param name - Name of the scope to remove
   * @returns The current QueryBuilder instance
   */
  withoutGlobalScope(name: string): this {
    this.ensureOwnState()
    this.removedScopes.add(name)
    return this
  }

  /**
   * Apply all registered global scopes to the query
   *
   * @internal
   */
  protected applyGlobalScopes(): void {
    if (this._isApplyingScopes) {
      return
    }

    // Ensure we have our own state before applying scopes
    // Scopes may modify the query (e.g., add where clauses)
    this.ensureOwnState()

    this._isApplyingScopes = true

    for (const [name, callback] of this.globalScopes) {
      if (!this.removedScopes.has(name)) {
        callback(this as unknown as QueryBuilderContract<T>)
      }
    }

    this._isApplyingScopes = false
  }

  // ============================================================================
  // INTERNAL Methods
  // ============================================================================

  /**
   * Get the compiled query structure for the SQL grammar
   *
   * @returns CompiledQuery object
   * @internal
   */
  getCompiledQuery(): CompiledQuery {
    this.applyGlobalScopes()
    return {
      table: this.tableName,
      columns: this.columns,
      distinct: this.distinctValue,
      wheres: this.wheres,
      orders: this.orders,
      groups: this.groups,
      havings: this.havings,
      joins: this.joins,
      limit: this.limitValue,
      offset: this.offsetValue,
      bindings: this.bindingsList,
    }
  }

  /**
   * Check if the query has a limit or offset set
   *
   * @returns True if limit or offset exists
   * @internal
   */
  hasLimitOrOffset(): boolean {
    return this.limitValue !== undefined || this.offsetValue !== undefined
  }
}
