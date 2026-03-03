/**
 * @gravito/atlas - Migration Generator
 * @description Converts a SchemaDiffResult into SQL ALTER TABLE statements
 * for both PostgreSQL and MySQL dialects.
 *
 * Powers the `migrate:generate` and `db:push` CLI commands.
 */
import type { DriverType } from '../types'
import type { SchemaDiffResult } from './SchemaDiff'
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
export declare class MigrationGenerator {
  private readonly dialect
  constructor(options: MigrationGeneratorOptions)
  /**
   * Generate SQL statements for the given diff.
   *
   * @param diff - Schema diff result from SchemaDiff.compare()
   * @returns Array of SQL statements to execute
   */
  generate(diff: SchemaDiffResult): string[]
  /**
   * Generate a timestamped migration script content string.
   *
   * @param diff - Schema diff result
   * @param migrationName - Optional migration name
   */
  generateMigrationScript(diff: SchemaDiffResult, migrationName?: string): string
  private quoteIdentifier
}
