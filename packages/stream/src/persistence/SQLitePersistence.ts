import type { ConnectionContract } from '@gravito/atlas'
import { Schema } from '@gravito/atlas'
import type { JobRow, PersistenceAdapter, SerializedJob } from '../types'

/**
 * SQLite Persistence Adapter.
 * Archives jobs into a local SQLite database for zero-config persistence.
 */
export class SQLitePersistence implements PersistenceAdapter {
  /**
   * @param db - An Atlas DB instance (SQLite driver).
   * @param table - The name of the table to store archived jobs.
   * @param logsTable - The name of the table to store system logs.
   * @param options - Buffering options (Deprecated: Use BufferedPersistence wrapper instead).
   */
  constructor(
    private db: ConnectionContract,
    private table = 'flux_job_archive',
    private logsTable = 'flux_system_logs',
    _options: { maxBufferSize?: number; flushInterval?: number } = {}
  ) {}

  async archive(
    queue: string,
    job: SerializedJob,
    status: 'completed' | 'failed' | 'waiting' | string
  ): Promise<void> {
    await this.archiveMany([{ queue, job, status }])
  }

  async archiveMany(
    jobs: Array<{
      queue: string
      job: SerializedJob
      status: 'completed' | 'failed' | 'waiting' | string
    }>
  ): Promise<void> {
    if (jobs.length === 0) return

    const batchSize = 200
    for (let i = 0; i < jobs.length; i += batchSize) {
      const chunk = jobs.slice(i, i + batchSize)
      try {
        const records = chunk.map((item) => ({
          job_id: item.job.id,
          queue: item.queue,
          status: item.status,
          payload: JSON.stringify(item.job),
          error: item.job.error || null,
          created_at: new Date(item.job.createdAt),
          archived_at: new Date(),
        }))

        // For SQLite, wrapping in a transaction significantly improves performance
        if (typeof (this.db as any).transaction === 'function') {
          await (this.db as any).transaction(async (trx: any) => {
            await trx.table(this.table).insert(records)
          })
        } else {
          await this.db.table(this.table).insert(records)
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err))
        console.error(`[SQLitePersistence] Failed to archive ${chunk.length} jobs:`, error.message)
      }
    }
  }

  async flush(): Promise<void> {
    // No-op: Buffering removed. Use BufferedPersistence if buffering is needed.
  }

  async find(queue: string, id: string): Promise<SerializedJob | null> {
    const row = await this.db.table(this.table).where('queue', queue).where('job_id', id).first()

    if (!row) {
      return null
    }

    try {
      const job = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
      return job
    } catch (_e) {
      return null
    }
  }

  /**
   * List jobs from the archive.
   */
  async list(
    queue: string,
    options: {
      limit?: number
      offset?: number
      status?: 'completed' | 'failed' | 'waiting' | string
      jobId?: string
      startTime?: Date
      endTime?: Date
    } = {}
  ): Promise<SerializedJob[]> {
    let query = this.db.table(this.table).where('queue', queue)

    if (options.status) {
      query = query.where('status', options.status)
    }

    if (options.jobId) {
      query = query.where('job_id', options.jobId)
    }

    if (options.startTime) {
      query = query.where('archived_at', '>=', options.startTime)
    }

    if (options.endTime) {
      query = query.where('archived_at', '<=', options.endTime)
    }

    const rows = await query
      .orderBy('archived_at', 'desc')
      .limit(options.limit ?? 50)
      .offset(options.offset ?? 0)
      .get()

    return (rows as unknown as JobRow[])
      .map((r) => {
        try {
          const job = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload
          return { ...job, _status: r.status, _archivedAt: r.archived_at }
        } catch (_e) {
          return null
        }
      })
      .filter(
        (item): item is SerializedJob & { _status: string; _archivedAt: Date | string } => !!item
      )
  }

  /**
   * Search jobs from the archive.
   */
  async search(
    query: string,
    options: { limit?: number; offset?: number; queue?: string } = {}
  ): Promise<SerializedJob[]> {
    let q = this.db.table(this.table)

    if (options.queue) {
      q = q.where('queue', options.queue)
    }

    const rows = await q
      .where((sub: any) => {
        sub
          .where('job_id', 'like', `%${query}%`)
          .orWhere('payload', 'like', `%${query}%`)
          .orWhere('error', 'like', `%${query}%`)
      })
      .orderBy('archived_at', 'desc')
      .limit(options.limit ?? 50)
      .offset(options.offset ?? 0)
      .get()

    return (rows as unknown as JobRow[])
      .map((r) => {
        try {
          const job = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload
          return { ...job, _status: r.status, _archivedAt: r.archived_at }
        } catch (_e) {
          return null
        }
      })
      .filter(
        (item): item is SerializedJob & { _status: string; _archivedAt: Date | string } => !!item
      )
  }

  /**
   * Archive a system log message (buffered).
   */
  async archiveLog(log: {
    level: string
    message: string
    workerId: string
    queue?: string
    timestamp: Date
  }): Promise<void> {
    await this.archiveLogMany([log])
  }

  /**
   * Archive multiple log messages (direct batch write).
   */
  async archiveLogMany(
    logs: Array<{
      level: string
      message: string
      workerId: string
      queue?: string
      timestamp: Date
    }>
  ): Promise<void> {
    if (logs.length === 0) return

    try {
      const records = logs.map((log) => ({
        level: log.level,
        message: log.message,
        worker_id: log.workerId,
        queue: log.queue || null,
        timestamp: log.timestamp,
      }))

      await this.db.table(this.logsTable).insert(records)
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.error(`[SQLitePersistence] Failed to archive ${logs.length} logs:`, error.message)
    }
  }

  /**
   * List system logs from the archive.
   */
  async listLogs(
    options: {
      limit?: number
      offset?: number
      level?: string
      workerId?: string
      queue?: string
      search?: string
      startTime?: Date
      endTime?: Date
    } = {}
  ): Promise<any[]> {
    let query = this.db.table(this.logsTable)

    if (options.level) {
      query = query.where('level', options.level)
    }
    if (options.workerId) {
      query = query.where('worker_id', options.workerId)
    }
    if (options.queue) {
      query = query.where('queue', options.queue)
    }
    if (options.search) {
      query = query.where('message', 'like', `%${options.search}%`)
    }

    if (options.startTime) {
      query = query.where('timestamp', '>=', options.startTime)
    }

    if (options.endTime) {
      query = query.where('timestamp', '<=', options.endTime)
    }

    return await query
      .orderBy('timestamp', 'desc')
      .limit(options.limit ?? 50)
      .offset(options.offset ?? 0)
      .get()
  }

  /**
   * Count system logs in the archive.
   */
  async countLogs(
    options: {
      level?: string
      workerId?: string
      queue?: string
      search?: string
      startTime?: Date
      endTime?: Date
    } = {}
  ): Promise<number> {
    let query = this.db.table(this.logsTable)

    if (options.level) {
      query = query.where('level', options.level)
    }
    if (options.workerId) {
      query = query.where('worker_id', options.workerId)
    }
    if (options.queue) {
      query = query.where('queue', options.queue)
    }
    if (options.search) {
      query = query.where('message', 'like', `%${options.search}%`)
    }

    if (options.startTime) {
      query = query.where('timestamp', '>=', options.startTime)
    }

    if (options.endTime) {
      query = query.where('timestamp', '<=', options.endTime)
    }

    const result = await query.count()
    return Number(result) || 0
  }

  /**
   * Remove old records from the archive.
   */
  async cleanup(days: number): Promise<number> {
    const threshold = new Date()
    threshold.setDate(threshold.getDate() - days)

    const [jobsDeleted, logsDeleted] = await Promise.all([
      this.db.table(this.table).where('archived_at', '<', threshold).delete(),
      this.db.table(this.logsTable).where('timestamp', '<', threshold).delete(),
    ])

    return (Number(jobsDeleted) || 0) + (Number(logsDeleted) || 0)
  }

  /**
   * Count jobs in the archive.
   */
  async count(
    queue: string,
    options: {
      status?: 'completed' | 'failed' | 'waiting' | string
      jobId?: string
      startTime?: Date
      endTime?: Date
    } = {}
  ): Promise<number> {
    let query = this.db.table(this.table).where('queue', queue)

    if (options.status) {
      query = query.where('status', options.status)
    }

    if (options.jobId) {
      query = query.where('job_id', options.jobId)
    }

    if (options.startTime) {
      query = query.where('archived_at', '>=', options.startTime)
    }

    if (options.endTime) {
      query = query.where('archived_at', '<=', options.endTime)
    }

    const result = await query.count()
    return Number(result) || 0
  }

  /**
   * Setup table for SQLite.
   */
  async setupTable(): Promise<void> {
    await Promise.all([this.setupJobsTable(), this.setupLogsTable()])
  }

  private async setupJobsTable(): Promise<void> {
    const exists = await Schema.hasTable(this.table)
    if (exists) {
      return
    }

    await Schema.create(this.table, (table) => {
      table.id()
      table.string('job_id', 64)
      table.string('queue', 128)
      table.string('status', 20)
      table.text('payload')
      table.text('error').nullable()
      table.timestamp('created_at').nullable()
      table.timestamp('archived_at').nullable()

      table.index(['queue', 'archived_at'])
      table.index(['archived_at'])
    })
    console.log(`[SQLitePersistence] Created jobs archive table: ${this.table}`)
  }

  private async setupLogsTable(): Promise<void> {
    const exists = await Schema.hasTable(this.logsTable)
    if (exists) {
      return
    }

    await Schema.create(this.logsTable, (table) => {
      table.id()
      table.string('level', 20)
      table.text('message')
      table.string('worker_id', 128)
      table.string('queue', 128).nullable()
      table.timestamp('timestamp')

      table.index(['worker_id'])
      table.index(['queue'])
      table.index(['level'])
      table.index(['timestamp'])
    })
    console.log(`[SQLitePersistence] Created logs archive table: ${this.logsTable}`)
  }
}
