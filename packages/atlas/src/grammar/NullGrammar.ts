/**
 * Null Grammar
 * @description A fallback grammar for non-SQL drivers
 */

import type { GrammarContract, CompiledQuery } from '../types'

/**
 * Null Grammar
 * Used for MongoDB, Redis, etc. where SQL compilation is not needed.
 */
export class NullGrammar implements GrammarContract {
    compileSelect(_query: CompiledQuery): string {
        throw new Error('Method not implemented for this driver.')
    }

    compileInsert(_query: CompiledQuery, _values: Record<string, unknown>[]): string {
        throw new Error('Method not implemented for this driver.')
    }

    compileInsertGetId(_query: CompiledQuery, _values: Record<string, unknown>, _primaryKey: string): string {
        throw new Error('Method not implemented for this driver.')
    }

    compileUpdate(_query: CompiledQuery, _values: Record<string, unknown>): string {
        throw new Error('Method not implemented for this driver.')
    }

    compileDelete(_query: CompiledQuery): string {
        throw new Error('Method not implemented for this driver.')
    }

    compileTruncate(_query: CompiledQuery): string {
        throw new Error('Method not implemented for this driver.')
    }

    compileAggregate(_query: CompiledQuery, _aggregate: { function: string; column: string }): string {
        throw new Error('Method not implemented for this driver.')
    }

    compileExists(_query: CompiledQuery): string {
        throw new Error('Method not implemented for this driver.')
    }

    getPlaceholder(_index: number): string {
        return '?'
    }

    wrapColumn(column: string): string {
        return column
    }

    wrapTable(table: string): string {
        return table
    }

    quoteValue(value: unknown): string {
        return String(value)
    }

    compileLateralEagerLoad(_table: string, _foreignKey: string, _parentKeys: unknown[], _query: CompiledQuery): { sql: string; bindings: unknown[] } {
        return { sql: '', bindings: [] }
    }

    compileJsonPath(column: string, _value: unknown): string {
        return column
    }

      compileJsonContains(column: string, _value: unknown): string {

        return column

      }

    

      compileUpdateJson(query: any, column: string, _value: unknown): string {

          return column

      }

    }

    
