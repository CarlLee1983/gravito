import type { QueueStats, SerializedJob } from '../types'
import type { QueueDriver } from './QueueDriver'

/**
 * Generic database service interface.
 *
 * Adapts any SQL database client (e.g., pg, mysql2, sqlite3) for use with the DatabaseDriver.
 * Users must provide an implementation of this interface that wraps their specific DB library.
 */
export interface DatabaseService {
  /**
   * Execute a raw SQL query.
   *
   * @param sql - The SQL query string with placeholders (e.g., $1, ?).
   * @param bindings - The values to bind to the placeholders.
   * @returns The query result (rows or metadata).
   */
  execute<T = unknown>(sql: string, bindings?: unknown[]): Promise<T[] | T>

  /**
   * Execute multiple queries within a single transaction.
   *
   * @param callback - A function that receives a transaction-scoped service instance.
   * @returns The result of the callback.
   */
  transaction<T>(callback: (tx: DatabaseService) => Promise<T>): Promise<T>
}

/**
 * Configuration options for the DatabaseDriver.
 */
export interface DatabaseDriverConfig {
  /**
   * The name of the table used to store jobs.
   * @default 'jobs'
   */
  table?: string

  /**
   * The database service adapter instance.
   */
  dbService?: DatabaseService
}

/**
 * Database-backed queue driver.
 *
 * Persists jobs in a SQL database table. Supports delayed jobs, reservation (locking),
 * and reliable delivery. Compatible with PostgreSQL (SKIP LOCKED), MySQL, and SQLite.
 *
 * @public
 * @example
 * ```typescript
 * const driver = new DatabaseDriver({
 *   dbService: myDbAdapter,
 *   table: 'queue_jobs'
 * });
 * ```
 */
export class DatabaseDriver implements QueueDriver {
  private tableName: string
  private dbService: DatabaseService

  constructor(config: DatabaseDriverConfig) {
    this.tableName = validateSqlIdentifier(config.table ?? 'jobs', 'table')
    this.dbService = config.dbService!

    if (!this.dbService) {
      throw new Error(
        '[DatabaseDriver] dbService is required. Please provide a database service that implements DatabaseService interface.'
      )
    }
  }

