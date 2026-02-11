/**
 * Report Distribution Manager
 * 報表分發管理系統
 *
 * 職責：
 * 1. 報表多渠道分發（郵件、Webhook、下載、消息推送）
 * 2. 分發失敗重試機制
 * 3. 分發記錄和審計
 * 4. 分發收件人管理
 */

export interface Recipient {
  id: string
  type: 'email' | 'webhook' | 'user' | 'team'
  destination: string // email、webhook URL 或用戶/團隊 ID
  name: string
  enabled: boolean
  preferences: DistributionPreferences
}

export interface DistributionPreferences {
  formats: ('csv' | 'excel' | 'json')[]
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly'
  includeMetadata: boolean
  notificationOnly: boolean
}

export interface DistributionJob {
  jobId: string
  reportId: string
  recipients: Recipient[]
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'retrying'
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  results: DistributionResult[]
  attempts: number
  maxAttempts: number
  nextRetryAt?: Date
  error?: string
}

export interface DistributionResult {
  recipientId: string
  recipientName: string
  channel: 'email' | 'webhook' | 'download' | 'push'
  status: 'success' | 'failed' | 'pending'
  sentAt?: Date
  deliveredAt?: Date
  error?: string
  metadata: Record<string, unknown>
}

export interface DistributionConfig {
  maxRetries?: number // 默認 3 次
  baseRetryDelay?: number // 默認 5000ms
  maxRetryDelay?: number // 默認 300000ms
  emailEnabled?: boolean
  webhookEnabled?: boolean
  pushNotificationEnabled?: boolean
}

/**
 * 報表分發管理器
 */
export class ReportDistributionManager {
  private config: Required<DistributionConfig>
  private recipients: Map<string, Recipient> = new Map()
  private jobs: Map<string, DistributionJob> = new Map()
  private completedJobs: Map<string, DistributionJob> = new Map()
  private distributionHandlers: Map<
    string,
    (recipient: Recipient, reportContent: string, reportName: string) => Promise<void>
  > = new Map()

  constructor(config: DistributionConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      baseRetryDelay: config.baseRetryDelay ?? 5000,
      maxRetryDelay: config.maxRetryDelay ?? 300000,
      emailEnabled: config.emailEnabled ?? true,
      webhookEnabled: config.webhookEnabled ?? true,
      pushNotificationEnabled: config.pushNotificationEnabled ?? true,
    }

