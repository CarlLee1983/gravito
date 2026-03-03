/**
 * Migrator
 * @description Migration runner with support for running and rolling back migrations
 */
/**
 * Migrator Options
 */
export interface MigratorOptions {
  /** Path to migrations directory */
  path?: string
  /** Database connection name */
  connection?: string
  /** Migration table name */
  table?: string
}
/**
 * Migration Result
 */
export interface MigrationResult {
  /** Migrations that were run */
  migrations: string[]
  /** Batch number */
  batch?: number
}
/**
 * Migrator
 *
 * The Migrator class is responsible for managing the database migration lifecycle.
 * It handles discovering migration files, tracking which migrations have been run
 * in the database, and executing the `up` or `down` methods of migration classes.
 *
 * @example
 * ```typescript
 * const migrator = new Migrator({ path: './migrations' })
 *
 * // Run all pending migrations
 * await migrator.run()
 *
 * // Rollback the last batch of migrations
 * await migrator.rollback()
 * ```
 */
export declare class Migrator {
  private repository
  private migrationsPath
  private resolvedMigrations
  constructor(options?: MigratorOptions)
  /**
   * Set migrations path
   */
  setPath(path: string): this
  /**
   * Set database connection
   */
  connection(name: string): this
  /**
   * Run all pending migrations.
   *
   * This method will identify all migration files that have not yet been
   * recorded in the migrations table and execute their `up` method.
   *
   * @returns A promise that resolves to the migration result.
   */
  run(): Promise<MigrationResult>
  /**
   * Run a specific migration up
   */
  runUp(migrationName: string): Promise<void>
  /**
   * Rollback the last batch of migrations.
   *
   * This method will identify the migrations that were part of the last
   * execution batch and execute their `down` method.
   *
   * @param steps The number of batches to rollback (defaults to 1).
   * @returns A promise that resolves to the migration result.
   */
  rollback(steps?: number): Promise<MigrationResult>
  /**
   * Rollback all migrations
   */
  reset(): Promise<MigrationResult>
  /**
   * Reset and re-run all migrations
   */
  fresh(): Promise<MigrationResult>
  /**
   * Rollback and re-run the last batch
   */
  refresh(steps?: number): Promise<MigrationResult>
  /**
   * Get migration status
   */
  status(): Promise<{
    ran: string[]
    pending: string[]
  }>
  /**
   * Get all migration files from the migrations directory
   */
  private getMigrationFiles
  /**
   * Run a single migration
   */
  private runMigration
  /**
   * Resolve migration class from file
   */
  private resolveMigration
}
