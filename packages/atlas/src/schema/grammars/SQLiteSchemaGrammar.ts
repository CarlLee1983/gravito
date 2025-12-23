/**
 * SQLite Schema Grammar
 * @description DDL generation for SQLite
 */

import type { ColumnDefinition } from '../ColumnDefinition'
import type { IndexDefinition } from '../ForeignKeyDefinition'
import { SchemaGrammar } from './SchemaGrammar'

export class SQLiteSchemaGrammar extends SchemaGrammar {
  protected wrapChar = '"'

  wrapTable(table: string): string {
    return `${this.wrapChar}${table}${this.wrapChar}`
  }

  wrapColumn(column: string): string {
    return `${this.wrapChar}${column}${this.wrapChar}`
  }

  compileTableExists(table: string): string {
    return `SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='${table}'`
  }

  compileColumnExists(table: string, column: string): string {
    return `SELECT count(*) as count FROM pragma_table_info('${table}') WHERE name='${column}'`
  }

  compileListTables(): string {
    return `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
  }

  protected compileType(column: ColumnDefinition): string {
    switch (column.type) {
      case 'integer':
      case 'bigInteger':
        return 'INTEGER'
      case 'string':
      case 'text':
      case 'uuid':
        return 'TEXT'
      case 'boolean':
        return 'INTEGER'
      case 'float':
      case 'decimal':
        return 'REAL'
      case 'date':
      case 'dateTime':
      case 'timestamp':
        return 'TEXT'
      case 'json':
        return 'TEXT'
      case 'binary':
        return 'BLOB'
      default:
        return 'TEXT'
    }
  }

  protected compileAutoIncrement(): string {
    // In SQLite, AUTOINCREMENT is only allowed on INTEGER PRIMARY KEY
    return 'PRIMARY KEY AUTOINCREMENT'
  }

  protected supportsUnsigned(): boolean {
    return false
  }

  protected compileFullTextIndex(_table: string, _index: IndexDefinition): string {
    throw new Error('Fulltext indexes are not supported in SQLite via standard CREATE INDEX')
  }

  protected compileSpatialIndex(_table: string, _index: IndexDefinition): string {
    throw new Error('Spatial indexes are not supported in SQLite')
  }

  public compileDropIndex(_table: string, name: string): string {
    return `DROP INDEX ${this.wrapColumn(name)}`
  }
}
