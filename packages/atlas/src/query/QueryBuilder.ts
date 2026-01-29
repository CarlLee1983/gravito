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
import { NPlusOneDetector } from './NPlusOneDetector'

export class QueryBuilderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QueryBuilderError'
  }
}

export class RecordNotFoundError extends Error {
  constructor(message = 'Record not found') {
    super(message)
    this.name = 'RecordNotFoundError'
  }
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
export class QueryBuilder<T = Record<string, unknown>> implements QueryBuilderContract<T> {
  /**
   * Name of the target database table.
   */
  protected tableName: string

  /**
   * Optional Model class for result hydration.
   */
  protected modelClass?: ModelConstructor<Model>

  // Query Components
  protected selectClause = new SelectClause()
  protected whereClause = new WhereClause()
  protected joinManager = new JoinManager()
  protected groupByClause = new GroupByClause()
  protected havingClause = new HavingClause()
  protected orderByClause = new OrderByClause()
  protected limitClause = new LimitClause()

  /**
   * Read-only flag to bypass hydration for performance.
   */
  protected isReadOnly = false

  /**
   * Map of relationships to load alongside query results.
   */
  protected eagerLoads = new Map<string, (query: QueryBuilderContract<any>) => void>()

  /**
   * Result caching configuration.
   */
  protected _cache?: { ttl: number; key?: string }

  /**
   * Internal flag for copy-on-write optimization.
   */
  protected _isClone = false

  /**
   * Tracks if clones have been modified.
   */
  protected _isModified = false

  /**
   * Tracks reference counts for shared state management.
   */
  private _cloneCount = 0

  /**
   * Registered global query filters.
   */
  protected globalScopes = new Map<string, (query: QueryBuilderContract<any>) => void>()

  /**
   * Identifiers of scopes to bypass.
   */
  protected removedScopes = new Set<string>()

  /**
   * Prevents infinite recursion during scope application.
   */
  protected _isApplyingScopes = false

  /**
   * Initializes a new query builder.
   *
   * @param connection - Active database connection.
   * @param grammar - SQL compiler instance.
   * @param table - Initial table name.
   */
  constructor(
    protected readonly connection: ConnectionContract,
    protected readonly grammar: GrammarContract,
    table: string
  ) {
    this.tableName = table
  }

  /**
   * Implements Copy-on-Write for query cloning.
   *
   * Shared state (clauses) is lazily copied only when a modification occurs.
   * This drastically reduces overhead for operations like .count() or .paginate()
   * that require cloning the builder.
   *
   * @internal
   */
  protected ensureOwnState(): void {
    if (this._isClone && !this._isModified) {
      this.selectClause = this.selectClause.clone()
      this.whereClause = this.whereClause.clone()
      this.joinManager = this.joinManager.clone()
      this.groupByClause = this.groupByClause.clone()
      this.havingClause = this.havingClause.clone()
      this.orderByClause = this.orderByClause.clone()
      this.limitClause = this.limitClause.clone()

      this._isModified = true
      this._isClone = false
    } else if (!this._isClone && this._cloneCount > 0 && !this._isModified) {
      this.selectClause = this.selectClause.clone()
      this.whereClause = this.whereClause.clone()
      this.joinManager = this.joinManager.clone()
      this.groupByClause = this.groupByClause.clone()
      this.havingClause = this.havingClause.clone()
      this.orderByClause = this.orderByClause.clone()
      this.limitClause = this.limitClause.clone()

      this._isModified = true
      this._cloneCount = 0
    }
  }

  /**
   * Associates a Model with the query for automatic record hydration.
   *
   * @param model - The Model class constructor.
   */
  setModel<M extends Model>(model: ModelConstructor<M>): this {
    this.ensureOwnState()
    this.modelClass = model
    return this
  }

  /**
   * Retrieves the associated Model class.
   */
  getModel<M extends Model>(): ModelConstructor<M> | undefined {
    return this.modelClass as ModelConstructor<M> | undefined
  }

  /**
   * Accesses raw WHERE conditions.
   * @internal
   */
  get wheres(): import('./clauses/WhereClause').WhereCondition[] {
    return this.whereClause.getWheres()
  }

  // ============================================================================
  // SELECT Methods
  // ============================================================================

