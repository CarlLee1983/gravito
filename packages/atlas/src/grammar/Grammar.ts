/**
 * Abstract SQL Grammar providing base logic for SQL generation.
 *
 * Handles the structural assembly of SELECT, INSERT, UPDATE, and DELETE
 * statements. Includes a sophisticated compilation cache to minimize
 * string manipulation overhead for repetitive query structures.
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

export abstract class Grammar implements GrammarContract {
  /**
   * Optional prefix for all table names.
   */
  protected tablePrefix = ''

  /**
   * Database-specific character for wrapping identifiers (e.g., " or `).
   */
  protected abstract wrapChar: string

  /**
   * Internal cache for compiled SQL templates.
   * Keyed by structural hash to allow reuse across different parameter values.
   */
  private static compilationCache = new LRUCache<string, string>({
    max: 500,
    ttl: 1000 * 60 * 5,
    updateAgeOnGet: true,
    allowStale: false,
  })

  /**
   * Metrics for cache performance monitoring.
   */
  private static cacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
  }

  /**
   * Global toggle for SQL compilation caching.
   */
  public static useCache = true

  /**
   * Determines if the cache is shared globally or isolated per grammar instance.
   */
  public static cacheScope: 'global' | 'instance' = 'global'

  private _instanceCache?: LRUCache<string, string>

  private _instanceCacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
  }

  /**
   * Retrieves performance metrics for the compilation cache.
   *
   * @returns Stats including hit rate and utilization.
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
   * Retrieves metrics for the instance-level cache.
   *
   * @returns Stats object or null if instance caching is disabled.
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
   * Flushes all performance counters.
   */
  static resetCacheStats(): void {
    Grammar.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
    }
  }

  /**
   * Wipes the compilation cache.
   */
  static clearCache(): void {
    Grammar.compilationCache.clear()
  }

  /**
   * Resizes the global compilation cache.
   *
   * @param max - Maximum number of templates to store.
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
   * Resolves the active cache instance based on scope configuration.
   * @internal
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
  // Abstract Methods
  // ============================================================================

  /**
   * Returns the database-specific placeholder (e.g., ?, $1, :name).
   *
   * @param index - The zero-based binding index.
   */
  abstract getPlaceholder(index: number): string

  /**
   * Compiles an INSERT statement that returns the primary key.
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
   * Transforms a query structure into a SELECT SQL string.
   *
   * Leverages caching by generating a structural key that ignores binding values.
   *
   * @param query - The structural definition of the query.
   * @returns The compiled SQL string.
   */
  compileSelect(query: CompiledQuery): string {
    let cacheKey = ''
    if (Grammar.useCache) {
      cacheKey = this.getStructuralKey(query)
      const cache = this.getCompilationCache()
      const cached = cache.get(cacheKey)

      if (cached) {
        if (Grammar.cacheScope === 'instance' && this._instanceCache) {
          this._instanceCacheStats.hits++
        } else {
          Grammar.cacheStats.hits++
        }
        return cached
      }

      if (Grammar.cacheScope === 'instance' && this._instanceCache) {
        this._instanceCacheStats.misses++
      } else {
        Grammar.cacheStats.misses++
      }
    }

    const parts: string[] = []

    parts.push(this.compileColumns(query))
    let currentBindingOffset = query.bindingCounts?.select ?? 0

    parts.push(this.compileFrom(query))

    if (query.joins.length > 0) {
      parts.push(this.compileJoins(query))
      currentBindingOffset += query.bindingCounts?.join ?? 0
    }

    if (query.wheres.length > 0) {
      parts.push(this.compileWheres(query, currentBindingOffset))
      currentBindingOffset += query.bindingCounts?.where ?? this.countAllWhereBindings(query.wheres)
    }

    if (query.groups.length > 0) {
      parts.push(this.compileGroups(query))
    }

    if (query.havings.length > 0) {
      parts.push(this.compileHavings(query, currentBindingOffset))
    }

    if (query.unions.length > 0) {
      // If we have unions, we compile the base query parts first (excluding orders/limit)
      const baseSql = parts.filter(Boolean).join(' ')
      const unionSql = this.compileUnions(query)

      // Standard UNION structure without leading parentheses for base query
      // This is more compatible with SQLite.
      let sql = `${baseSql} ${unionSql}`

      // Add global orders/limit/offset
      const globalParts: string[] = []
      if (query.orders.length > 0) {
        globalParts.push(this.compileOrders(query))
      }
      if (query.limit !== undefined) {
        globalParts.push(this.compileLimit(query))
      }
      if (query.offset !== undefined) {
        globalParts.push(this.compileOffset(query))
      }

      if (globalParts.length > 0) {
        sql += ` ${globalParts.join(' ')}`
      }

      return sql
    }

    if (query.orders.length > 0) {
      parts.push(this.compileOrders(query))
    }

    if (query.limit !== undefined) {
      parts.push(this.compileLimit(query))
    }

    if (query.offset !== undefined) {
      parts.push(this.compileOffset(query))
    }

    const sql = parts.filter(Boolean).join(' ')

    if (Grammar.useCache && cacheKey) {
      this.getCompilationCache().set(cacheKey, sql)
      if (Grammar.cacheScope === 'instance' && this._instanceCache) {
        this._instanceCacheStats.sets++
      } else {
        Grammar.cacheStats.sets++
      }
    }

    return sql
  }

  /**
   * Generates a unique hash representing the SQL structure.
   *
   * Ignores specific binding values to allow cache hits for similar queries.
   * Uses efficient array joining for performance.
   *
   * @param query - The query structure.
   * @returns A deterministic string key.
   */
  public getStructuralKey(query: CompiledQuery): string {
    const keyParts: string[] = [this.constructor.name, query.table]

    keyParts.push(query.columns.length > 0 ? query.columns.join(',') : '*')

    keyParts.push(query.distinct ? '1' : '0')

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

    if (query.joins.length > 0) {
      const joins = query.joins
        .map((j) => `${j.type}:${j.table}:${j.first}:${j.operator}:${j.second}`)
        .join('|')
      keyParts.push(joins)
    } else {
      keyParts.push('')
    }

    keyParts.push(query.groups.length > 0 ? query.groups.join(',') : '')

    if (query.havings.length > 0) {
      const havings = query.havings
        .map((h) => `${h.type}:${h.column ?? ''}:${h.operator ?? ''}:${h.boolean ?? ''}`)
        .join('|')
      keyParts.push(havings)
    } else {
      keyParts.push('')
    }

    if (query.orders.length > 0) {
      const orders = query.orders.map((o) => `${o.column}:${o.direction}`).join('|')
      keyParts.push(orders)
    } else {
      keyParts.push('')
    }

    keyParts.push(query.limit !== undefined ? `L${query.limit}` : 'X')
    keyParts.push(query.offset !== undefined ? `O${query.offset}` : 'X')

    return keyParts.join('_')
  }

  /**
   * Compiles the SELECT list.
   * @internal
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
   * Compiles the FROM clause.
   * @internal
   */
  protected compileFrom(query: CompiledQuery): string {
    return `FROM ${this.wrapTable(query.table)}`
  }

  /**
   * Compiles UNION clauses.
   * @internal
   */
  protected compileUnions(query: CompiledQuery): string {
    return query.unions
      .map((union) => {
        const joiner = union.all ? 'UNION ALL' : 'UNION'
        return `${joiner} ${this.compileSelect(union.query)}`
      })
      .join(' ')
  }

  // ============================================================================
  // WHERE Compilation
  // ============================================================================

  /**
   * Compiles all WHERE constraints.
   *
   * @param query - The query definition.
   * @param bindingOffset - Initial parameter index.
   * @returns Compiled SQL snippet.
   * @internal
   */
  protected compileWheres(query: CompiledQuery, bindingOffset = 0): string {
    if (query.wheres.length === 0) {
      return ''
    }

    let currentOffset = bindingOffset
    const clauses = query.wheres.map((where, index) => {
      const { sql, bindingsUsed } = this.compileWhereWithOffset(where, currentOffset)
      currentOffset += bindingsUsed
      return index === 0 ? sql : `${where.boolean.toUpperCase()} ${sql}`
    })

    return `WHERE ${clauses.join(' ')}`
  }

  /**
   * @deprecated Use compileWhereWithOffset.
   */
  protected compileWhere(where: WhereClause, _query: CompiledQuery): string {
    return this.compileWhereWithOffset(where, 0).sql
  }

  /**
   * Compiles a single WHERE clause with offset awareness.
   * @internal
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
   * Compiles a standard equality or comparison clause.
   * @internal
   */
  protected compileWhereBasicWithOffset(where: WhereClause, offset: number): string {
    const column = this.wrapColumn(where.column ?? '')
    const operator = where.operator ?? '='

    if (where.value instanceof Object && 'getCompiledQuery' in where.value) {
      const subQuery = (where.value as any).getCompiledQuery()
      return `${column} ${operator} (${this.compileSelect(subQuery)})`
    }

    const placeholder = this.getPlaceholder(offset)
    return `${column} ${operator} ${placeholder}`
  }

  /**
   * Compiles an IN clause.
   * @internal
   */
  protected compileWhereInWithOffset(where: WhereClause, offset: number): string {
    const column = this.wrapColumn(where.column ?? '')
    const values = where.values ?? []
    const not = where.not ? 'NOT ' : ''

    if (
      values.length === 1 &&
      values[0] instanceof Object &&
      'getCompiledQuery' in (values[0] as any)
    ) {
      const subQuery = (values[0] as any).getCompiledQuery()
      return `${column} ${not}IN (${this.compileSelect(subQuery)})`
    }

    const placeholders = values.map((_, i) => this.getPlaceholder(offset + i))
    return `${column} ${not}IN (${placeholders.join(', ')})`
  }

  /**
   * Wraps nested SQL in parentheses.
   * @internal
   */
  protected compileWhereNested(where: WhereClause): string {
    const nestedSql = where.sql ?? ''
    return `(${nestedSql})`
  }

  /**
   * Compiles IS NULL constraints.
   * @internal
   */
  protected compileWhereNull(where: WhereClause): string {
    const column = this.wrapColumn(where.column ?? '')
    const not = where.not ? 'NOT ' : ''
    return `${column} IS ${not}NULL`
  }

  /**
   * Compiles BETWEEN constraints.
   * @internal
   */
  protected compileWhereBetweenWithOffset(where: WhereClause, offset: number): string {
    const column = this.wrapColumn(where.column ?? '')
    const not = where.not ? 'NOT ' : ''
    const min = this.getPlaceholder(offset)
    const max = this.getPlaceholder(offset + 1)
    return `${column} ${not}BETWEEN ${min} AND ${max}`
  }

  /**
   * Compiles column-to-column comparisons.
   * @internal
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
   * Compiles all JOIN clauses.
   * @internal
   */
  protected compileJoins(query: CompiledQuery): string {
    return query.joins.map((join) => this.compileJoin(join)).join(' ')
  }

  /**
   * Compiles a single JOIN relationship.
   * @internal
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
   * Compiles the GROUP BY clause.
   * @internal
   */
  protected compileGroups(query: CompiledQuery): string {
    const columns = query.groups.map((col) => this.wrapColumn(col)).join(', ')
    return `GROUP BY ${columns}`
  }

  /**
   * Compiles all HAVING constraints.
   * @internal
   */
  protected compileHavings(query: CompiledQuery, bindingOffset?: number): string {
    let currentOffset =
      bindingOffset ??
      query.wheres.reduce((count, where) => count + this.countWhereBindings(where), 0)

    const clauses = query.havings.map((having, index) => {
      const { sql, bindingsUsed } = this.compileHavingWithOffset(having, currentOffset)
      currentOffset += bindingsUsed
      return index === 0 ? sql : `${having.boolean.toUpperCase()} ${sql}`
    })

    return `HAVING ${clauses.join(' ')}`
  }

  /**
   * Sums bindings across all WHERE clauses.
   * @internal
   */
  protected countAllWhereBindings(wheres: WhereClause[]): number {
    return wheres.reduce((count, where) => count + this.countWhereBindings(where), 0)
  }

  /**
   * Counts bindings for a specific WHERE type.
   * @internal
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
   * Compiles a single HAVING clause.
   * @internal
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
   * @deprecated
   */
  protected compileHaving(having: HavingClause, _query: CompiledQuery): string {
    return this.compileHavingWithOffset(having, 0).sql
  }

  // ============================================================================
  // ORDER BY Compilation
  // ============================================================================

  /**
   * Compiles the full ORDER BY clause.
   * @internal
   */
  protected compileOrders(query: CompiledQuery): string {
    const orders = query.orders.map((order) => this.compileOrder(order)).join(', ')

    return `ORDER BY ${orders}`
  }

  /**
   * Compiles a single sorting rule.
   * @internal
   */
  protected compileOrder(order: OrderClause): string {
    return `${this.wrapColumn(order.column)} ${order.direction.toUpperCase()}`
  }

  // ============================================================================
  // LIMIT & OFFSET Compilation
  // ============================================================================

  /**
   * Compiles the LIMIT clause.
   * @internal
   */
  protected compileLimit(query: CompiledQuery): string {
    return `LIMIT ${query.limit}`
  }

  /**
   * Compiles the OFFSET clause.
   * @internal
   */
  protected compileOffset(query: CompiledQuery): string {
    return `OFFSET ${query.offset}`
  }

  // ============================================================================
  // INSERT Compilation
  // ============================================================================

  /**
   * Compiles a multi-row INSERT statement.
   *
   * @param query - The query definition.
   * @param values - Records to insert.
   * @returns The SQL string.
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
   * Compiles an UPDATE statement with WHERE constraints.
   *
   * @param query - The query definition.
   * @param values - Fields and values to update.
   * @returns The SQL string.
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

    if (query.wheres.length > 0) {
      const wheres = this.compileWheres(query, bindingIndex)
      sql += ` ${wheres}`
    }

    return sql
  }

  /**
   * Adjusts placeholders in a pre-compiled snippet.
   * @internal
   */
  protected offsetPlaceholders(sql: string, _offset: number): string {
    return sql
  }

  // ============================================================================
  // DELETE Compilation
  // ============================================================================

  /**
   * Compiles a DELETE statement.
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
   * Compiles a TRUNCATE statement to wipe a table.
   */
  compileTruncate(query: CompiledQuery): string {
    return `TRUNCATE TABLE ${this.wrapTable(query.table)}`
  }

  // ============================================================================
  // Aggregate Compilation
  // ============================================================================

  /**
   * Compiles an aggregate function selection (COUNT, MAX, etc.).
   */
  compileAggregate(query: CompiledQuery, aggregate: { function: string; column: string }): string {
    const column = aggregate.column === '*' ? '*' : this.wrapColumn(aggregate.column)
    const func = aggregate.function.toUpperCase()

    const aggregateSelect = `SELECT ${func}(${column}) AS "aggregate"`

    const from = this.compileFrom(query)
    const wheres = query.wheres.length > 0 ? ` ${this.compileWheres(query)}` : ''
    const groups = query.groups.length > 0 ? ` ${this.compileGroups(query)}` : ''
    const havings = query.havings.length > 0 ? ` ${this.compileHavings(query)}` : ''

    return `${aggregateSelect} ${from}${wheres}${groups}${havings}`
  }

  /**
   * Compiles an EXISTS check.
   */
  compileExists(query: CompiledQuery): string {
    const subquery = this.compileSelect(query)
    return `SELECT EXISTS(${subquery}) AS "exists"`
  }

  // ============================================================================
  // Wrapping & Quoting
  // ============================================================================

  /**
   * Escapes a column name for SQL safety.
   *
   * Handles table aliases, raw expressions, and wildcards.
   *
   * @param column - The column identifier.
   */
  wrapColumn(column: string): string {
    if (typeof column === 'object' && column !== null && 'getValue' in (column as any)) {
      return (column as any).getValue()
    }

    if (column === '*') {
      return '*'
    }

    if (column.includes('.')) {
      const parts = column.split('.')
      return parts.map((part) => (part === '*' ? '*' : this.wrapValue(part))).join('.')
    }

    if (column.toLowerCase().includes(' as ')) {
      const [col, alias] = column.split(/ as /i).map((s) => s.trim())
      return `${this.wrapValue(col ?? '')} AS ${this.wrapValue(alias ?? '')}`
    }

    return this.wrapValue(column)
  }

  /**
   * Escapes a table name.
   */
  wrapTable(table: string): string {
    if (table.toLowerCase().includes(' as ')) {
      const [tbl, alias] = table.split(/ as /i).map((s) => s.trim())
      return `${this.wrapValue(this.tablePrefix + (tbl ?? ''))} AS ${this.wrapValue(alias ?? '')}`
    }

    return this.wrapValue(this.tablePrefix + table)
  }

  /**
   * Internal string escaping.
   * @internal
   */
  protected wrapValue(value: string): string {
    if (value === '*') {
      return '*'
    }
    return `${this.wrapChar}${value.replace(new RegExp(this.wrapChar, 'g'), this.wrapChar + this.wrapChar)}${this.wrapChar}`
  }

  /**
   * Manually quotes a value for literal injection.
   *
   * Warning: Prefer bindings over manual quoting for security.
   *
   * @param value - The value to quote.
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

    const escaped = String(value).replace(/'/g, "''")
    return `'${escaped}'`
  }

  /**
   * Configures a prefix for all table references.
   */
  setTablePrefix(prefix: string): void {
    this.tablePrefix = prefix
  }

  /**
   * Retrieves the current table prefix.
   */
  getTablePrefix(): string {
    return this.tablePrefix
  }

  /**
   * Compiles a query for relationship lateral loading.
   * @throws {Error} If unsupported by driver.
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
  // JSON Compilation
  // ============================================================================

  /**
   * Compiles a JSON path selector.
   * @throws {Error} If unsupported.
   */
  compileJsonPath(_column: string, _value: unknown): string {
    throw new Error('JSON queries are not supported by this database driver.')
  }

  /**
   * Compiles a JSON containment check.
   * @throws {Error} If unsupported.
   */
  compileJsonContains(_column: string, _value: unknown): string {
    throw new Error('JSON contains queries are not supported by this database driver.')
  }

  /**
   * Compiles a partial JSON update.
   * @throws {Error} If unsupported.
   */
  compileUpdateJson(_query: CompiledQuery, _column: string, _value: unknown): string {
    throw new Error('Partial JSON updates are not supported by this database driver.')
  }

  /**
   * Compiles an UPSERT statement.
   * @throws {Error} If unsupported.
   */
  compileUpsert(
    _query: CompiledQuery,
    _values: Record<string, unknown>[],
    _uniqueBy: string[],
    _update: string[]
  ): string {
    throw new Error('UPSERT is not supported by this database driver.')
  }
}
