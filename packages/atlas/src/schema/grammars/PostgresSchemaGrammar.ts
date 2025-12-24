/**
 * PostgreSQL Schema Grammar
 * @description DDL generation for PostgreSQL
 */

import type { Blueprint } from '../Blueprint'
import type { ColumnDefinition } from '../ColumnDefinition'
import type { IndexDefinition } from '../ForeignKeyDefinition'
import { SchemaGrammar } from './SchemaGrammar'

/**
 * PostgreSQL Schema Grammar
 */
export class PostgresSchemaGrammar extends SchemaGrammar {
  protected wrapChar = '"'

  // ============================================================================
  // Column Type Compilation
  // ============================================================================

  protected compileType(column: ColumnDefinition): string {
    const params = column.parameters

    switch (column.type) {
      case 'bigInteger':
        return 'BIGINT'
      case 'integer':
        return 'INTEGER'
      case 'smallInteger':
        return 'SMALLINT'
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
      case 'timeTz':
        return 'TIME'
      case 'dateTime':
      case 'dateTimeTz':
        return 'TIMESTAMP'
      case 'timestamp':
        return 'TIMESTAMP WITHOUT TIME ZONE'
      case 'timestampTz':
        return 'TIMESTAMP WITH TIME ZONE'
      case 'json':
      case 'jsonb':
        return 'JSONB'
      case 'uuid':
        return 'UUID'
      case 'enum':
        return 'VARCHAR(255)'
      case 'set':
        return 'VARCHAR(255)'
      case 'macAddress':
        return 'MACADDR'
      case 'ipAddress':
        return 'INET'
      case 'vector':
        return 'VECTOR'
      default:
        return 'TEXT'
    }
  }

  protected compileAutoIncrement(): string {
    // Postgres uses SERIAL types which already include the integer type and auto-increment logic
    // We'll return an empty string here because we override compileColumn for this
    return ''
  }

  protected override compileColumn(column: ColumnDefinition, blueprint: Blueprint): string {
    if (column.isAutoIncrement()) {
        const serialType = column.type === 'bigInteger' ? 'BIGSERIAL' : 'SERIAL'
        // If it's a primary key and we aren't adding it at the bottom, add it here
        const primary = (column.isPrimary() && !this.shouldAddPrimaryAtBottom(blueprint)) ? ' PRIMARY KEY' : ''
        return `${this.wrapColumn(column.name)} ${serialType}${primary}`
    }
    return super.compileColumn(column, blueprint)
  }

  protected supportsUnsigned(): boolean {
    return false
  }

  // ============================================================================
  // Index Compilation
  // ============================================================================

  protected compileFullTextIndex(table: string, index: IndexDefinition): string {
    const columns = index.columns.map((c) => `to_tsvector('english', ${this.wrapColumn(c)})`).join(' || ')
    return `CREATE INDEX ${this.wrapColumn(index.name)} ON ${this.wrapTable(table)} USING GIN (${columns})`
  }

  protected compileSpatialIndex(table: string, index: IndexDefinition): string {
    const columns = index.columns.map((c) => this.wrapColumn(c)).join(', ')
    return `CREATE INDEX ${this.wrapColumn(index.name)} ON ${this.wrapTable(table)} USING GIST (${columns})`
  }

  public compileDropIndex(_table: string, name: string): string {
    return `DROP INDEX ${this.wrapColumn(name)}`
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
    return `SELECT count(*) as count FROM information_schema.tables WHERE table_name = '${table}'`
  }

  compileColumnExists(table: string, column: string): string {
    return `SELECT count(*) as count FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${column}'`
  }

  compileListTables(): string {
    return `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  }
}