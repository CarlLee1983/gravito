/**
 * Schema Facade
 * @description Entry point for database schema operations
 */

import { DB } from '../DB'
import { Blueprint } from './Blueprint'
import {
  MySQLSchemaGrammar,
  PostgresSchemaGrammar,
  type SchemaGrammar,
  SQLiteSchemaGrammar,
} from './grammars'

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
export class Schema {
  private static grammar: SchemaGrammar | null = null
  private static connectionName: string | undefined

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Set the connection to use for schema operations.
   *
   * @param name The name of the connection defined in your database configuration.
   * @returns The Schema class for chaining.
   */
  static connection(name: string): typeof Schema {
    Schema.connectionName = name
    Schema.grammar = null // Reset grammar for new connection
    return Schema
  }

  /**
   * Reset the schema facade state (primarily for testing).
   * @internal
   */
  static reset(): void {
    Schema.connectionName = undefined
    Schema.grammar = null
  }

  /**
   * Get the grammar instance for the current connection
   */
  private static getGrammar(): SchemaGrammar {
    const driver = Schema.getDriverName()

    // If grammar exists but doesn't match current driver, reset it
    if (Schema.grammar && !Schema.isGrammarMatch(Schema.grammar, driver)) {
      Schema.grammar = null
    }

    if (!Schema.grammar) {
      Schema.grammar = Schema.createGrammar(driver)
    }
    return Schema.grammar
  }

  /**
   * Check if grammar instance matches driver
   */
  private static isGrammarMatch(grammar: SchemaGrammar, driver: string): boolean {
    if (driver === 'postgres' || driver === 'postgresql') {
      return grammar instanceof PostgresSchemaGrammar
    }
    if (driver === 'mysql' || driver === 'mariadb') {
      return grammar instanceof MySQLSchemaGrammar
    }
    if (driver === 'sqlite') {
      return grammar instanceof SQLiteSchemaGrammar
    }
    return false
  }

  private static getDriverName(): string {
    // Get driver from DB configuration
    const config = DB.getConnectionConfig(Schema.connectionName)
    // Fallback to default connection if Schema.connectionName is not set
    if (!config && !Schema.connectionName) {
      const defaultConfig = DB.getConnectionConfig()
      if (!defaultConfig) {
        return 'postgres'
      }
      if ('driver' in defaultConfig) {
        return defaultConfig.driver
      }
      // For ReadWriteConnectionConfig, use the write config driver
      return defaultConfig.write.driver ?? 'postgres'
    }
    if (!config) {
      return 'postgres'
    }
    if ('driver' in config) {
      return config.driver
    }
    // For ReadWriteConnectionConfig, use the write config driver
    return config.write.driver ?? 'postgres'
  }

  private static createGrammar(driver: string): SchemaGrammar {
    switch (driver) {
      case 'mysql':
      case 'mariadb':
        return new MySQLSchemaGrammar()
      case 'sqlite':
        return new SQLiteSchemaGrammar()
      default:
        return new PostgresSchemaGrammar()
    }
  }

  // ============================================================================
  // Table Operations
  // ============================================================================

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
  static async create(table: string, callback: (blueprint: Blueprint) => void): Promise<void> {
    const blueprint = new Blueprint(table)
    callback(blueprint)

    const grammar = Schema.getGrammar()
    const sql = grammar.compileCreate(blueprint)

    await Schema.executeStatement(sql)

    // Create indexes separately
    for (const index of blueprint.getIndexes()) {
      const indexSql = grammar.compileIndex(table, index)
      await Schema.executeStatement(indexSql)
    }
  }

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
  static async table(table: string, callback: (blueprint: Blueprint) => void): Promise<void> {
    const blueprint = new Blueprint(table)
    callback(blueprint)

    const grammar = Schema.getGrammar()
    const statements = grammar.compileAlter(blueprint)

    for (const sql of statements) {
      await Schema.executeStatement(sql)
    }
  }

  /**
   * Drop a table from the schema.
   *
   * @param table - The name of the table to drop.
   * @throws Error if the table does not exist.
   */
  static async drop(table: string): Promise<void> {
    const grammar = Schema.getGrammar()
    const sql = grammar.compileDrop(table)
    await Schema.executeStatement(sql)
  }

  /**
   * Drop a table from the schema only if it exists.
   *
   * @param table - The name of the table to drop.
   */
  static async dropIfExists(table: string): Promise<void> {
    const grammar = Schema.getGrammar()
    const sql = grammar.compileDropIfExists(table)
    await Schema.executeStatement(sql)
  }

  /**
   * Rename an existing table on the schema.
   *
   * @param from - The current name of the table.
   * @param to - The new name for the table.
   */
  static async rename(from: string, to: string): Promise<void> {
    const grammar = Schema.getGrammar()
    const sql = `ALTER TABLE ${grammar.wrapTable(from)} RENAME TO ${grammar.wrapTable(to)}`
    await Schema.executeStatement(sql)
  }

  // ============================================================================
  // Introspection
  // ============================================================================

  /**
   * Determine if the given table exists in the database.
   *
   * @param table - The name of the table to check.
   * @returns Promise resolving to true if the table exists.
   */
  static async hasTable(table: string): Promise<boolean> {
    const grammar = Schema.getGrammar()
    const sql = grammar.compileTableExists(table)
    const result = await Schema.executeQuery(sql)

    // Handle different result formats
    if (result.length > 0) {
      const row = result[0] as Record<string, unknown>
      if (row.exists !== undefined) {
        return row.exists === true
      }
      if (row.count !== undefined) {
        return Number(row.count) > 0
      }
    }
    return false
  }

  /**
   * Determine if the given table has a specific column.
   *
   * @param table - The name of the table.
   * @param column - The name of the column.
   * @returns Promise resolving to true if the column exists.
   */
  static async hasColumn(table: string, column: string): Promise<boolean> {
    const grammar = Schema.getGrammar()
    const sql = grammar.compileColumnExists(table, column)
    const result = await Schema.executeQuery(sql)

    if (result.length > 0) {
      const row = result[0] as Record<string, unknown>
      if (row.exists !== undefined) {
        return row.exists === true
      }
      if (row.count !== undefined) {
        return Number(row.count) > 0
      }
    }
    return false
  }

  /**
   * Get a list of all table names for the current database connection.
   *
   * @returns Promise resolving to an array of table names.
   */
  static async getTables(): Promise<string[]> {
    const grammar = Schema.getGrammar()
    const sql = grammar.compileListTables()
    const result = await Schema.executeQuery(sql)

    return result.map((row) => {
      const r = row as Record<string, unknown>
      return (r.table_name ?? r.TABLE_NAME ?? '') as string
    })
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private static async executeStatement(sql: string): Promise<void> {
    const connection = DB.connection(Schema.connectionName)
    await connection.raw(sql)
  }

  private static async executeQuery(sql: string): Promise<unknown[]> {
    const connection = DB.connection(Schema.connectionName)
    const result = await connection.raw(sql)
    return result.rows
  }
}
