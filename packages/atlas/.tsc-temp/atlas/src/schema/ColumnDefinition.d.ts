/**
 * Column Definition
 * @description Represents a column in a table schema with fluent modifiers
 */
import type { ForeignKeyDefinition } from './ForeignKeyDefinition'
/**
 * Column data type
 */
export type ColumnType =
  | 'bigInteger'
  | 'binary'
  | 'boolean'
  | 'date'
  | 'dateTime'
  | 'dateTimeTz'
  | 'decimal'
  | 'enum'
  | 'float'
  | 'integer'
  | 'ipAddress'
  | 'json'
  | 'jsonb'
  | 'macAddress'
  | 'set'
  | 'smallInteger'
  | 'string'
  | 'text'
  | 'time'
  | 'timeTz'
  | 'timestamp'
  | 'timestampTz'
  | 'uuid'
  | 'vector'
/**
 * Foreign key action
 */
export type ForeignKeyAction = 'cascade' | 'restrict' | 'no action' | 'set null' | 'set default'
/**
 * Column Definition
 *
 * The ColumnDefinition class represents a column in a database table.
 * It provides a fluent interface for defining column properties such as
 * nullability, default values, indexes, and foreign key constraints.
 */
export declare class ColumnDefinition {
  /** Column name */
  readonly name: string
  /** Column type */
  readonly type: ColumnType
  /** Type-specific parameters */
  readonly parameters: Record<string, unknown>
  /** Modifiers */
  private _nullable
  private _default
  private _hasDefault
  private _unique
  private _index
  private _primary
  private _unsigned
  private _autoIncrement
  private _comment
  private _after
  private _first
  private _change
  /** Foreign key reference */
  private _foreignKey
  constructor(name: string, type: ColumnType, parameters?: Record<string, unknown>)
  /**
   * Allow NULL values to be stored in the column.
   *
   * @param value Whether the column should be nullable (defaults to true).
   * @returns The ColumnDefinition instance for chaining.
   */
  nullable(value?: boolean): this
  /**
   * Set the default value for the column.
   *
   * @param value The default value.
   * @returns The ColumnDefinition instance for chaining.
   */
  default(value: unknown): this
  /**
   * Add a UNIQUE constraint to the column.
   *
   * @returns The ColumnDefinition instance for chaining.
   */
  unique(): this
  /**
   * Add INDEX
   */
  index(): this
  /**
   * Set the column as a PRIMARY KEY.
   *
   * @returns The ColumnDefinition instance for chaining.
   */
  primary(): this
  /**
   * Make UNSIGNED (MySQL)
   */
  unsigned(): this
  /**
   * Set AUTO_INCREMENT
   */
  autoIncrement(): this
  /**
   * Add column comment
   */
  comment(text: string): this
  /**
   * Place column after another column (MySQL)
   */
  after(column: string): this
  /**
   * Place column first (MySQL)
   */
  first(): this
  /**
   * Mark column for modification
   */
  change(): this
  /**
   * Define a foreign key constraint for the column.
   *
   * @param table The name of the referenced table (inferred from column name if not provided).
   * @returns The ColumnDefinition instance for chaining.
   *
   * @example
   * ```typescript
   * table.foreignId('user_id').constrained('users')
   * ```
   */
  constrained(table?: string): this
  /**
   * Set the ON DELETE action for the foreign key constraint.
   *
   * @param action The action to perform (e.g., 'cascade', 'set null').
   * @returns The ColumnDefinition instance for chaining.
   */
  onDelete(action: ForeignKeyAction): this
  /**
   * Set ON UPDATE action
   */
  onUpdate(action: ForeignKeyAction): this
  /**
   * Set the referenced column (for manual FK definition)
   */
  references(column: string): ForeignKeyBuilder
  isNullable(): boolean
  hasDefaultValue(): boolean
  getDefault(): unknown
  isUnique(): boolean
  hasIndex(): boolean
  isPrimary(): boolean
  isUnsigned(): boolean
  isAutoIncrement(): boolean
  getComment(): string | undefined
  getAfter(): string | undefined
  isFirst(): boolean
  isChange(): boolean
  getForeignKey(): ForeignKeyDefinition | undefined
  setForeignKey(fk: ForeignKeyDefinition): void
  private inferTableName
}
/**
 * Foreign Key Builder
 * For manual foreign key definition: column.references('id').on('users')
 */
declare class ForeignKeyBuilder {
  private readonly column
  private referencedColumn
  constructor(column: ColumnDefinition, referencedColumn: string)
  /**
   * Set the referenced table
   */
  on(table: string): ColumnDefinition
}
