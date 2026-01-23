import { Database } from 'bun:sqlite'
import type { WorkflowFilter, WorkflowState, WorkflowStorage } from '../types'

export interface BunSQLiteStorageOptions {
  path?: string
  tableName?: string
}

export class BunSQLiteStorage implements WorkflowStorage {
  private db: Database
  private tableName: string
  private initialized = false

  constructor(options: BunSQLiteStorageOptions = {}) {
    this.db = new Database(options.path ?? ':memory:')
    this.tableName = options.tableName ?? 'flux_workflows'
  }

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

  async delete(id: string): Promise<void> {
    await this.init()

    const stmt = this.db.prepare(`
      DELETE FROM ${this.tableName} WHERE id = $id
    `)

    stmt.run({ $id: id })
  }

  async close(): Promise<void> {
    this.db.close()
    this.initialized = false
  }

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

  getDatabase(): Database {
    return this.db
  }

  vacuum(): void {
    this.db.run('VACUUM')
  }
}

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
