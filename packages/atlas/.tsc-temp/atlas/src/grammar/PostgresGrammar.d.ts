/**
 * PostgreSQL Grammar
 * @description SQL grammar implementation for PostgreSQL
 */
import type { CompiledQuery } from '../types'
import { Grammar } from './Grammar'
/**
 * PostgreSQL Grammar
 * Implements PostgreSQL-specific SQL syntax
 */
export declare class PostgresGrammar extends Grammar {
  /**
   * PostgreSQL uses double quotes for identifiers
   */
  protected wrapChar: string
  /**
   * Get placeholder for PostgreSQL ($1, $2, $3...)
   */
  getPlaceholder(index: number): string
  /**
   * Compile INSERT and return ID using RETURNING clause
   */
  compileInsertGetId(
    query: CompiledQuery,
    values: Record<string, unknown>,
    primaryKey: string
  ): string
  /**
   * Compile INSERT with RETURNING clause for PostgreSQL
   */
  compileInsert(query: CompiledQuery, values: Record<string, unknown>[]): string
  /**
   * Compile UPDATE with RETURNING clause for PostgreSQL
   */
  compileUpdate(query: CompiledQuery, values: Record<string, unknown>): string
  /**
   * Compile TRUNCATE with CASCADE option for PostgreSQL
   */
  compileTruncate(query: CompiledQuery): string
  /**
   * PostgreSQL-specific: Compile UPSERT using ON CONFLICT
   */
  compileUpsert(
    query: CompiledQuery,
    values: Record<string, unknown>[],
    uniqueBy: string[],
    update: string[]
  ): string
  /**
   * PostgreSQL-specific: Compile locking clause
   */
  compileLock(mode: 'update' | 'share'): string
  /**
   * Override offset placeholders for PostgreSQL
   */
  protected offsetPlaceholders(sql: string, offset: number): string
  /**
   * Compile a lateral eager load query for PostgreSQL
   */
  compileLateralEagerLoad(
    _table: string,
    foreignKey: string,
    parentKeys: unknown[],
    query: CompiledQuery
  ): {
    sql: string
    bindings: unknown[]
  }
  /**
   * Guess the PostgreSQL type for an array of values
   */
  protected guessType(values: unknown[]): string
  compileJsonPath(column: string, path: string[]): string
  compileJsonContains(column: string, _value: unknown): string
  compileUpdateJson(query: CompiledQuery, column: string, _value: unknown): string
}
