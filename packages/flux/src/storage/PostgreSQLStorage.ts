import type { WorkflowFilter, WorkflowState, WorkflowStorage } from '../types'

/**
 * Configuration options for the PostgreSQL storage adapter.
 *
 * Defines connection parameters and database schema settings.
 */
export interface PostgreSQLStorageOptions {
  /** Connection string URL (e.g. "postgres://user:pass@host:5432/db"). */
  connectionString?: string
  /** Database host address. */
  host?: string
  /** Database port number. @default 5432 */
  port?: number
  /** Database name. @default "postgres" */
  database?: string
  /** Database user. */
  user?: string
  /** Database password. */
  password?: string
  /** Name of the table to store workflows. @default "flux_workflows" */
  tableName?: string
  /** SSL configuration for secure connections. */
  ssl?: boolean | { rejectUnauthorized?: boolean }
}

/**
 * PostgreSQL storage adapter for Flux workflows.
 *
 * Provides persistent, reliable storage using a PostgreSQL database.
 * Supports JSONB for efficient storage of workflow state and history.
 *
 * @example
 * ```typescript
 * const storage = new PostgreSQLStorage({
 *   connectionString: process.env.DATABASE_URL,
 *   tableName: 'my_workflows'
 * });
 * await storage.init();
 * ```
 */
export class PostgreSQLStorage implements WorkflowStorage {
  private pool: any
  private tableName: string
  private initialized = false
  private options: PostgreSQLStorageOptions

  /**
   * Creates a new PostgreSQL storage instance.
   *
   * @param options - Connection and configuration options.
   */
  constructor(options: PostgreSQLStorageOptions = {}) {
    this.options = options
    this.tableName = validateSqlIdentifier(options.tableName ?? 'flux_workflows', 'tableName')
  }

  /**
   * Initializes the database connection pool and schema.
   *
   * Creates the workflow table and indexes if they do not exist.
   * This method is idempotent.
   *
   * @throws {Error} If connection fails or schema creation fails.
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return
    }

    const { Pool } = await import('pg')

    const config: any = this.options.connectionString
      ? { connectionString: this.options.connectionString }
      : {
          host: this.options.host ?? 'localhost',
          port: this.options.port ?? 5432,
          database: this.options.database ?? 'postgres',
          user: this.options.user,
          password: this.options.password,
        }

    if (this.options.ssl !== undefined) {
      config.ssl = this.options.ssl
    }

    this.pool = new Pool(config)

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        input JSONB NOT NULL,
        data JSONB NOT NULL,
        current_step INTEGER NOT NULL,
        history JSONB NOT NULL,
        error TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        version INTEGER NOT NULL DEFAULT 1,
        definition_version TEXT
      )
    `)

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_name 
      ON ${this.tableName}(name)
    `)
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status 
      ON ${this.tableName}(status)
    `)
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created 
      ON ${this.tableName}(created_at DESC)
    `)

    this.initialized = true
  }

  /**
   * Persists the current state of a workflow.
   *
   * Uses upsert (INSERT ... ON CONFLICT) to save or update the workflow state.
   *
   * @param state - The workflow state to save.
   * @throws {Error} If the database operation fails.
   */
  async save(state: WorkflowState): Promise<void> {
    await this.init()

    await this.pool.query(
      `
      INSERT INTO ${this.tableName} 
      (id, name, status, input, data, current_step, history, error, created_at, updated_at, completed_at, version, definition_version)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        input = EXCLUDED.input,
        data = EXCLUDED.data,
        current_step = EXCLUDED.current_step,
        history = EXCLUDED.history,
        error = EXCLUDED.error,
        updated_at = EXCLUDED.updated_at,
        completed_at = EXCLUDED.completed_at,
        version = EXCLUDED.version,
        definition_version = EXCLUDED.definition_version
    `,
      [
        state.id,
        state.name,
        state.status,
        JSON.stringify(state.input),
        JSON.stringify(state.data),
        state.currentStep,
        JSON.stringify(state.history),
        state.error ?? null,
        state.createdAt,
        new Date(),
        state.completedAt ?? null,
        state.version,
        state.definitionVersion ?? null,
      ]
    )
  }

