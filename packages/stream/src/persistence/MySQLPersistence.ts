import { DB, Schema } from '@gravito/atlas'
import type { PersistenceAdapter, SerializedJob } from '../types'

/**
 * MySQL Persistence Adapter.
 * Archives jobs into a MySQL table for long-term auditing.
 */
export class MySQLPersistence implements PersistenceAdapter {
  /**
   * @param db - An Atlas DB instance or compatible QueryBuilder.
   * @param table - The name of the table to store archived jobs.
   */
  constructor(
    private db: any,
    private table = 'flux_job_archive',
    private logsTable = 'flux_system_logs'
  ) {}

  /**
   * Archive a job.
   */
  async archive(
    queue: string,
    job: SerializedJob,
    status: 'completed' | 'failed' | 'waiting' | string
  ): Promise<void> {
    try {
      await this.db.table(this.table).insert({
        job_id: job.id,
        queue: queue,
        status: status,
        payload: JSON.stringify(job),
        error: job.error || null,
        created_at: new Date(job.createdAt),
        archived_at: new Date(),
      })
    } catch (err) {
      console.error(`[MySQLPersistence] Failed to archive job ${job.id}:`, err)
    }
  }

  /**
   * Find a specific job in the archive.
   */
  async find(queue: string, id: string): Promise<SerializedJob | null> {
    const row = await this.db.table(this.table).where('queue', queue).where('job_id', id).first()

    if (!row) {
      return null
    }

    // Parse the stored payload
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

    return rows
      .map((r: any) => {
        try {
          const job = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload
          return { ...job, _status: r.status, _archivedAt: r.archived_at }
        } catch (_e) {
          return null
        }
      })
      .filter(Boolean)
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

    return rows
      .map((r: any) => {
        try {
          const job = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload
          return { ...job, _status: r.status, _archivedAt: r.archived_at }
        } catch (_e) {
          return null
        }
      })
      .filter(Boolean)
  }

  /**
   * Archive a system log message.
   */
  async archiveLog(log: {
    level: string
    message: string
    workerId: string
    queue?: string
    timestamp: Date
  }): Promise<void> {
    try {
      await this.db.table(this.logsTable).insert({
        level: log.level,
        message: log.message,
        worker_id: log.workerId,
        queue: log.queue || null,
        timestamp: log.timestamp,
      })
    } catch (err: any) {
      console.error(`[MySQLPersistence] Failed to archive log:`, err.message)
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

    if (options.level) query = query.where('level', options.level)
    if (options.workerId) query = query.where('worker_id', options.workerId)
    if (options.queue) query = query.where('queue', options.queue)
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

    if (options.level) query = query.where('level', options.level)
    if (options.workerId) query = query.where('worker_id', options.workerId)
    if (options.queue) query = query.where('queue', options.queue)
    if (options.search) {
      query = query.where('message', 'like', `%${options.search}%`)
    }

    if (options.startTime) {
      query = query.where('timestamp', '>=', options.startTime)
    }

    if (options.endTime) {
      query = query.where('timestamp', '<=', options.endTime)
    }

    const result = await query.count('id as total').first()
    return result?.total || 0
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

    return (jobsDeleted || 0) + (logsDeleted || 0)
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

    const result = await query.count('id as total').first()
    return result?.total || 0
  }

  /**
   * Help script to create the necessary table.
   */
  async setupTable(): Promise<void> {
    await Promise.all([this.setupJobsTable(), this.setupLogsTable()])
  }

  private async setupJobsTable(): Promise<void> {
    const exists = await Schema.hasTable(this.table)
    if (exists) return

    await Schema.create(this.table, (table) => {
      table.id()
      table.string('job_id', 64)
      table.string('queue', 128)
      table.string('status', 20)
      table.json('payload')
      table.text('error').nullable()
      table.timestamp('created_at').nullable()
      table.timestamp('archived_at').default(DB.raw('CURRENT_TIMESTAMP'))

      table.index(['queue', 'archived_at'])
      table.index(['queue', 'job_id'])
      table.index(['status', 'archived_at'])
      table.index(['archived_at'])
    })
    console.log(`[MySQLPersistence] Created jobs archive table: ${this.table}`)
  }

  private async setupLogsTable(): Promise<void> {
    const exists = await Schema.hasTable(this.logsTable)
    if (exists) return

    await Schema.create(this.logsTable, (table) => {
      table.id()
      table.string('level', 20)
      table.text('message')
      table.string('worker_id', 128)
      table.string('queue', 128).nullable()
      table.timestamp('timestamp').default(DB.raw('CURRENT_TIMESTAMP'))

      table.index(['worker_id'])
      table.index(['queue'])
      table.index(['level'])
      table.index(['timestamp'])
    })
    console.log(`[MySQLPersistence] Created logs archive table: ${this.logsTable}`)
  }
}
