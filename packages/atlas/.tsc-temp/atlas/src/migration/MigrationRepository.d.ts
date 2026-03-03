/**
 * Migration Repository
 * @description Tracks migration execution state in the database
 */
import type { MigrationRecord } from './Migration'
/**
 * Migration Repository
 *
 * The MigrationRepository class manages the database table that tracks
 * which migrations have been executed. It provides methods for logging
 * migrations, retrieving the list of ran migrations, and managing batches.
 */
export declare class MigrationRepository {
  private tableName
  private connectionName
  constructor(connectionName?: string)
  /**
   * Set the table name for migrations
   */
  setTable(table: string): this
  /**
   * Create the migration repository table if it doesn't exist
   */
  createRepository(): Promise<void>
  /**
   * Check if the migration repository exists
   */
  repositoryExists(): Promise<boolean>
  /**
   * Delete the migration repository table
   */
  deleteRepository(): Promise<void>
  /**
   * Get all ran migrations
   */
  getRan(): Promise<string[]>
  /**
   * Get migrations for a specific batch
   */
  getMigrations(batch: number): Promise<MigrationRecord[]>
  /**
   * Get the last batch number
   */
  getLastBatchNumber(): Promise<number>
  /**
   * Get the next batch number
   */
  getNextBatchNumber(): Promise<number>
  /**
   * Log that a migration was run
   */
  log(migration: string, batch: number): Promise<void>
  /**
   * Remove a migration from the log
   */
  delete(migration: string): Promise<void>
  /**
   * Get the last migrations (for rollback)
   */
  getLast(): Promise<MigrationRecord[]>
  /**
   * Get the database connection
   */
  private getConnection
}
