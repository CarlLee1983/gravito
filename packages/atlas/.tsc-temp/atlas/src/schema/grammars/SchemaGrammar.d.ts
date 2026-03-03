/**
 * Schema Grammar
 * @description Base class for generating DDL SQL statements
 */
import type { Blueprint } from '../Blueprint'
import type { ColumnDefinition } from '../ColumnDefinition'
import type { ForeignKeyDefinition, IndexDefinition } from '../ForeignKeyDefinition'
/**
 * Schema Grammar
 * Generates DDL SQL statements from Blueprint definitions
 */
export declare abstract class SchemaGrammar {
  /**
   * Compile CREATE TABLE statement
   */
  compileCreate(blueprint: Blueprint): string
  /**
   * Compile DROP TABLE statement
   */
  compileDrop(table: string): string
  /**
   * Compile DROP TABLE IF EXISTS statement
   */
  compileDropIfExists(table: string): string
  /**
   * Compile ALTER TABLE statement
   */
  compileAlter(blueprint: Blueprint): string[]
  /**
   * Determine if primary key should be added at the bottom of the statement
   */
  protected shouldAddPrimaryAtBottom(blueprint: Blueprint): boolean
  /**
   * Compile a column definition
   */
  protected compileColumn(column: ColumnDefinition, _blueprint: Blueprint): string
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
  protected compileDefault(value: unknown): string
  /**
   * Compile CREATE INDEX statement
   */
  compileIndex(table: string, index: IndexDefinition): string
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
  abstract compileDropIndex(table: string, name: string): string
  /**
   * Compile FOREIGN KEY constraint
   */
  protected compileForeignKey(fk: ForeignKeyDefinition): string
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
  protected quoteString(value: string): string
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