  /**
   * Specifies the columns to be retrieved.
   *
   * @param columns - List of column names.
   */
  select(...columns: string[]): this {
    this.ensureOwnState()
    this.selectClause.setColumns(...columns)
    return this
  }

  /**
   * Sets the target database table.
   */
  from(table: string): this {
    this.ensureOwnState()
    this.tableName = table
    return this
  }

  /**
   * Adds a raw SQL expression to the SELECT clause.
   *
   * @param sql - Raw SQL template or Expression instance.
   * @param bindings - Binding values.
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
   * Adds the DISTINCT keyword to the selection.
   */
  distinct(): this {
    this.ensureOwnState()
    this.selectClause.setDistinct()
    return this
  }

  /**
   * Configures query result caching.
   *
   * @param ttl - Duration in seconds.
   * @param key - Explicit cache identifier.
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
  ): this {
    this.ensureOwnState()
    if (typeof column === 'function') {
      return this.whereNested(column, 'and')
    }

    if (typeof column === 'object' && column !== null) {
      for (const [key, val] of Object.entries(column)) {
        this.where(key, '=', val)
      }
      return this
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

    this.whereClause.add(column, operator, finalValue, 'and')
    return this
  }

  /**
   * Adds an OR WHERE constraint.
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
   * Adds a WHERE IN constraint.
   *
   * @param column - Target column.
   * @param values - Values array or subquery.
   */
  whereIn(column: string, values: unknown[] | QueryBuilderContract<any>): this {
    this.ensureOwnState()
    const finalValues = Array.isArray(values) ? values : [values]
    this.whereClause.addIn(column, finalValues, 'and', false)
    return this
  }

  /**
   * Adds a WHERE NOT IN constraint.
   */
  whereNotIn(column: string, values: unknown[] | QueryBuilderContract<any>): this {
    this.ensureOwnState()
    const finalValues = Array.isArray(values) ? values : [values]
    this.whereClause.addIn(column, finalValues, 'and', true)
    return this
  }

  /**
   * Adds an OR WHERE IN constraint.
   */
  orWhereIn(column: string, values: unknown[] | QueryBuilderContract<any>): this {
    this.ensureOwnState()
    const finalValues = Array.isArray(values) ? values : [values]
    this.whereClause.addIn(column, finalValues, 'or', false)
    return this
  }

  /**
   * Adds an OR WHERE NOT IN constraint.
   */
  orWhereNotIn(column: string, values: unknown[] | QueryBuilderContract<any>): this {
    this.ensureOwnState()
    const finalValues = Array.isArray(values) ? values : [values]
    this.whereClause.addIn(column, finalValues, 'or', true)
    return this
  }

  /**
   * Adds a WHERE column IS NULL constraint.
   */
  whereNull(column: string): this {
    this.ensureOwnState()
    this.whereClause.addNull(column, 'and', false)
    return this
  }

  /**
   * Adds a WHERE column IS NOT NULL constraint.
   */
  whereNotNull(column: string): this {
    this.ensureOwnState()
    this.whereClause.addNull(column, 'and', true)
    return this
  }

  /**
   * Adds an OR WHERE column IS NULL constraint.
   */
  orWhereNull(column: string): this {
    this.ensureOwnState()
    this.whereClause.addNull(column, 'or', false)
    return this
  }

  /**
   * Adds an OR WHERE column IS NOT NULL constraint.
   */
  orWhereNotNull(column: string): this {
    this.ensureOwnState()
    this.whereClause.addNull(column, 'or', true)
    return this
  }

  /**
   * Adds a WHERE BETWEEN constraint.
   */
  whereBetween(column: string, values: [unknown, unknown]): this {
    this.ensureOwnState()
    this.whereClause.addBetween(column, values, 'and', false)
    return this
  }

  /**
   * Adds a WHERE NOT BETWEEN constraint.
   */
  whereNotBetween(column: string, values: [unknown, unknown]): this {
    this.ensureOwnState()
    this.whereClause.addBetween(column, values, 'and', true)
    return this
  }

  /**
   * Adds a raw SQL WHERE constraint.
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
   * Adds an OR WHERE raw SQL constraint.
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
   * Compares two columns in a WHERE clause.
   */
  whereColumn(first: string, operator: Operator, second: string): this {
    this.ensureOwnState()
    this.whereClause.addColumn(first, operator, second, 'and')
    return this
  }

