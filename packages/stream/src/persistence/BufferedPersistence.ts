import type { PersistenceAdapter, SerializedJob } from '../types'

/**
 * Buffered Persistence Wrapper.
 *
 * Decorates any `PersistenceAdapter` to add write buffering. Instead of writing
 * to the database immediately for every event, it collects jobs and logs in memory
 * and flushes them in batches. This significantly reduces database I/O for high-throughput queues.
 *
 * @public
 * @example
 * ```typescript
 * const mysqlAdapter = new MySQLPersistence(db);
 * const bufferedAdapter = new BufferedPersistence(mysqlAdapter, {
 *   maxBufferSize: 100,
 *   flushInterval: 500
 * });
 * ```
 */
export class BufferedPersistence implements PersistenceAdapter {
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

  constructor(
    private adapter: PersistenceAdapter,
    options: { maxBufferSize?: number; flushInterval?: number } = {}
  ) {
    this.maxBufferSize = options.maxBufferSize ?? 50
    this.flushInterval = options.flushInterval ?? 5000
  }

  /**
   * Buffers a job archive request.
   *
   * @param queue - The queue name.
   * @param job - The serialized job.
   * @param status - The final job status.
   */
  async archive(
    queue: string,
    job: SerializedJob,
    status: 'completed' | 'failed' | 'waiting' | string
  ): Promise<void> {
    this.jobBuffer.push({ queue, job, status })

    if (this.jobBuffer.length >= this.maxBufferSize) {
      this.flush().catch((err) => {
        console.error('[BufferedPersistence] Auto-flush failed (jobs):', err.message || err)
      })
    } else {
      this.ensureFlushTimer()
    }
  }

  /**
   * Delegates find to the underlying adapter (no buffering for reads).
   */
  async find(queue: string, id: string): Promise<SerializedJob | null> {
    return this.adapter.find(queue, id)
  }

  /**
   * Delegates list to the underlying adapter (no buffering for reads).
   */
  async list(
    queue: string,
    options?: {
      limit?: number
      offset?: number
      status?: 'completed' | 'failed' | 'waiting' | string
      jobId?: string
      startTime?: Date
      endTime?: Date
    }
  ): Promise<SerializedJob[]> {
    return this.adapter.list(queue, options)
  }

  /**
   * Archives multiple jobs directly (bypassing buffer, or flushing first).
   *
   * Actually, for consistency, this might just pass through.
   */
  async archiveMany(
    jobs: Array<{
      queue: string
      job: SerializedJob
      status: 'completed' | 'failed' | 'waiting' | string
    }>
  ): Promise<void> {
    if (this.adapter.archiveMany) {
      return this.adapter.archiveMany(jobs)
    }

    for (const item of jobs) {
      await this.adapter.archive(item.queue, item.job, item.status)
    }
  }

  /**
   * Delegates cleanup to the underlying adapter.
   */
  async cleanup(days: number): Promise<number> {
    return this.adapter.cleanup(days)
  }

  /**
   * Flushes all buffered data to the underlying adapter.
   *
   * Uses `archiveMany` and `archiveLogMany` if supported by the adapter for batch efficiency.
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
      if (this.adapter.archiveMany) {
        promises.push(this.adapter.archiveMany(jobs))
      } else {
        promises.push(
          (async () => {
            for (const item of jobs) {
              await this.adapter.archive(item.queue, item.job, item.status)
            }
          })()
        )
      }
    }

    if (logs.length > 0) {
      if (this.adapter.archiveLogMany) {
        promises.push(this.adapter.archiveLogMany(logs))
      } else {
        promises.push(
          (async () => {
            for (const log of logs) {
              await this.adapter.archiveLog(log)
            }
          })()
        )
      }
    }

    await Promise.all(promises)
  }

  /**
   * Delegates count to the underlying adapter.
   */
  async count(
    queue: string,
    options?: {
      status?: 'completed' | 'failed' | 'waiting' | string
      jobId?: string
      startTime?: Date
      endTime?: Date
    }
  ): Promise<number> {
    return this.adapter.count(queue, options)
  }

  /**
   * Buffers a log message.
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
        console.error('[BufferedPersistence] Auto-flush failed (logs):', err.message || err)
      })
    } else {
      this.ensureFlushTimer()
    }
  }

  /**
   * Archives multiple logs directly.
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
    if (this.adapter.archiveLogMany) {
      return this.adapter.archiveLogMany(logs)
    }

    for (const log of logs) {
      await this.adapter.archiveLog(log)
    }
  }

  /**
   * Delegates listLogs to the underlying adapter.
   */
  async listLogs(options?: {
    limit?: number
    offset?: number
    level?: string
    workerId?: string
    queue?: string
    search?: string
    startTime?: Date
    endTime?: Date
  }): Promise<any[]> {
    return this.adapter.listLogs(options)
  }

  /**
   * Delegates countLogs to the underlying adapter.
   */
  async countLogs(options?: {
    level?: string
    workerId?: string
    queue?: string
    search?: string
    startTime?: Date
    endTime?: Date
  }): Promise<number> {
    return this.adapter.countLogs(options)
  }

  /**
   * Ensures the auto-flush timer is running.
   */
  private ensureFlushTimer(): void {
    if (this.flushTimer) {
      return
    }

    this.flushTimer = setTimeout(() => {
      this.flush().catch((err) => {
        console.error('[BufferedPersistence] Interval flush failed:', err.message || err)
      })
    }, this.flushInterval)
  }
}
