/**
 * Schema Facade
 * @description Entry point for database schema operations
 */

import { DB } from '../DB'
import { Blueprint } from './Blueprint'
import { MySQLSchemaGrammar, PostgresSchemaGrammar, SQLiteSchemaGrammar, type SchemaGrammar } from './grammars'

/**
 * Schema Facade
 * Provides static methods for schema operations
 *
 * @example
 * ```typescript
 * import { Schema } from '@gravito/atlas'
 *
 * await Schema.create('users', (table) => {
 *   table.id()
 *   table.string('email').unique()
 *   table.timestamps()
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
   * Set the connection to use for schema operations
   */
  static connection(name: string): typeof Schema {
    Schema.connectionName = name
    Schema.grammar = null // Reset grammar for new connection
    return Schema
  }

  /**
   * Get the grammar instance for the current connection
   */
  private static getGrammar(): SchemaGrammar {
    if (!Schema.grammar) {
      const driver = Schema.getDriverName()
      Schema.grammar = Schema.createGrammar(driver)
    }
    return Schema.grammar
  }

  private static getDriverName(): string {
    // Get driver from DB configuration
    const config = DB.getConnectionConfig(Schema.connectionName)
    return config?.driver ?? 'postgres'
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
   * Create a new table
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
   * Modify an existing table
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
   * Drop a table
   */
  static async drop(table: string): Promise<void> {
    const grammar = Schema.getGrammar()
    const sql = grammar.compileDrop(table)
    await Schema.executeStatement(sql)
  }

  /**
   * Drop a table if it exists
   */
  static async dropIfExists(table: string): Promise<void> {
    const grammar = Schema.getGrammar()
    const sql = grammar.compileDropIfExists(table)
    await Schema.executeStatement(sql)
  }

  /**
   * Rename a table
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
   * Check if a table exists
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
   * Check if a column exists
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
   * Get all table names
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