  /**
   * Adds a WHERE EXISTS subquery constraint.
   *
   * @param callback - Logic for the subquery.
   */
  whereExists(callback: (query: QueryBuilderContract<any>) => void): this {
    this.ensureOwnState()
    const subQuery = new QueryBuilder(this.connection, this.grammar, '')
    callback(subQuery)
    const sql = subQuery.toSql()
    return this.whereRaw(`EXISTS (${sql})`, subQuery.getBindings())
  }

  /**
   * Adds a WHERE NOT EXISTS subquery constraint.
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
   * Adds a constraint for a nested JSON property.
   *
   * @param column - Path using "->" syntax.
   * @param value - Match value.
   */
  whereJson(column: string, value: unknown): this {
    return this.whereRaw(this.grammar.compileJsonPath(column, value), [value])
  }

  /**
   * Adds an OR WHERE constraint for a nested JSON property.
   */
  orWhereJson(column: string, value: unknown): this {
    return this.orWhereRaw(this.grammar.compileJsonPath(column, value), [value])
  }

  /**
   * Checks if a JSON column contains a specific value.
   */
  whereJsonContains(column: string, value: unknown): this {
    return this.whereRaw(this.grammar.compileJsonContains(column, value), [JSON.stringify(value)])
  }

  /**
   * OR version of {@link whereJsonContains}.
   */
  orWhereJsonContains(column: string, value: unknown): this {
    return this.orWhereRaw(this.grammar.compileJsonContains(column, value), [JSON.stringify(value)])
  }

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
  ): this {
    const nestedQuery = new QueryBuilder<T>(this.connection, this.grammar, this.tableName)
    callback(nestedQuery)

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
   * Adds an INNER JOIN.
   */
  join(table: string, first: string, operator: string, second: string): this {
    return this.addJoin('inner', table, first, operator, second)
  }

  /**
   * Adds a LEFT JOIN.
   */
  leftJoin(table: string, first: string, operator: string, second: string): this {
    return this.addJoin('left', table, first, operator, second)
  }

  /**
   * Adds a RIGHT JOIN.
   */
  rightJoin(table: string, first: string, operator: string, second: string): this {
    return this.addJoin('right', table, first, operator, second)
  }

  /**
   * Adds a CROSS JOIN.
   */
  crossJoin(table: string): this {
    this.ensureOwnState()
    this.joinManager.cross(table, '', '', '')
    return this
  }

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
  ): this {
    this.ensureOwnState()
    this.joinManager.add(type, table, first, operator, second)
    return this
  }

  // ============================================================================
  // GROUP BY & HAVING Methods
  // ============================================================================

  /**
   * Defines the GROUP BY clause.
   */
  groupBy(...columns: string[]): this {
    this.ensureOwnState()
    this.groupByClause.groupBy(...columns)
    return this
  }

  /**
   * Defines a HAVING constraint.
   */
  having(column: string, operator: Operator, value: unknown): this {
    this.ensureOwnState()
    this.havingClause.having(column, operator, value)
    return this
  }

  /**
   * Defines a raw HAVING constraint.
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
   * Defines the ORDER BY clause.
   */
  orderBy(column: string, direction: OrderDirection = 'asc'): this {
    this.ensureOwnState()
    this.orderByClause.orderBy(column, direction)
    return this
  }

  /**
   * Helper for DESC ordering.
   */
  orderByDesc(column: string): this {
    return this.orderBy(column, 'desc')
  }

  /**
   * Adds a raw SQL ORDER BY clause.
   */
  orderByRaw(sql: string | Expression, bindings: unknown[] = []): this {
    this.ensureOwnState()
    this.orderByClause.orderByRaw(sql, bindings)
    return this
  }

  /**
   * Orders results by the latest created_at timestamp.
   */
  latest(column = 'created_at'): this {
    return this.orderBy(column, 'desc')
  }

  /**
   * Orders results by the oldest created_at timestamp.
   */
  oldest(column = 'created_at'): this {
    return this.orderBy(column, 'asc')
  }

  // ============================================================================
  // LIMIT & OFFSET Methods
  // ============================================================================

  /**
   * Constrains the number of results.
   */
  limit(value: number): this {
    this.ensureOwnState()
    this.limitClause.setLimit(value)
    return this
  }

  /**
   * Skips the specified number of results.
   */
  offset(value: number): this {
    this.ensureOwnState()
    this.limitClause.setOffset(value)
    return this
  }