    console.log('[ReportDistributionManager] 報表分發管理器初始化')
    console.log(`  最大重試次數: ${this.config.maxRetries}`)
    console.log(`  郵件分發: ${this.config.emailEnabled ? '啟用' : '禁用'}`)
    console.log(`  Webhook 分發: ${this.config.webhookEnabled ? '啟用' : '禁用'}`)
  }

  /**
   * 註冊收件人
   */
  registerRecipient(recipient: Recipient): void {
    this.recipients.set(recipient.id, recipient)
    console.log(`[ReportDistributionManager] 已註冊收件人: ${recipient.id}`)
    console.log(`  名稱: ${recipient.name}`)
    console.log(`  類型: ${recipient.type}`)
  }

  /**
   * 註冊分發處理器
   */
  registerDistributionHandler(
    channel: 'email' | 'webhook' | 'download' | 'push',
    handler: (recipient: Recipient, reportContent: string, reportName: string) => Promise<void>
  ): void {
    this.distributionHandlers.set(channel, handler)
    console.log(`[ReportDistributionManager] 已註冊分發處理器: ${channel}`)
  }

  /**
   * 提交分發任務
   */
  submitDistributionJob(
    reportId: string,
    reportContent: string,
    reportName: string,
    recipientIds?: string[]
  ): string {
    const jobId = `dist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // 確定收件人
    let recipients: Recipient[] = []
    if (recipientIds) {
      recipients = recipientIds
        .map((id) => this.recipients.get(id))
        .filter((r): r is Recipient => r !== undefined)
    } else {
      // 使用所有啟用的收件人
      recipients = Array.from(this.recipients.values()).filter((r) => r.enabled)
    }

    const job: DistributionJob = {
      jobId,
      reportId,
      recipients,
      status: 'pending',
      createdAt: new Date(),
      results: recipients.map((r) => ({
        recipientId: r.id,
        recipientName: r.name,
        channel: this.mapRecipientTypeToChannel(r.type),
        status: 'pending',
        metadata: {},
      })),
      attempts: 0,
      maxAttempts: this.config.maxRetries + 1,
    }

    this.jobs.set(jobId, job)

    console.log(`[ReportDistributionManager] 分發任務已提交: ${jobId}`)
    console.log(`  報表: ${reportId}`)
    console.log(`  收件人數: ${recipients.length}`)

    // 非阻塞：後台啟動分發
    this.processDistributionJob(jobId, reportContent, reportName)

    return jobId
  }

  /**
   * 處理分發任務
   */
  private async processDistributionJob(
    jobId: string,
    reportContent: string,
    reportName: string
  ): Promise<void> {
    const job = this.jobs.get(jobId)
    if (!job) {
      return
    }

    job.status = 'in_progress'
    job.startedAt = new Date()
    job.attempts++

    console.log(
      `[ReportDistributionManager] 開始分發: ${jobId} (嘗試 ${job.attempts}/${job.maxAttempts})`
    )

    try {
      // 並發分發到所有收件人
      const promises = job.recipients.map((recipient) =>
        this.distributeToRecipient(jobId, recipient, reportContent, reportName)
      )

      await Promise.allSettled(promises)

      // 檢查結果
      const failedCount = job.results.filter((r) => r.status === 'failed').length

      if (failedCount === 0) {
        job.status = 'completed'
        job.completedAt = new Date()
        this.completedJobs.set(jobId, job)
        this.jobs.delete(jobId)
        console.log(`[ReportDistributionManager] 分發完成: ${jobId}`)
      } else {
        // 有失敗的，決定是否重試
        if (job.attempts < job.maxAttempts) {
          const delay = this.calculateRetryDelay(job.attempts)
          job.status = 'retrying'
          job.nextRetryAt = new Date(Date.now() + delay)

          console.log(`[ReportDistributionManager] 已排定重試: ${jobId} (${delay}ms 後)`)

          setTimeout(() => {
            const retryJob = this.jobs.get(jobId)
            if (retryJob && retryJob.status === 'retrying') {
              // 重置失敗的結果
              retryJob.results = retryJob.results.map((r) =>
                r.status === 'failed' ? { ...r, status: 'pending', error: undefined } : r
              )
              this.processDistributionJob(jobId, reportContent, reportName)
            }
          }, delay)
        } else {
          job.status = 'failed'
          job.completedAt = new Date()
          job.error = `${failedCount} 個收件人分發失敗`
          this.completedJobs.set(jobId, job)
          this.jobs.delete(jobId)
          console.log(`[ReportDistributionManager] 分發失敗: ${jobId} - ${job.error}`)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      job.status = 'failed'
      job.error = errorMessage
      job.completedAt = new Date()
      this.completedJobs.set(jobId, job)
      this.jobs.delete(jobId)
      console.error(`[ReportDistributionManager] 分發異常: ${jobId} - ${errorMessage}`)
    }
  }

  /**
   * 分發到單個收件人
   */
  private async distributeToRecipient(
    jobId: string,
    recipient: Recipient,
    reportContent: string,
    reportName: string
  ): Promise<void> {
    const job = this.jobs.get(jobId)
    if (!job) {
      return
    }

    const result = job.results.find((r) => r.recipientId === recipient.id)
    if (!result) {
      return
    }

    try {
      const channel = this.mapRecipientTypeToChannel(recipient.type)
      const handler = this.distributionHandlers.get(channel)

      if (!handler) {
        throw new Error(`未註冊的分發渠道: ${channel}`)
      }

      // 檢查選項
      if (!this.isChannelEnabled(channel)) {
        throw new Error(`分發渠道已禁用: ${channel}`)
      }

      // 執行分發
      await handler(recipient, reportContent, reportName)

      result.status = 'success'
      result.sentAt = new Date()
      result.deliveredAt = new Date()

      console.log(`[ReportDistributionManager] 分發成功: ${recipient.id} (${channel})`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      result.status = 'failed'
      result.error = errorMessage
      console.error(`[ReportDistributionManager] 分發失敗: ${recipient.id} - ${errorMessage}`)
    }
  }

  /**
   * 獲取分發任務狀態
   */
  getDistributionJobStatus(jobId: string): DistributionJob | undefined {
    return this.jobs.get(jobId) || this.completedJobs.get(jobId)
  }

  /**
   * 查詢分發任務
   */
  queryDistributionJobs(reportId: string): DistributionJob[] {
    const results: DistributionJob[] = []

    for (const job of this.jobs.values()) {
      if (job.reportId === reportId) {
        results.push(job)
      }
    }

    for (const job of this.completedJobs.values()) {
      if (job.reportId === reportId) {
        results.push(job)
      }
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * 啟用/禁用收件人
   */
  setRecipientEnabled(recipientId: string, enabled: boolean): boolean {
    const recipient = this.recipients.get(recipientId)
    if (!recipient) {
      return false
    }

    recipient.enabled = enabled
    console.log(
      `[ReportDistributionManager] 收件人 ${enabled ? '已啟用' : '已禁用'}: ${recipientId}`
    )
    return true
  }

  /**
   * 獲取分發統計
   */
  getStats() {
    const allJobs = Array.from(this.jobs.values()).concat(Array.from(this.completedJobs.values()))

    const completedJobs = Array.from(this.completedJobs.values())
    const successfulJobs = completedJobs.filter((j) => j.status === 'completed').length
    const failedJobs = completedJobs.filter((j) => j.status === 'failed').length

    return {
      totalJobs: allJobs.length,
      pendingJobs: Array.from(this.jobs.values()).length,
      completedJobs: completedJobs.length,
      successfulJobs,
      failedJobs,
      successRate: completedJobs.length > 0 ? (successfulJobs / completedJobs.length) * 100 : 0,
      totalRecipients: this.recipients.size,
      enabledRecipients: Array.from(this.recipients.values()).filter((r) => r.enabled).length,
    }
  }

  /**
   * 計算重試延遲（指數退避）
   */
  private calculateRetryDelay(attempts: number): number {
    const delay = 2 ** (attempts - 1) * this.config.baseRetryDelay
    return Math.min(delay, this.config.maxRetryDelay)
  }

  /**
   * 映射收件人類型到分發渠道
   */
  private mapRecipientTypeToChannel(type: string): 'email' | 'webhook' | 'download' | 'push' {
    switch (type) {
      case 'email':
        return 'email'
      case 'webhook':
        return 'webhook'
      case 'user':
        return 'push'
      case 'team':
        return 'download'
      default:
        return 'email'
    }
  }

  /**
   * 檢查分發渠道是否啟用
   */
  private isChannelEnabled(channel: string): boolean {
    switch (channel) {
      case 'email':
        return this.config.emailEnabled
      case 'webhook':
        return this.config.webhookEnabled
      case 'push':
        return this.config.pushNotificationEnabled
      default:
        return true
    }
  }

  /**
   * 生成狀態報告
   */
  generateStatusReport(): string {
    const stats = this.getStats()

    const lines: string[] = []
    lines.push('========== REPORT DISTRIBUTION STATUS ==========')
    lines.push('')

    lines.push('--- DISTRIBUTION STATISTICS ---')
    lines.push(`總任務數: ${stats.totalJobs}`)
    lines.push(`待處理: ${stats.pendingJobs}`)
    lines.push(`已完成: ${stats.completedJobs}`)
    lines.push(`  成功: ${stats.successfulJobs}`)
    lines.push(`  失敗: ${stats.failedJobs}`)
    lines.push(`成功率: ${stats.successRate.toFixed(2)}%`)
    lines.push('')

    lines.push('--- RECIPIENT STATISTICS ---')
    lines.push(`總收件人數: ${stats.totalRecipients}`)
    lines.push(`已啟用: ${stats.enabledRecipients}`)
    lines.push(`已禁用: ${stats.totalRecipients - stats.enabledRecipients}`)
    lines.push('')

    lines.push('--- CONFIGURATION ---')
    lines.push(`最大重試次數: ${this.config.maxRetries}`)
    lines.push(`郵件分發: ${this.config.emailEnabled ? '啟用' : '禁用'}`)
    lines.push(`Webhook 分發: ${this.config.webhookEnabled ? '啟用' : '禁用'}`)
    lines.push(`推送通知: ${this.config.pushNotificationEnabled ? '啟用' : '禁用'}`)

    return lines.join('\n')
  }
}
