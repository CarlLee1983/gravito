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
export class PostgresGrammar extends Grammar {
    /**
     * PostgreSQL uses double quotes for identifiers
     */
    protected wrapChar = '"'

    /**
     * Get placeholder for PostgreSQL ($1, $2, $3...)
     */
    getPlaceholder(index: number): string {
        return `$${index + 1}`
    }

    /**
     * Compile INSERT and return ID using RETURNING clause
     */
    compileInsertGetId(
        query: CompiledQuery,
        values: Record<string, unknown>,
        primaryKey: string
    ): string {
        // Use base class compileInsert to avoid double RETURNING clause
        const insertSql = super.compileInsert(query, [values])
        return `${insertSql} RETURNING ${this.wrapColumn(primaryKey)}`
    }

    /**
     * Compile INSERT with RETURNING clause for PostgreSQL
     */
    override compileInsert(query: CompiledQuery, values: Record<string, unknown>[]): string {
        const baseSql = super.compileInsert(query, values)
        // PostgreSQL supports RETURNING for all inserts
        return `${baseSql} RETURNING *`
    }

    /**
     * Compile UPDATE with RETURNING clause for PostgreSQL
     */
    override compileUpdate(query: CompiledQuery, values: Record<string, unknown>): string {
        const baseSql = super.compileUpdate(query, values)
        return baseSql
    }

    /**
     * Compile TRUNCATE with CASCADE option for PostgreSQL
     */
    override compileTruncate(query: CompiledQuery): string {
        return `TRUNCATE TABLE ${this.wrapTable(query.table)} RESTART IDENTITY CASCADE`
    }

    /**
     * PostgreSQL-specific: Compile UPSERT using ON CONFLICT
     */
    compileUpsert(
        query: CompiledQuery,
        values: Record<string, unknown>[],
        uniqueBy: string[],
        update: string[]
    ): string {
        const insertSql = super.compileInsert(query, values).replace(' RETURNING *', '')
        const conflictColumns = uniqueBy.map((col) => this.wrapColumn(col)).join(', ')

        if (update.length === 0) {
            return `${insertSql} ON CONFLICT (${conflictColumns}) DO NOTHING`
        }

        const updateSet = update
            .map((col) => `${this.wrapColumn(col)} = EXCLUDED.${this.wrapColumn(col)}`)
            .join(', ')

        return `${insertSql} ON CONFLICT (${conflictColumns}) DO UPDATE SET ${updateSet} RETURNING *`
    }

    /**
     * PostgreSQL-specific: Compile locking clause
     */
    compileLock(mode: 'update' | 'share'): string {
        return mode === 'share' ? 'FOR SHARE' : 'FOR UPDATE'
    }

    /**
     * Override offset placeholders for PostgreSQL
     */
    protected override offsetPlaceholders(sql: string, offset: number): string {
        // PostgreSQL uses $1, $2, etc. - we need to offset these
        return sql.replace(/\$(\d+)/g, (_, num) => `$${Number.parseInt(num) + offset}`)
    }
}
