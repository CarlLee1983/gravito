/**
 * Report Queue Manager
 * 報表隊列管理系統
 *
 * 職責：
 * 1. 管理異步報表生成隊列
 * 2. 支持優先級隊列
 * 3. 實施重試機制（指數退避）
 * 4. 管理死信隊列（DLQ）
 * 5. 監控隊列狀態
 */

export interface ReportJob {
  jobId: string
  reportType: 'sales' | 'inventory' | 'customer' | 'revenue' | 'custom'
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying'
  data: Record<string, unknown>
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  attempts: number
  maxAttempts: number
  error?: string
  result?: unknown
  retryScheduledAt?: Date
}

export interface ReportQueueConfig {
  maxRetries?: number // 默認 3 次
  baseRetryDelay?: number // 默認 1000ms
  maxRetryDelay?: number // 默認 60000ms
  concurrency?: number // 默認 5
  timeout?: number // 默認 300000ms (5 分鐘)
}

export interface QueueStats {
  totalJobs: number
  pendingJobs: number
  processingJobs: number
  completedJobs: number
  failedJobs: number
  dlqJobs: number
  averageProcessingTime: number
  successRate: number
}

export interface JobResult {
  jobId: string
  status: 'success' | 'failed' | 'retry'
  processingTime: number
  message?: string
}

/**
 * 報表隊列管理器
 */
export class ReportQueueManager {
  private config: Required<ReportQueueConfig>
  private jobs: Map<string, ReportJob> = new Map()
  private dlqJobs: Map<string, ReportJob> = new Map()
  private completedJobs: Map<string, ReportJob> = new Map()
  private jobProcessors: Map<string, (job: ReportJob) => Promise<unknown>> = new Map()
  private eventListeners: Map<string, ((data: unknown) => void)[]> = new Map()
  private isProcessing = false
  private processingQueue: string[] = []

  constructor(config: ReportQueueConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      baseRetryDelay: config.baseRetryDelay ?? 1000,
      maxRetryDelay: config.maxRetryDelay ?? 60000,
      concurrency: config.concurrency ?? 5,
      timeout: config.timeout ?? 300000,
    }

