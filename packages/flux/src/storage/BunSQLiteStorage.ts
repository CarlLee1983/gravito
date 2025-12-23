/**
 * @fileoverview Bun SQLite Storage Adapter
 *
 * High-performance storage using Bun's built-in SQLite.
 *
 * @module @gravito/flux/storage
 */

import { Database } from 'bun:sqlite'
import type { WorkflowFilter, WorkflowState, WorkflowStorage } from '../types'

/**
 * SQLite Storage Options
 */
export interface BunSQLiteStorageOptions {
  /** Database file path (default: ':memory:') */
  path?: string
  /** Table name (default: 'flux_workflows') */
  tableName?: string
}

/**
 * Bun SQLite Storage
 *
 * High-performance storage adapter using Bun's built-in SQLite.
 *
 * @example
 * ```typescript
 * const engine = new FluxEngine({
 *   storage: new BunSQLiteStorage({ path: './data/flux.db' })
 * })
 * ```
 */
export class BunSQLiteStorage implements WorkflowStorage {
  private db: Database
  private tableName: string
  private initialized = false

  constructor(options: BunSQLiteStorageOptions = {}) {
    this.db = new Database(options.path ?? ':memory:')
    this.tableName = options.tableName ?? 'flux_workflows'
  }

  /**
   * Initialize storage (create tables)
   */
  async init(): Promise<void> {
    if (this.initialized) return

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
        completed_at TEXT
      )
    `)

    // Create indexes for common queries
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
   * Save workflow state
   */
  async save(state: WorkflowState): Promise<void> {
    await this.init()

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ${this.tableName} 
      (id, name, status, input, data, current_step, history, error, created_at, updated_at, completed_at)
      VALUES ($id, $name, $status, $input, $data, $currentStep, $history, $error, $createdAt, $updatedAt, $completedAt)
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
    })
  }

  /**
   * Load workflow state by ID
   */
  async load(id: string): Promise<WorkflowState | null> {
    await this.init()

    const stmt = this.db.prepare(`
      SELECT * FROM ${this.tableName} WHERE id = $id
    `)

    const row = stmt.get({ $id: id }) as SQLiteRow | null

    if (!row) return null

    return this.rowToState(row)
  }

  /**
   * List workflow states with optional filter
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = stmt.all(params as any) as SQLiteRow[]

    return rows.map((row) => this.rowToState(row))
  }

  /**
   * Delete workflow state
   */
  async delete(id: string): Promise<void> {
    await this.init()

    const stmt = this.db.prepare(`
      DELETE FROM ${this.tableName} WHERE id = $id
    `)

    stmt.run({ $id: id })
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    this.db.close()
    this.initialized = false
  }

  /**
   * Convert SQLite row to WorkflowState
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
    }
  }

  /**
   * Get raw database (for advanced usage)
   */
  getDatabase(): Database {
    return this.db
  }

  /**
   * Run a vacuum to optimize database
   */
  vacuum(): void {
    this.db.run('VACUUM')
  }
}

/**
 * SQLite row type
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
}
