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
export declare class MySQLGrammar extends Grammar {
  /**
   * MySQL uses backticks for identifiers
   */
  protected wrapChar: string
  /**
   * Get placeholder for MySQL (?)
   */
  getPlaceholder(_index: number): string
  /**
   * Compile INSERT and return ID using LAST_INSERT_ID()
   */
  compileInsertGetId(
    query: CompiledQuery,
    values: Record<string, unknown>,
    _primaryKey: string
  ): string
  /**
   * Compile TRUNCATE for MySQL
   */
  compileTruncate(query: CompiledQuery): string
  /**
   * MySQL-specific: Compile UPSERT using ON DUPLICATE KEY UPDATE
   */
  compileUpsert(
    query: CompiledQuery,
    values: Record<string, unknown>[],
    _uniqueBy: string[],
    update: string[]
  ): string
  /**
   * MySQL-specific: Compile locking clause
   */
  compileLock(mode: 'update' | 'share'): string
  /**
   * Override offset placeholders - MySQL uses ? for all
   */
  protected offsetPlaceholders(sql: string, _offset: number): string
  /**
   * Compile EXISTS with MySQL syntax
   */
  compileExists(query: CompiledQuery): string
  /**
   * Override aggregate to use backticks
   */
  compileAggregate(
    query: CompiledQuery,
    aggregate: {
      function: string
      column: string
    }
  ): string
  compileJsonPath(column: string, _value: unknown): string
  compileJsonContains(column: string, _value: unknown): string
  compileUpdateJson(query: CompiledQuery, column: string, _value: unknown): string
}
