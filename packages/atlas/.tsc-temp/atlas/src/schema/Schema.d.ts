/**
 * Schema Facade
 * @description Entry point for database schema operations
 */
import { Blueprint } from './Blueprint'
/**
 * Schema Facade
 *
 * The Schema class provides a database agnostic way of manipulating tables.
 * It works with all supported databases and provides a unified API for
 * creating, modifying, and dropping tables.
 *
 * @example
 * ```typescript
 * import { Schema } from '@gravito/atlas'
 *
 * // Create a new table
 * await Schema.create('users', (table) => {
 *   table.id()
 *   table.string('email').unique()
 *   table.timestamps()
 * })
 *
 * // Modify an existing table
 * await Schema.table('users', (table) => {
 *   table.string('phone').nullable()
 * })
 * ```
 */
export declare class Schema {
  private static grammar
  private static connectionName
  /**
   * Set the connection to use for schema operations.
   *
   * @param name The name of the connection defined in your database configuration.
   * @returns The Schema class for chaining.
   */
  static connection(name: string): typeof Schema
  /**
   * Reset the schema facade state (primarily for testing).
   * @internal
   */
  static reset(): void
  /**
   * Get the grammar instance for the current connection
   */
  private static getGrammar
  /**
   * Check if grammar instance matches driver
   */
  private static isGrammarMatch
  private static getDriverName
  private static createGrammar
  /**
   * Create a new table on the schema.
   *
   * @param table The name of the table to create.
   * @param callback A callback that receives a Blueprint instance to define columns.
   *
   * @example
   * ```typescript
   * await Schema.create('posts', (table) => {
   *   table.id()
   *   table.foreignId('user_id').constrained().onDelete('cascade')
   *   table.string('title')
   *   table.text('content')
   *   table.timestamps()
   * })
   * ```
   */
  static create(table: string, callback: (blueprint: Blueprint) => void): Promise<void>
  /**
   * Modify an existing table on the schema.
   *
   * @param table The name of the table to modify.
   * @param callback A callback that receives a Blueprint instance to modify columns or indexes.
   *
   * @example
   * ```typescript
   * await Schema.table('users', (table) => {
   *   table.string('avatar_url').nullable()
   *   table.index(['email', 'avatar_url'])
   * })
   * ```
   */
  static table(table: string, callback: (blueprint: Blueprint) => void): Promise<void>
  /**
   * Drop a table from the schema.
   *
   * @param table - The name of the table to drop.
   * @throws Error if the table does not exist.
   */
  static drop(table: string): Promise<void>
  /**
   * Drop a table from the schema only if it exists.
   *
   * @param table - The name of the table to drop.
   */
  static dropIfExists(table: string): Promise<void>
  /**
   * Rename an existing table on the schema.
   *
   * @param from - The current name of the table.
   * @param to - The new name for the table.
   */
  static rename(from: string, to: string): Promise<void>
  /**
   * Determine if the given table exists in the database.
   *
   * @param table - The name of the table to check.
   * @returns Promise resolving to true if the table exists.
   */
  static hasTable(table: string): Promise<boolean>
  /**
   * Determine if the given table has a specific column.
   *
   * @param table - The name of the table.
   * @param column - The name of the column.
   * @returns Promise resolving to true if the column exists.
   */
  static hasColumn(table: string, column: string): Promise<boolean>
  /**
   * Get a list of all table names for the current database connection.
   *
   * @returns Promise resolving to an array of table names.
   */
  static getTables(): Promise<string[]>
  private static executeStatement
  private static executeQuery
}
