/**
 * Blueprint
 * @description Fluent interface for defining table schema
 */

import { ColumnDefinition, type ColumnType, type ForeignKeyAction } from './ColumnDefinition'
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
export class Blueprint {
  /** Table name */
  readonly table: string

  /** Column definitions */
  private _columns: ColumnDefinition[] = []

  /** Index definitions */
  private _indexes: IndexDefinition[] = []

  /** Foreign key definitions (standalone) */
  private _foreignKeys: ForeignKeyDefinition[] = []

  /** Columns to drop */
  private _dropColumns: string[] = []

  /** Indexes to drop */
  private _dropIndexes: string[] = []

  /** Foreign keys to drop */
  private _dropForeignKeys: string[] = []

  constructor(table: string) {
    this.table = table
  }

  // ============================================================================
  // ID / Primary Key Columns
  // ============================================================================

  /**
   * Create a new auto-incrementing BIGINT primary key column.
   *
   * @param name The name of the column (defaults to 'id').
   * @returns The ColumnDefinition instance for further modification.
   */
  id(name = 'id'): ColumnDefinition {
    return this.bigInteger(name).unsigned().autoIncrement().primary()
  }

  /**
   * Create a new UUID primary key column.
   *
   * @param name The name of the column (defaults to 'id').
   * @returns The ColumnDefinition instance for further modification.
   */
  uuid(name = 'id'): ColumnDefinition {
    return this.addColumn(name, 'uuid')
  }

  // ============================================================================
  // Numeric Columns
  // ============================================================================

  /**
   * Create a new integer column.
   *
   * @param name The name of the column.
   * @returns The ColumnDefinition instance for further modification.
   */
  integer(name: string): ColumnDefinition {
    return this.addColumn(name, 'integer')
  }

  /**
   * SMALLINT column
   */
  smallInteger(name: string): ColumnDefinition {
    return this.addColumn(name, 'smallInteger')
  }

  /**
   * BIGINT column
   */
  bigInteger(name: string): ColumnDefinition {
    return this.addColumn(name, 'bigInteger')
  }

  /**
   * DECIMAL column
   */
  decimal(name: string, precision = 8, scale = 2): ColumnDefinition {
    return this.addColumn(name, 'decimal', { precision, scale })
  }

  /**
   * FLOAT column
   */
  float(name: string): ColumnDefinition {
    return this.addColumn(name, 'float')
  }

  /**
   * BOOLEAN column
   */
  boolean(name: string): ColumnDefinition {
    return this.addColumn(name, 'boolean')
  }

  // ============================================================================
  // String Columns
  // ============================================================================

  /**
   * Create a new string (VARCHAR) column.
   *
   * @param name The name of the column.
   * @param length The maximum length of the string (defaults to 255).
   * @returns The ColumnDefinition instance for further modification.
   */
  string(name: string, length = 255): ColumnDefinition {
    return this.addColumn(name, 'string', { length })
  }

  /**
   * TEXT column
   */
  text(name: string): ColumnDefinition {
    return this.addColumn(name, 'text')
  }

  /**
   * ENUM column
   */
  enum(name: string, values: string[]): ColumnDefinition {
    return this.addColumn(name, 'enum', { values })
  }

  /**
   * SET column (MySQL)
   */
  set(name: string, values: string[]): ColumnDefinition {
    return this.addColumn(name, 'set', { values })
  }

  // ============================================================================
  // Date/Time Columns
  // ============================================================================

  /**
   * DATE column
   */
  date(name: string): ColumnDefinition {
    return this.addColumn(name, 'date')
  }

  /**
   * TIME column
   */
  time(name: string): ColumnDefinition {
    return this.addColumn(name, 'time')
  }

  /**
   * TIME WITH TIME ZONE column
   */
  timeTz(name: string): ColumnDefinition {
    return this.addColumn(name, 'timeTz')
  }

  /**
   * DATETIME column
   */
  dateTime(name: string): ColumnDefinition {
    return this.addColumn(name, 'dateTime')
  }

  /**
   * DATETIME WITH TIME ZONE column
   */
  dateTimeTz(name: string): ColumnDefinition {
    return this.addColumn(name, 'dateTimeTz')
  }

