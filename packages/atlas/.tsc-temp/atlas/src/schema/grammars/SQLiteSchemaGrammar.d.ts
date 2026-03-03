/**
 * SQLite Schema Grammar
 * @description DDL generation for SQLite
 */
import type { Blueprint } from '../Blueprint'
import type { ColumnDefinition } from '../ColumnDefinition'
import type { IndexDefinition } from '../ForeignKeyDefinition'
import { SchemaGrammar } from './SchemaGrammar'
/**
 * SQLite Schema Grammar
 * Generates SQL DDL statements specifically for SQLite databases.
 * @internal
 */
export declare class SQLiteSchemaGrammar extends SchemaGrammar {
  protected wrapChar: string
  compileCreate(blueprint: Blueprint): string
  wrapTable(table: string): string
  wrapColumn(column: string): string
  compileTableExists(table: string): string
  compileColumnExists(table: string, column: string): string
  compileListTables(): string
  protected compileType(column: ColumnDefinition): string
  protected compileAutoIncrement(): string
  protected supportsUnsigned(): boolean
  protected compileFullTextIndex(_table: string, _index: IndexDefinition): string
  protected compileSpatialIndex(_table: string, _index: IndexDefinition): string
  compileDropIndex(_table: string, name: string): string
}
