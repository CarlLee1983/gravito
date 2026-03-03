/**
 * @gravito/atlas - Schema Differ
 * @description Compares Atlas Model decorator metadata against the live database
 * schema (information_schema) and produces a structured diff.
 *
 * This powers the `db:push` and `migrate:generate` CLI commands.
 */
import type { ConnectionContract } from '../types'
/**
 * A single column definition from information_schema or decorator meta.
 */
export interface ColumnDefinition {
  name: string
  type: string
  nullable: boolean
  defaultValue: string | null
  isPrimary: boolean
  isUnique: boolean
}
/**
 * The result of comparing two schema states.
 */
export interface SchemaDiffResult {
  /** Table name */
  table: string
  /** Columns that exist in models but not in the DB */
  added: ColumnDefinition[]
  /** Columns that exist in the DB but not in models */
  removed: ColumnDefinition[]
  /** Columns where the type or nullability has changed */
  modified: Array<{
    name: string
    from: ColumnDefinition
    to: ColumnDefinition
  }>
  /** Whether any changes were detected */
  hasChanges: boolean
}
export interface SchemaDiffOptions {
  /** Database connection to compare against */
  connection: ConnectionContract
  /** Table name */
  table: string
  /** Desired column definitions (from Model decorators) */
  desired: ColumnDefinition[]
}
/**
 * SchemaDiff
 *
 * Compares the desired schema (from Model @Column decorators) against the
 * current live database schema and produces a structured diff result.
 *
 * @example
 * ```typescript
 * const differ = new SchemaDiff({ connection, table: 'users', desired: userColumns })
 * const diff = await differ.compare()
 * if (diff.hasChanges) console.log('Schema is out of sync!')
 * ```
 */
export declare class SchemaDiff {
  private readonly connection
  private readonly table
  private readonly desired
  constructor(options: SchemaDiffOptions)
  /**
   * Perform the schema comparison and return the diff result.
   */
  compare(): Promise<SchemaDiffResult>
  /**
   * Normalize DB type strings for comparison (e.g. 'character varying' → 'varchar').
   */
  private normalizeType
}
