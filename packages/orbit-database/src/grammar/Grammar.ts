/**
 * Grammar - Abstract SQL Grammar Base Class
 * @description Base class for database-specific SQL generation
 */

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

    return parts.filter(Boolean).join(' ')
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
    const columns = Object.keys(values)
    let bindingIndex = 0

    const setClause = columns
      .map((col) => {
        const placeholder = this.getPlaceholder(bindingIndex)
        bindingIndex++
        return `${this.wrapColumn(col)} = ${placeholder}`
      })
      .join(', ')

    let sql = `UPDATE ${this.wrapTable(query.table)} SET ${setClause}`

    // Compile WHEREs with offset bindings
    if (query.wheres.length > 0) {
      const whereBindingsOffset = columns.length
      const offsetQuery = { ...query, bindings: query.bindings.slice(whereBindingsOffset) }
      const wheres = this.compileWheres(offsetQuery)
      // Fix placeholders to account for SET values
      sql += ` ${this.offsetPlaceholders(wheres, whereBindingsOffset)}`
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
      const [col, alias] = column.split(/\s+as\s+/i)
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
      const [tbl, alias] = table.split(/\s+as\s+/i)
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
}