  /**
   * Loads a workflow state by its ID.
   *
   * @param id - The unique identifier of the workflow.
   * @returns The workflow state, or null if not found.
   * @throws {Error} If the database query fails.
   */
  async load(id: string): Promise<WorkflowState | null> {
    await this.init()

    const result = await this.pool.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id])

    if (result.rows.length === 0) {
      return null
    }

    return this.rowToState(result.rows[0])
  }

  /**
   * Lists workflows matching the given filter.
   *
   * @param filter - Criteria to filter the results.
   * @returns A list of matching workflow states.
   * @throws {Error} If the database query fails.
   */
  async list(filter?: WorkflowFilter): Promise<WorkflowState[]> {
    await this.init()

    let query = `SELECT * FROM ${this.tableName} WHERE 1=1`
    const params: unknown[] = []
    let paramIndex = 1

    if (filter?.name) {
      query += ` AND name = $${paramIndex++}`
      params.push(filter.name)
    }

    if (filter?.status) {
      if (Array.isArray(filter.status)) {
        const placeholders = filter.status.map(() => `$${paramIndex++}`).join(', ')
        query += ` AND status IN (${placeholders})`
        params.push(...filter.status)
      } else {
        query += ` AND status = $${paramIndex++}`
        params.push(filter.status)
      }
    }

    if (filter?.version) {
      query += ` AND definition_version = $${paramIndex++}`
      params.push(filter.version)
    }

    query += ' ORDER BY created_at DESC'

    if (filter?.limit) {
      query += ` LIMIT $${paramIndex++}`
      params.push(filter.limit)
    }

    if (filter?.offset) {
      query += ` OFFSET $${paramIndex++}`
      params.push(filter.offset)
    }

    const result = await this.pool.query(query, params)

    return result.rows.map((row: PostgreSQLRow) => this.rowToState(row))
  }

  /**
   * Deletes a workflow state by its ID.
   *
   * @param id - The unique identifier of the workflow to delete.
   * @throws {Error} If the database operation fails.
   */
  async delete(id: string): Promise<void> {
    await this.init()

    await this.pool.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id])
  }

  /**
   * Closes the database connection pool.
   *
   * Should be called when shutting down the application.
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.initialized = false
    }
  }

  /**
   * Converts a database row to a WorkflowState object.
   *
   * @param row - The raw database row.
   * @returns The parsed workflow state.
   */
  private rowToState(row: PostgreSQLRow): WorkflowState {
    return {
      id: row.id,
      name: row.name,
      status: row.status as WorkflowState['status'],
      input: typeof row.input === 'string' ? JSON.parse(row.input) : row.input,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      currentStep: row.current_step,
      history: typeof row.history === 'string' ? JSON.parse(row.history) : row.history,
      error: row.error ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      version: row.version,
      definitionVersion: row.definition_version ?? undefined,
    }
  }

  /**
   * Returns the underlying pg.Pool instance.
   *
   * Useful for testing or advanced database operations.
   *
   * @returns The PostgreSQL connection pool.
   */
  getPool(): any {
    return this.pool
  }

  /**
   * Optimizes the database table by reclaiming storage and updating statistics.
   *
   * Runs VACUUM ANALYZE on the workflow table.
   *
   * @throws {Error} If the maintenance operation fails.
   */
  async vacuum(): Promise<void> {
    await this.init()
    await this.pool.query('VACUUM ANALYZE')
  }
}

function validateSqlIdentifier(value: string, field: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(
      `Invalid ${field}: "${value}". Only letters, numbers, and underscores are allowed.`
    )
  }
  return value
}

/**
 * Internal interface for PostgreSQL row structure.
 */
interface PostgreSQLRow {
  id: string
  name: string
  status: string
  input: string | object
  data: string | object
  current_step: number
  history: string | object
  error: string | null
  created_at: string | Date
  updated_at: string | Date
  completed_at: string | Date | null
  version: number
  definition_version: string | null
}
