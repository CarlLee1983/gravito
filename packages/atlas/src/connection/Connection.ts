/**
 * Connection
 * @description Represents a database connection
 */

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
import type { AtlasMetrics, AtlasTracer } from '../observability'
import { QueryBuilder } from '../query/QueryBuilder'
import { SafeQueryBuilder } from '../query/SafeQueryBuilder'
import type {
  BaseConnectionConfig,
  ConnectionConfig,
  ConnectionContract,
  DriverContract,
  ExecuteResult,
  GrammarContract,
  PoolStats,
  PostgresConfig,
  QueryBuilderContract,
  QueryResult,
  SafeQueryBuilderContract,
} from '../types'

/**
 * Database Connection
 * Wraps a driver and grammar for query building and execution
 */
export class Connection implements ConnectionContract {
  protected driver: DriverContract
  protected grammar: GrammarContract
  protected connected = false
  protected proxy?: ConnectionContract
  protected tracer: AtlasTracer | undefined
  protected metrics: AtlasMetrics | undefined

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

  constructor(
    protected readonly name: string,
    protected readonly config: ConnectionConfig
  ) {
    this.driver = this.createDriver()
    this.grammar = this.createGrammar()
    this.tracer = (config as BaseConnectionConfig).tracer
    this.metrics = (config as BaseConnectionConfig).metrics

    // Proxy driver methods (e.g. redis.set, mongodb.collection)
    // biome-ignore lint/correctness/noConstructorReturn: This proxy is intentional for dynamic driver method access
    return new Proxy(this, {
      get(target: Connection, prop: string | symbol) {
        if (prop in target) {
          return Reflect.get(target, prop)
        }
        // Fallback to driver if method exists there
        if (
          typeof prop === 'string' &&
          target.driver &&
          typeof (target.driver as unknown as Record<string, unknown>)[prop] === 'function'
        ) {
          // biome-ignore lint/complexity/noBannedTypes: We need to bind a generic function
          return ((target.driver as unknown as Record<string, unknown>)[prop] as Function).bind(
            target.driver
          )
        }
        return undefined
      },
    })
  }

  /**
   * Set the proxy instance for this connection
   */
  setProxy(proxy: ConnectionContract): void {
    this.proxy = proxy
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
   * Get the tracer
   */
  getTracer(): AtlasTracer | undefined {
    return this.tracer
  }

  /**
   * Get the metrics
   */
  getMetrics(): AtlasMetrics | undefined {
    return this.metrics
  }

  /**
   * Create a new query builder for a table
   */
  table<T = Record<string, unknown>>(tableName: string): QueryBuilderContract<T> {
    return new QueryBuilder<T>(this.proxy || this, this.grammar, tableName)
  }

  /**
   * Alias for table() for NoSQL connections
   */
  collection<T = Record<string, unknown>>(name: string): QueryBuilderContract<T> {
    return this.table<T>(name)
  }

  /**
   * Safe query builder using tagged template literals
   * Automatically prevents SQL injection through parameter binding
   *
   * @example
   * ```typescript
   * const userId = 123
   * const users = await this.sql`SELECT * FROM users WHERE id = ${userId}`.all()
   * ```
   */
  sql<T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): SafeQueryBuilderContract<T> {
    const builder = new SafeQueryBuilder<T>(strings, values)
    return builder.using(this.proxy || this)
  }

  /**
   * Execute raw SQL
   */
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

      // Record Metrics (Zero-Overhead check)
      if (this.metrics) {
        this.metrics.operationDuration?.record(duration, {
          'db.system': this.config.driver,
          'db.operation': 'query',
        })
      }

