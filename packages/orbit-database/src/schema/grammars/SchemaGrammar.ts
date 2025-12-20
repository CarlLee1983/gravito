/**
 * Schema Grammar
 * @description Base class for generating DDL SQL statements
 */

import type { Blueprint } from '../Blueprint'
import type { ColumnDefinition } from '../ColumnDefinition'
import type { IndexDefinition, ForeignKeyDefinition } from '../ForeignKeyDefinition'

/**
 * Schema Grammar
 * Generates DDL SQL statements from Blueprint definitions
 */
export abstract class SchemaGrammar {
    // ============================================================================
    // Table Operations
    // ============================================================================

    /**
     * Compile CREATE TABLE statement
     */
    compileCreate(blueprint: Blueprint): string {
        const columns = blueprint.getColumns()
        const columnsSql = columns.map(col => this.compileColumn(col)).join(',\n  ')

        // Primary key constraints
        const primaryCols = columns.filter(col => col.isPrimary())
        const primarySql = primaryCols.length > 1
            ? `,\n  PRIMARY KEY (${primaryCols.map(c => this.wrapColumn(c.name)).join(', ')})`
            : ''

        // Foreign key constraints
        const fks = blueprint.getForeignKeys()
        const fksSql = fks.length > 0
            ? ',\n  ' + fks.map(fk => this.compileForeignKey(fk)).join(',\n  ')
            : ''

        return `CREATE TABLE ${this.wrapTable(blueprint.table)} (\n  ${columnsSql}${primarySql}${fksSql}\n)`
    }

    /**
     * Compile DROP TABLE statement
     */
    compileDrop(table: string): string {
        return `DROP TABLE ${this.wrapTable(table)}`
    }

    /**
     * Compile DROP TABLE IF EXISTS statement
     */
    compileDropIfExists(table: string): string {
        return `DROP TABLE IF EXISTS ${this.wrapTable(table)}`
    }

    /**
     * Compile ALTER TABLE statement
     */
    compileAlter(blueprint: Blueprint): string[] {
        const statements: string[] = []
        const table = this.wrapTable(blueprint.table)

        // Add columns
        for (const column of blueprint.getColumns()) {
            statements.push(`ALTER TABLE ${table} ADD COLUMN ${this.compileColumn(column)}`)
        }

        // Drop columns
        for (const columnName of blueprint.getDropColumns()) {
            statements.push(`ALTER TABLE ${table} DROP COLUMN ${this.wrapColumn(columnName)}`)
        }

        // Add indexes
        for (const index of blueprint.getIndexes()) {
            statements.push(this.compileIndex(blueprint.table, index))
        }

        // Drop indexes
        for (const indexName of blueprint.getDropIndexes()) {
            statements.push(this.compileDropIndex(blueprint.table, indexName))
        }

        // Add foreign keys
        for (const fk of blueprint.getForeignKeys()) {
            statements.push(`ALTER TABLE ${table} ADD ${this.compileForeignKey(fk)}`)
        }

        return statements
    }

    // ============================================================================
    // Column Compilation
    // ============================================================================

    /**
     * Compile a column definition
     */
    protected compileColumn(column: ColumnDefinition): string {
        const parts: string[] = [
            this.wrapColumn(column.name),
            this.compileType(column),
        ]

        // Modifiers
        if (column.isUnsigned() && this.supportsUnsigned()) {
            parts.push('UNSIGNED')
        }

        if (column.isAutoIncrement()) {
            parts.push(this.compileAutoIncrement())
        }

        if (column.isNullable()) {
            parts.push('NULL')
        } else {
            parts.push('NOT NULL')
        }

        if (column.hasDefaultValue()) {
            parts.push(`DEFAULT ${this.compileDefault(column.getDefault())}`)
        }

        if (column.isPrimary() && !column.isAutoIncrement()) {
            parts.push('PRIMARY KEY')
        }

        if (column.isUnique()) {
            parts.push('UNIQUE')
        }

        if (column.getComment()) {
            parts.push(`COMMENT ${this.quoteString(column.getComment()!)}`)
        }

        return parts.join(' ')
    }

    /**
     * Compile column type
     */
    protected abstract compileType(column: ColumnDefinition): string

    /**
     * Compile auto increment syntax
     */
    protected abstract compileAutoIncrement(): string

    /**
     * Check if database supports UNSIGNED
     */
    protected abstract supportsUnsigned(): boolean

    /**
     * Compile default value
     */
    protected compileDefault(value: unknown): string {
        if (value === null) return 'NULL'
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
        if (typeof value === 'number') return String(value)
        if (typeof value === 'string') return this.quoteString(value)
        return String(value)
    }

    // ============================================================================
    // Index Compilation
    // ============================================================================

    /**
     * Compile CREATE INDEX statement
     */
    protected compileIndex(table: string, index: IndexDefinition): string {
        const columns = index.columns.map(c => this.wrapColumn(c)).join(', ')

        switch (index.type) {
            case 'primary':
                return `ALTER TABLE ${this.wrapTable(table)} ADD PRIMARY KEY (${columns})`
            case 'unique':
                return `CREATE UNIQUE INDEX ${this.wrapColumn(index.name)} ON ${this.wrapTable(table)} (${columns})`
            case 'fulltext':
                return this.compileFullTextIndex(table, index)
            case 'spatial':
                return this.compileSpatialIndex(table, index)
            default:
                return `CREATE INDEX ${this.wrapColumn(index.name)} ON ${this.wrapTable(table)} (${columns})`
        }
    }

    /**
     * Compile fulltext index (override in subclasses)
     */
    protected abstract compileFullTextIndex(table: string, index: IndexDefinition): string

    /**
     * Compile spatial index (override in subclasses)
     */
    protected abstract compileSpatialIndex(table: string, index: IndexDefinition): string

    /**
     * Compile DROP INDEX statement
     */
    protected abstract compileDropIndex(table: string, name: string): string

    // ============================================================================
    // Foreign Key Compilation
    // ============================================================================

    /**
     * Compile FOREIGN KEY constraint
     */
    protected compileForeignKey(fk: ForeignKeyDefinition): string {
        let sql = `CONSTRAINT fk_${fk.column} FOREIGN KEY (${this.wrapColumn(fk.column)}) ` +
            `REFERENCES ${this.wrapTable(fk.referencedTable)} (${this.wrapColumn(fk.referencedColumn)})`

        if (fk.onDelete) {
            sql += ` ON DELETE ${fk.onDelete.toUpperCase()}`
        }
        if (fk.onUpdate) {
            sql += ` ON UPDATE ${fk.onUpdate.toUpperCase()}`
        }

        return sql
    }

    // ============================================================================
    // Utility Methods
    // ============================================================================

    /**
     * Wrap table name with quotes
     */
    abstract wrapTable(table: string): string

    /**
     * Wrap column name with quotes
     */
    abstract wrapColumn(column: string): string

    /**
     * Quote a string value
     */
    protected quoteString(value: string): string {
        return `'${value.replace(/'/g, "''")}'`
    }

    // ============================================================================
    // Introspection Queries
    // ============================================================================

    /**
     * Compile query to check if table exists
     */
    abstract compileTableExists(table: string): string

    /**
     * Compile query to check if column exists
     */
    abstract compileColumnExists(table: string, column: string): string

    /**
     * Compile query to list all tables
     */
    abstract compileListTables(): string
}