    console.log('[ReportQueueManager] 隊列管理器初始化')
    console.log(`  最大重試次數: ${this.config.maxRetries}`)
    console.log(`  初始重試延遲: ${this.config.baseRetryDelay}ms`)
    console.log(`  並發數: ${this.config.concurrency}`)
  }

  /**
   * 提交報表生成任務
   */
  submitJob(
    reportType: ReportJob['reportType'],
    data: Record<string, unknown>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): string {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const job: ReportJob = {
      jobId,
      reportType,
      priority,
      status: 'pending',
      data,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: this.config.maxRetries + 1,
    }

    this.jobs.set(jobId, job)
    this.emit('job:submitted', { jobId, reportType, priority })

    console.log(`[ReportQueueManager] 任務已提交: ${jobId}`)
    console.log(`  類型: ${reportType}`)
    console.log(`  優先級: ${priority}`)

    // 非阻塞：後台啟動處理
    this.startProcessing()

    return jobId
  }

  /**
   * 註冊報表處理器
   */
  registerProcessor(
    reportType: ReportJob['reportType'],
    processor: (job: ReportJob) => Promise<unknown>
  ): void {
    this.jobProcessors.set(reportType, processor)
    console.log(`[ReportQueueManager] 已註冊處理器: ${reportType}`)
  }

  /**
   * 獲取隊列統計
   */
  getStats(): QueueStats {
    const allJobs = Array.from(this.jobs.values())
    const completedJobs = Array.from(this.completedJobs.values())

    const pendingCount = allJobs.filter((j) => j.status === 'pending').length
    const processingCount = allJobs.filter((j) => j.status === 'processing').length
    const completedCount = completedJobs.length
    const failedCount = allJobs.filter((j) => j.status === 'failed').length
    const dlqCount = this.dlqJobs.size

    const totalProcessingTime = completedJobs.reduce((sum, job) => {
      const startTime = job.startedAt?.getTime() ?? job.createdAt.getTime()
      const endTime = job.completedAt?.getTime() ?? Date.now()
      return sum + (endTime - startTime)
    }, 0)

    const averageTime = completedCount > 0 ? totalProcessingTime / completedCount : 0
    const successRate =
      completedCount + failedCount > 0 ? (completedCount / (completedCount + failedCount)) * 100 : 0

    return {
      totalJobs: this.jobs.size,
      pendingJobs: pendingCount,
      processingJobs: processingCount,
      completedJobs: completedCount,
      failedJobs: failedCount,
      dlqJobs: dlqCount,
      averageProcessingTime: averageTime,
      successRate,
    }
  }

  /**
   * 獲取任務狀態
   */
  getJobStatus(jobId: string): ReportJob | undefined {
    return this.jobs.get(jobId) || this.completedJobs.get(jobId) || this.dlqJobs.get(jobId)
  }

  /**
   * 獲取 DLQ 中的任務
   */
  getDLQJobs(): ReportJob[] {
    return Array.from(this.dlqJobs.values())
  }

  /**
   * 處理隊列中的任務
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true

    while (this.processingQueue.length > 0 || this.hasPendingJobs()) {
      const pendingJobs = this.getPendingJobsSorted()

      // 按優先級和並發數處理
      const jobsToProcess = pendingJobs.slice(0, this.config.concurrency)

      const promises = jobsToProcess.map((jobId) => this.processJob(jobId))
      await Promise.allSettled(promises)

      // 短暫延遲以避免緊忙迴圈
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    this.isProcessing = false
  }

  /**
   * 按優先級排序待處理任務
   */
  private getPendingJobsSorted(): string[] {
    const priorityMap = { high: 3, medium: 2, low: 1 }

    const pendingJobs = Array.from(this.jobs.entries())
      .filter(([, job]) => job.status === 'pending')
      .sort(([, jobA], [, jobB]) => {
        const priorityDiff = priorityMap[jobB.priority] - priorityMap[jobA.priority]
        if (priorityDiff !== 0) {
          return priorityDiff
        }
        return jobA.createdAt.getTime() - jobB.createdAt.getTime()
      })

    return pendingJobs.map(([jobId]) => jobId)
  }

  /**
   * 檢查是否有待處理任務
   */
  private hasPendingJobs(): boolean {
    return Array.from(this.jobs.values()).some((j) => j.status === 'pending')
  }

  /**
   * 處理單個任務
   */
  private async processJob(jobId: string): Promise<JobResult> {
    const job = this.jobs.get(jobId)
    if (!job) {
      return { jobId, status: 'failed', processingTime: 0, message: 'Job not found' }
    }

    job.status = 'processing'
    job.startedAt = new Date()
    job.attempts++

    this.emit('job:started', { jobId, reportType: job.reportType })
    console.log(`[ReportQueueManager] 開始處理: ${jobId} (嘗試 ${job.attempts}/${job.maxAttempts})`)

    try {
      // 獲取並執行處理器
      const processor = this.jobProcessors.get(job.reportType)
      if (!processor) {
        throw new Error(`No processor registered for ${job.reportType}`)
      }

      // 執行處理器（帶超時）
      const result = await Promise.race([processor(job), this.createTimeout(this.config.timeout)])

      job.status = 'completed'
      job.result = result
      job.completedAt = new Date()

      this.completedJobs.set(jobId, job)
      this.jobs.delete(jobId)

      const processingTime = job.completedAt.getTime() - (job.startedAt?.getTime() ?? 0)

      this.emit('job:completed', { jobId, processingTime, result })
      console.log(`[ReportQueueManager] 任務完成: ${jobId} (耗時 ${processingTime}ms)`)

      return { jobId, status: 'success', processingTime }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      job.error = errorMessage
      job.status = 'failed'
      job.completedAt = new Date()

      console.error(`[ReportQueueManager] 任務失敗: ${jobId} - ${errorMessage}`)

      // 決定是否重試
      if (job.attempts < job.maxAttempts) {
        const delay = this.calculateRetryDelay(job.attempts)
        job.status = 'retrying'
        job.retryScheduledAt = new Date(Date.now() + delay)

        this.emit('job:retry', { jobId, attempt: job.attempts, delay })
        console.log(`[ReportQueueManager] 已排定重試: ${jobId} (${delay}ms 後)`)

        // 排定重試
        setTimeout(() => {
          const retryJob = this.jobs.get(jobId)
          if (retryJob && retryJob.status === 'retrying') {
            retryJob.status = 'pending'
            retryJob.retryScheduledAt = undefined
          }
        }, delay)

        return { jobId, status: 'retry', processingTime: 0, message: `Retry in ${delay}ms` }
      } else {
        // 發送到死信隊列
        job.status = 'failed'
        this.dlqJobs.set(jobId, job)
        this.jobs.delete(jobId)

        this.emit('job:dlq', { jobId, error: errorMessage, attempts: job.attempts })
        console.log(`[ReportQueueManager] 任務已移至 DLQ: ${jobId} (${job.attempts} 次嘗試)`)

        return { jobId, status: 'failed', processingTime: 0, message: 'Max retries exceeded' }
      }
    }
  }

  /**
   * 計算重試延遲（指數退避）
   */
  private calculateRetryDelay(attempts: number): number {
    // 指數退避：1s, 2s, 4s, ...
    const delay = 2 ** (attempts - 1) * this.config.baseRetryDelay
    return Math.min(delay, this.config.maxRetryDelay)
  }

  /**
   * 創建超時 Promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Job timeout after ${ms}ms`)), ms)
    )
  }

  /**
   * 重新提交 DLQ 任務
   */
  resubmitDLQJob(jobId: string): boolean {
    const dlqJob = this.dlqJobs.get(jobId)
    if (!dlqJob) {
      return false
    }

    // 重置任務為待處理
    dlqJob.status = 'pending'
    dlqJob.attempts = 0
    dlqJob.error = undefined
    dlqJob.completedAt = undefined
    dlqJob.startedAt = undefined

    this.dlqJobs.delete(jobId)
    this.jobs.set(jobId, dlqJob)

    this.emit('job:resubmitted', { jobId })
    console.log(`[ReportQueueManager] DLQ 任務已重新提交: ${jobId}`)

    this.startProcessing()
    return true
  }

  /**
   * 清空 DLQ
   */
  clearDLQ(): number {
    const count = this.dlqJobs.size
    this.dlqJobs.clear()
    console.log(`[ReportQueueManager] DLQ 已清空 (${count} 個任務)`)
    return count
  }

  /**
   * 事件監聽
   */
  on(event: string, callback: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)?.push(callback)
  }

  /**
   * 觸發事件
   */
  private emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data)
        } catch (error) {
          console.error(`[ReportQueueManager] Event listener error for ${event}:`, error)
        }
      }
    }
  }

  /**
   * 生成報表隊列狀態報告
   */
  generateStatusReport(): string {
    const stats = this.getStats()

    const lines: string[] = []
    lines.push('========== REPORT QUEUE STATUS ==========')
    lines.push('')

    lines.push('--- QUEUE STATISTICS ---')
    lines.push(`總任務數: ${stats.totalJobs}`)
    lines.push(`待處理: ${stats.pendingJobs}`)
    lines.push(`處理中: ${stats.processingJobs}`)
    lines.push(`已完成: ${stats.completedJobs}`)
    lines.push(`已失敗: ${stats.failedJobs}`)
    lines.push(`DLQ 任務: ${stats.dlqJobs}`)
    lines.push('')

    lines.push('--- PERFORMANCE ---')
    lines.push(`平均處理時間: ${(stats.averageProcessingTime / 1000).toFixed(2)}s`)
    lines.push(`成功率: ${stats.successRate.toFixed(2)}%`)
    lines.push('')

    lines.push('--- QUEUE CONFIGURATION ---')
    lines.push(`最大重試次數: ${this.config.maxRetries}`)
    lines.push(`基礎重試延遲: ${this.config.baseRetryDelay}ms`)
    lines.push(`最大重試延遲: ${this.config.maxRetryDelay}ms`)
    lines.push(`並發數: ${this.config.concurrency}`)
    lines.push(`超時: ${this.config.timeout}ms`)

    return lines.join('\n')
  }
}