  /**
   * Alias for {@link offset}.
   */
  skip(value: number): this {
    return this.offset(value)
  }

  /**
   * Alias for {@link limit}.
   */
  take(value: number): this {
    return this.limit(value)
  }

  // ============================================================================
  // READ Execution Methods
  // ============================================================================

  /**
   * Executes the query using a server-side prepared statement for speed.
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
   * Fetches raw database rows, bypassing the Model hydration layer.
   *
   * @returns Array of plain objects.
   * @internal
   */
  async getRawResults(): Promise<Record<string, unknown>[]> {
    const tracer = this.connection.getTracer()
    const span = tracer?.startSpan('Atlas:Select', {
      'db.system': this.connection.getDriver().getDriverName(),
      'db.operation': 'select',
      'db.sql.table': this.tableName,
    })

    try {
      const compiled = this.getCompiledQuery()
      const sql = this.grammar.compileSelect(compiled)
      const bindings = compiled.bindings

      NPlusOneDetector.track(this.tableName, sql, this.grammar.getStructuralKey(compiled))

      if (span) {
        span.setAttribute('db.statement', sql)
      }

      const cache = DB.getCache()
      let cacheKey: string | undefined

      if (cache && this._cache) {
        cacheKey = this._cache.key ?? `orbit:query:${sql}:${JSON.stringify(bindings)}`
        const cached = await cache.get<Record<string, unknown>[]>(cacheKey)
        if (cached) {
          span?.setAttribute('db.cache.hit', true)
          return cached
        }
        span?.setAttribute('db.cache.hit', false)
      }

      const result = await this.connection.raw<Record<string, unknown>>(sql, bindings)

      if (cache && this._cache && cacheKey) {
        await cache.set(cacheKey, result.rows, this._cache.ttl)
      }

      return result.rows
    } finally {
      span?.end()
    }
  }

  /**
   * Executes the query and returns hydrated records.
   */
  async get(): Promise<T[]> {
    const rows = await this.getRawResults()
    return rows as unknown as T[]
  }

  /**
   * Provides an async iterator to stream results one by one.
   *
   * Essential for processing datasets that exceed memory capacity.
   */
  async *stream(): AsyncIterable<T> {
    const compiled = this.getCompiledQuery()
    const sql = this.grammar.compileSelect(compiled)
    const bindings = compiled.bindings

    const conn = this.connection as ConnectionContract & {
      stream?: <U>(sql: string, bindings: unknown[]) => AsyncIterable<U>
    }

    if (typeof conn.stream === 'function') {
      yield* conn.stream<T>(sql, bindings)
    } else {
      const rows = await this.get()
      for (const row of rows) {
        yield row
      }
    }
  }

  /**
   * Returns the first record matching the query.
   */
  async first(): Promise<T | null> {
    this.limit(1)
    const results = await this.get()
    return results[0] ?? null
  }

  /**
   * Fails if no record matches the query.
   * @throws {RecordNotFoundError}
   */
  async firstOrFail(): Promise<T> {
    const result = await this.first()
    if (result === null) {
      throw new RecordNotFoundError()
    }
    return result
  }

  /**
   * Shortcut for searching by primary key.
   */
  async find(id: unknown, primaryKey = 'id'): Promise<T | null> {
    return this.where(primaryKey, '=', id).first()
  }

  /**
   * Fails if primary key search yields no result.
   */
  async findOrFail(id: unknown, primaryKey = 'id'): Promise<T> {
    const result = await this.find(id, primaryKey)
    if (result === null) {
      throw new RecordNotFoundError(`Record with ${primaryKey}=${id} not found`)
    }
    return result
  }

  /**
   * Retrieves a single column value from the first matching record.
   */
  async value<V = unknown>(column: string): Promise<V | null> {
    const result = await this.select(column).first()
    if (result === null) {
      return null
    }
    return (result as Record<string, unknown>)[column] as V
  }

  /**
   * Retrieves an array of values for a single column.
   */
  async pluck<V = unknown>(column: string): Promise<V[]> {
    const results = await this.select(column).get()
    return results.map((row) => (row as Record<string, unknown>)[column] as V)
  }

