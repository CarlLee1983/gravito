/**
 * Blueprint
 * @description Fluent interface for defining table schema
 */
import { ColumnDefinition, type ForeignKeyAction } from './ColumnDefinition'
import type { ForeignKeyDefinition, IndexDefinition } from './ForeignKeyDefinition'
/**
 * Blueprint
 *
 * The Blueprint class provides a fluent interface for defining table schema.
 * It is used within the `Schema.create` and `Schema.table` callbacks to
 * define columns, indexes, and foreign keys.
 *
 * @example
 * ```typescript
 * Schema.create('users', (table) => {
 *   table.id()
 *   table.string('email').unique()
 *   table.string('password')
 *   table.timestamps()
 * })
 * ```
 */
export declare class Blueprint {
  /** Table name */
  readonly table: string
  /** Column definitions */
  private _columns
  /** Index definitions */
  private _indexes
  /** Foreign key definitions (standalone) */
  private _foreignKeys
  /** Columns to drop */
  private _dropColumns
  /** Indexes to drop */
  private _dropIndexes
  /** Foreign keys to drop */
  private _dropForeignKeys
  constructor(table: string)
  /**
   * Create a new auto-incrementing BIGINT primary key column.
   *
   * @param name The name of the column (defaults to 'id').
   * @returns The ColumnDefinition instance for further modification.
   */
  id(name?: string): ColumnDefinition
  /**
   * Create a new UUID primary key column.
   *
   * @param name The name of the column (defaults to 'id').
   * @returns The ColumnDefinition instance for further modification.
   */
  uuid(name?: string): ColumnDefinition
  /**
   * Create a new integer column.
   *
   * @param name The name of the column.
   * @returns The ColumnDefinition instance for further modification.
   */
  integer(name: string): ColumnDefinition
  /**
   * SMALLINT column
   */
  smallInteger(name: string): ColumnDefinition
  /**
   * BIGINT column
   */
  bigInteger(name: string): ColumnDefinition
  /**
   * DECIMAL column
   */
  decimal(name: string, precision?: number, scale?: number): ColumnDefinition
  /**
   * FLOAT column
   */
  float(name: string): ColumnDefinition
  /**
   * BOOLEAN column
   */
  boolean(name: string): ColumnDefinition
  /**
   * Create a new string (VARCHAR) column.
   *
   * @param name The name of the column.
   * @param length The maximum length of the string (defaults to 255).
   * @returns The ColumnDefinition instance for further modification.
   */
  string(name: string, length?: number): ColumnDefinition
  /**
   * TEXT column
   */
  text(name: string): ColumnDefinition
  /**
   * ENUM column
   */
  enum(name: string, values: string[]): ColumnDefinition
  /**
   * SET column (MySQL)
   */
  set(name: string, values: string[]): ColumnDefinition
  /**
   * DATE column
   */
  date(name: string): ColumnDefinition
  /**
   * TIME column
   */
  time(name: string): ColumnDefinition
  /**
   * TIME WITH TIME ZONE column
   */
  timeTz(name: string): ColumnDefinition
  /**
   * DATETIME column
   */
  dateTime(name: string): ColumnDefinition
  /**
   * DATETIME WITH TIME ZONE column
   */
  dateTimeTz(name: string): ColumnDefinition
  /**
   * TIMESTAMP column
   */
  timestamp(name: string): ColumnDefinition
  /**
   * TIMESTAMP WITH TIME ZONE column
   */
  timestampTz(name: string): ColumnDefinition
  /**
   * Add `created_at` and `updated_at` TIMESTAMP columns to the table.
   */
  timestamps(): void
  /**
   * created_at and updated_at TIMESTAMP WITH TZ columns
   */
  timestampsTz(): void
  /**
   * deleted_at TIMESTAMP column for soft deletes
   */
  softDeletes(name?: string): ColumnDefinition
  /**
   * deleted_at TIMESTAMP WITH TZ column for soft deletes
   */
  softDeletesTz(name?: string): ColumnDefinition
  /**
   * BINARY/BLOB column
   */
  binary(name: string): ColumnDefinition
  /**
   * JSON column
   */
  json(name: string): ColumnDefinition
  /**
   * JSONB column (PostgreSQL)
   */
  jsonb(name: string): ColumnDefinition
  /**
   * MAC address column
   */
  macAddress(name: string): ColumnDefinition
  /**
   * IP address column
   */
  ipAddress(name: string): ColumnDefinition
  /**
   * VECTOR column (PostgreSQL pgvector)
   */
  vector(name: string, dimensions?: number): ColumnDefinition
  /**
   * remember_token VARCHAR(100) column
   */
  rememberToken(): ColumnDefinition
  /**
   * Create a new BIGINT UNSIGNED column for a foreign key.
   *
   * @param name The name of the column.
   * @returns The ColumnDefinition instance for further modification.
   *
   * @example
   * ```typescript
   * table.foreignId('user_id').constrained().onDelete('cascade')
   * ```
   */
  foreignId(name: string): ColumnDefinition
  /**
   * Add a standalone foreign key constraint to the table.
   *
   * @param column The name of the local column.
   * @returns A ForeignKeyBuilder instance to define the reference.
   *
   * @example
   * ```typescript
   * table.foreign('user_id').references('id').on('users')
   * ```
   */
  foreign(column: string): ForeignKeyBuilder
  /**
   * Add PRIMARY KEY constraint
   */
  primary(columns: string | string[], name?: string): this
  /**
   * Add a UNIQUE index to the table.
   *
   * @param columns The column(s) to include in the index.
   * @param name The name of the index (optional).
   * @returns The Blueprint instance for chaining.
   */
  unique(columns: string | string[], name?: string): this
  /**
   * Add a basic index to the table.
   *
   * @param columns The column(s) to include in the index.
   * @param name The name of the index (optional).
   * @returns The Blueprint instance for chaining.
   */
  index(columns: string | string[], name?: string): this
  /**
   * Add FULLTEXT index
   */
  fullText(columns: string | string[], language?: string, name?: string): this
  /**
   * Add SPATIAL index (not supported in SQLite)
   */
  spatialIndex(columns: string | string[], name?: string): this
  /**
   * Drop a column
   */
  dropColumn(column: string | string[]): this
  /**
   * Drop an index
   */
  dropIndex(name: string | string[]): this
  /**
   * Drop a foreign key
   */
  dropForeign(columns: string | string[]): this
  getColumns(): ColumnDefinition[]
  getIndexes(): IndexDefinition[]
  getForeignKeys(): ForeignKeyDefinition[]
  getDropColumns(): string[]
  getDropIndexes(): string[]
  getDropForeignKeys(): string[]
  private addColumn
  addForeignKey(fk: ForeignKeyDefinition): void
}
/**
 * Foreign Key Builder (for standalone FK definitions)
 */
declare class ForeignKeyBuilder {
  private readonly blueprint
  private column
  private referencedColumn
  private referencedTable
  private onDeleteAction
  private onUpdateAction
  constructor(blueprint: Blueprint, column: string)
  /**
   * Set the referenced column
   */
  references(column: string): this
  /**
   * Set the referenced table
   */
  on(table: string): this
  /**
   * Set ON DELETE action
   */
  onDelete(action: ForeignKeyAction): this
  /**
   * Set ON UPDATE action
   */
  onUpdate(action: ForeignKeyAction): this
  private finalize
  private updateForeignKey
}
