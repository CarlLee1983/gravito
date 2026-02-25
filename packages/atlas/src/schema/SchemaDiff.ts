/**
 * @gravito/atlas - Schema Differ
 * @description Compares Atlas Model decorator metadata against the live database
 * schema (information_schema) and produces a structured diff.
 *
 * This powers the `db:push` and `migrate:generate` CLI commands.
 */

import type { ConnectionContract } from '../types'

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// DB Schema fetcher via information_schema
// ============================================================================

/**
 * Fetch existing columns for a table from the database's information_schema.
 * Compatible with Postgres and MySQL.
 */
async function fetchDbColumns(
  connection: ConnectionContract,
  tableName: string
): Promise<ColumnDefinition[]> {
  const driverName = connection.getDriver().getDriverName()

  let sql: string
  let bindings: unknown[]

  if (driverName === 'postgres') {
    sql = `
      SELECT
        c.column_name AS name,
        c.data_type AS type,
        c.is_nullable = 'YES' AS nullable,
        c.column_default AS default_value,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary,
        CASE WHEN uq.column_name IS NOT NULL THEN true ELSE false END AS is_unique
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.column_name = pk.column_name
      LEFT JOIN (
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'UNIQUE'
      ) uq ON c.column_name = uq.column_name
      WHERE c.table_name = $1
      ORDER BY c.ordinal_position
    `
    bindings = [tableName]
  } else {
    // MySQL / MariaDB
    sql = `
      SELECT
        COLUMN_NAME AS name,
        DATA_TYPE AS type,
        IS_NULLABLE = 'YES' AS nullable,
        COLUMN_DEFAULT AS default_value,
        COLUMN_KEY = 'PRI' AS is_primary,
        COLUMN_KEY IN ('UNI', 'PRI') AS is_unique
      FROM information_schema.COLUMNS
      WHERE TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `
    bindings = [tableName]
  }

  const result = await connection.raw<{
    name: string
    type: string
    nullable: boolean | number
    default_value: string | null
    is_primary: boolean | number
    is_unique: boolean | number
  }>(sql, bindings)

  return result.rows.map((row) => ({
    name: row.name,
    type: row.type.toLowerCase(),
    nullable: Boolean(row.nullable),
    defaultValue: row.default_value,
    isPrimary: Boolean(row.is_primary),
    isUnique: Boolean(row.is_unique),
  }))
}

// ============================================================================
// SchemaDiff - Main class
// ============================================================================

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
export class SchemaDiff {
  private readonly connection: ConnectionContract
  private readonly table: string
  private readonly desired: ColumnDefinition[]

  constructor(options: SchemaDiffOptions) {
    this.connection = options.connection
    this.table = options.table
    this.desired = options.desired
  }

  /**
   * Perform the schema comparison and return the diff result.
   */
  async compare(): Promise<SchemaDiffResult> {
    const current = await fetchDbColumns(this.connection, this.table)

    const currentMap = new Map(current.map((c) => [c.name, c]))
    const desiredMap = new Map(this.desired.map((c) => [c.name, c]))

    const added: ColumnDefinition[] = []
    const removed: ColumnDefinition[] = []
    const modified: SchemaDiffResult['modified'] = []

    // Find added columns (in desired but not in DB)
    for (const [name, col] of desiredMap) {
      if (!currentMap.has(name)) {
        added.push(col)
      }
    }

    // Find removed columns (in DB but not in desired)
    for (const [name, col] of currentMap) {
      if (!desiredMap.has(name)) {
        removed.push(col)
      }
    }

    // Find modified columns (exist in both but differ)
    for (const [name, desired] of desiredMap) {
      const current = currentMap.get(name)
      if (!current) {
        continue
      }

      if (
        this.normalizeType(current.type) !== this.normalizeType(desired.type) ||
        current.nullable !== desired.nullable
      ) {
        modified.push({ name, from: current, to: desired })
      }
    }

    return {
      table: this.table,
      added,
      removed,
      modified,
      hasChanges: added.length > 0 || removed.length > 0 || modified.length > 0,
    }
  }

  /**
   * Normalize DB type strings for comparison (e.g. 'character varying' → 'varchar').
   */
  private normalizeType(type: string): string {
    const aliases: Record<string, string> = {
      'character varying': 'varchar',
      character: 'char',
      integer: 'int',
      int4: 'int',
      int8: 'bigint',
      bool: 'boolean',
      timestamptz: 'timestamp',
      'timestamp with time zone': 'timestamp',
      'timestamp without time zone': 'timestamp',
    }
    return aliases[type.toLowerCase()] ?? type.toLowerCase()
  }
}
