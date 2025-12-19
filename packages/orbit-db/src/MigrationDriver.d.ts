/**
 * Migration result interface
 */
export interface MigrationResult {
  success: boolean
  message: string
  migrations?: string[]
  error?: string
}
/**
 * Migration abstraction interface
 * Allows different ORM backends to implement their own migration logic
 */
export interface MigrationDriver {
  /**
   * Generate a new migration file
   */
  generate(name: string): Promise<MigrationResult>
  /**
   * Run pending migrations
   */
  migrate(): Promise<MigrationResult>
  /**
   * Rollback the last migration (if supported)
   */
  rollback?(): Promise<MigrationResult>
  /**
   * Drop all tables and re-run migrations
   */
  fresh(): Promise<MigrationResult>
  /**
   * Get migration status
   */
  status(): Promise<{
    pending: string[]
    applied: string[]
  }>
}
/**
 * Drizzle Kit Migration Driver
 * Wraps drizzle-kit CLI commands
 */
export declare class DrizzleMigrationDriver implements MigrationDriver {
  private configPath
  private migrationsDir
  constructor(configPath?: string, migrationsDir?: string)
  generate(name: string): Promise<MigrationResult>
  migrate(): Promise<MigrationResult>
  fresh(): Promise<MigrationResult>
  status(): Promise<{
    pending: string[]
    applied: string[]
  }>
}
//# sourceMappingURL=MigrationDriver.d.ts.map
