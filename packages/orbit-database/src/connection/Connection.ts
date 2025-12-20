/**
 * Connection
 * @description Represents a database connection
 */

import { PostgresDriver } from '../drivers/PostgresDriver'
import { PostgresGrammar } from '../grammar/PostgresGrammar'
import { QueryBuilder } from '../query/QueryBuilder'
import type {
  ConnectionConfig,
  ConnectionContract,
  DriverContract,
  GrammarContract,
  PostgresConfig,
  QueryBuilderContract,
  QueryResult,
} from '../types'

/**
 * Database Connection
 * Wraps a driver and grammar for query building and execution
 */
export class Connection implements ConnectionContract {
  protected driver: DriverContract
  protected grammar: GrammarContract
  protected connected = false

  constructor(
    protected readonly name: string,
    protected readonly config: ConnectionConfig
  ) {
    this.driver = this.createDriver()
    this.grammar = this.createGrammar()
  }

  /**
   * Get connection name
   */
  getName(): string {
    return this.name
  }

  /**
   * Get the underlying driver
   */
  getDriver(): DriverContract {
    return this.driver
  }

  /**
   * Get connection configuration
   */
  getConfig(): ConnectionConfig {
    return this.config
  }

  /**
   * Get the grammar
   */
  getGrammar(): GrammarContract {
    return this.grammar
  }

  /**
   * Create a new query builder for a table
   */
  table<T = Record<string, unknown>>(tableName: string): QueryBuilderContract<T> {
    return new QueryBuilder<T>(this, this.grammar, tableName)
  }

  /**
   * Execute raw SQL
   */
  async raw<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    await this.ensureConnected()
    return this.driver.query<T>(sql, bindings)
  }

  /**
   * Run a callback within a transaction
   */
  async transaction<T>(callback: (connection: ConnectionContract) => Promise<T>): Promise<T> {
    await this.ensureConnected()
    await this.driver.beginTransaction()

    try {
      const result = await callback(this)
      await this.driver.commit()
      return result
    } catch (error) {
      await this.driver.rollback()
      throw error
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.driver.disconnect()
      this.connected = false
    }
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    if (!this.connected) {
      await this.driver.connect()
      this.connected = true
    }
  }

  /**
   * Ensure connection is established
   */
  protected async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect()
    }
  }

  /**
   * Create the driver instance based on config
   */
  protected createDriver(): DriverContract {
    switch (this.config.driver) {
      case 'postgres':
        return new PostgresDriver(this.config as PostgresConfig)
      case 'mysql':
      case 'mariadb':
        throw new Error(`Driver "${this.config.driver}" is not yet implemented`)
      case 'sqlite':
        throw new Error('SQLite driver is not yet implemented')
      default:
        throw new Error(`Unknown driver: ${this.config.driver}`)
    }
  }

  /**
   * Create the grammar instance based on config
   */
  protected createGrammar(): GrammarContract {
    switch (this.config.driver) {
      case 'postgres':
        return new PostgresGrammar()
      case 'mysql':
      case 'mariadb':
        throw new Error(`Grammar for "${this.config.driver}" is not yet implemented`)
      case 'sqlite':
        throw new Error('SQLite grammar is not yet implemented')
      default:
        throw new Error(`Unknown grammar: ${this.config.driver}`)
    }
  }
}