  /**
   * TIMESTAMP column
   */
  timestamp(name: string): ColumnDefinition {
    return this.addColumn(name, 'timestamp')
  }

  /**
   * TIMESTAMP WITH TIME ZONE column
   */
  timestampTz(name: string): ColumnDefinition {
    return this.addColumn(name, 'timestampTz')
  }

  /**
   * Add `created_at` and `updated_at` TIMESTAMP columns to the table.
   */
  timestamps(): void {
    this.timestamp('created_at').nullable()
    this.timestamp('updated_at').nullable()
  }

  /**
   * created_at and updated_at TIMESTAMP WITH TZ columns
   */
  timestampsTz(): void {
    this.timestampTz('created_at').nullable()
    this.timestampTz('updated_at').nullable()
  }

  /**
   * deleted_at TIMESTAMP column for soft deletes
   */
  softDeletes(name = 'deleted_at'): ColumnDefinition {
    return this.timestamp(name).nullable()
  }

  /**
   * deleted_at TIMESTAMP WITH TZ column for soft deletes
   */
  softDeletesTz(name = 'deleted_at'): ColumnDefinition {
    return this.timestampTz(name).nullable()
  }

  // ============================================================================
  // Binary & JSON Columns
  // ============================================================================

  /**
   * BINARY/BLOB column
   */
  binary(name: string): ColumnDefinition {
    return this.addColumn(name, 'binary')
  }

  /**
   * JSON column
   */
  json(name: string): ColumnDefinition {
    return this.addColumn(name, 'json')
  }

  /**
   * JSONB column (PostgreSQL)
   */
  jsonb(name: string): ColumnDefinition {
    return this.addColumn(name, 'jsonb')
  }

  // ============================================================================
  // Special Columns
  // ============================================================================

  /**
   * MAC address column
   */
  macAddress(name: string): ColumnDefinition {
    return this.addColumn(name, 'macAddress')
  }

  /**
   * IP address column
   */
  ipAddress(name: string): ColumnDefinition {
    return this.addColumn(name, 'ipAddress')
  }

  /**
   * VECTOR column (PostgreSQL pgvector)
   */
  vector(name: string, dimensions?: number): ColumnDefinition {
    return this.addColumn(name, 'vector', dimensions ? { dimensions } : {})
  }

  /**
   * remember_token VARCHAR(100) column
   */
  rememberToken(): ColumnDefinition {
    return this.string('remember_token', 100).nullable()
  }

  // ============================================================================
  // Foreign Key Columns
  // ============================================================================

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
  foreignId(name: string): ColumnDefinition {
    return this.bigInteger(name).unsigned()
  }

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
  foreign(column: string): ForeignKeyBuilder {
    return new ForeignKeyBuilder(this, column)
  }

  // ============================================================================
  // Index Methods
  // ============================================================================

  /**
   * Add PRIMARY KEY constraint
   */
  primary(columns: string | string[], name?: string): this {
    const cols = Array.isArray(columns) ? columns : [columns]
    this._indexes.push({
      name: name ?? `${this.table}_${cols.join('_')}_primary`,
      type: 'primary',
      columns: cols,
    })
    return this
  }

  /**
   * Add a UNIQUE index to the table.
   *
   * @param columns The column(s) to include in the index.
   * @param name The name of the index (optional).
   * @returns The Blueprint instance for chaining.
   */
  unique(columns: string | string[], name?: string): this {
    const cols = Array.isArray(columns) ? columns : [columns]
    this._indexes.push({
      name: name ?? `${this.table}_${cols.join('_')}_unique`,
      type: 'unique',
      columns: cols,
    })
    return this
  }

  /**
   * Add a basic index to the table.
   *
   * @param columns The column(s) to include in the index.
   * @param name The name of the index (optional).
   * @returns The Blueprint instance for chaining.
   */
  index(columns: string | string[], name?: string): this {
    const cols = Array.isArray(columns) ? columns : [columns]
    this._indexes.push({
      name: name ?? `${this.table}_${cols.join('_')}_index`,
      type: 'index',
      columns: cols,
    })
    return this
  }

