/**
 * Schema Types
 * @description Type definitions for schema introspection
 */
/**
 * Column data types
 */
export type ColumnType =
  | 'string'
  | 'text'
  | 'integer'
  | 'bigint'
  | 'smallint'
  | 'decimal'
  | 'float'
  | 'boolean'
  | 'date'
  | 'time'
  | 'datetime'
  | 'timestamp'
  | 'json'
  | 'jsonb'
  | 'uuid'
  | 'binary'
  | 'enum'
  | 'unknown'
/**
 * Column schema definition
 */
export interface ColumnSchema {
  /** Column name */
  name: string
  /** Column type */
  type: ColumnType
  /** Is nullable */
  nullable: boolean
  /** Default value */
  default?: unknown
  /** Is primary key */
  primary: boolean
  /** Is unique */
  unique: boolean
  /** Is auto-increment */
  autoIncrement: boolean
  /** Enum values (if type is enum) */
  enumValues?: string[] | undefined
  /** Max length (for string types) */
  maxLength?: number | undefined
  /** Numeric precision */
  precision?: number | undefined
  /** Numeric scale */
  scale?: number | undefined
}
/**
 * Table schema definition
 */
export interface TableSchema {
  /** Table name */
  table: string
  /** Column definitions */
  columns: Map<string, ColumnSchema>
  /** Primary key column(s) */
  primaryKey: string[]
  /** Timestamp of schema capture */
  capturedAt: number
}
/**
 * Schema lock file format
 */
export interface SchemaLock {
  /** Version for compatibility */
  version: string
  /** Driver used to generate */
  driver: string
  /** Generation timestamp */
  generatedAt: string
  /** Table schemas */
  tables: Record<string, SerializedTableSchema>
}
/**
 * Serialized table schema (for JSON storage)
 */
export interface SerializedTableSchema {
  table: string
  columns: SerializedColumnSchema[]
  primaryKey: string[]
}
/**
 * Serialized column schema (for JSON storage)
 */
export interface SerializedColumnSchema {
  name: string
  type: ColumnType
  nullable: boolean
  default?: unknown
  primary: boolean
  unique: boolean
  autoIncrement: boolean
  enumValues?: string[] | undefined
  maxLength?: number | undefined
  precision?: number | undefined
  scale?: number | undefined
}
