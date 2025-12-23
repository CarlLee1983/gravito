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
}