  /**
   * Add FULLTEXT index
   */
  fullText(columns: string | string[], language?: string, name?: string): this {
    const cols = Array.isArray(columns) ? columns : [columns]
    this._indexes.push({
      name: name ?? `${this.table}_${cols.join('_')}_fulltext`,
      type: 'fulltext',
      columns: cols,
      language,
    })
    return this
  }

  /**
   * Add SPATIAL index (not supported in SQLite)
   */
  spatialIndex(columns: string | string[], name?: string): this {
    const cols = Array.isArray(columns) ? columns : [columns]
    this._indexes.push({
      name: name ?? `${this.table}_${cols.join('_')}_spatial`,
      type: 'spatial',
      columns: cols,
    })
    return this
  }

  // ============================================================================
  // Drop Operations
  // ============================================================================

  /**
   * Drop a column
   */
  dropColumn(column: string | string[]): this {
    const cols = Array.isArray(column) ? column : [column]
    this._dropColumns.push(...cols)
    return this
  }

  /**
   * Drop an index
   */
  dropIndex(name: string | string[]): this {
    const names = Array.isArray(name) ? name : [name]
    this._dropIndexes.push(...names)
    return this
  }

  /**
   * Drop a foreign key
   */
  dropForeign(columns: string | string[]): this {
    const cols = Array.isArray(columns) ? columns : [columns]
    this._dropForeignKeys.push(...cols)
    return this
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getColumns(): ColumnDefinition[] {
    return [...this._columns]
  }

  getIndexes(): IndexDefinition[] {
    return [...this._indexes]
  }

  getForeignKeys(): ForeignKeyDefinition[] {
    // Combine standalone FKs with column-defined FKs
    const columnFks = this._columns
      .map((col) => col.getForeignKey())
      .filter((fk): fk is ForeignKeyDefinition => fk !== undefined)
    return [...this._foreignKeys, ...columnFks]
  }

  getDropColumns(): string[] {
    return [...this._dropColumns]
  }

  getDropIndexes(): string[] {
    return [...this._dropIndexes]
  }

  getDropForeignKeys(): string[] {
    return [...this._dropForeignKeys]
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private addColumn(
    name: string,
    type: ColumnType,
    parameters: Record<string, unknown> = {}
  ): ColumnDefinition {
    const column = new ColumnDefinition(name, type, parameters)
    this._columns.push(column)
    return column
  }

  addForeignKey(fk: ForeignKeyDefinition): void {
    this._foreignKeys.push(fk)
  }
}

/**
 * Foreign Key Builder (for standalone FK definitions)
 */
class ForeignKeyBuilder {
  private column: string
  private referencedColumn: string | undefined
  private referencedTable: string | undefined
  private onDeleteAction: ForeignKeyAction | undefined
  private onUpdateAction: ForeignKeyAction | undefined

  constructor(
    private readonly blueprint: Blueprint,
    column: string
  ) {
    this.column = column
  }

  /**
   * Set the referenced column
   */
  references(column: string): this {
    this.referencedColumn = column
    return this
  }

  /**
   * Set the referenced table
   */
  on(table: string): this {
    this.referencedTable = table
    this.finalize()
    return this
  }

  /**
   * Set ON DELETE action
   */
  onDelete(action: ForeignKeyAction): this {
    this.onDeleteAction = action
    this.updateForeignKey()
    return this
  }

  /**
   * Set ON UPDATE action
   */
  onUpdate(action: ForeignKeyAction): this {
    this.onUpdateAction = action
    this.updateForeignKey()
    return this
  }

  private finalize(): void {
    if (this.referencedColumn && this.referencedTable) {
      this.blueprint.addForeignKey({
        column: this.column,
        referencedTable: this.referencedTable,
        referencedColumn: this.referencedColumn,
        onDelete: this.onDeleteAction,
        onUpdate: this.onUpdateAction,
      })
    }
  }

  private updateForeignKey(): void {
    // Update the FK if already added
    const fks = this.blueprint.getForeignKeys()
    const existing = fks.find((fk) => fk.column === this.column)
    if (existing) {
      existing.onDelete = this.onDeleteAction ?? existing.onDelete
      existing.onUpdate = this.onUpdateAction ?? existing.onUpdate
    }
  }
}