  /**
   * Returns true if any records match the query.
   */
  async exists(): Promise<boolean> {
    const compiled = this.getCompiledQuery()
    const sql = this.grammar.compileExists(compiled)
    const result = await this.connection.raw<{ exists: boolean }>(sql, compiled.bindings)
    return result.rows[0]?.exists ?? false
  }

  /**
   * Inverse of {@link exists}.
   */
  async doesntExist(): Promise<boolean> {
    return !(await this.exists())
  }

  // ============================================================================
  // AGGREGATE Execution Methods
  // ============================================================================

  /**
   * Returns the count of matching records.
   */
  async count(column = '*'): Promise<number> {
    const result = await this.aggregate('count', column)
    return result ?? 0
  }

  /**
   * Returns the maximum value of a column.
   */
  async max<V = number>(column: string): Promise<V | null> {
    return this.aggregate('max', column) as Promise<V | null>
  }

  /**
   * Returns the minimum value of a column.
   */
  async min<V = number>(column: string): Promise<V | null> {
    return this.aggregate('min', column) as Promise<V | null>
  }

  /**
   * Returns the average value of a column.
   */
  async avg(column: string): Promise<number | null> {
    return this.aggregate('avg', column)
  }

  /**
   * Returns the sum of a column's values.
   */
  async sum(column: string): Promise<number> {
    return (await this.aggregate('sum', column)) ?? 0
  }

  /**
   * Internal generic aggregate execution.
   * @internal
   */
  protected async aggregate(func: string, column: string): Promise<number | null> {
    const tracer = this.connection.getTracer()
    const span = tracer?.startSpan(`Atlas:Aggregate ${func}`, {
      'db.system': this.connection.getDriver().getDriverName(),
      'db.operation': 'select',
      'db.sql.table': this.tableName,
    })

    try {
      const compiled = this.getCompiledQuery()
      const sql = this.grammar.compileAggregate(compiled, { function: func, column })

      if (span) {
        span.setAttribute('db.statement', sql)
      }

      const result = await this.connection.raw<{ aggregate: number | null }>(sql, compiled.bindings)
      const value = result.rows[0]?.aggregate
      return value === null || value === undefined ? null : Number(value)
    } finally {
      span?.end()
    }
  }

  // ============================================================================
  // WRITE Execution Methods
  // ============================================================================

  /**
   * Inserts data into the table.
   *
   * Automatically handles batching (chunking) to stay within binding limits.
   *
   * @param data - Single object or array of objects.
   * @returns Array of inserted objects (with generated IDs if supported).
   */
  async insert(data: Partial<T> | Partial<T>[]): Promise<T[]> {
    const tracer = this.connection.getTracer()
    const span = tracer?.startSpan('Atlas:Insert', {
      'db.system': this.connection.getDriver().getDriverName(),
      'db.operation': 'insert',
      'db.sql.table': this.tableName,
    })

    try {
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

      if (span) {
        span.setAttribute('db.statement', sql)
      }

      const result = await this.connection.raw<T>(sql, allBindings)
      return result.rows
    } finally {
      span?.end()
    }
  }

  /**
   * Inserts data and returns the primary key.
   *
   * @param data - Record data.
   * @param primaryKey - Name of the auto-increment column.
   * @returns Generated ID.
   * @throws {QueryBuilderError} If ID retrieval fails.
   */
  async insertGetId(data: Partial<T>, primaryKey = 'id'): Promise<number | bigint> {
    const tracer = this.connection.getTracer()
    const span = tracer?.startSpan('Atlas:InsertGetId', {
      'db.system': this.connection.getDriver().getDriverName(),
      'db.operation': 'insert',
      'db.sql.table': this.tableName,
    })

    try {
      const values = Object.values(data as Record<string, unknown>)
      const sql = this.grammar.compileInsertGetId(
        this.getCompiledQuery(),
        data as Record<string, unknown>,
        primaryKey
      )

      if (span) {
        span.setAttribute('db.statement', sql)
      }

      const result = await this.connection.raw<Record<string, number | bigint>>(sql, values)
      const id = result.rows[0]?.[primaryKey]
      if (id === undefined) {
        throw new QueryBuilderError('Failed to get insert ID')
      }
      return id
    } finally {
      span?.end()
    }
  }

