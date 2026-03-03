/**
 * Null Grammar
 * @description A fallback grammar for non-SQL drivers
 */
import type { CompiledQuery, GrammarContract } from '../types'
/**
 * Null Grammar
 * Used for MongoDB, Redis, etc. where SQL compilation is not needed.
 */
export declare class NullGrammar implements GrammarContract {
  compileSelect(_query: CompiledQuery): string
  compileInsert(_query: CompiledQuery, _values: Record<string, unknown>[]): string
  compileInsertGetId(
    _query: CompiledQuery,
    _values: Record<string, unknown>,
    _primaryKey: string
  ): string
  compileUpdate(_query: CompiledQuery, _values: Record<string, unknown>): string
  compileDelete(_query: CompiledQuery): string
  compileTruncate(_query: CompiledQuery): string
  compileAggregate(
    _query: CompiledQuery,
    _aggregate: {
      function: string
      column: string
    }
  ): string
  compileExists(_query: CompiledQuery): string
  getPlaceholder(_index: number): string
  wrapColumn(column: string): string
  wrapTable(table: string): string
  quoteValue(value: unknown): string
  compileLateralEagerLoad(
    _table: string,
    _foreignKey: string,
    _parentKeys: unknown[],
    _query: CompiledQuery
  ): {
    sql: string
    bindings: unknown[]
  }
  getStructuralKey(_query: CompiledQuery): string
  compileJsonPath(column: string, _value: unknown): string
  compileJsonContains(column: string, _value: unknown): string
  compileUpdateJson(_query: CompiledQuery, column: string, _value: unknown): string
  compileUpsert(
    _query: CompiledQuery,
    _values: Record<string, unknown>[],
    _uniqueBy: string[],
    _update: string[]
  ): string
}
