/**
 * SQLite Grammar
 * @description SQL grammar implementation for SQLite
 */

import type { CompiledQuery } from '../types'
import { Grammar } from './Grammar'

/**
 * SQLite Grammar
 * Implements SQLite-specific SQL syntax
 */
export class SQLiteGrammar extends Grammar {
  /**
   * SQLite uses double quotes for identifiers
   */
  protected wrapChar = '"'

  /**
   * Get placeholder for SQLite (?)
   */
  getPlaceholder(_index: number): string {
    return '?'
  }

  /**
   * Compile INSERT statement with RETURNING *
   */
  override compileInsert(query: CompiledQuery, values: Record<string, unknown>[]): string {
    const sql = super.compileInsert(query, values)
    return `${sql} RETURNING *`
  }
  compileInsertGetId(
    query: CompiledQuery,
    values: Record<string, unknown>,
    primaryKey: string
  ): string {
    const sql = super.compileInsert(query, [values])
    return `${sql} RETURNING ${this.wrapColumn(primaryKey)}`
  }

  /**
   * Compile TRUNCATE statement
   * SQLite doesn't have TRUNCATE, use DELETE FROM
   */
  override compileTruncate(query: CompiledQuery): string {
    return `DELETE FROM ${this.wrapTable(query.table)}`
  }

  // ============================================================================
  // JSON Compilation
  // ============================================================================

  override compileJsonPath(column: string, _value: unknown): string {
    const [field, ...path] = column.split('->')
    const jsonPath = path.length > 0 ? `$.${path.join('.')}` : '$'
    
    // settings->theme => json_extract("settings", '$.theme')
    return `json_extract(${this.wrapColumn(field ?? '')}, '${jsonPath}') = ?`
  }

  override compileJsonContains(column: string, _value: unknown): string {
    // SQLite doesn't have native JSON_CONTAINS like MySQL
    // We can simulate it with EXISTS (SELECT 1 FROM json_each(col) WHERE value = ?)
    // But for simplicity/MVP we might just error or use a basic check
    throw new Error('JSON contains queries are not natively supported in SQLite without extensions.')
  }
}
