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
   * 初始化進度追蹤
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
   * 更新進度
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

    // 定期更新到儲存（避免過於頻繁的寫入）
    if (!this.updateTimer) {
      this.updateTimer = setInterval(() => {
        this.flush().catch((err) => {
          console.error('[ProgressTracker] Failed to flush progress:', err)
        })
      }, this.updateInterval)
    }
  }

  /**
   * 完成進度追蹤
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
   * 標記為失敗
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
   * 刷新進度到儲存
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
   * 停止更新計時器
   */
  private stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = null
    }
  }

  /**
   * 獲取當前進度
   */
  getCurrentProgress(): SitemapProgress | null {
    return this.currentProgress ? { ...this.currentProgress } : null
  }
}
