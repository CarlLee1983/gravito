import type { SitemapProgress, SitemapProgressStorage } from '../types'

/**
 * Options for configuring the `ProgressTracker`.
 *
 * @public
 * @since 3.0.0
 */
export interface ProgressTrackerOptions {
  /** The storage backend used to persist progress information. */
  storage: SitemapProgressStorage
  /** Update interval in milliseconds. @default 1000 */
  updateInterval?: number
}

/**
 * ProgressTracker monitors and persists the progress of sitemap generation jobs.
 *
 * It provides methods to initialize, update, and complete progress tracking,
 * ensuring that long-running generation tasks can be monitored via the storage backend.
 *
 * @public
 * @since 3.0.0
 */
export class ProgressTracker {
  private storage: SitemapProgressStorage
  private updateInterval: number
  private currentProgress: SitemapProgress | null = null
  private updateTimer: ReturnType<typeof setInterval> | null = null

  constructor(options: ProgressTrackerOptions) {
    this.storage = options.storage
    this.updateInterval = options.updateInterval || 1000
  }

  /**
   * Initializes progress tracking for a new job.
   *
   * @param jobId - Unique identifier for the generation job.
   * @param total - Total number of entries to be processed.
   */
  async init(jobId: string, total: number): Promise<void> {
    this.currentProgress = {
      jobId,
      status: 'pending',
      total,
      processed: 0,
      percentage: 0,
      startTime: new Date(),
    }

    await this.storage.set(jobId, this.currentProgress)
  }

  /**
   * Updates the current progress of the job.
   *
   * Updates are debounced and flushed to storage at regular intervals
   * specified by `updateInterval` to avoid excessive write operations.
   *
   * @param processed - Number of entries processed so far.
   * @param status - Optional new status for the job.
   */
  async update(processed: number, status?: SitemapProgress['status']): Promise<void> {
    if (!this.currentProgress) {
      return
    }

    this.currentProgress.processed = processed
    this.currentProgress.percentage = Math.round((processed / this.currentProgress.total) * 100)

    if (status) {
      this.currentProgress.status = status
    } else if (this.currentProgress.status === 'pending') {
      this.currentProgress.status = 'processing'
    }

    // Regularly update to storage (avoid too frequent writes)
    if (!this.updateTimer) {
      this.updateTimer = setInterval(() => {
        this.flush().catch((err) => {
          console.error('[ProgressTracker] Failed to flush progress:', err)
        })
      }, this.updateInterval)
      this.updateTimer.unref?.()
    }
  }

  /**
   * Marks the current job as successfully completed.
   */
  async complete(): Promise<void> {
    if (!this.currentProgress) {
      return
    }

    this.currentProgress.status = 'completed'
    this.currentProgress.endTime = new Date()
    this.currentProgress.percentage = 100

    await this.flush()
    this.stop()
  }

  /**
   * Marks the current job as failed with an error message.
   *
   * @param error - The error message describing why the job failed.
   */
  async fail(error: string): Promise<void> {
    if (!this.currentProgress) {
      return
    }

    this.currentProgress.status = 'failed'
    this.currentProgress.endTime = new Date()
    this.currentProgress.error = error

    await this.flush()
    this.stop()
  }

  /**
   * Flushes the current progress state to the storage backend.
   */
  private async flush(): Promise<void> {
    if (!this.currentProgress) {
      return
    }

    await this.storage.update(this.currentProgress.jobId, {
      processed: this.currentProgress.processed,
      percentage: this.currentProgress.percentage,
      status: this.currentProgress.status,
      endTime: this.currentProgress.endTime,
      error: this.currentProgress.error,
    })
  }

  /**
   * Stops the periodic update timer.
   */
  private stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = null
    }
  }

  /**
   * Returns a copy of the current progress state.
   *
   * @returns The current SitemapProgress object, or null if no job is active.
   */
  getCurrentProgress(): SitemapProgress | null {
    return this.currentProgress ? { ...this.currentProgress } : null
  }
}
