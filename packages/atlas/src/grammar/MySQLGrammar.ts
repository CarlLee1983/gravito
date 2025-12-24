/**
 * MySQL Grammar
 * @description SQL grammar implementation for MySQL/MariaDB
 */

import type { CompiledQuery } from '../types'
import { Grammar } from './Grammar'

/**
 * MySQL Grammar
 * Implements MySQL/MariaDB-specific SQL syntax
 */
export class MySQLGrammar extends Grammar {
  /**
   * MySQL uses backticks for identifiers
   */
  protected wrapChar = '`'

  /**
   * Get placeholder for MySQL (?)
   */
  getPlaceholder(_index: number): string {
    return '?'
  }

  /**
   * Compile INSERT and return ID using LAST_INSERT_ID()
   */
  compileInsertGetId(
    query: CompiledQuery,
    values: Record<string, unknown>,
    _primaryKey: string
  ): string {
    // MySQL doesn't support RETURNING, we use LAST_INSERT_ID() after insert
    return this.compileInsert(query, [values])
  }

  /**
   * Compile TRUNCATE for MySQL
   */
  override compileTruncate(query: CompiledQuery): string {
    return `TRUNCATE TABLE ${this.wrapTable(query.table)}`
  }

  /**
   * MySQL-specific: Compile UPSERT using ON DUPLICATE KEY UPDATE
   */
  compileUpsert(
    query: CompiledQuery,
    values: Record<string, unknown>[],
    _uniqueBy: string[],
    update: string[]
  ): string {
    const insertSql = super.compileInsert(query, values)

    if (update.length === 0) {
      // MySQL doesn't have ON CONFLICT DO NOTHING, use INSERT IGNORE
      return insertSql.replace('INSERT INTO', 'INSERT IGNORE INTO')
    }

    const updateSet = update
      .map((col) => `${this.wrapColumn(col)} = VALUES(${this.wrapColumn(col)})`)
      .join(', ')

    return `${insertSql} ON DUPLICATE KEY UPDATE ${updateSet}`
  }

  /**
   * MySQL-specific: Compile locking clause
   */
  compileLock(mode: 'update' | 'share'): string {
    return mode === 'share' ? 'LOCK IN SHARE MODE' : 'FOR UPDATE'
  }

  /**
   * Override offset placeholders - MySQL uses ? for all
   */
  protected override offsetPlaceholders(sql: string, _offset: number): string {
    // MySQL uses ? for all placeholders, no need to offset
    return sql
  }

  /**
   * Compile EXISTS with MySQL syntax
   */
  override compileExists(query: CompiledQuery): string {
    const subquery = this.compileSelect(query)
    return `SELECT EXISTS(${subquery}) AS \`exists\``
  }

  /**
   * Override aggregate to use backticks
   */
  override compileAggregate(
    query: CompiledQuery,
    aggregate: { function: string; column: string }
  ): string {
    const column = aggregate.column === '*' ? '*' : this.wrapColumn(aggregate.column)
    const func = aggregate.function.toUpperCase()

    const aggregateSelect = `SELECT ${func}(${column}) AS \`aggregate\``
    const from = this.compileFrom(query)
    const wheres = query.wheres.length > 0 ? ` ${this.compileWheres(query)}` : ''
    const groups = query.groups.length > 0 ? ` ${this.compileGroups(query)}` : ''
    const havings = query.havings.length > 0 ? ` ${this.compileHavings(query)}` : ''

    return `${aggregateSelect} ${from}${wheres}${groups}${havings}`
  }

  // ============================================================================
  // JSON Compilation
  // ============================================================================

  override compileJsonPath(column: string, _value: unknown): string {
    const [field, ...path] = column.split('->')
    const jsonPath = path.length > 0 ? `$.${path.join('.')}` : '$'
    
    // settings->theme => JSON_UNQUOTE(JSON_EXTRACT(`settings`, '$.theme'))
    return `JSON_UNQUOTE(JSON_EXTRACT(${this.wrapColumn(field ?? '')}, '${jsonPath}')) = ?`
  }

  override compileJsonContains(column: string, _value: unknown): string {
    return `JSON_CONTAINS(${this.wrapColumn(column)}, ?)`
  }

  override compileUpdateJson(query: CompiledQuery, column: string, _value: unknown): string {
      const [field, ...path] = column.split('->')
      const jsonPath = `$.${path.join('.')}`
      const wrappedField = this.wrapColumn(field ?? '')
      
      // UPDATE users SET settings = JSON_SET(settings, '$.theme', 'dark') WHERE ...
      const setClause = `${wrappedField} = JSON_SET(${wrappedField}, '${jsonPath}', ?)`
      
      let sql = `UPDATE ${this.wrapTable(query.table)} SET ${setClause}`
      if (query.wheres.length > 0) {
          sql += ` ${this.compileWheres(query, 1)}`
      }
      return sql
  }
}
