/**
 * Query Builder
 * @description Fluent query builder for constructing SQL queries
 */

import { DB } from '../DB'
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
 * Provides a fluent interface for building and executing SQL queries
 */
export class QueryBuilder<T = Record<string, unknown>> implements QueryBuilderContract<T> {
  // Query state
  protected tableName: string
  protected columns: string[] = ['*']
  protected distinctValue = false
  protected wheres: WhereClause[] = []
  protected orders: OrderClause[] = []
  protected groups: string[] = []
  protected havings: HavingClause[] = []
  protected joins: JoinClause[] = []
  protected limitValue: number | undefined = undefined
  protected offsetValue: number | undefined = undefined
  protected bindingsList: unknown[] = []
  // biome-ignore lint/suspicious/noExplicitAny: Eager loads need any for flexibility
  protected eagerLoads = new Map<string, (query: QueryBuilderContract<any>) => void>()
  protected _cache?: { ttl: number; key?: string }

  // Global Scopes
  // biome-ignore lint/suspicious/noExplicitAny: Global scopes need any for flexibility
  protected globalScopes = new Map<string, (query: QueryBuilderContract<any>) => void>()
  protected removedScopes = new Set<string>()
  protected _isApplyingScopes = false

  constructor(
    protected readonly connection: ConnectionContract,
    protected readonly grammar: GrammarContract,
    table: string
  ) {
    this.tableName = table
  }

  // ============================================================================
  // SELECT Methods
  // ============================================================================

  /**
   * Set the columns to select
   */
  select(...columns: string[]): this {
    this.columns = columns.length > 0 ? columns : ['*']
    return this
  }