      // Fire listeners
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
      if (this.metrics) {
        this.metrics.operationErrors?.add(1, {
          'db.system': this.config.driver,
          'db.operation': 'query',
        })
      }
      throw error
    }
  }

  /**
   * Execute raw SQL and return rows as arrays of values
   */
  async values<T = unknown[]>(sql: string, bindings: unknown[] = []): Promise<T[]> {
    await this.ensureConnected()

    const startTime = performance.now()
    const timestamp = Date.now()

    try {
      let rows: T[]

      if (typeof this.driver.values === 'function') {
        rows = await this.driver.values<T>(sql, bindings)
      } else {
        // Fallback: use query and extract object values
        const result = await this.driver.query(sql, bindings)
        rows = result.rows.map((row) => Object.values(row as object)) as T[]
      }

      const duration = performance.now() - startTime

      // Record Metrics (Zero-Overhead check)
      if (this.metrics) {
        this.metrics.operationDuration?.record(duration, {
          'db.system': this.config.driver,
          'db.operation': 'values',
        })
      }

      // Fire listeners
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

      return rows
    } catch (error) {
      if (this.metrics) {
        this.metrics.operationErrors?.add(1, {
          'db.system': this.config.driver,
          'db.operation': 'values',
        })
      }
      throw error
    }
  }

  /**
   * Execute raw SQL statement (INSERT/UPDATE/DELETE)
   */
  async execute(sql: string, bindings: unknown[] = []): Promise<ExecuteResult> {
    await this.ensureConnected()

    const startTime = performance.now()
    const timestamp = Date.now()

    try {
      const result = await this.driver.execute(sql, bindings)
      const duration = performance.now() - startTime

      // Record Metrics (Zero-Overhead check)
      if (this.metrics) {
        this.metrics.operationDuration?.record(duration, {
          'db.system': this.config.driver,
          'db.operation': 'execute',
        })
      }

      // Fire listeners
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
      if (this.metrics) {
        this.metrics.operationErrors?.add(1, {
          'db.system': this.config.driver,
          'db.operation': 'execute',
        })
      }
      throw error
    }
  }

  /**
   * Run a callback within a transaction
   */
  async transaction<T>(callback: (connection: ConnectionContract) => Promise<T>): Promise<T> {
    await this.ensureConnected()

    // Prefer native transaction closure if supported by driver (e.g. Bun.sql)
    if (typeof this.driver.runTransaction === 'function') {
      return await this.driver.runTransaction(async () => {
        return await callback(this.proxy || this)
      })
    }

    // Fallback to procedural BEGIN/COMMIT
    await this.driver.beginTransaction()

    try {
      const result = await callback(this.proxy || this)
      await this.driver.commit()
      return result
    } catch (error) {
      await this.driver.rollback()
      throw error
    }
  }

  /**
   * Stream query results for processing large datasets
   * @param sql - SQL query
   * @param bindings - Query parameters
   * @returns Async iterable of result rows
   */
  async *stream<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): AsyncIterable<T> {
    await this.ensureConnected()

    // Check if driver supports streaming
    const driver = this.driver as DriverContract & {
      stream?: <U>(sql: string, bindings: unknown[]) => AsyncIterable<U>
    }

    if (typeof driver.stream === 'function') {
      // Use native driver streaming
      yield* driver.stream<T>(sql, bindings)
    } else {
      // Fallback: execute query and yield rows sequentially
      const result = await this.raw<T>(sql, bindings)
      for (const row of result.rows) {
        yield row
      }
    }
  }

  /**
   * Get connection pool statistics (if supported by driver)
   * @returns Pool statistics or null if not supported
   */
  getPoolStats(): PoolStats | null {
    const driver = this.driver as DriverContract & { getPoolStats?: () => PoolStats | null }

    if (typeof driver.getPoolStats === 'function') {
      return driver.getPoolStats()
    }

    return null
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
   * Automatically prefers Bun.sql native driver when available (unless explicitly disabled)
   */
  protected createDriver(): DriverContract {
    // Check for Bun Native Driver availability
    const g = globalThis as any
    // biome-ignore lint/complexity/useLiteralKeys: Intentionally using bracket notation to hide 'Bun' symbol from tsc
    const bunSql = g['Bun']?.sql

    // Auto-detect: prefer native driver when available and not explicitly disabled
    const useNative =
      this.config.useNativeDriver === true &&
      bunSql &&
      (this.config.driver === 'sqlite' ||
        this.config.driver === 'postgres' ||
        this.config.driver === 'mysql' ||
        this.config.driver === 'mariadb')

    if (useNative) {
      if (process.env.DEBUG_ATLAS) {
        // biome-ignore lint: Internal debug logging
        console.debug?.(`[Atlas] Using Bun.sql native driver for ${this.config.driver}`)
      }
      return new BunSQLDriver(this.config)
    }

    // Fallback to traditional drivers
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
