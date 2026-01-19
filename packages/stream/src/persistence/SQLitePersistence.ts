import type { ConnectionContract } from '@gravito/atlas'
import { Schema } from '@gravito/atlas'
import type { JobRow, PersistenceAdapter, SerializedJob } from '../types'

/**
 * SQLite Persistence Adapter.
 * Archives jobs into a local SQLite database for zero-config persistence.
 */
export class SQLitePersistence implements PersistenceAdapter {
  private jobBuffer: Array<{
    queue: string
    job: SerializedJob
    status: string
  }> = []
  private logBuffer: Array<{
    level: string
    message: string
    workerId: string
    queue?: string
    timestamp: Date
  }> = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private maxBufferSize: number
  private flushInterval: number

  /**
   * @param db - An Atlas DB instance (SQLite driver).
   * @param table - The name of the table to store archived jobs.
   * @param logsTable - The name of the table to store system logs.
   * @param options - Buffering options.
   */
  constructor(
    private db: ConnectionContract,
    private table = 'flux_job_archive',
    private logsTable = 'flux_system_logs',
    options: { maxBufferSize?: number; flushInterval?: number } = {}
  ) {
    this.maxBufferSize = options.maxBufferSize ?? 50
    this.flushInterval = options.flushInterval ?? 5000 // 5 seconds
  }

  /**
   * Archive a job (buffered).
   */
  async archive(
    queue: string,
    job: SerializedJob,
    status: 'completed' | 'failed' | 'waiting' | string
  ): Promise<void> {
    this.jobBuffer.push({ queue, job, status })

    if (this.jobBuffer.length >= this.maxBufferSize) {
      this.flush().catch((err) => {
        console.error('[SQLitePersistence] Auto-flush failed (jobs):', err.message)
      })
    } else {
      this.ensureFlushTimer()
    }
  }

  /**
   * Archive multiple jobs (direct batch write).
   */
  async archiveMany(
    jobs: Array<{
      queue: string
      job: SerializedJob
      status: string
    }>
  ): Promise<void> {
    if (jobs.length === 0) return

    try {
      const records = jobs.map((item) => ({
        job_id: item.job.id,
        queue: item.queue,
        status: item.status,
        payload: JSON.stringify(item.job),
        error: item.job.error || null,
        created_at: new Date(item.job.createdAt),
        archived_at: new Date(),
      }))

      await this.db.table(this.table).insert(records)
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.error(`[SQLitePersistence] Failed to archive ${jobs.length} jobs:`, error.message)
    }
  }

  /**
   * Ensure the flush timer is running.
   */
  private ensureFlushTimer(): void {
    if (this.flushTimer) return

    this.flushTimer = setTimeout(() => {
      this.flush().catch((err) => {
        console.error('[SQLitePersistence] Interval flush failed:', err.message)
      })
    }, this.flushInterval)
  }

  /**
   * Flush all buffered data.
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    const jobs = [...this.jobBuffer]
    const logs = [...this.logBuffer]
    this.jobBuffer = []
    this.logBuffer = []

    const promises: Promise<void>[] = []
    if (jobs.length > 0) {
      promises.push(this.archiveMany(jobs))
    }
    if (logs.length > 0) {
      promises.push(this.archiveLogMany(logs))
    }

    await Promise.all(promises)
  }

  /**
   * Find a specific job in the archive.
   */
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
    this.logBuffer.push(log)

    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flush().catch((err) => {
        console.error('[SQLitePersistence] Auto-flush failed (logs):', err.message)
      })
    } else {
      this.ensureFlushTimer()
    }
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
