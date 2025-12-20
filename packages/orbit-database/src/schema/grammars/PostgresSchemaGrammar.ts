/**
 * PostgreSQL Schema Grammar
 * @description DDL generation for PostgreSQL
 */

import type { ColumnDefinition } from '../ColumnDefinition'
import type { IndexDefinition } from '../ForeignKeyDefinition'
import { SchemaGrammar } from './SchemaGrammar'

/**
 * PostgreSQL Schema Grammar
 */
export class PostgresSchemaGrammar extends SchemaGrammar {
    // ============================================================================
    // Column Type Compilation
    // ============================================================================

    protected compileType(column: ColumnDefinition): string {
        const params = column.parameters

        switch (column.type) {
            case 'bigInteger':
                return column.isAutoIncrement() ? 'BIGSERIAL' : 'BIGINT'
            case 'integer':
                return column.isAutoIncrement() ? 'SERIAL' : 'INTEGER'
            case 'smallInteger':
                return column.isAutoIncrement() ? 'SMALLSERIAL' : 'SMALLINT'
            case 'boolean':
                return 'BOOLEAN'
            case 'decimal':
                return `DECIMAL(${params.precision ?? 8}, ${params.scale ?? 2})`
            case 'float':
                return 'DOUBLE PRECISION'
            case 'string':
                return `VARCHAR(${params.length ?? 255})`
            case 'text':
                return 'TEXT'
            case 'binary':
                return 'BYTEA'
            case 'date':
                return 'DATE'
            case 'time':
                return 'TIME'
            case 'timeTz':
                return 'TIME WITH TIME ZONE'
            case 'dateTime':
            case 'timestamp':
                return 'TIMESTAMP'
            case 'dateTimeTz':
            case 'timestampTz':
                return 'TIMESTAMP WITH TIME ZONE'
            case 'json':
                return 'JSON'
            case 'jsonb':
                return 'JSONB'
            case 'uuid':
                return 'UUID'
            case 'enum':
                // PostgreSQL uses CHECK constraint for enum
                const values = (params.values as string[]).map(v => `'${v}'`).join(', ')
                return `VARCHAR(255) CHECK (${column.name} IN (${values}))`
            case 'set':
                // PostgreSQL doesn't have SET, use array
                return 'TEXT[]'
            case 'macAddress':
                return 'MACADDR'
            case 'ipAddress':
                return 'INET'
            case 'vector':
                const dims = params.dimensions as number | undefined
                return dims ? `VECTOR(${dims})` : 'VECTOR'
            default:
                return 'TEXT'
        }
    }

    protected compileAutoIncrement(): string {
        // PostgreSQL uses SERIAL/BIGSERIAL types, no separate keyword needed
        return ''
    }

    protected supportsUnsigned(): boolean {
        // PostgreSQL doesn't support UNSIGNED
        return false
    }

    // ============================================================================
    // Index Compilation
    // ============================================================================

    protected compileFullTextIndex(table: string, index: IndexDefinition): string {
        const columns = index.columns.map(c => this.wrapColumn(c)).join(' || \' \' || ')
        const config = index.language ?? 'english'
        return `CREATE INDEX ${this.wrapColumn(index.name)} ON ${this.wrapTable(table)} ` +
            `USING GIN (to_tsvector('${config}', ${columns}))`
    }

    protected compileSpatialIndex(table: string, index: IndexDefinition): string {
        const columns = index.columns.map(c => this.wrapColumn(c)).join(', ')
        return `CREATE INDEX ${this.wrapColumn(index.name)} ON ${this.wrapTable(table)} USING GIST (${columns})`
    }

    protected compileDropIndex(_table: string, name: string): string {
        return `DROP INDEX IF EXISTS ${this.wrapColumn(name)}`
    }

    // ============================================================================
    // Utility Methods
    // ============================================================================

    wrapTable(table: string): string {
        return `"${table}"`
    }

    wrapColumn(column: string): string {
        return `"${column}"`
    }

    // ============================================================================
    // Introspection Queries
    // ============================================================================

    compileTableExists(table: string): string {
        return `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${table}'
        )`
    }

    compileColumnExists(table: string, column: string): string {
        return `SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = '${table}' 
            AND column_name = '${column}'
        )`
    }

    compileListTables(): string {
        return `SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    }
}
