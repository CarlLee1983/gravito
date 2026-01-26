import { Database } from 'bun:sqlite'
import type { WorkflowFilter, WorkflowState, WorkflowStorage } from '../types'

/**
 * Configuration options for the Bun SQLite storage adapter.
 */
export interface BunSQLiteStorageOptions {
  /**
   * Path to the SQLite database file.
   * Use ':memory:' for an ephemeral in-memory database.
   */
  path?: string
  /**
   * Name of the table used to store workflow states.
   */
  tableName?: string
}

/**
 * BunSQLiteStorage provides a persistent storage backend for Flux workflows using Bun's native SQLite module.
 *
 * It handles automatic table creation, indexing for performance, and serialization of workflow state
 * into a relational format.
 *
 * @example
 * ```typescript
 * const storage = new BunSQLiteStorage({
 *   path: './workflows.db',
 *   tableName: 'my_workflows'
 * });
 * await storage.init();
 * ```
 */
export class BunSQLiteStorage implements WorkflowStorage {
  private db: Database
  private tableName: string
  private initialized = false

  /**
   * Creates a new instance of BunSQLiteStorage.
   *
   * @param options - Configuration for the database connection and table naming.
   */
  constructor(options: BunSQLiteStorageOptions = {}) {
    this.db = new Database(options.path ?? ':memory:')
    this.tableName = options.tableName ?? 'flux_workflows'
  }

  /**
   * Initializes the database schema and required indexes.
   *
   * This method is idempotent and will be called automatically by other operations if not invoked manually.
   *
   * @throws {Error} If the database schema cannot be created or indexes fail to initialize.
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        input TEXT NOT NULL,
        data TEXT NOT NULL,
        current_step INTEGER NOT NULL,
        history TEXT NOT NULL,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        version INTEGER NOT NULL DEFAULT 1
      )
    `)

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_name 
      ON ${this.tableName}(name)
    `)
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status 
      ON ${this.tableName}(status)
    `)
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created 
      ON ${this.tableName}(created_at DESC)
    `)

    this.initialized = true
  }

  /**
   * Persists or updates a workflow state in the database.
   *
   * Uses an "INSERT OR REPLACE" strategy to ensure the latest state is always stored for a given ID.
   *
   * @param state - The current state of the workflow to be saved.
   * @throws {Error} If the database write operation fails or serialization errors occur.
   */
  async save(state: WorkflowState): Promise<void> {
    await this.init()

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ${this.tableName} 
      (id, name, status, input, data, current_step, history, error, created_at, updated_at, completed_at, version)
      VALUES ($id, $name, $status, $input, $data, $currentStep, $history, $error, $createdAt, $updatedAt, $completedAt, $version)
    `)

    stmt.run({
      $id: state.id,
      $name: state.name,
      $status: state.status,
      $input: JSON.stringify(state.input),
      $data: JSON.stringify(state.data),
      $currentStep: state.currentStep,
      $history: JSON.stringify(state.history),
      $error: state.error ?? null,
      $createdAt: state.createdAt.toISOString(),
      $updatedAt: state.updatedAt.toISOString(),
      $completedAt: state.completedAt?.toISOString() ?? null,
      $version: state.version,
    })
  }

  /**
   * Retrieves a workflow state by its unique identifier.
   *
   * @param id - The unique ID of the workflow to load.
   * @returns The reconstructed workflow state, or null if no record is found.
   * @throws {Error} If the database query fails or deserialization of stored JSON fails.
   */
  async load(id: string): Promise<WorkflowState | null> {
    await this.init()

    const stmt = this.db.prepare(`
      SELECT * FROM ${this.tableName} WHERE id = $id
    `)

    const row = stmt.get({ $id: id }) as SQLiteRow | null

    if (!row) {
      return null
    }

    return this.rowToState(row)
  }

  /**
   * Lists workflow states based on the provided filtering criteria.
   *
   * Results are returned in descending order of creation time.
   *
   * @param filter - Criteria for filtering and paginating the results.
   * @returns An array of workflow states matching the filter.
   * @throws {Error} If the database query fails.
   */
  async list(filter?: WorkflowFilter): Promise<WorkflowState[]> {
    await this.init()

    let query = `SELECT * FROM ${this.tableName} WHERE 1=1`
    const params: Record<string, unknown> = {}

    if (filter?.name) {
      query += ' AND name = $name'
      params.$name = filter.name
    }

    if (filter?.status) {
      if (Array.isArray(filter.status)) {
        const placeholders = filter.status.map((_, i) => `$status${i}`).join(', ')
        query += ` AND status IN (${placeholders})`
        filter.status.forEach((s, i) => {
          params[`$status${i}`] = s
        })
      } else {
        query += ' AND status = $status'
        params.$status = filter.status
      }
    }

    query += ' ORDER BY created_at DESC'

    if (filter?.limit) {
      query += ' LIMIT $limit'
      params.$limit = filter.limit
    }

    if (filter?.offset) {
      query += ' OFFSET $offset'
      params.$offset = filter.offset
    }

    const stmt = this.db.prepare(query)
    const rows = stmt.all(params as Record<string, any>) as SQLiteRow[]

    return rows.map((row) => this.rowToState(row))
  }

  /**
   * Deletes a workflow state from the database.
   *
   * @param id - The unique ID of the workflow to delete.
   * @throws {Error} If the database deletion fails.
   */
  async delete(id: string): Promise<void> {
    await this.init()

    const stmt = this.db.prepare(`
      DELETE FROM ${this.tableName} WHERE id = $id
    `)

    stmt.run({ $id: id })
  }

  /**
   * Closes the database connection and resets the initialization state.
   *
   * @throws {Error} If the database connection cannot be closed cleanly.
   */
  async close(): Promise<void> {
    this.db.close()
    this.initialized = false
  }

  /**
   * Converts a raw database row into a structured WorkflowState object.
   *
   * @param row - The raw SQLite row data.
   * @returns The parsed workflow state.
   * @private
   */
  private rowToState(row: SQLiteRow): WorkflowState {
    return {
      id: row.id,
      name: row.name,
      status: row.status as WorkflowState['status'],
      input: JSON.parse(row.input),
      data: JSON.parse(row.data),
      currentStep: row.current_step,
      history: JSON.parse(row.history),
      error: row.error ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      version: row.version,
    }
  }

  /**
   * Provides direct access to the underlying Bun SQLite Database instance.
   *
   * Useful for performing custom queries or maintenance tasks.
   *
   * @returns The raw Database instance.
   */
  getDatabase(): Database {
    return this.db
  }

  /**
   * Performs a VACUUM operation to reclaim unused space and defragment the database.
   *
   * @throws {Error} If the VACUUM operation fails.
   */
  vacuum(): void {
    this.db.run('VACUUM')
  }
}

/**
 * Internal representation of a workflow record in the SQLite database.
 */
interface SQLiteRow {
  id: string
  name: string
  status: string
  input: string
  data: string
  current_step: number
  history: string
  error: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  version: number
}
