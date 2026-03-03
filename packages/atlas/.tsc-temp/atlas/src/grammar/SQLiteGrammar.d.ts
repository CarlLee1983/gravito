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
export declare class SQLiteGrammar extends Grammar {
  /**
   * SQLite uses double quotes for identifiers
   */
  protected wrapChar: string
  /**
   * Get placeholder for SQLite (?)
   */
  getPlaceholder(_index: number): string
  /**
   * Compile INSERT statement with RETURNING *
   */
  compileInsert(query: CompiledQuery, values: Record<string, unknown>[]): string
  compileInsertGetId(
    query: CompiledQuery,
    values: Record<string, unknown>,
    primaryKey: string
  ): string
  /**
   * Compile TRUNCATE statement
   * SQLite doesn't have TRUNCATE, use DELETE FROM
   */
  compileTruncate(query: CompiledQuery): string
  /**
   * Compile UPSERT statement for SQLite
   */
  compileUpsert(
    query: CompiledQuery,
    values: Record<string, unknown>[],
    uniqueBy: string[],
    update: string[]
  ): string
  compileJsonPath(column: string, _value: unknown): string
  compileJsonContains(_column: string, _value: unknown): string
}
