/**
 * Result of a migration operation.
 *
 * @public
 * @since 3.0.0
 */
export interface MigrationResult {
  /** Whether the operation succeeded. */
  success: boolean
  /** Human-readable message describing the result. */
  message: string
  /** List of migrations affected by the operation. */
  migrations?: string[]
  /** Error message if the operation failed. */
  error?: string
}

/**
 * Status of database migrations.
 *
 * @public
 * @since 3.0.0
 */
export interface MigrationStatus {
  /** List of pending migrations not yet applied. */
  pending: string[]
  /** List of migrations already applied. */
  applied: string[]
}

/**
 * Interface for database migration drivers.
 *
 * Provides methods for generating, running, and managing
 * database migrations across different ORMs.
 *
 * @example
 * ```typescript
 * class MyMigrationDriver implements MigrationDriver {
 *   async generate(name: string) {
 *     // Create migration file
 *     return { success: true, message: 'Migration created' }
 *   }
 *
 *   async migrate() {
 *     // Run pending migrations
 *     return { success: true, message: 'Migrations applied' }
 *   }
 *
 *   async status() {
 *     return { pending: [], applied: ['001_initial'] }
 *   }
 * }
 * ```
 *
 * @public
 * @since 3.0.0
 */
export interface MigrationDriver {
  /** Generate a new migration file */
  generate(name: string): Promise<MigrationResult>
  /** Run all pending migrations */
  migrate(): Promise<MigrationResult>
  /** Drop all tables and re-run migrations */
  fresh(): Promise<MigrationResult>
  /** Rollback the last N migrations */
  rollback(steps?: number): Promise<MigrationResult>
  /** Get migration status */
  status(): Promise<MigrationStatus>
}
