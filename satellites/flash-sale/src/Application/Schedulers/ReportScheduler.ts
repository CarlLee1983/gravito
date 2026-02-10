/**
 * ReportScheduler
 *
 * 定期報表調度器
 * - 註冊定期報表任務（日報、週報）
 * - 使用 cron 表達式進行調度
 * - 支持多種報表類型的自動生成
 */

import type { Logger } from '@gravito/core'
import { type AsyncReportingService, ReportType } from '../Services/AsyncReportingService'

/**
 * 定期報表配置
 */
export interface ScheduledReportConfig {
  id: string
  reportType: ReportType
  cronExpression: string
  description: string
  enabled: boolean
}

/**
 * 調度器介面
 */
export interface Scheduler {
  schedule(id: string, cron: string, callback: () => Promise<void>): Promise<void>
  unschedule(id: string): Promise<void>
  isScheduled(id: string): boolean
}

/**
 * ReportScheduler
 *
 * 管理定期報表生成
 */
export class ReportScheduler {
  private scheduledReports: Map<string, ScheduledReportConfig> = new Map()
  private activeSchedules: Set<string> = new Set()

  constructor(
    private reportingService: AsyncReportingService,
    private scheduler: Scheduler,
    private logger: Logger
  ) {
    this.initializeDefaultSchedules()
  }

  /**
   * 初始化默認的定期報表
   */
  private initializeDefaultSchedules(): void {
    const defaultSchedules: ScheduledReportConfig[] = [
      {
        id: 'daily-order-summary',
        reportType: ReportType.ORDER_SUMMARY,
        cronExpression: '0 2 * * *', // 每日 02:00
        description: '每日訂單摘要',
        enabled: true,
      },
      {
        id: 'daily-sales-analysis',
        reportType: ReportType.SALES_ANALYSIS,
        cronExpression: '0 3 * * *', // 每日 03:00
        description: '每日銷售分析',
        enabled: true,
      },
      {
        id: 'weekly-revenue-report',
        reportType: ReportType.REVENUE_REPORT,
        cronExpression: '0 4 * * 1', // 每週一 04:00
        description: '週收入報表',
        enabled: true,
      },
      {
        id: 'weekly-inventory-status',
        reportType: ReportType.INVENTORY_STATUS,
        cronExpression: '0 5 * * 1', // 每週一 05:00
        description: '週庫存狀態',
        enabled: true,
      },
      {
        id: 'monthly-customer-behavior',
        reportType: ReportType.CUSTOMER_BEHAVIOR,
        cronExpression: '0 6 1 * *', // 每月 1 日 06:00
        description: '月度客戶行為分析',
        enabled: true,
      },
    ]

    for (const schedule of defaultSchedules) {
      this.scheduledReports.set(schedule.id, schedule)
    }
  }

  /**
   * 註冊所有定期報表
   */
  async registerScheduledReports(): Promise<void> {
    for (const [id, config] of this.scheduledReports.entries()) {
      if (!config.enabled) {
        continue
      }

      try {
        await this.registerSchedule(id, config)
      } catch (error) {
        this.logger.error(`[ReportScheduler] Failed to register schedule ${id}: ${String(error)}`)
      }
    }

    this.logger.info(`[ReportScheduler] Registered ${this.activeSchedules.size} scheduled reports`)
  }

  /**
   * 註冊單個報表調度
   *
   * @param id 調度 ID
   * @param config 調度配置
   */
  private async registerSchedule(id: string, config: ScheduledReportConfig): Promise<void> {
    await this.scheduler.schedule(id, config.cronExpression, async () => {
      this.logger.info(
        `[ReportScheduler] Executing scheduled report: ${id} (${config.description})`
      )

      try {
        // 計算日期範圍（昨天）
        const now = new Date()
        const startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 1)
        startDate.setHours(0, 0, 0, 0)

        const endDate = new Date(now)
        endDate.setDate(endDate.getDate() - 1)
        endDate.setHours(23, 59, 59, 999)

        // 提交報表生成任務
        const jobId = await this.reportingService.generateReport(
          config.reportType,
          {
            startDate,
            endDate,
          },
          'system-scheduler'
        )

        this.logger.info(`[ReportScheduler] Report job submitted: ${jobId}`)
      } catch (error) {
        this.logger.error(`[ReportScheduler] Failed to submit report job: ${String(error)}`)
      }
    })

    this.activeSchedules.add(id)
    this.logger.debug(
      `[ReportScheduler] Registered schedule: ${id} (cron: ${config.cronExpression})`
    )
  }

  /**
   * 取消報表調度
   *
   * @param id 調度 ID
   */
  async unregisterSchedule(id: string): Promise<void> {
    const config = this.scheduledReports.get(id)
    if (!config) {
      throw new Error(`Schedule not found: ${id}`)
    }

    await this.scheduler.unschedule(id)
    this.activeSchedules.delete(id)

    this.logger.info(`[ReportScheduler] Unregistered schedule: ${id}`)
  }

  /**
   * 啟用/禁用報表調度
   *
   * @param id 調度 ID
   * @param enabled 是否啟用
   */
  async setScheduleEnabled(id: string, enabled: boolean): Promise<void> {
    const config = this.scheduledReports.get(id)
    if (!config) {
      throw new Error(`Schedule not found: ${id}`)
    }

    config.enabled = enabled

    if (enabled && !this.activeSchedules.has(id)) {
      // 啟用已禁用的調度
      await this.registerSchedule(id, config)
    } else if (!enabled && this.activeSchedules.has(id)) {
      // 禁用已啟用的調度
      await this.unregisterSchedule(id)
    }

    this.logger.info(`[ReportScheduler] Schedule ${id} is now ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * 獲取所有定期報表配置
   */
  getScheduledReports(): ScheduledReportConfig[] {
    return Array.from(this.scheduledReports.values())
  }

  /**
   * 獲取活躍的調度列表
   */
  getActiveSchedules(): string[] {
    return Array.from(this.activeSchedules)
  }

  /**
   * 停止所有調度
   */
  async stopAll(): Promise<void> {
    const scheduleIds = Array.from(this.activeSchedules)

    for (const id of scheduleIds) {
      try {
        await this.unregisterSchedule(id)
      } catch (error) {
        this.logger.error(`[ReportScheduler] Failed to unregister schedule ${id}: ${String(error)}`)
      }
    }

    this.logger.info('[ReportScheduler] All schedules stopped')
  }
}