  /**
   * Updates records matching the current query state.
   *
   * @param data - Update values.
   * @returns Count of affected rows.
   */
  async update(data: Partial<T>): Promise<number> {
    const tracer = this.connection.getTracer()
    const span = tracer?.startSpan('Atlas:Update', {
      'db.system': this.connection.getDriver().getDriverName(),
      'db.operation': 'update',
      'db.sql.table': this.tableName,
    })

    try {
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

      if (span) {
        span.setAttribute('db.statement', sql)
      }

      const result = await this.connection.getDriver().execute(sql, allBindings)
      return result.affectedRows
    } finally {
      span?.end()
    }
  }

  /**
   * Specialized method for updating JSON fields.
   */
  async updateJson(column: string, value: unknown): Promise<number> {
    const tracer = this.connection.getTracer()
    const span = tracer?.startSpan('Atlas:UpdateJson', {
      'db.system': this.connection.getDriver().getDriverName(),
      'db.operation': 'update',
      'db.sql.table': this.tableName,
    })

    try {
      const sql = this.grammar.compileUpdateJson(this.getCompiledQuery(), column, value)

      if (span) {
        span.setAttribute('db.statement', sql)
      }

      const result = await this.connection.getDriver().execute(sql, [value, ...this.getBindings()])
      return result.affectedRows
    } finally {
      span?.end()
    }
  }

  /**
   * Deletes records matching the query.
   *
   * Note: This performs a hard delete. For soft deletes, use the Model layer.
   */
  async delete(): Promise<number> {
    const tracer = this.connection.getTracer()
    const span = tracer?.startSpan('Atlas:Delete', {
      'db.system': this.connection.getDriver().getDriverName(),
      'db.operation': 'delete',
      'db.sql.table': this.tableName,
    })

    try {
      const sql = this.grammar.compileDelete(this.getCompiledQuery())

      if (span) {
        span.setAttribute('db.statement', sql)
      }

      const result = await this.connection.getDriver().execute(sql, this.getBindings())
      return result.affectedRows
    } finally {
      span?.end()
    }
  }

  /**
   * Drops all records and resets auto-increment state.
   */
  async truncate(): Promise<void> {
    const tracer = this.connection.getTracer()
    const span = tracer?.startSpan('Atlas:Truncate', {
      'db.system': this.connection.getDriver().getDriverName(),
      'db.operation': 'truncate',
      'db.sql.table': this.tableName,
    })

    try {
      const sql = this.grammar.compileTruncate(this.getCompiledQuery())

      if (span) {
        span.setAttribute('db.statement', sql)
      }

      await this.connection.getDriver().execute(sql)
    } finally {
      span?.end()
    }
  }

  // ============================================================================
  // EAGER LOADING Methods
  // ============================================================================

  /**
   * Defines relationships to load in bulk after the primary query.
   */
  with(
    relation: string | string[] | Record<string, (query: QueryBuilderContract<unknown>) => void>
  ): this {
    this.ensureOwnState()
    if (typeof relation === 'string') {
      this.eagerLoads.set(relation, () => {})
    } else if (Array.isArray(relation)) {
      for (const rel of relation) {
        this.eagerLoads.set(rel, () => {})
      }
    } else {
      for (const [rel, callback] of Object.entries(relation)) {
        this.eagerLoads.set(rel, callback as any)
      }
    }
    return this
  }

  /**
   * Filters the query based on relationship existence.
   */
  whereHas(relation: string, callback?: (query: QueryBuilderContract<unknown>) => void): this {
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

    if (meta.type === 'belongsTo') {
      subQuery.whereColumn(`${relatedTable}.${localKey}`, '=', `${this.tableName}.${foreignKey}`)
    } else {
      subQuery.whereColumn(`${relatedTable}.${foreignKey}`, '=', `${this.tableName}.${localKey}`)
    }

    if (callback) {
      callback(subQuery)
    }

    this.whereClause.addRaw(`EXISTS (${subQuery.selectRaw('1').toSql()})`, subQuery.getBindings())
    return this
  }

  /**
   * Retrieves eager load mapping.
   * @internal
   */
  getEagerLoads(): Map<string, (query: QueryBuilderContract<any>) => void> {
    return this.eagerLoads
  }

  // ============================================================================
  // SOFT DELETES
  // ============================================================================

  /**
   * Includes soft-deleted records (where deleted_at is not null).
   */
  withTrashed(): this {
    return this.withoutGlobalScope('softDeletes')
  }

  /**
   * Excludes non-deleted records.
   */
  onlyTrashed(): this {
    this.withTrashed()
    this.whereNotNull('deleted_at')
    return this
  }

