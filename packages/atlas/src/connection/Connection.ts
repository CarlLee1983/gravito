/**
 * Connection
 * @description Represents a database connection
 */

import { DB } from '../DB'
import { BunSQLDriver } from '../drivers/BunSQLDriver'
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
  ExecuteResult,
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
  private transactionDepth = 0

  /**
   * Static query listeners for global observation (e.g. debugging)
   */
  public static queryListeners: Array<
    (query: {
      connection: string
      sql: string
      bindings: unknown[]
      duration: number
      timestamp: number
    }) => void
  > = []

  private proxyHandle: ConnectionContract | null = null

  constructor(
    protected readonly name: string,
    protected readonly config: ConnectionConfig
  ) {
    this.driver = this.createDriver()
    this.grammar = this.createGrammar()
  }

  setProxy(proxy: ConnectionContract): void {
    this.proxyHandle = proxy
  }

  getName(): string {
    return this.name
  }

  getDriver(): DriverContract {
    return this.driver
  }

  getConfig(): ConnectionConfig {
    return this.config
  }

  getGrammar(): GrammarContract {
    return this.grammar
  }

  table<T = Record<string, unknown>>(tableName: string): QueryBuilderContract<T> {
    return new QueryBuilder<T>(
      this.proxyHandle || (this as unknown as ConnectionContract),
      this.grammar,
      tableName
    )
  }

  collection<T = Record<string, unknown>>(name: string): QueryBuilderContract<T> {
    return this.table<T>(name)
  }

  async raw<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    await this.ensureConnected()

    const startTime = performance.now()
    const timestamp = Date.now()
    try {
      const result = await this.driver.query<T>(sql, bindings)
      const duration = performance.now() - startTime
      DB.logQuery(sql, bindings, duration)

      if (DB.isDebug()) {
        console.log(`[${duration.toFixed(2)}ms]`, DB.getLastQuery())
      }

      if (Connection.queryListeners.length > 0) {
        const queryData = {
          connection: this.name,
          sql,
          bindings,
          duration,
          timestamp,
        }
        for (const listener of Connection.queryListeners) {
          listener(queryData)
        }
      }

      return result
    } catch (error) {
      if (DB.isDebug()) {
        console.error('[Query Failed]', DB.getLastQuery())
      }
      throw error
    }
  }

  async execute(sql: string, bindings: unknown[] = []): Promise<ExecuteResult> {
    await this.ensureConnected()
    return this.driver.execute(sql, bindings)
  }

  async transaction<T>(callback: (connection: ConnectionContract) => Promise<T>): Promise<T> {
    await this.ensureConnected()

    this.transactionDepth++
    const depth = this.transactionDepth

    try {
      if (depth === 1) {
        if (DB.isDebug()) console.log(`[Transaction] BEGIN on ${this.name}`)
        await this.driver.beginTransaction()
      } else {
        if (DB.isDebug()) console.log(`[Transaction] SAVEPOINT sp_${depth} on ${this.name}`)
        await this.execute(`SAVEPOINT sp_${depth}`, [])
      }

      const result = await callback(this.proxyHandle || (this as unknown as ConnectionContract))

      if (depth === 1) {
        if (DB.isDebug()) console.log(`[Transaction] COMMIT on ${this.name}`)
        await this.driver.commit()
      } else {
        if (DB.isDebug()) console.log(`[Transaction] RELEASE sp_${depth} on ${this.name}`)
        await this.execute(`RELEASE SAVEPOINT sp_${depth}`, [])
      }

      return result
    } catch (error) {
      if (depth === 1) {
        if (DB.isDebug()) console.log(`[Transaction] ROLLBACK on ${this.name}`)
        await this.driver.rollback()
      } else {
        if (DB.isDebug()) console.log(`[Transaction] ROLLBACK TO sp_${depth} on ${this.name}`)
        await this.execute(`ROLLBACK TO SAVEPOINT sp_${depth}`, [])
      }
      throw error
    } finally {
      this.transactionDepth--
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      try {
        // Ensure any pending transactions are rolled back
        if (this.transactionDepth > 0) {
          if (DB.isDebug()) {
            console.warn(
              `[Connection] Disconnecting with active transaction (depth: ${this.transactionDepth})`
            )
          }
          // Reset transaction depth to prevent issues
          this.transactionDepth = 0
        }

        // Disconnect the driver
        await this.driver.disconnect()

        // Clear proxy handle
        this.proxyHandle = null

        // Mark as disconnected
        this.connected = false
      } catch (error) {
        // Even if disconnect fails, mark as disconnected to prevent hanging
        this.connected = false
        this.proxyHandle = null
        throw error
      }
    }
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.driver.connect()
      this.connected = true
    }
  }

  protected async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect()
    }
  }

  protected createDriver(): DriverContract {
    // biome-ignore lint/complexity/useLiteralKeys: Bypassing global check
    const bunSql = (globalThis as any)['Bun']?.sql

    if (
      this.config.useNativeDriver === true &&
      bunSql &&
      ['postgres', 'mysql', 'mariadb', 'sqlite'].includes(this.config.driver)
    ) {
      return new BunSQLDriver(this.config)
    }

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
