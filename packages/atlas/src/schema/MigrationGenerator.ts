/**
 * @gravito/atlas - Migration Generator
 * @description Converts a SchemaDiffResult into SQL ALTER TABLE statements
 * for both PostgreSQL and MySQL dialects.
 *
 * Powers the `migrate:generate` and `db:push` CLI commands.
 */

import type { DriverType } from '../types'
import type { ColumnDefinition, SchemaDiffResult } from './SchemaDiff'

// ============================================================================
// SQL helpers per dialect
// ============================================================================

function columnTypeToSql(col: ColumnDefinition, dialect: DriverType): string {
  const typeMap: Partial<Record<string, string>> = {
    int: 'INTEGER',
    integer: 'INTEGER',
    bigint: 'BIGINT',
    float: 'FLOAT',
    double: 'DOUBLE PRECISION',
    decimal: 'DECIMAL(10,2)',
    string: dialect === 'postgres' ? 'VARCHAR(255)' : 'VARCHAR(255)',
    varchar: 'VARCHAR(255)',
    text: 'TEXT',
    boolean: dialect === 'postgres' ? 'BOOLEAN' : 'TINYINT(1)',
    bool: dialect === 'postgres' ? 'BOOLEAN' : 'TINYINT(1)',
    date: 'DATE',
    datetime: dialect === 'postgres' ? 'TIMESTAMP' : 'DATETIME',
    timestamp: 'TIMESTAMP',
    json: dialect === 'postgres' ? 'JSONB' : 'JSON',
    jsonb: 'JSONB',
    uuid: dialect === 'postgres' ? 'UUID' : 'CHAR(36)',
  }

  return typeMap[col.type.toLowerCase()] ?? col.type.toUpperCase()
}

function columnSuffix(col: ColumnDefinition): string {
  const parts: string[] = []
  if (!col.nullable) {
    parts.push('NOT NULL')
  }
  if (col.defaultValue !== null && col.defaultValue !== undefined) {
    parts.push(`DEFAULT ${col.defaultValue}`)
  }
  return parts.length > 0 ? ` ${parts.join(' ')}` : ''
}

// ============================================================================
// MigrationGenerator
// ============================================================================

export interface MigrationGeneratorOptions {
  /** Target database dialect */
  dialect: DriverType
}

/**
 * MigrationGenerator
 *
 * Takes a `SchemaDiffResult` and generates the corresponding SQL statements
 * required to bring the database schema in sync with Model definitions.
 *
 * @example
 * ```typescript
 * const gen = new MigrationGenerator({ dialect: 'postgres' })
 * const sql = gen.generate(diff)
 * // Returns: ALTER TABLE users ADD COLUMN bio TEXT NULL; ...
 * ```
 */
export class MigrationGenerator {
  private readonly dialect: DriverType

  constructor(options: MigrationGeneratorOptions) {
    this.dialect = options.dialect
  }

  /**
   * Generate SQL statements for the given diff.
   *
   * @param diff - Schema diff result from SchemaDiff.compare()
   * @returns Array of SQL statements to execute
   */
  generate(diff: SchemaDiffResult): string[] {
    if (!diff.hasChanges) {
      return []
    }

    const statements: string[] = []
    const table = this.quoteIdentifier(diff.table)

    // ADD COLUMN statements
    for (const col of diff.added) {
      const colType = columnTypeToSql(col, this.dialect)
      const suffix = columnSuffix(col)
      statements.push(
        `ALTER TABLE ${table} ADD COLUMN ${this.quoteIdentifier(col.name)} ${colType}${suffix};`
      )
    }

    // DROP COLUMN statements
    for (const col of diff.removed) {
      if (this.dialect === 'postgres') {
        statements.push(
          `ALTER TABLE ${table} DROP COLUMN IF EXISTS ${this.quoteIdentifier(col.name)};`
        )
      } else {
        statements.push(`ALTER TABLE ${table} DROP COLUMN ${this.quoteIdentifier(col.name)};`)
      }
    }

    // MODIFY / ALTER COLUMN statements
    for (const { name, to } of diff.modified) {
      const colType = columnTypeToSql(to, this.dialect)
      const suffix = columnSuffix(to)

      if (this.dialect === 'postgres') {
        const parts: string[] = []
        parts.push(
          `ALTER TABLE ${table} ALTER COLUMN ${this.quoteIdentifier(name)} TYPE ${colType} USING ${this.quoteIdentifier(name)}::${colType};`
        )
        if (!to.nullable) {
          parts.push(
            `ALTER TABLE ${table} ALTER COLUMN ${this.quoteIdentifier(name)} SET NOT NULL;`
          )
        } else {
          parts.push(
            `ALTER TABLE ${table} ALTER COLUMN ${this.quoteIdentifier(name)} DROP NOT NULL;`
          )
        }
        statements.push(...parts)
      } else {
        // MySQL: MODIFY COLUMN
        statements.push(
          `ALTER TABLE ${table} MODIFY COLUMN ${this.quoteIdentifier(name)} ${colType}${suffix};`
        )
      }
    }

    return statements
  }

  /**
   * Generate a timestamped migration script content string.
   *
   * @param diff - Schema diff result
   * @param migrationName - Optional migration name
   */
  generateMigrationScript(diff: SchemaDiffResult, migrationName?: string): string {
    const statements = this.generate(diff)
    const name = migrationName ?? `sync_${diff.table}`
    const timestamp = new Date().toISOString()

    return `/**
 * Atlas Migration: ${name}
 * Table: ${diff.table}
 * Generated: ${timestamp}
 * Dialect: ${this.dialect}
 */

// Changes: +${diff.added.length} added, -${diff.removed.length} removed, ~${diff.modified.length} modified

export async function up(connection: any): Promise<void> {
${statements.map((s) => `  await connection.raw(\`${s}\`)`).join('\n')}
}

export async function down(_connection: any): Promise<void> {
  // TODO: Add rollback statements
  throw new Error('Rollback not auto-generated. Please implement manually.')
}
`
  }

  private quoteIdentifier(name: string): string {
    if (this.dialect === 'postgres') {
      return `"${name}"`
    }
    return `\`${name}\``
  }
}
