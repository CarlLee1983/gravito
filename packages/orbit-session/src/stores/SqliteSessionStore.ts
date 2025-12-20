import { Database } from 'bun:sqlite'
import type { SessionId, SessionRecord, SessionStore } from '../types'

export class SqliteSessionStore implements SessionStore {
  private db: Database
  private tableName: string

  constructor(path: string, tableName: string = 'sessions') {
    this.db = new Database(path, { create: true })
    this.tableName = tableName
    this.init()
  }

  private init() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS "${this.tableName}" (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        last_activity INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_expires ON "${this.tableName}" (expires_at)`)
  }

  async get(id: SessionId): Promise<SessionRecord | null> {
    const query = this.db.query(`SELECT payload, expires_at FROM "${this.tableName}" WHERE id = $id`)
    const row = query.get({ $id: id }) as { payload: string; expires_at: number } | null

    if (!row) {
      return null
    }

    if (Date.now() / 1000 > row.expires_at) {
      this.delete(id)
      return null
    }

    try {
      return JSON.parse(row.payload) as SessionRecord
    } catch {
      return null
    }
  }

  async set(id: SessionId, record: SessionRecord, ttlSeconds: number): Promise<void> {
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds
    const query = this.db.query(`
      INSERT OR REPLACE INTO "${this.tableName}" (id, payload, last_activity, expires_at)
      VALUES ($id, $payload, $lastActivity, $expiresAt)
    `)
    query.run({
      $id: id,
      $payload: JSON.stringify(record),
      $lastActivity: Math.floor(record.lastActivityAt / 1000),
      $expiresAt: expiresAt
    })
  }

  async delete(id: SessionId): Promise<void> {
    const query = this.db.query(`DELETE FROM "${this.tableName}" WHERE id = $id`)
    query.run({ $id: id })
  }
}
