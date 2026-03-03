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
export declare class MySQLSchemaGrammar extends SchemaGrammar {
  protected compileType(column: ColumnDefinition): string
  protected compileAutoIncrement(): string
  protected supportsUnsigned(): boolean
  protected compileFullTextIndex(table: string, index: IndexDefinition): string
  protected compileSpatialIndex(table: string, index: IndexDefinition): string
  compileDropIndex(table: string, name: string): string
  wrapTable(table: string): string
  wrapColumn(column: string): string
  compileTableExists(table: string): string
  compileColumnExists(table: string, column: string): string
  compileListTables(): string
}
