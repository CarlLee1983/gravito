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
export class ColumnDefinition {
  /** Column name */
  readonly name: string
  /** Column type */
  readonly type: ColumnType
  /** Type-specific parameters */
  readonly parameters: Record<string, unknown> = {}

  /** Modifiers */
  private _nullable = false
  private _default: unknown = undefined
  private _hasDefault = false
  private _unique = false
  private _index = false
  private _primary = false
  private _unsigned = false
  private _autoIncrement = false
  private _comment: string | undefined
  private _after: string | undefined
  private _first = false
  private _change = false

  /** Foreign key reference */
  private _foreignKey: ForeignKeyDefinition | undefined

  constructor(name: string, type: ColumnType, parameters: Record<string, unknown> = {}) {
    this.name = name
    this.type = type
    this.parameters = parameters
  }

  // ============================================================================
  // Fluent Modifiers
  // ============================================================================

  /**
   * Allow NULL values to be stored in the column.
   *
   * @param value Whether the column should be nullable (defaults to true).
   * @returns The ColumnDefinition instance for chaining.
   */
  nullable(value = true): this {
    this._nullable = value
    return this
  }

  /**
   * Set the default value for the column.
   *
   * @param value The default value.
   * @returns The ColumnDefinition instance for chaining.
   */
  default(value: unknown): this {
    this._default = value
    this._hasDefault = true
    return this
  }

  /**
   * Add a UNIQUE constraint to the column.
   *
   * @returns The ColumnDefinition instance for chaining.
   */
  unique(): this {
    this._unique = true
    return this
  }

  /**
   * Add INDEX
   */
  index(): this {
    this._index = true
    return this
  }

  /**
   * Set the column as a PRIMARY KEY.
   *
   * @returns The ColumnDefinition instance for chaining.
   */
  primary(): this {
    this._primary = true
    return this
  }

  /**
   * Make UNSIGNED (MySQL)
   */
  unsigned(): this {
    this._unsigned = true
    return this
  }

  /**
   * Set AUTO_INCREMENT
   */
  autoIncrement(): this {
    this._autoIncrement = true
    return this
  }

  /**
   * Add column comment
   */
  comment(text: string): this {
    this._comment = text
    return this
  }

  /**
   * Place column after another column (MySQL)
   */
  after(column: string): this {
    this._after = column
    return this
  }

  /**
   * Place column first (MySQL)
   */
  first(): this {
    this._first = true
    return this
  }

  /**
   * Mark column for modification
   */
  change(): this {
    this._change = true
    return this
  }

  // ============================================================================
  // Foreign Key Builder
  // ============================================================================

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
  constrained(table?: string): this {
    const referencedTable = table ?? this.inferTableName()
    this._foreignKey = {
      column: this.name,
      referencedTable,
      referencedColumn: 'id',
      onDelete: undefined,
      onUpdate: undefined,
    }
    return this
  }

  /**
   * Set the ON DELETE action for the foreign key constraint.
   *
   * @param action The action to perform (e.g., 'cascade', 'set null').
   * @returns The ColumnDefinition instance for chaining.
   */
  onDelete(action: ForeignKeyAction): this {
    if (this._foreignKey) {
      this._foreignKey.onDelete = action
    }
    return this
  }

  /**
   * Set ON UPDATE action
   */
  onUpdate(action: ForeignKeyAction): this {
    if (this._foreignKey) {
      this._foreignKey.onUpdate = action
    }
    return this
  }

  /**
   * Set the referenced column (for manual FK definition)
   */
  references(column: string): ForeignKeyBuilder {
    return new ForeignKeyBuilder(this, column)
  }

  // ============================================================================
  // Getters
  // ============================================================================

  isNullable(): boolean {
    return this._nullable
  }

  hasDefaultValue(): boolean {
    return this._hasDefault
  }

  getDefault(): unknown {
    return this._default
  }

  isUnique(): boolean {
    return this._unique
  }

  hasIndex(): boolean {
    return this._index
  }

  isPrimary(): boolean {
    return this._primary
  }

  isUnsigned(): boolean {
    return this._unsigned
  }

  isAutoIncrement(): boolean {
    return this._autoIncrement
  }

  getComment(): string | undefined {
    return this._comment
  }

  getAfter(): string | undefined {
    return this._after
  }

  isFirst(): boolean {
    return this._first
  }

  isChange(): boolean {
    return this._change
  }

  getForeignKey(): ForeignKeyDefinition | undefined {
    return this._foreignKey
  }

  setForeignKey(fk: ForeignKeyDefinition): void {
    this._foreignKey = fk
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private inferTableName(): string {
    // user_id -> users, category_id -> categories
    const base = this.name.replace(/_id$/, '')
    // Simple pluralization
    if (base.endsWith('y')) {
      return `${base.slice(0, -1)}ies`
    }
    return `${base}s`
  }
}

/**
 * Foreign Key Builder
 * For manual foreign key definition: column.references('id').on('users')
 */
class ForeignKeyBuilder {
  private referencedColumn: string

  constructor(
    private readonly column: ColumnDefinition,
    referencedColumn: string
  ) {
    this.referencedColumn = referencedColumn
  }

  /**
   * Set the referenced table
   */
  on(table: string): ColumnDefinition {
    this.column.setForeignKey({
      column: this.column.name,
      referencedTable: table,
      referencedColumn: this.referencedColumn,
      onDelete: undefined,
      onUpdate: undefined,
    })
    return this.column
  }
}
