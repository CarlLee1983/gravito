import type { SerializedJob } from '../types'
import type { QueueDriver } from './QueueDriver'

/**
 * Generic database service interface.
 * Users should implement this interface with their preferred ORM/database client.
 */
export interface DatabaseService {
  /**
   * Execute a raw SQL query.
   * @param sql - The SQL query string with placeholders ($1, $2, etc.)
   * @param bindings - The values to bind to placeholders
   */
  execute<T = unknown>(sql: string, bindings?: unknown[]): Promise<T[] | T>

  /**
   * Execute multiple queries within a transaction.
   * @param callback - The callback to execute within the transaction
   */
  transaction<T>(callback: (tx: DatabaseService) => Promise<T>): Promise<T>
}

/**
 * Database driver configuration.
 */
export interface DatabaseDriverConfig {
  /**
   * Table name (default: `jobs`).
   */
  table?: string

  /**
   * Database service instance that implements DatabaseService interface.
   */
  dbService?: DatabaseService
}

/**
 * Database Driver
 *
 * Uses a database as the queue backend.
 * Works with any database service that implements the DatabaseService interface.
 *
 * @example
 * ```typescript
 * // Create a database service adapter
 * const dbService = {
 *   execute: async (sql, bindings) => yourDbClient.query(sql, bindings),
 *   transaction: async (callback) => yourDbClient.transaction(callback),
 * }
 *
 * const driver = new DatabaseDriver({ dbService, table: 'jobs' })
 * await driver.push('default', serializedJob)
 * ```
 */
export class DatabaseDriver implements QueueDriver {
  private tableName: string
  private dbService: DatabaseService

  constructor(config: DatabaseDriverConfig) {
    this.tableName = config.table ?? 'jobs'
    this.dbService = config.dbService!

    if (!this.dbService) {
      throw new Error(
        '[DatabaseDriver] dbService is required. Please provide a database service that implements DatabaseService interface.'
      )
    }
  }

  /**
   * Push a job to a queue.
   */
  async push(queue: string, job: SerializedJob): Promise<void> {
    const availableAt = job.delaySeconds
      ? new Date(Date.now() + job.delaySeconds * 1000)
      : new Date()

    // Use dbService.execute() to run raw SQL
    await this.dbService.execute(
      `INSERT INTO ${this.tableName} (queue, payload, attempts, available_at, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [queue, job.data, job.attempts ?? 0, availableAt.toISOString(), new Date().toISOString()]
    )
  }

  /**
   * Pop a job from the queue (FIFO, with delay support).
   */
  async pop(queue: string): Promise<SerializedJob | null> {
    // Use SELECT FOR UPDATE to lock rows (PostgreSQL/MySQL).
    // Note: SKIP LOCKED is PostgreSQL-specific, and is supported by MySQL 8.0+ as well.
    // For databases that don't support SKIP LOCKED, this falls back to a plain SELECT FOR UPDATE.
    const result = await this.dbService
      .execute<{
        id: string
        payload: string
        attempts: number
        created_at: Date
        available_at: Date
      }>(
        `SELECT id, payload, attempts, created_at, available_at
       FROM ${this.tableName}
       WHERE queue = $1
         AND available_at <= NOW()
         AND (reserved_at IS NULL OR reserved_at < NOW() - INTERVAL '5 minutes')
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
        [queue]
      )
      .catch(() => {
        // Fallback: DB does not support SKIP LOCKED
        return this.dbService.execute<{
          id: string
          payload: string
          attempts: number
          created_at: Date
          available_at: Date
        }>(
          `SELECT id, payload, attempts, created_at, available_at
         FROM ${this.tableName}
         WHERE queue = $1
           AND available_at <= NOW()
           AND (reserved_at IS NULL OR reserved_at < NOW() - INTERVAL '5 minutes')
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE`,
          [queue]
        )
      })

    const rows = result as {
      id: string
      payload: string
      attempts: number
      created_at: Date
      available_at: Date
    }[]

    if (!rows || rows.length === 0) {
      return null
    }

    const row = rows[0]!

    // Mark as reserved
    await this.dbService.execute(
      `UPDATE ${this.tableName}
       SET reserved_at = NOW()
       WHERE id = $1`,
      [row.id]
    )

    // Compute delaySeconds
    const createdAt = new Date(row.created_at).getTime()
    const delaySeconds = row.available_at
      ? Math.max(0, Math.floor((new Date(row.available_at).getTime() - createdAt) / 1000))
      : undefined

    return {
      id: row.id,
      type: 'class', // Default; should be inferred from payload in a full implementation
      data: row.payload,
      createdAt,
      attempts: row.attempts,
      ...(delaySeconds !== undefined ? { delaySeconds } : {}),
    }
  }

  /**
   * Get queue size.
   */
  async size(queue: string): Promise<number> {
    const result = (await this.dbService.execute<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM ${this.tableName}
       WHERE queue = $1
         AND available_at <= NOW()
         AND (reserved_at IS NULL OR reserved_at < NOW() - INTERVAL '5 minutes')`,
      [queue]
    )) as { count: number }[]

    return result?.[0]?.count ?? 0
  }

  /**
   * Clear a queue.
   */
  async clear(queue: string): Promise<void> {
    await this.dbService.execute(`DELETE FROM ${this.tableName} WHERE queue = $1`, [queue])
  }

  /**
   * Push multiple jobs.
   */
  async pushMany(queue: string, jobs: SerializedJob[]): Promise<void> {
    if (jobs.length === 0) {
      return
    }

    // Batch insert within a transaction
    await this.dbService.transaction(async (tx: DatabaseService) => {
      for (const job of jobs) {
        const availableAt = job.delaySeconds
          ? new Date(Date.now() + job.delaySeconds * 1000)
          : new Date()

        await tx.execute(
          `INSERT INTO ${this.tableName} (queue, payload, attempts, available_at, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [queue, job.data, job.attempts ?? 0, availableAt.toISOString(), new Date().toISOString()]
        )
      }
    })
  }
}