  /**
   * Pushes a job to the database queue.
   *
   * Inserts a new row into the jobs table.
   *
   * @param queue - The queue name.
   * @param job - The serialized job.
   */
  async push(queue: string, job: SerializedJob): Promise<void> {
    const availableAt = job.delaySeconds
      ? new Date(Date.now() + job.delaySeconds * 1000)
      : new Date()

    // Save the WHOLE job as JSON in payload column for zero-loss metadata
    const payload = JSON.stringify(job)

    await this.dbService.execute(
      `INSERT INTO ${this.tableName} (queue, payload, attempts, available_at, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [queue, payload, job.attempts ?? 0, availableAt.toISOString(), new Date().toISOString()]
    )
  }

  /**
   * Pops the next available job from the queue.
   *
   * Uses transactional locking (SELECT ... FOR UPDATE SKIP LOCKED if supported) to ensure
   * atomic reservation of jobs by workers.
   *
   * @param queue - The queue name.
   * @returns The job or `null`.
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

    // Parse payload and restore metadata
    let job: SerializedJob
    try {
      const parsed = JSON.parse(row.payload)
      if (parsed && typeof parsed === 'object' && parsed.type && parsed.data) {
        job = {
          ...parsed,
          id: row.id, // DB ID is the source of truth for deletion
          attempts: row.attempts,
        }
      } else {
        throw new Error('Fallback')
      }
    } catch (_e) {
      // Fallback for old format
      job = {
        id: row.id,
        type: 'class',
        data: row.payload,
        createdAt,
        attempts: row.attempts,
      }
    }

    if (delaySeconds !== undefined) {
      job.delaySeconds = delaySeconds
    }

    return job
  }

  /**
   * Pops multiple jobs from the queue in a single transaction.
   *
   * @param queue - The queue name.
   * @param count - Max jobs to pop.
   */
  async popMany(queue: string, count: number): Promise<SerializedJob[]> {
    if (count <= 1) {
      const job = await this.pop(queue)
      return job ? [job] : []
    }

    try {
      // 1. Select and lock multiple rows
      const result = await this.dbService.execute<{
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
         LIMIT ${count}
         FOR UPDATE SKIP LOCKED`,
        [queue]
      )

      const rows = Array.isArray(result) ? result : result ? [result] : []
      if (!rows || rows.length === 0) {
        return []
      }

      // Ensure rows is treated as array of objects (DatabaseService might return different shapes)
      const validRows = rows.filter((r) => r?.id) as any[]
      if (validRows.length === 0) {
        return []
      }

      const ids = validRows.map((r) => r.id)

      // 2. Mark as reserved in batch
      await this.dbService.execute(
        `UPDATE ${this.tableName}
         SET reserved_at = NOW()
         WHERE id IN (${ids.map((_, i) => `$${i + 1}`).join(', ')})`,
        ids
      )

      // 3. Map to SerializedJob
      return validRows.map((row) => {
        const createdAt = new Date(row.created_at).getTime()
        try {
          const parsed = JSON.parse(row.payload)
          return {
            ...parsed,
            id: row.id,
            attempts: row.attempts,
          }
        } catch (_e) {
          return {
            id: row.id,
            type: 'class' as const,
            data: row.payload,
            createdAt,
            attempts: row.attempts,
          }
        }
      })
    } catch (_e) {
      // Fallback: If SKIP LOCKED is not supported, fall back to single pop loop
      // We avoid blocking FOR UPDATE on multiple rows to prevent deadlock/starvation
      const firstJob = await this.pop(queue)
      return firstJob ? [firstJob] : []
    }
  }

  /**
   * Retrieves queue statistics by querying the table.
   *
   * @param queue - The queue name.
   */
  async stats(queue: string): Promise<QueueStats> {
    const failedQueue = `failed:${queue}`

    try {
      // Pending: available now and not reserved
      const pendingRes = (await this.dbService.execute<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE queue = $1 AND available_at <= NOW() AND reserved_at IS NULL`,
        [queue]
      )) as any[]

      // Delayed: available in future
      const delayedRes = (await this.dbService.execute<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE queue = $1 AND available_at > NOW()`,
        [queue]
      )) as any[]

      // Reserved: currently in flight
      const reservedRes = (await this.dbService.execute<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE queue = $1 AND reserved_at IS NOT NULL`,
        [queue]
      )) as any[]

      // Failed
      const failedRes = (await this.dbService.execute<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE queue = $1`,
        [failedQueue]
      )) as any[]

      return {
        queue,
        size: pendingRes[0]?.count || 0,
        delayed: delayedRes[0]?.count || 0,
        reserved: reservedRes[0]?.count || 0,
        failed: failedRes[0]?.count || 0,
      }
    } catch (err) {
      console.error('[DatabaseDriver] Failed to get stats:', err)
      return { queue, size: 0, delayed: 0, reserved: 0, failed: 0 }
    }
  }

  /**
   * Returns the count of pending jobs.
   *
   * @param queue - The queue name.
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
   * Clears the queue by deleting all rows for the queue.
   *
   * @param queue - The queue name.
   */
  async clear(queue: string): Promise<void> {
    await this.dbService.execute(`DELETE FROM ${this.tableName} WHERE queue = $1`, [queue])
  }

  /**
   * Pops a job using a polling loop (Blocking simulation).
   *
   * @param queue - The queue name.
   * @param timeout - Timeout in seconds.
   */
  async popBlocking(queue: string, timeout: number): Promise<SerializedJob | null> {
    const start = Date.now()
    const timeoutMs = timeout * 1000

    while (true) {
      const job = await this.pop(queue)
      if (job) {
        return job
      }

      if (timeout > 0 && Date.now() - start >= timeoutMs) {
        return null
      }

      // Wait 1 second before next poll
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  /**
   * Pushes multiple jobs using a transaction.
   *
   * @param queue - The queue name.
   * @param jobs - Array of jobs.
   */
  async pushMany(queue: string, jobs: SerializedJob[]): Promise<void> {
    if (jobs.length === 0) {
      return
    }

    // For database drivers, multi-row INSERT is significantly faster
    // Constructing query manually for generality (assuming standard (?,?) or ($1,$2) syntax)
    // Note: DatabaseService provider handles the actual dialect.

    await this.dbService.transaction(async (tx) => {
      for (let i = 0; i < jobs.length; i += 100) {
        const batch = jobs.slice(i, i + 100)
        // Note: Generic multi-row insert is hard without knowing Dialect.
        // Falling back to individual inserts within a transaction for safety,
        // but it's already a batch because of the transaction.
        for (const job of batch) {
          const availableAt = job.delaySeconds
            ? new Date(Date.now() + job.delaySeconds * 1000)
            : new Date()

          const payload = JSON.stringify(job)
          await tx.execute(
            `INSERT INTO ${this.tableName} (queue, payload, attempts, available_at, created_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [queue, payload, job.attempts ?? 0, availableAt.toISOString(), new Date().toISOString()]
          )
        }
      }
    })
  }

  /**
   * Marks a job as permanently failed by moving it to the DLQ (separate logical queue in DB).
   *
   * @param queue - The queue name.
   * @param job - The failed job.
   */
  async fail(queue: string, job: SerializedJob): Promise<void> {
    const failedQueue = `failed:${queue}`
    const payload = JSON.stringify(job)

    await this.dbService.execute(
      `INSERT INTO ${this.tableName} (queue, payload, attempts, available_at, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [failedQueue, payload, job.attempts, new Date().toISOString(), new Date().toISOString()]
    )
  }

  /**
   * Deletes a job row from the database (completion).
   *
   * @param _queue - The queue name (unused).
   * @param job - The job to complete.
   */
  async complete(_queue: string, job: SerializedJob): Promise<void> {
    if (!job.id) {
      return
    }
    await this.dbService.execute(`DELETE FROM ${this.tableName} WHERE id = $1`, [job.id])
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
