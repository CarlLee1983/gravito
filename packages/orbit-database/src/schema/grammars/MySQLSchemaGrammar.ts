/**
 * MySQL Schema Grammar
 * @description DDL generation for MySQL/MariaDB
 */

import type { ColumnDefinition } from '../ColumnDefinition'
import type { IndexDefinition } from '../ForeignKeyDefinition'
import { SchemaGrammar } from './SchemaGrammar'

/**
 * MySQL Schema Grammar
 */
export class MySQLSchemaGrammar extends SchemaGrammar {
    // ============================================================================
    // Column Type Compilation
    // ============================================================================

    protected compileType(column: ColumnDefinition): string {
        const params = column.parameters

        switch (column.type) {
            case 'bigInteger':
                return 'BIGINT'
            case 'integer':
                return 'INT'
            case 'smallInteger':
                return 'SMALLINT'
            case 'boolean':
                return 'TINYINT(1)'
            case 'decimal':
                return `DECIMAL(${params.precision ?? 8}, ${params.scale ?? 2})`
            case 'float':
                return 'DOUBLE'
            case 'string':
                return `VARCHAR(${params.length ?? 255})`
            case 'text':
                return 'TEXT'
            case 'binary':
                return 'BLOB'
            case 'date':
                return 'DATE'
            case 'time':
            case 'timeTz':
                return 'TIME'
            case 'dateTime':
            case 'dateTimeTz':
                return 'DATETIME'
            case 'timestamp':
            case 'timestampTz':
                return 'TIMESTAMP'
            case 'json':
            case 'jsonb':
                return 'JSON'
            case 'uuid':
                return 'CHAR(36)'
            case 'enum':
                const enumValues = (params.values as string[]).map(v => `'${v}'`).join(', ')
                return `ENUM(${enumValues})`
            case 'set':
                const setValues = (params.values as string[]).map(v => `'${v}'`).join(', ')
                return `SET(${setValues})`
            case 'macAddress':
                return 'VARCHAR(17)'
            case 'ipAddress':
                return 'VARCHAR(45)'
            case 'vector':
                // MySQL doesn't natively support vector, use JSON
                return 'JSON'
            default:
                return 'TEXT'
        }
    }

    protected compileAutoIncrement(): string {
        return 'AUTO_INCREMENT'
    }

    protected supportsUnsigned(): boolean {
        return true
    }

    // ============================================================================
    // Index Compilation
    // ============================================================================

    protected compileFullTextIndex(table: string, index: IndexDefinition): string {
        const columns = index.columns.map(c => this.wrapColumn(c)).join(', ')
        return `CREATE FULLTEXT INDEX ${this.wrapColumn(index.name)} ON ${this.wrapTable(table)} (${columns})`
    }

    protected compileSpatialIndex(table: string, index: IndexDefinition): string {
        const columns = index.columns.map(c => this.wrapColumn(c)).join(', ')
        return `CREATE SPATIAL INDEX ${this.wrapColumn(index.name)} ON ${this.wrapTable(table)} (${columns})`
    }

    protected compileDropIndex(table: string, name: string): string {
        return `DROP INDEX ${this.wrapColumn(name)} ON ${this.wrapTable(table)}`
    }

    // ============================================================================
    // Utility Methods
    // ============================================================================

    wrapTable(table: string): string {
        return `\`${table}\``
    }

    wrapColumn(column: string): string {
        return `\`${column}\``
    }

    // ============================================================================
    // Introspection Queries
    // ============================================================================

    compileTableExists(table: string): string {
        return `SELECT COUNT(*) as count FROM information_schema.tables 
                WHERE table_schema = DATABASE() AND table_name = '${table}'`
    }

    compileColumnExists(table: string, column: string): string {
        return `SELECT COUNT(*) as count FROM information_schema.columns 
                WHERE table_schema = DATABASE() AND table_name = '${table}' AND column_name = '${column}'`
    }

    compileListTables(): string {
        return `SELECT table_name FROM information_schema.tables 
                WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`
    }
}
