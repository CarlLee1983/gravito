/**
 * Connection
 * @description Represents a database connection
 */

import { MongoDBDriver } from '../drivers/MongoDBDriver'
import { MySQLDriver } from '../drivers/MySQLDriver'
import { PostgresDriver } from '../drivers/PostgresDriver'
import { RedisDriver } from '../drivers/RedisDriver'
import { SQLiteDriver } from '../drivers/SQLiteDriver'
import { MongoGrammar } from '../grammar/MongoGrammar'
import { MySQLGrammar } from '../grammar/MySQLGrammar'
import { NullGrammar } from '../grammar/NullGrammar'
import { PostgresGrammar } from '../grammar/PostgresGrammar'
import { SQLiteGrammar } from '../grammar/SQLiteGrammar'
import { QueryBuilder } from '../query/QueryBuilder'
import type {
  BaseConnectionConfig,
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

    // Proxy driver methods (e.g. redis.set, mongodb.collection)
    // biome-ignore lint/correctness/noConstructorReturn: This proxy is intentional for dynamic driver method access
    return new Proxy(this, {
      get(target: Connection, prop: string | symbol) {
        if (prop in target) {
          return (target as any)[prop]
        }
        // Fallback to driver if method exists there
        if (
          typeof prop === 'string' &&
          target.driver &&
          typeof (target.driver as unknown as Record<string, unknown>)[prop] === 'function'
        ) {
          return (target.driver as unknown as Record<string, any>)[prop].bind(target.driver)
        }
        return undefined
      },
    })
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
   * Alias for table() for NoSQL connections
   */
  collection<T = Record<string, unknown>>(name: string): QueryBuilderContract<T> {
    return this.table<T>(name)
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
        return new MySQLDriver(this.config, this.config.driver)
      case 'sqlite':
        return new SQLiteDriver(this.config)
      case 'mongodb':
        return new MongoDBDriver(this.config)
      case 'redis':
        return new RedisDriver(this.config)
      default:
        throw new Error(`Unknown driver: ${(this.config as BaseConnectionConfig).driver}`)
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
        return new MySQLGrammar()
      case 'sqlite':
        return new SQLiteGrammar()
      case 'mongodb':
        return new MongoGrammar()
      case 'redis':
        return new NullGrammar()
      default:
        throw new Error(`Unknown grammar: ${(this.config as BaseConnectionConfig).driver}`)
    }
  }
}
