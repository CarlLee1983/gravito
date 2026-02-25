import { DB } from '../DB'
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
import { AggregateBuilder } from './builders/AggregateBuilder'
import { MutationBuilder } from './builders/MutationBuilder'
import { PaginationBuilder } from './builders/PaginationBuilder'
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
import type { RelationshipResolver } from './RelationshipResolver'

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
   * Global relationship resolver to avoid circular dependencies and require() calls.
   * Injected by the Model layer.
   */
  public static relationshipResolver?: RelationshipResolver

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
   * When true, this query will always use the write (primary) connection,
   * even if read replicas are configured. Use after a write to avoid
   * replication lag issues.
   */
  protected _forceWrite = false

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

  // ============================================================================
  // 組合的特化建構器（Composed Specialized Builders）
  // ============================================================================

  /**
   * 聚合操作委派建構器（count/sum/avg/min/max）
   */
  private readonly aggregateBuilder: AggregateBuilder

  /**
   * 寫入操作委派建構器（insert/update/delete/upsert/increment/decrement）
   */
  private readonly mutationBuilder: MutationBuilder<T>

  /**
   * 分頁操作委派建構器（paginate/cursorPaginate/chunk）
   */
  private readonly paginationBuilder: PaginationBuilder<T>

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

    // 初始化委派建構器
    this.aggregateBuilder = new AggregateBuilder(
      this.connection,
      this.grammar,
      () => this.tableName,
      () => this.getCompiledQuery()
    )

    this.mutationBuilder = new MutationBuilder<T>(
      this.connection,
      this.grammar,
      () => this.tableName,
      () => this.getCompiledQuery(),
      () => this.getBindings(),
      (data) => this.update(data)
    )

    this.paginationBuilder = new PaginationBuilder<T>(this as any)
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
    point: { lat: number; lng: number },
    distanceMeters: number
  ): this {
    const driverName = this.connection.getDriver().getDriverName()
    const { lat, lng } = point

    if (driverName === 'postgres') {
      // ST_DWithin uses geography type for meter-based distance
      return this.whereRaw(`ST_DWithin(${column}::geography, ST_MakePoint(?, ?)::geography, ?)`, [
        lng,
        lat,
        distanceMeters,
      ])
    }

    // MySQL / MariaDB: ST_Distance_Sphere returns meters
    return this.whereRaw(`ST_Distance_Sphere(${column}, POINT(?, ?)) <= ?`, [
      lng,
      lat,
      distanceMeters,
    ])
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
  // AGGREGATE Execution Methods（委派至 AggregateBuilder）
  // ============================================================================

  /**
   * Returns the count of matching records.
   */
  async count(column = '*'): Promise<number> {
    return this.aggregateBuilder.count(column)
  }

  /**
   * Returns the maximum value of a column.
   */
  async max<V = number>(column: string): Promise<V | null> {
    return this.aggregateBuilder.max<V>(column)
  }

  /**
   * Returns the minimum value of a column.
   */
  async min<V = number>(column: string): Promise<V | null> {
    return this.aggregateBuilder.min<V>(column)
  }

  /**
   * Returns the average value of a column.
   */
  async avg(column: string): Promise<number | null> {
    return this.aggregateBuilder.avg(column)
  }

  /**
   * Returns the sum of a column's values.
   */
  async sum(column: string): Promise<number> {
    return this.aggregateBuilder.sum(column)
  }

  /**
   * Internal generic aggregate execution.
   * @internal
   */
  protected async aggregate(func: string, column: string): Promise<number | null> {
    return this.aggregateBuilder.runAggregate(func, column)
  }

  // ============================================================================
  // WRITE Execution Methods（委派至 MutationBuilder）
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
    return this.mutationBuilder.insert(data)
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
    return this.mutationBuilder.insertGetId(data, primaryKey)
  }

  /**
   * Updates records matching the current query state.
   *
   * @param data - Update values.
   * @returns Count of affected rows.
   */
  async update(data: Partial<T>): Promise<number> {
    return this.mutationBuilder.update(data)
  }

  /**
   * Specialized method for updating JSON fields.
   */
  async updateJson(column: string, value: unknown): Promise<number> {
    return this.mutationBuilder.updateJson(column, value)
  }

  /**
   * Deletes records matching the query.
   *
   * Note: This performs a hard delete. For soft deletes, use the Model layer.
   */
  async delete(): Promise<number> {
    return this.mutationBuilder.delete()
  }

  /**
   * Drops all records and resets auto-increment state.
   */
  async truncate(): Promise<void> {
    return this.mutationBuilder.truncate()
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

    const resolver = (this.constructor as typeof QueryBuilder).relationshipResolver
    let relations: Map<string, any>

    if (resolver) {
      relations = resolver.getRelationships(this.modelClass)
    } else {
      // Fallback for standalone QueryBuilder (avoid circular dependency with require)
      try {
        const { getRelationships } = require('../orm/model/relationships')
        relations = getRelationships(this.modelClass)
      } catch (e: any) {
        throw new Error(
          `whereHas() failed: Relationship resolver not configured and fallback 'require' failed. Error: ${e.message}`
        )
      }
    }

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
  // INCREMENT/DECREMENT Methods（委派至 MutationBuilder）
  // ============================================================================

  /**
   * Atomically increments a numeric column.
   */
  async increment(column: string, amount = 1, extra: Partial<T> = {}): Promise<number> {
    return this.mutationBuilder.increment(column, amount, extra)
  }

  /**
   * Atomically decrements a numeric column.
   */
  async decrement(column: string, amount = 1, extra: Partial<T> = {}): Promise<number> {
    return this.mutationBuilder.decrement(column, amount, extra)
  }

  // ============================================================================
  // UPSERT Method（委派至 MutationBuilder）
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
    return this.mutationBuilder.upsert(data, uniqueBy, update)
  }

  // ============================================================================
  // PAGINATION Methods（委派至 PaginationBuilder）
  // ============================================================================

  /**
   * Alias for {@link paginate}.
   */
  async simplePaginate(perPage = 15, page = 1, primaryKey = 'id'): Promise<PaginateResult<T>> {
    return this.paginationBuilder.simplePaginate(perPage, page, primaryKey)
  }

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
  useWriteConnection(): this {
    this.ensureOwnState()
    this._forceWrite = true
    return this
  }

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
  async cursorPaginate(
    limit = 15,
    cursor?: string,
    sortColumn = 'id',
    direction: 'asc' | 'desc' = 'asc'
  ): Promise<CursorPaginateResult<T>> {
    this.ensureOwnState()
    return this.paginationBuilder.cursorPaginate(limit, cursor, sortColumn, direction)
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
    return this.paginationBuilder.chunk(size, callback)
  }

  /**
   * Returns a paginated result set with metadata.
   */
  async paginate(perPage = 15, page = 1, primaryKey = 'id'): Promise<PaginateResult<T>> {
    return this.paginationBuilder.paginate(perPage, page, primaryKey)
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
    // biome-ignore lint: Internal debug tool
    console.log('SQL:', this.toSql())
    // biome-ignore lint: Internal debug tool
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
}