  /**
   * Restores soft-deleted records to active state.
   */
  async restore(): Promise<number> {
    return this.withTrashed().update({ deleted_at: null } as never)
  }

  /**
   * Bypasses soft deletes to permanently remove records.
   */
  async forceDelete(): Promise<number> {
    return this.withTrashed().delete()
  }

  // ============================================================================
  // INCREMENT/DECREMENT Methods
  // ============================================================================

  /**
   * Atomically increments a numeric column.
   */
  async increment(column: string, amount = 1, extra: Partial<T> = {}): Promise<number> {
    const data = {
      ...extra,
      [column]: new Expression(`${this.grammar.wrapColumn(column)} + ${amount}`),
    } as Partial<T>
    return this.update(data)
  }

  /**
   * Atomically decrements a numeric column.
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
   * Inserts records or updates them if a uniqueness conflict occurs.
   *
   * @param data - Records to process.
   * @param uniqueBy - Column(s) that identify uniqueness.
   * @param update - Column(s) to update on conflict.
   * @returns Affected rows.
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
   * Alias for {@link paginate}.
   */
  async simplePaginate(perPage = 15, page = 1, primaryKey = 'id'): Promise<PaginateResult<T>> {
    return this.paginate(perPage, page, primaryKey)
  }

  /**
   * Processes the entire dataset in memory-efficient chunks.
   *
   * @param size - Chunk size.
   * @param callback - Logic for each chunk.
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
   * Returns a paginated result set with metadata.
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
   * Force an ID sort if none exists to prevent skipping records during pagination.
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
   * Sets the read-only flag for this query.
   */
  readonly(value = true): this {
    this.ensureOwnState()
    this.isReadOnly = value
    return this
  }

  /**
   * Checks if read-only is active.
   * @internal
   */
  getIsReadOnly(): boolean {
    return this.isReadOnly
  }

  /**
   * Creates a deep copy of the current builder.
   *
   * Leverages copy-on-write; state is initially shared.
   */
  clone(): QueryBuilderContract<T> {
    const cloned = new QueryBuilder<T>(this.connection, this.grammar, this.tableName)

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
   * Returns a finalized query structure ready for compilation.
   *
   * Includes global scope application.
   */
  getCompiledQuery(): CompiledQuery {
    if (this._isApplyingScopes) {
      return this.getRawCompiledQuery()
    }

    const query = this.clone() as QueryBuilder<T>
    query.applyGlobalScopes()
    return query.getRawCompiledQuery()
  }

  /**
   * Internal query structural assembly.
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
        join: 0,
        having: havingBindings.length,
        order: orderBindings.length,
      },
    }
  }

  /**
   * Executes all registered global scope callbacks.
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
   * Returns all bound values for the current state.
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
   * Checks for LIMIT or OFFSET definitions.
   */
  hasLimitOrOffset(): boolean {
    return this.limitClause.hasLimit() || this.limitClause.hasOffset()
  }

  /**
   * Returns the compiled SQL string.
   */
  toSql(): string {
    return this.grammar.compileSelect(this.getCompiledQuery())
  }

  /**
   * Logs SQL and Bindings to standard output.
   */
  dump(): this {
    console.log('SQL:', this.toSql())
    console.log('Bindings:', this.getBindings())
    return this
  }

  /**
   * Logs and exits process.
   */
  dd(): never {
    this.dump()
    process.exit(1)
  }

  /**
   * Registers a permanent filter for this builder instance.
   */
  applyScope(name: string, callback: (query: QueryBuilderContract<T>) => void): this {
    this.ensureOwnState()
    this.globalScopes.set(name, callback as any)
    return this
  }

  /**
   * Bypasses a previously registered scope.
   */
  withoutGlobalScope(name: string): this {
    this.ensureOwnState()
    this.removedScopes.add(name)
    return this
  }

  /**
   * Optimizes chunk size to prevent too many bindings for the driver.
   * @internal
   */
  private calculateOptimalChunkSize(values: Partial<T>[]): number {
    const MAX_BINDINGS = 65000
    const columnsCount = Object.keys(values[0] || {}).length || 1

    const safeChunkSize = Math.floor(MAX_BINDINGS / columnsCount)

    return Math.min(safeChunkSize, 1000)
  }
}
