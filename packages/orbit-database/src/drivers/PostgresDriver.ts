/**
 * PostgreSQL Driver
 * @description Database driver implementation for PostgreSQL using node-pg
 */

import type {
  DriverContract,
  DriverType,
  ExecuteResult,
  PostgresConfig,
  QueryResult,
} from '../types'

/**
 * PostgreSQL Driver
 * Connects and executes queries against PostgreSQL databases
 */
export class PostgresDriver implements DriverContract {
  private pool: PgPool | null = null
  private connected = false
  private transactionActive = false
  private transactionClient: PgClient | null = null

  constructor(private readonly config: PostgresConfig) {}

  /**
   * Get driver name
   */
  getDriverName(): DriverType {
    return 'postgres'
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return
    }

    // Dynamic import of pg to avoid bundling issues
    const pg = await this.loadPgModule()

    // Build connection config
    const poolConfig: PgPoolConfig = {
      host: this.config.host ?? 'localhost',
      port: this.config.port ?? 5432,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl,
      // Pool settings
      min: this.config.pool?.min ?? 2,
      max: this.config.pool?.max ?? 10,
      idleTimeoutMillis: this.config.pool?.idleTimeout ?? 30000,
      connectionTimeoutMillis: this.config.pool?.acquireTimeout ?? 5000,
    }

    if (this.config.applicationName) {
      poolConfig.application_name = this.config.applicationName
    }

    this.pool = new pg.Pool(poolConfig)
    this.connected = true
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    if (this.transactionClient) {
      await this.transactionClient.release()
      this.transactionClient = null
    }

    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }

    this.connected = false
    this.transactionActive = false
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.pool !== null
  }

  /**
   * Execute a query and return results
   */
  async query<T = Record<string, unknown>>(
    sql: string,
    bindings: unknown[] = []
  ): Promise<QueryResult<T>> {
    const client = await this.getClient()

    try {
      const result = await client.query(sql, bindings)

      const fields = result.fields?.map((f: PgFieldInfo) => ({
        name: f.name,
        dataType: f.dataTypeID?.toString(),
        tableId: f.tableID,
      }))

      return {
        rows: result.rows as T[],
        rowCount: result.rowCount ?? 0,
        ...(fields ? { fields } : {}),
      }
    } finally {
      // Release client if not in transaction
      if (!this.transactionActive && client !== this.transactionClient) {
        ;(client as PgPoolClient).release?.()
      }
    }
  }

  /**
   * Execute a statement (INSERT/UPDATE/DELETE)
   */
  async execute(sql: string, bindings: unknown[] = []): Promise<ExecuteResult> {
    const client = await this.getClient()

    try {
      const result = await client.query(sql, bindings)

      // Try to extract insert ID from RETURNING clause
      let insertId: number | bigint | undefined
      if (result.rows && result.rows.length > 0) {
        const firstRow = result.rows[0] as Record<string, unknown>
        // Look for common primary key column names
        insertId = (firstRow.id ?? firstRow.ID ?? firstRow[Object.keys(firstRow)[0] ?? '']) as
          | number
          | bigint
          | undefined
      }

      return {
        affectedRows: result.rowCount ?? 0,
        ...(insertId !== undefined ? { insertId } : {}),
      }
    } finally {
      if (!this.transactionActive && client !== this.transactionClient) {
        ;(client as PgPoolClient).release?.()
      }
    }
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<void> {
    if (this.transactionActive) {
      throw new Error('Transaction already in progress')
    }

    if (!this.pool) {
      await this.connect()
    }
    if (!this.pool) {
      throw new Error('Database connection failed')
    }
    this.transactionClient = await this.pool.connect()
    await this.transactionClient.query('BEGIN')
    this.transactionActive = true
  }

  /**
   * Commit the current transaction
   */
  async commit(): Promise<void> {
    if (!this.transactionActive || !this.transactionClient) {
      throw new Error('No transaction in progress')
    }

    await this.transactionClient.query('COMMIT')
    this.transactionClient.release()
    this.transactionClient = null
    this.transactionActive = false
  }

  /**
   * Rollback the current transaction
   */
  async rollback(): Promise<void> {
    if (!this.transactionActive || !this.transactionClient) {
      throw new Error('No transaction in progress')
    }

    await this.transactionClient.query('ROLLBACK')
    this.transactionClient.release()
    this.transactionClient = null
    this.transactionActive = false
  }

  /**
   * Check if currently in a transaction
   */
  inTransaction(): boolean {
    return this.transactionActive
  }

  /**
   * Get a client for executing queries
   */
  private async getClient(): Promise<PgClient> {
    if (!this.connected || !this.pool) {
      await this.connect()
    }

    if (this.transactionActive && this.transactionClient) {
      return this.transactionClient
    }

    if (!this.pool) {
      throw new Error('Database connection failed')
    }
    return this.pool.connect()
  }

  /**
   * Dynamically load the pg module
   */
  private async loadPgModule(): Promise<PgModule> {
    try {
      const pg = await import('pg')
      return pg as unknown as PgModule
    } catch {
      throw new Error('PostgreSQL driver requires the "pg" package. Please install it: bun add pg')
    }
  }
}

// ============================================================================
// Type definitions for pg module (to avoid direct dependency)
// ============================================================================

interface PgModule {
  Pool: new (config: PgPoolConfig) => PgPool
  Client: new (config: PgPoolConfig) => PgClient
}

interface PgPoolConfig {
  host?: string | undefined
  port?: number | undefined
  database?: string | undefined
  user?: string | undefined
  password?: string | undefined
  ssl?: boolean | object | undefined
  min?: number | undefined
  max?: number | undefined
  idleTimeoutMillis?: number | undefined
  connectionTimeoutMillis?: number | undefined
  application_name?: string | undefined
}

interface PgPool {
  connect(): Promise<PgPoolClient>
  end(): Promise<void>
  query(sql: string, values?: unknown[]): Promise<PgResult>
}

interface PgClient {
  query(sql: string, values?: unknown[]): Promise<PgResult>
  release(): void
}

interface PgPoolClient extends PgClient {
  release(): void
}

interface PgResult {
  rows: unknown[]
  rowCount: number | null
  fields?: PgFieldInfo[]
}

interface PgFieldInfo {
  name: string
  dataTypeID?: number
  tableID?: number
}
