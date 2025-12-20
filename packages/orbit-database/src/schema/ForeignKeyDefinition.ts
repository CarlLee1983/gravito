/**
 * Foreign Key Definition
 * @description Represents a foreign key constraint
 */

import type { ForeignKeyAction } from './ColumnDefinition'

/**
 * Foreign Key Definition
 */
export interface ForeignKeyDefinition {
  /** Local column name */
  column: string
  /** Referenced table name */
  referencedTable: string
  /** Referenced column name */
  referencedColumn: string
  /** ON DELETE action */
  onDelete: ForeignKeyAction | undefined
  /** ON UPDATE action */
  onUpdate: ForeignKeyAction | undefined
}

/**
 * Index Definition
 */
export interface IndexDefinition {
  /** Index name */
  name: string
  /** Index type */
  type: 'index' | 'unique' | 'primary' | 'fulltext' | 'spatial'
  /** Columns in the index */
  columns: string[]
  /** Language for fulltext index */
  language?: string | undefined
}
