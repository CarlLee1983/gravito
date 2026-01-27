/**
 * Grammar - Abstract SQL Grammar Base Class
 * @description Base class for database-specific SQL generation
 */

import { LRUCache } from 'lru-cache'
import { Expression } from '../query/Expression'
import type {
  CompiledQuery,
  GrammarContract,
  HavingClause,
  JoinClause,
  OrderClause,
  WhereClause,
} from '../types'

/**
 * Abstract Grammar class
 * Provides base SQL compilation logic that can be extended for specific databases
 */
export abstract class Grammar implements GrammarContract {
  /**
   * The grammar table prefix
   */
  protected tablePrefix = ''

  /**
   * Column wrapper character
   */
  protected abstract wrapChar: string

  /**
   * Cache for pre-compiled SQL statements
   * Shared across all Grammar instances
   */
  private static compilationCache = new LRUCache<string, string>({
    max: 500, // Max 500 compiled queries (~50KB typical)
    ttl: 1000 * 60 * 5, // 5 minute TTL
    updateAgeOnGet: true, // Refresh TTL on access (LRU behavior)
    allowStale: false,
  })

  /**
   * Cache statistics for monitoring
   */
  private static cacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
  }

  /**
   * Toggle for compilation cache
   */
  public static useCache = true

  /**
   * Cache scope
   */
  public static cacheScope: 'global' | 'instance' = 'global'

  // Instance-level cache for isolated scope
  private _instanceCache?: LRUCache<string, string>

  // Instance-level cache statistics
  private _instanceCacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
  }

  /**
   * Retrieves comprehensive cache statistics for monitoring and optimization.
   *
   * Provides detailed metrics including hit/miss rates, total requests,
   * and cache utilization. Useful for identifying query patterns and
   * tuning cache size for optimal performance.
   *
   * @returns Cache statistics object with hit/miss rates and utilization metrics
   *
   * @example
   * ```typescript
   * const stats = Grammar.getCacheStats();
   * console.log(`Hit rate: ${stats.hitRate * 100}%`);
   * console.log(`Cache utilization: ${stats.utilization * 100}%`);
   * ```
   */
  static getCacheStats() {
    const cache = Grammar.compilationCache
    const total = Grammar.cacheStats.hits + Grammar.cacheStats.misses
    const hitRate = total > 0 ? Grammar.cacheStats.hits / total : 0

    return {
      size: cache.size,
      maxSize: cache.max,
      hits: Grammar.cacheStats.hits,
      misses: Grammar.cacheStats.misses,
      sets: Grammar.cacheStats.sets,
      hitRate: hitRate,
      missRate: total > 0 ? Grammar.cacheStats.misses / total : 0,
      totalRequests: total,
      utilization: cache.size / (cache.max || 1),
    }
  }

  /**
   * Retrieves cache statistics for instance-level cache.
   *
   * Returns null if instance-level caching is not enabled. Provides
   * the same metrics as `getCacheStats()` but scoped to this specific
   * Grammar instance.
   *
   * @returns Cache statistics object or null if instance cache not enabled
   *
   * @example
   * ```typescript
   * const grammar = new PostgresGrammar();
   * Grammar.cacheScope = 'instance';
   * // ... perform queries ...
   * const stats = grammar.getInstanceCacheStats();
   * if (stats) {
   *   console.log(`Instance hit rate: ${stats.hitRate * 100}%`);
   * }
   * ```
   */
  getInstanceCacheStats() {
    if (!this._instanceCache) {
      return null
    }

    const cache = this._instanceCache
    const total = this._instanceCacheStats.hits + this._instanceCacheStats.misses
    const hitRate = total > 0 ? this._instanceCacheStats.hits / total : 0

    return {
      size: cache.size,
      maxSize: cache.max,
      hits: this._instanceCacheStats.hits,
      misses: this._instanceCacheStats.misses,
      sets: this._instanceCacheStats.sets,
      hitRate: hitRate,
      missRate: total > 0 ? this._instanceCacheStats.misses / total : 0,
      totalRequests: total,
      utilization: cache.size / (cache.max || 1),
    }
  }

  /**
   * Resets all cache statistics counters to zero.
   *
   * Useful for benchmarking or starting a new measurement period.
   * Does not clear the cache contents, only resets the counters.
   *
   * @example
   * ```typescript
   * Grammar.resetCacheStats();
   * // ... perform operations ...
   * const stats = Grammar.getCacheStats(); // Fresh statistics
   * ```
   */
  static resetCacheStats(): void {
    Grammar.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
    }
  }

  /**
   * Clear compilation cache (useful for tests)
   */
  static clearCache(): void {
    Grammar.compilationCache.clear()
  }

  /**
   * Configure cache size
   */
  static setCacheSize(max: number): void {
    Grammar.compilationCache = new LRUCache({
      max,
      ttl: 1000 * 60 * 5,
      updateAgeOnGet: true,
      allowStale: false,
    })
  }

  /**
   * Get the appropriate cache instance
   */
  protected getCompilationCache(): LRUCache<string, string> {
    if (Grammar.cacheScope === 'instance') {
      if (!this._instanceCache) {
        this._instanceCache = new LRUCache<string, string>({
          max: Grammar.compilationCache.max,
          ttl: Grammar.compilationCache.ttl,
          updateAgeOnGet: true,
          allowStale: false,
        })
      }
      return this._instanceCache
    }
    return Grammar.compilationCache
  }

  // ============================================================================
  // Abstract Methods (Must be implemented by subclasses)
  // ============================================================================

  /**
   * Get the placeholder for a binding at a specific index
   */
  abstract getPlaceholder(index: number): string

  /**
   * Compile an INSERT and get ID statement
   */
  abstract compileInsertGetId(
    query: CompiledQuery,
    values: Record<string, unknown>,
    primaryKey: string
  ): string

  // ============================================================================
  // SELECT Compilation
  // ============================================================================

  /**
   * Compile a SELECT statement
   */
  compileSelect(query: CompiledQuery): string {
    // 1. Try to get from cache first
    let cacheKey = ''
    if (Grammar.useCache) {
      cacheKey = this.getStructuralKey(query)
      const cache = this.getCompilationCache()
      const cached = cache.get(cacheKey)

      // 追蹤統計資訊
      if (cached) {
        if (Grammar.cacheScope === 'instance' && this._instanceCache) {
          this._instanceCacheStats.hits++
        } else {
          Grammar.cacheStats.hits++
        }
        return cached
      } else {
        if (Grammar.cacheScope === 'instance' && this._instanceCache) {
          this._instanceCacheStats.misses++
        } else {
          Grammar.cacheStats.misses++
        }
      }
    }

    const parts: string[] = []

    // SELECT [DISTINCT] columns
    parts.push(this.compileColumns(query))

    // FROM table
    parts.push(this.compileFrom(query))

    // JOINs
    if (query.joins.length > 0) {
      parts.push(this.compileJoins(query))
    }

    // WHERE
    if (query.wheres.length > 0) {
      parts.push(this.compileWheres(query))
    }

    // GROUP BY
    if (query.groups.length > 0) {
      parts.push(this.compileGroups(query))
    }

    // HAVING
    if (query.havings.length > 0) {
      parts.push(this.compileHavings(query))
    }

    // ORDER BY
    if (query.orders.length > 0) {
      parts.push(this.compileOrders(query))
    }

    // LIMIT
    if (query.limit !== undefined) {
      parts.push(this.compileLimit(query))
    }

    // OFFSET
    if (query.offset !== undefined) {
      parts.push(this.compileOffset(query))
    }

    const sql = parts.filter(Boolean).join(' ')

    // 2. Store in cache
    if (Grammar.useCache && cacheKey) {
      this.getCompilationCache().set(cacheKey, sql)
      // 追蹤統計資訊
      if (Grammar.cacheScope === 'instance' && this._instanceCache) {
        this._instanceCacheStats.sets++
      } else {
        Grammar.cacheStats.sets++
      }
    }

    return sql
  }

  /**
   * Generates a unique cache key for a query structure (excluding bindings).
   *
   * Creates a deterministic key based on query structure (table, columns,
   * wheres, joins, etc.) without including actual values. This allows
   * caching compiled SQL for queries with different bindings but same structure.
   *
   * Optimized to use array building and join operations instead of string
   * concatenation for better performance with large queries.
   *
   * @param query - Compiled query structure to generate key for
   * @returns Unique string key representing the query structure
   * @internal
   */
  protected getStructuralKey(query: CompiledQuery): string {
    // 使用陣列構建 key 部分，比字串拼接更高效
    const keyParts: string[] = [this.constructor.name, query.table]

    // Columns
    keyParts.push(query.columns.length > 0 ? query.columns.join(',') : '*')

    // Distinct flag
    keyParts.push(query.distinct ? '1' : '0')

    // Wheres - 優化：只在有 wheres 時才構建字串
    if (query.wheres.length > 0) {
      const wheres = query.wheres
        .map(
          (w) =>
            `${w.type}:${w.column ?? ''}:${w.operator ?? ''}:${w.boolean ?? ''}:${w.not ? '1' : '0'}:${w.sql ?? ''}:${w.values?.length ?? 0}`
        )
        .join('|')
      keyParts.push(wheres)
    } else {
      keyParts.push('')
    }

    // Joins
    if (query.joins.length > 0) {
      const joins = query.joins
        .map((j) => `${j.type}:${j.table}:${j.first}:${j.operator}:${j.second}`)
        .join('|')
      keyParts.push(joins)
    } else {
      keyParts.push('')
    }

    // Groups
    keyParts.push(query.groups.length > 0 ? query.groups.join(',') : '')

    // Havings
    if (query.havings.length > 0) {
      const havings = query.havings
        .map((h) => `${h.type}:${h.column ?? ''}:${h.operator ?? ''}:${h.boolean ?? ''}`)
        .join('|')
      keyParts.push(havings)
    } else {
      keyParts.push('')
    }

    // Orders
    if (query.orders.length > 0) {
      const orders = query.orders.map((o) => `${o.column}:${o.direction}`).join('|')
      keyParts.push(orders)
    } else {
      keyParts.push('')
    }

    // Limit & Offset
    keyParts.push(query.limit !== undefined ? `L${query.limit}` : 'X')
    keyParts.push(query.offset !== undefined ? `O${query.offset}` : 'X')

    // 使用 join 比字串拼接更高效
    return keyParts.join('_')
  }

  /**
   * Compile SELECT columns
   */
  protected compileColumns(query: CompiledQuery): string {
    const distinct = query.distinct ? 'DISTINCT ' : ''
    const columns =
      query.columns.length === 0 || (query.columns.length === 1 && query.columns[0] === '*')
        ? '*'
        : query.columns.map((col) => this.wrapColumn(col)).join(', ')

    return `SELECT ${distinct}${columns}`
  }

  /**
   * Compile FROM clause
   */
  protected compileFrom(query: CompiledQuery): string {
    return `FROM ${this.wrapTable(query.table)}`
  }

  // ============================================================================
  // WHERE Compilation
  // ============================================================================

  /**
   * Compile WHERE clauses
   */
  protected compileWheres(query: CompiledQuery, bindingOffset = 0): string {
    if (query.wheres.length === 0) {
      return ''
    }

    let currentOffset = bindingOffset
    const clauses = query.wheres.map((where, index) => {
      const { sql, bindingsUsed } = this.compileWhereWithOffset(where, currentOffset)
      currentOffset += bindingsUsed
      // Skip boolean for first clause
      return index === 0 ? sql : `${where.boolean.toUpperCase()} ${sql}`
    })

    return `WHERE ${clauses.join(' ')}`
  }

  /**
   * Compile a single WHERE clause (deprecated, use compileWhereWithOffset)
   */
  protected compileWhere(where: WhereClause, _query: CompiledQuery): string {
    return this.compileWhereWithOffset(where, 0).sql
  }

  /**
   * Compile a WHERE clause and return bindings used count
   */
  protected compileWhereWithOffset(
    where: WhereClause,
    offset: number
  ): { sql: string; bindingsUsed: number } {
    switch (where.type) {
      case 'basic':
        return { sql: this.compileWhereBasicWithOffset(where, offset), bindingsUsed: 1 }
      case 'nested':
        return { sql: this.compileWhereNested(where), bindingsUsed: where.bindings?.length ?? 0 }
      case 'in': {
        const values = where.values ?? []
        return { sql: this.compileWhereInWithOffset(where, offset), bindingsUsed: values.length }
      }
      case 'null':
        return { sql: this.compileWhereNull(where), bindingsUsed: 0 }
      case 'between':
        return { sql: this.compileWhereBetweenWithOffset(where, offset), bindingsUsed: 2 }
      case 'raw':
        return { sql: where.sql ?? '', bindingsUsed: where.bindings?.length ?? 0 }
      case 'column':
        return { sql: this.compileWhereColumn(where), bindingsUsed: 0 }
      default:
        return { sql: '', bindingsUsed: 0 }
    }
  }

  /**
   * Compile a basic WHERE clause with offset
   */
  protected compileWhereBasicWithOffset(where: WhereClause, offset: number): string {
    const column = this.wrapColumn(where.column ?? '')
    const operator = where.operator ?? '='
    const placeholder = this.getPlaceholder(offset)
    return `${column} ${operator} ${placeholder}`
  }

  /**
   * Compile a nested WHERE clause
   */
  protected compileWhereNested(where: WhereClause): string {
    // The nested query's wheres are compiled separately
    const nestedSql = where.sql ?? ''
    return `(${nestedSql})`
  }

  /**
   * Compile a WHERE IN clause with offset
   */
  protected compileWhereInWithOffset(where: WhereClause, offset: number): string {
    const column = this.wrapColumn(where.column ?? '')
    const values = where.values ?? []
    const placeholders = values.map((_, i) => this.getPlaceholder(offset + i))
    const not = where.not ? 'NOT ' : ''
    return `${column} ${not}IN (${placeholders.join(', ')})`
  }

  /**
   * Compile a WHERE NULL clause
   */
  protected compileWhereNull(where: WhereClause): string {
    const column = this.wrapColumn(where.column ?? '')
    const not = where.not ? 'NOT ' : ''
    return `${column} IS ${not}NULL`
  }

  /**
   * Compile a WHERE BETWEEN clause with offset
   */
  protected compileWhereBetweenWithOffset(where: WhereClause, offset: number): string {
    const column = this.wrapColumn(where.column ?? '')
    const not = where.not ? 'NOT ' : ''
    const min = this.getPlaceholder(offset)
    const max = this.getPlaceholder(offset + 1)
    return `${column} ${not}BETWEEN ${min} AND ${max}`
  }

  /**
   * Compile a WHERE column comparison clause
   */
  protected compileWhereColumn(where: WhereClause): string {
    const values = where.values ?? []
    const first = this.wrapColumn(String(values[0] ?? ''))
    const operator = where.operator ?? '='
    const second = this.wrapColumn(String(values[1] ?? ''))
    return `${first} ${operator} ${second}`
  }

  // ============================================================================
  // JOIN Compilation
  // ============================================================================

  /**
   * Compile JOINs
   */
  protected compileJoins(query: CompiledQuery): string {
    return query.joins.map((join) => this.compileJoin(join)).join(' ')
  }

  /**
   * Compile a single JOIN
   */
  protected compileJoin(join: JoinClause): string {
    const type = join.type.toUpperCase()
    const table = this.wrapTable(join.table)
    const first = this.wrapColumn(join.first)
    const second = this.wrapColumn(join.second)

    if (join.type === 'cross') {
      return `CROSS JOIN ${table}`
    }

    return `${type} JOIN ${table} ON ${first} ${join.operator} ${second}`
  }

  // ============================================================================
  // GROUP BY & HAVING Compilation
  // ============================================================================

  /**
   * Compile GROUP BY clause
   */
  protected compileGroups(query: CompiledQuery): string {
    const columns = query.groups.map((col) => this.wrapColumn(col)).join(', ')
    return `GROUP BY ${columns}`
  }

  /**
   * Compile HAVING clauses
   */
  protected compileHavings(query: CompiledQuery): string {
    // Calculate bindings used by WHERE clauses
    let whereBindingsCount = 0
    for (const where of query.wheres) {
      whereBindingsCount += this.countWhereBindings(where)
    }

    let currentOffset = whereBindingsCount
    const clauses = query.havings.map((having, index) => {
      const { sql, bindingsUsed } = this.compileHavingWithOffset(having, currentOffset)
      currentOffset += bindingsUsed
      return index === 0 ? sql : `${having.boolean.toUpperCase()} ${sql}`
    })

    return `HAVING ${clauses.join(' ')}`
  }

  /**
   * Count bindings used by a WHERE clause
   */
  protected countWhereBindings(where: WhereClause): number {
    switch (where.type) {
      case 'basic':
        return 1
      case 'in':
        return where.values?.length ?? 0
      case 'between':
        return 2
      case 'raw':
        return where.bindings?.length ?? 0
      case 'nested':
        return where.bindings?.length ?? 0
      default:
        return 0
    }
  }

  /**
   * Compile a single HAVING clause with offset
   */
  protected compileHavingWithOffset(
    having: HavingClause,
    offset: number
  ): { sql: string; bindingsUsed: number } {
    if (having.type === 'raw') {
      return { sql: having.sql ?? '', bindingsUsed: having.bindings?.length ?? 0 }
    }

    const column = this.wrapColumn(having.column ?? '')
    const operator = having.operator ?? '='
    const placeholder = this.getPlaceholder(offset)
    return { sql: `${column} ${operator} ${placeholder}`, bindingsUsed: 1 }
  }

  /**
   * Compile a single HAVING clause (deprecated)
   */
  protected compileHaving(having: HavingClause, _query: CompiledQuery): string {
    return this.compileHavingWithOffset(having, 0).sql
  }

  // ============================================================================
  // ORDER BY Compilation
  // ============================================================================

  /**
   * Compile ORDER BY clause
   */
  protected compileOrders(query: CompiledQuery): string {
    const orders = query.orders.map((order) => this.compileOrder(order)).join(', ')

    return `ORDER BY ${orders}`
  }

  /**
   * Compile a single ORDER BY
   */
  protected compileOrder(order: OrderClause): string {
    return `${this.wrapColumn(order.column)} ${order.direction.toUpperCase()}`
  }

  // ============================================================================
  // LIMIT & OFFSET Compilation
  // ============================================================================

  /**
   * Compile LIMIT clause
   */
  protected compileLimit(query: CompiledQuery): string {
    return `LIMIT ${query.limit}`
  }

  /**
   * Compile OFFSET clause
   */
  protected compileOffset(query: CompiledQuery): string {
    return `OFFSET ${query.offset}`
  }

  // ============================================================================
  // INSERT Compilation
  // ============================================================================

  /**
   * Compile an INSERT statement
   */
  compileInsert(query: CompiledQuery, values: Record<string, unknown>[]): string {
    if (values.length === 0) {
      return `INSERT INTO ${this.wrapTable(query.table)} DEFAULT VALUES`
    }

    const columns = Object.keys(values[0] ?? {})
    const columnList = columns.map((col) => this.wrapColumn(col)).join(', ')

    let bindingIndex = 0
    const valuesList = values
      .map(() => {
        const placeholders = columns.map(() => {
          const placeholder = this.getPlaceholder(bindingIndex)
          bindingIndex++
          return placeholder
        })
        return `(${placeholders.join(', ')})`
      })
      .join(', ')

    return `INSERT INTO ${this.wrapTable(query.table)} (${columnList}) VALUES ${valuesList}`
  }

  // ============================================================================
  // UPDATE Compilation
  // ============================================================================

  /**
   * Compile an UPDATE statement
   */
  compileUpdate(query: CompiledQuery, values: Record<string, unknown>): string {
    let bindingIndex = 0

    const setClause = Object.entries(values)
      .map(([col, value]) => {
        if (value instanceof Expression) {
          return `${this.wrapColumn(col)} = ${value.getValue()}`
        }
        const placeholder = this.getPlaceholder(bindingIndex)
        bindingIndex++
        return `${this.wrapColumn(col)} = ${placeholder}`
      })
      .join(', ')

    let sql = `UPDATE ${this.wrapTable(query.table)} SET ${setClause}`

    // Compile WHEREs with offset bindings
    if (query.wheres.length > 0) {
      const wheres = this.compileWheres(query, bindingIndex)
      sql += ` ${wheres}`
    }

    return sql
  }

  /**
   * Offset placeholders in a SQL string
   */
  protected offsetPlaceholders(sql: string, _offset: number): string {
    // Default implementation - subclasses may override
    return sql
  }

  // ============================================================================
  // DELETE Compilation
  // ============================================================================

  /**
   * Compile a DELETE statement
   */
  compileDelete(query: CompiledQuery): string {
    let sql = `DELETE FROM ${this.wrapTable(query.table)}`

    if (query.wheres.length > 0) {
      sql += ` ${this.compileWheres(query)}`
    }

    return sql
  }

  // ============================================================================
  // TRUNCATE Compilation
  // ============================================================================

  /**
   * Compile a TRUNCATE statement
   */
  compileTruncate(query: CompiledQuery): string {
    return `TRUNCATE TABLE ${this.wrapTable(query.table)}`
  }

  // ============================================================================
  // Aggregate Compilation
  // ============================================================================

  /**
   * Compile an aggregate query
   */
  compileAggregate(query: CompiledQuery, aggregate: { function: string; column: string }): string {
    const column = aggregate.column === '*' ? '*' : this.wrapColumn(aggregate.column)
    const func = aggregate.function.toUpperCase()

    // Build aggregate SELECT
    const aggregateSelect = `SELECT ${func}(${column}) AS "aggregate"`

    // Compile the rest of the query (FROM, WHERE, etc.)
    const from = this.compileFrom(query)
    const wheres = query.wheres.length > 0 ? ` ${this.compileWheres(query)}` : ''
    const groups = query.groups.length > 0 ? ` ${this.compileGroups(query)}` : ''
    const havings = query.havings.length > 0 ? ` ${this.compileHavings(query)}` : ''

    return `${aggregateSelect} ${from}${wheres}${groups}${havings}`
  }

  /**
   * Compile an EXISTS query
   */
  compileExists(query: CompiledQuery): string {
    const subquery = this.compileSelect(query)
    return `SELECT EXISTS(${subquery}) AS "exists"`
  }

  // ============================================================================
  // Wrapping & Quoting
  // ============================================================================

  /**
   * Wrap a column name
   */
  wrapColumn(column: string): string {
    // Handle raw expressions
    if (typeof column === 'object' && column !== null && 'getValue' in column) {
      return (column as Expression).getValue()
    }

    // Handle * wildcard
    if (column === '*') {
      return '*'
    }

    // Handle table.column format
    if (column.includes('.')) {
      const parts = column.split('.')
      return parts.map((part) => (part === '*' ? '*' : this.wrapValue(part))).join('.')
    }

    // Handle column aliases (column AS alias)
    if (column.toLowerCase().includes(' as ')) {
      const [col, alias] = column.split(/ as /i).map((s) => s.trim())
      return `${this.wrapValue(col ?? '')} AS ${this.wrapValue(alias ?? '')}`
    }

    return this.wrapValue(column)
  }

  /**
   * Wrap a table name
   */
  wrapTable(table: string): string {
    // Handle table aliases (table AS alias)
    if (table.toLowerCase().includes(' as ')) {
      const [tbl, alias] = table.split(/ as /i).map((s) => s.trim())
      return `${this.wrapValue(this.tablePrefix + (tbl ?? ''))} AS ${this.wrapValue(alias ?? '')}`
    }

    return this.wrapValue(this.tablePrefix + table)
  }

  /**
   * Wrap a value with the grammar's wrapper
   */
  protected wrapValue(value: string): string {
    if (value === '*') {
      return '*'
    }
    return `${this.wrapChar}${value.replace(new RegExp(this.wrapChar, 'g'), this.wrapChar + this.wrapChar)}${this.wrapChar}`
  }

  /**
   * Quote a value for safe SQL insertion
   */
  quoteValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'NULL'
    }

    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE'
    }

    if (typeof value === 'number') {
      return String(value)
    }

    if (value instanceof Expression) {
      return value.getValue()
    }

    if (value instanceof Date) {
      return `'${value.toISOString()}'`
    }

    // Escape single quotes
    const escaped = String(value).replace(/'/g, "''")
    return `'${escaped}'`
  }

  /**
   * Set table prefix
   */
  setTablePrefix(prefix: string): void {
    this.tablePrefix = prefix
  }

  /**
   * Get table prefix
   */
  getTablePrefix(): string {
    return this.tablePrefix
  }

  /**
   * Compile a lateral eager load query (Not supported by default)
   */
  compileLateralEagerLoad(
    _table: string,
    _foreignKey: string,
    _parentKeys: unknown[],
    _query: CompiledQuery
  ): { sql: string; bindings: unknown[] } {
    throw new Error('LATERAL eager loading is not supported by this database driver.')
  }

  // ============================================================================
  // JSON Compilation (Default - Override in drivers)
  // ============================================================================

  /**
   * Compile a JSON path query
   * Default implementation throws (not supported by all)
   */
  compileJsonPath(_column: string, _value: unknown): string {
    throw new Error('JSON queries are not supported by this database driver.')
  }

  /**
   * Compile a JSON contains query
   */
  compileJsonContains(_column: string, _value: unknown): string {
    throw new Error('JSON contains queries are not supported by this database driver.')
  }

  /**
   * Compile a JSON update query
   */
  compileUpdateJson(_query: CompiledQuery, _column: string, _value: unknown): string {
    throw new Error('Partial JSON updates are not supported by this database driver.')
  }
}
