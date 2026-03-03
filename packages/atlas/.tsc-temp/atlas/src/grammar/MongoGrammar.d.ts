/**
 * MongoDB Grammar
 * @description Translates generic CompiledQuery into a MongoDB Query Protocol (JSON)
 */
import type { CompiledQuery } from '../types'
import { Grammar } from './Grammar'
/**
 * MongoDB Query Protocol
 * Represents the structure passed from Grammar to Driver
 */
export interface MongoQueryProtocol {
  collection: string
  operation: 'find' | 'insert' | 'update' | 'delete' | 'aggregate' | 'count'
  filter?: Record<string, unknown>
  options?: Record<string, unknown>
  document?: Record<string, unknown> | Record<string, unknown>[]
  update?: Record<string, unknown>
  pipeline?: Record<string, unknown>[]
}
/**
 * Mongo Grammar
 * Transforms QueryBuilder state into MongoDB commands
 */
export declare class MongoGrammar extends Grammar {
  protected wrapChar: string
  getPlaceholder(_index: number): string
  compileInsertGetId(
    query: CompiledQuery,
    values: Record<string, unknown>,
    _primaryKey: string
  ): string
  compileSelect(query: CompiledQuery): string
  compileInsert(query: CompiledQuery, values: Record<string, unknown>[]): string
  compileUpdate(query: CompiledQuery, values: Record<string, unknown>): string
  compileDelete(query: CompiledQuery): string
  compileAggregate(
    query: CompiledQuery,
    aggregate: {
      function: string
      column: string
    }
  ): string
  compileTruncate(query: CompiledQuery): string
  /**
   * Translate generic WhereClause[] to MongoDB Filter
   */
  private compileMongoWheres
  private normalizeValue
  private compileBasicWhere
  private compileInWhere
  private compileNullWhere
  private normalizeColumn
  compileJsonPath(column: string, value: unknown): string
}
