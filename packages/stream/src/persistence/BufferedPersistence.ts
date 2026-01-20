import type { PersistenceAdapter, SerializedJob } from '../types'

/**
 * Buffered Persistence Wrapper.
 * Wraps any PersistenceAdapter to add buffering and batch writing capabilities.
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

  async find(queue: string, id: string): Promise<SerializedJob | null> {
    return this.adapter.find(queue, id)
  }

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

  async cleanup(days: number): Promise<number> {
    return this.adapter.cleanup(days)
  }

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