  /**
   * Add a raw SELECT expression
   */
  selectRaw(sql: string | Expression, bindings: unknown[] = []): this {
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
   * Add DISTINCT to the query
   */
  distinct(): this {
    this.distinctValue = true
    return this
  }

  /**
   * Cache the query result
   */
  cache(ttl: number, key?: string): this {
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
   * Add a WHERE clause
   */
  where(
    column: string | ((query: QueryBuilderContract<T>) => void) | Record<string, unknown>,
    operatorOrValue?: Operator | unknown,
    value?: unknown
  ): this {
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
   * Add an OR WHERE clause
   */
  orWhere(
    column: string | ((query: QueryBuilderContract<T>) => void),
    operatorOrValue?: Operator | unknown,
    value?: unknown
  ): this {
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
   * Add a WHERE IN clause
   */
  whereIn(column: string, values: unknown[]): this {
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
   * Add a WHERE NOT IN clause
   */
  whereNotIn(column: string, values: unknown[]): this {
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
   * Add an OR WHERE IN clause
   */
  orWhereIn(column: string, values: unknown[]): this {
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
   * Add an OR WHERE NOT IN clause
   */
  orWhereNotIn(column: string, values: unknown[]): this {
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
   * Add a WHERE NULL clause
   */
  whereNull(column: string): this {
    this.wheres.push({
      type: 'null',
      column,
      boolean: 'and',
      not: false,
    })
    return this
  }

  /**
   * Add a WHERE NOT NULL clause
   */
  whereNotNull(column: string): this {
    this.wheres.push({
      type: 'null',
      column,
      boolean: 'and',
      not: true,
    })
    return this
  }

  /**
   * Add an OR WHERE NULL clause
   */
  orWhereNull(column: string): this {
    this.wheres.push({
      type: 'null',
      column,
      boolean: 'or',
      not: false,
    })
    return this
  }

  /**
   * Add an OR WHERE NOT NULL clause
   */
  orWhereNotNull(column: string): this {
    this.wheres.push({
      type: 'null',
      column,
      boolean: 'or',
      not: true,
    })
    return this
  }

  /**
   * Add a WHERE BETWEEN clause
   */
  whereBetween(column: string, values: [unknown, unknown]): this {
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
   * Add a WHERE NOT BETWEEN clause
   */
  whereNotBetween(column: string, values: [unknown, unknown]): this {
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
   * Add a raw WHERE clause
   */
  whereRaw(sql: string | Expression, bindings: unknown[] = []): this {
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
   * Add a raw OR WHERE clause
   */
  orWhereRaw(sql: string | Expression, bindings: unknown[] = []): this {
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
   * Add a WHERE column comparison clause
   */
  whereColumn(first: string, operator: Operator, second: string): this {
    this.wheres.push({
      type: 'column',
      operator,
      values: [first, second],
      boolean: 'and',
    })
    return this
  }

  /**
   * Add a nested WHERE clause
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
   * Add an INNER JOIN
   */
  join(table: string, first: string, operator: string, second: string): this {
    return this.addJoin('inner', table, first, operator, second)
  }

  /**
   * Add a LEFT JOIN
   */
  leftJoin(table: string, first: string, operator: string, second: string): this {
    return this.addJoin('left', table, first, operator, second)
  }

  /**
   * Add a RIGHT JOIN
   */
  rightJoin(table: string, first: string, operator: string, second: string): this {
    return this.addJoin('right', table, first, operator, second)
  }

  /**
   * Add a CROSS JOIN
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
   * Add a JOIN clause
   */
  protected addJoin(
    type: JoinType,
    table: string,
    first: string,
    operator: string,
    second: string
  ): this {
    this.joins.push({ type, table, first, operator, second })
    return this
  }

  // ============================================================================
  // GROUP BY & HAVING Methods
  // ============================================================================

  /**
   * Add GROUP BY columns
   */
  groupBy(...columns: string[]): this {
    this.groups.push(...columns)
    return this
  }

  /**
   * Add a HAVING clause
   */
  having(column: string, operator: Operator, value: unknown): this {
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
   * Add a raw HAVING clause
   */
  havingRaw(sql: string | Expression, bindings: unknown[] = []): this {
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
   * Add an ORDER BY clause
   */
  orderBy(column: string, direction: OrderDirection = 'asc'): this {
    this.orders.push({ column, direction })
    return this
  }

  /**
   * Add an ORDER BY DESC clause
   */
  orderByDesc(column: string): this {
    return this.orderBy(column, 'desc')
  }

  /**
   * Add a raw ORDER BY clause
   */
  orderByRaw(sql: string | Expression, bindings: unknown[] = []): this {
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
   * Order by latest (created_at DESC)
   */
  latest(column = 'created_at'): this {
    return this.orderBy(column, 'desc')
  }

  /**
   * Order by oldest (created_at ASC)
   */
  oldest(column = 'created_at'): this {
    return this.orderBy(column, 'asc')
  }

  // ============================================================================
  // LIMIT & OFFSET Methods
  // ============================================================================

  /**
   * Set the LIMIT
   */
  limit(value: number): this {
    this.limitValue = value
    return this
  }

  /**
   * Set the OFFSET
   */
  offset(value: number): this {
    this.offsetValue = value
    return this
  }

  /**
   * Alias for offset
   */
  skip(value: number): this {
    return this.offset(value)
  }

  /**
   * Alias for limit
   */
  take(value: number): this {
    return this.limit(value)
  }

  // ============================================================================
  // READ Execution Methods
  // ============================================================================

  /**
   * Execute the query and get all results
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
   * Get the first result
   */
  async first(): Promise<T | null> {
    this.limit(1)
    const results = await this.get()
    return results[0] ?? null
  }

  /**
   * Get the first result or throw
   */
  async firstOrFail(): Promise<T> {
    const result = await this.first()
    if (result === null) {
      throw new RecordNotFoundError()
    }
    return result
  }

  /**
   * Find a record by ID
   */
  async find(id: unknown, primaryKey = 'id'): Promise<T | null> {
    return this.where(primaryKey, '=', id).first()
  }

  /**
   * Find a record by ID or throw
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
   * Get an array of values from a single column
   */
  async pluck<V = unknown>(column: string): Promise<V[]> {
    const results = await this.select(column).get()
    return results.map((row) => (row as Record<string, unknown>)[column] as V)
  }

  /**
   * Check if any records exist
   */
  async exists(): Promise<boolean> {
    const sql = this.grammar.compileExists(this.getCompiledQuery())
    const result = await this.connection.raw<{ exists: boolean }>(sql, this.bindingsList)
    return result.rows[0]?.exists ?? false
  }

  /**
   * Check if no records exist
   */
  async doesntExist(): Promise<boolean> {
    return !(await this.exists())
  }

  // ============================================================================
  // AGGREGATE Execution Methods
  // ============================================================================

  /**
   * Get the count of records
   */
  async count(column = '*'): Promise<number> {
    const result = await this.aggregate('count', column)
    return result ?? 0
  }

  /**
   * Get the maximum value
   */
  async max<V = number>(column: string): Promise<V | null> {
    return this.aggregate('max', column) as Promise<V | null>
  }

  /**
   * Get the minimum value
   */
  async min<V = number>(column: string): Promise<V | null> {
    return this.aggregate('min', column) as Promise<V | null>
  }

  /**
   * Get the average value
   */
  async avg(column: string): Promise<number | null> {
    return this.aggregate('avg', column)
  }

  /**
   * Get the sum of values
   */
  async sum(column: string): Promise<number> {
    return (await this.aggregate('sum', column)) ?? 0
  }

  /**
   * Execute an aggregate function
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
   * Insert records
   */
  async insert(data: Partial<T> | Partial<T>[]): Promise<T[]> {
    const values = Array.isArray(data) ? data : [data]
    if (values.length === 0) {
      return []
    }

    // Collect bindings from values
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
   * Insert a record and get the ID
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
   * Update records
   */
  async update(data: Partial<T>): Promise<number> {
    const values = Object.values(data as Record<string, unknown>)
    const allBindings = [...values, ...this.bindingsList]

    const compiled = this.getCompiledQuery()
    compiled.bindings = allBindings

    const sql = this.grammar.compileUpdate(compiled, data as Record<string, unknown>)
    const result = await this.connection.getDriver().execute(sql, allBindings)
    return result.affectedRows
  }

  /**
   * Delete records
   */
  async delete(): Promise<number> {
    const sql = this.grammar.compileDelete(this.getCompiledQuery())
    const result = await this.connection.getDriver().execute(sql, this.bindingsList)
    return result.affectedRows
  }

  /**
   * Truncate the table
   */
  async truncate(): Promise<void> {
    const sql = this.grammar.compileTruncate(this.getCompiledQuery())
    await this.connection.getDriver().execute(sql)
  }

  // ============================================================================
  // INCREMENT/DECREMENT Methods
  // ============================================================================

  /**
   * Increment a column value
   */
  async increment(column: string, amount = 1, extra: Partial<T> = {}): Promise<number> {
    const data = {
      ...extra,
      [column]: new Expression(`${this.grammar.wrapColumn(column)} + ${amount}`),
    } as Partial<T>
    return this.update(data)
  }

  /**
   * Decrement a column value
   */
  async decrement(column: string, amount = 1, extra: Partial<T> = {}): Promise<number> {
    const data = {
      ...extra,
      [column]: new Expression(`${this.grammar.wrapColumn(column)} - ${amount}`),
    } as Partial<T>
    return this.update(data)
  }

  /**
   * Add a relationship to be eager loaded
   */
  with(
    // biome-ignore lint/suspicious/noExplicitAny: Eager loads need any for flexibility
    relation: string | string[] | Record<string, (query: QueryBuilderContract<any>) => void>
  ): this {
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
   * Get eager loads
   */
  // biome-ignore lint/suspicious/noExplicitAny: Eager loads need any for flexibility
  getEagerLoads(): Map<string, (query: QueryBuilderContract<any>) => void> {
    return this.eagerLoads
  }

  // ============================================================================
  // SOFT DELETES
  // ============================================================================

  /**
   * Remove the soft delete global scope
   */
  withTrashed(): this {
    return this.withoutGlobalScope('softDeletes')
  }

  /**
   * Filter for only trashed records
   */
  onlyTrashed(): this {
    this.withTrashed()
    this.whereNotNull('deleted_at')
    return this
  }

  /**
   * Restore soft deleted records
   */
  async restore(): Promise<number> {
    return this.withTrashed().update({ deleted_at: null } as never)
  }

  /**
   * Force delete records physically
   */
  async forceDelete(): Promise<number> {
    return this.withTrashed().delete()
  }

  // ============================================================================
  // UPSERT Method
  // ============================================================================

  /**
   * Insert or update records
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
   * Paginate results
   * Automatically ensures deterministic ordering by appending primary key
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
   * @example Without deterministic order: ORDER BY created_at (rows may shift)
   * @example With deterministic order: ORDER BY created_at, id (stable pagination)
   */
  ensureDeterministicOrder(primaryKey = 'id'): this {
    // Check if primary key is already in the ORDER BY
    const hasIdOrder = this.orders.some((order) => order.column === primaryKey)

    if (!hasIdOrder) {
      // Append primary key as tie-breaker
      this.orders.push({ column: primaryKey, direction: 'asc' })
    }

    return this
  }

  // ============================================================================
  // DEBUGGING Methods
  // ============================================================================

  /**
   * Get the compiled SQL
   */
  toSql(): string {
    return this.grammar.compileSelect(this.getCompiledQuery())
  }

  /**
   * Get the bindings
   */
  getBindings(): unknown[] {
    return [...this.bindingsList]
  }

  /**
   * Dump the query and bindings
   */
  dump(): this {
    console.log('SQL:', this.toSql())
    console.log('Bindings:', this.getBindings())
    return this
  }

  /**
   * Dump and die
   */
  dd(): never {
    this.dump()
    process.exit(1)
  }

  // ============================================================================
  // CLONING Method
  // ============================================================================

  /**
   * Clone the query builder
   */
  clone(): QueryBuilderContract<T> {
    const cloned = new QueryBuilder<T>(this.connection, this.grammar, this.tableName)
    cloned.columns = [...this.columns]
    cloned.distinctValue = this.distinctValue
    cloned.wheres = [...this.wheres]
    cloned.orders = [...this.orders]
    cloned.groups = [...this.groups]
    cloned.havings = [...this.havings]
    cloned.joins = [...this.joins]
    cloned.limitValue = this.limitValue
    cloned.offsetValue = this.offsetValue
    cloned.bindingsList = [...this.bindingsList]
    cloned.globalScopes = new Map(this.globalScopes)
    cloned.removedScopes = new Set(this.removedScopes)
    return cloned
  }

  /**
   * Apply a global scope to the query
   */
  applyScope(name: string, callback: (query: QueryBuilderContract<T>) => void): this {
    this.globalScopes.set(name, callback)
    return this
  }

  /**
   * Remove a global scope from the query
   */
  withoutGlobalScope(name: string): this {
    this.removedScopes.add(name)
    return this
  }

  /**
   * Apply all registered global scopes
   */
  protected applyGlobalScopes(): void {
    if (this._isApplyingScopes) {
      return
    }
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
   * Get the compiled query structure
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
   * Check if the query has limit or offset
   */
  hasLimitOrOffset(): boolean {
    return this.limitValue !== undefined || this.offsetValue !== undefined
  }
}
