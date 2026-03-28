import { createSqliteDatabase, type RuntimeSqliteDatabase } from '@gravito/core'
import type { SessionId, SessionRecord, SessionStore } from '../types'
import { PulsarError } from '../errors/PulsarError'
import { PulsarErrorCodes } from '../errors/codes'

/**
 * SQLite-based session store for persistent single-instance storage.
 *
 * Stores sessions in a SQLite database file, providing durability across process restarts.
 * Unlike Redis, this store requires manual cleanup of expired sessions via the `cleanup()` method.
 * File-based locking makes it unsuitable for multi-instance deployments.
 *
 * **Performance Characteristics:**
 * - ✅ Persistent across restarts (survives crashes)
 * - ✅ Good for single-instance production (VPS, single server)
 * - ✅ No external dependencies (built-in SQLite)
 * - ⚠️  Requires manual cleanup via `cleanup()` method (no automatic expiration)
 * - ⚠️  Slower than memory/Redis due to disk I/O
 * - ❌ Not suitable for multi-instance (file locking conflicts)
 *
 * **Best For:** Single-instance production, VPS deployments, persistent development environments
 *
 * @example
 * ```typescript
 * const store = new SqliteSessionStore('./storage/sessions.db', 'sessions')
 * await store.set('session-id', {
 *   data: { userId: '123' },
 *   createdAt: Date.now(),
 *   lastActivityAt: Date.now()
 * }, 3600)
 * const session = await store.get('session-id')
 *
 * // Periodic cleanup of expired sessions
 * setInterval(() => store.cleanup(), 60 * 60 * 1000) // Every hour
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class SqliteSessionStore implements SessionStore {
  private db: RuntimeSqliteDatabase | null = null
  private tableName: string
  private initPromise: Promise<void> | null = null

  constructor(path: string, tableName = 'sessions') {
    this.initPromise = this.initDb(path, tableName)
    this.tableName = tableName
  }

  private async initDb(path: string, tableName: string) {
    this.db = await createSqliteDatabase(path)
    this.tableName = tableName
    this.init()
  }

  private ensureReady = async () => {
    if (this.initPromise) {
      await this.initPromise
      this.initPromise = null
    }
  }

  /**
   * Initialize the SQLite database schema.
   *
   * Creates the sessions table and expiration index if they don't exist.
   *
   * @throws {Error} If database connection was not properly initialized
   * @private
   */
  private init() {
    if (!this.db) {
      throw new PulsarError(500, PulsarErrorCodes.DATABASE_NOT_INITIALIZED, {
        message: '[SqliteSessionStore] Database not initialized',
      })
    }
    this.db.run(`
      CREATE TABLE IF NOT EXISTS "${this.tableName}" (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        last_activity INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `)
    this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_expires ON "${this.tableName}" (expires_at)`
    )
  }

  async get(id: SessionId): Promise<SessionRecord | null> {
    await this.ensureReady()
    if (!this.db) {
      return null
    }
    const query = this.db.query(
      `SELECT payload, expires_at FROM "${this.tableName}" WHERE id = $id`
    )
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
    await this.ensureReady()
    if (!this.db) {
      return
    }
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds
    const query = this.db.query(`
      INSERT OR REPLACE INTO "${this.tableName}" (id, payload, last_activity, expires_at)
      VALUES ($id, $payload, $lastActivity, $expiresAt)
    `)
    query.run({
      $id: id,
      $payload: JSON.stringify(record),
      $lastActivity: Math.floor(record.lastActivityAt / 1000),
      $expiresAt: expiresAt,
    })
  }

  async delete(id: SessionId): Promise<void> {
    await this.ensureReady()
    if (!this.db) {
      return
    }
    const query = this.db.query(`DELETE FROM "${this.tableName}" WHERE id = $id`)
    query.run({ $id: id })
  }

  /**
   * Remove all expired sessions from the database.
   *
   * @returns The number of sessions deleted
   */
  async cleanup(): Promise<number> {
    await this.ensureReady()
    if (!this.db) {
      return 0
    }
    const now = Math.floor(Date.now() / 1000)
    const countQuery = this.db.query(
      `SELECT COUNT(*) as count FROM "${this.tableName}" WHERE expires_at < $now`
    )
    const countResult = countQuery.get({ $now: now }) as { count: number } | null
    const count = countResult?.count ?? 0

    if (count > 0) {
      const deleteQuery = this.db.query(`DELETE FROM "${this.tableName}" WHERE expires_at < $now`)
      deleteQuery.run({ $now: now })
    }

    return count
  }
}
