/**
 * Report Scheduler
 * 報表調度系統
 *
 * 職責：
 * 1. 報表定時生成調度
 * 2. 調度規則管理（Cron 表達式支持）
 * 3. 調度執行監控
 * 4. 調度歷史和統計
 */

export interface ScheduleRule {
  ruleId: string
  templateId: string
  name: string
  description: string
  cronExpression: string // Cron 表達式，例如 "0 2 * * *" (每天凌晨 2 點)
  format: 'csv' | 'excel' | 'json'
  recipientIds: string[] // 分發收件人
  enabled: boolean
  createdAt: Date
  updatedAt: Date
  lastRunAt?: Date
  nextRunAt?: Date
  metadata: Record<string, unknown>
}

export interface ScheduleExecution {
  executionId: string
  ruleId: string
  reportId?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: Date
  completedAt?: Date
  error?: string
  duration?: number // 毫秒
  metadata: Record<string, unknown>
}

export interface ScheduleStats {
  totalRules: number
  enabledRules: number
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageExecutionTime: number
  lastExecutionTime?: Date
  nextScheduledExecution?: Date
}

/**
 * 報表調度器
 */
export class ReportScheduler {
  private scheduleRules: Map<string, ScheduleRule> = new Map()
  private executions: Map<string, ScheduleExecution> = new Map()
  private completedExecutions: Map<string, ScheduleExecution> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private executeHandlers: Map<string, (rule: ScheduleRule) => Promise<string>> = new Map()

  constructor() {
    console.log('[ReportScheduler] 報表調度器初始化')
  }

  /**
   * 註冊調度規則
   */
  registerScheduleRule(rule: ScheduleRule): void {
    this.scheduleRules.set(rule.ruleId, rule)

    if (rule.enabled) {
      this.scheduleRule(rule)
    }

    console.log(`[ReportScheduler] 已註冊調度規則: ${rule.ruleId}`)
    console.log(`  名稱: ${rule.name}`)
    console.log(`  Cron: ${rule.cronExpression}`)
    console.log(`  模板: ${rule.templateId}`)
  }

  /**
   * 註冊執行處理器
   */
  registerExecuteHandler(
    templateId: string,
    handler: (rule: ScheduleRule) => Promise<string>
  ): void {
    this.executeHandlers.set(templateId, handler)
    console.log(`[ReportScheduler] 已註冊執行處理器: ${templateId}`)
  }

  /**
   * 調度規則
   */
  private scheduleRule(rule: ScheduleRule): void {
    // 簡化的 Cron 表達式解析
    // 支持基本格式: "0 2 * * *" (分 時 日 月 周)
    const nextRun = this.calculateNextRun(rule.cronExpression)

    if (nextRun) {
      const delayMs = nextRun.getTime() - Date.now()

      if (delayMs > 0) {
        const timer = setTimeout(() => {
          this.executeScheduleRule(rule)
        }, delayMs)

        this.timers.set(rule.ruleId, timer)
        rule.nextRunAt = nextRun

        console.log(
          `[ReportScheduler] 已調度規則: ${rule.ruleId}，下次運行: ${nextRun.toISOString()}`
        )
      }
    }
  }

  /**
   * 執行調度規則
   */
  private async executeScheduleRule(rule: ScheduleRule): Promise<void> {
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const execution: ScheduleExecution = {
      executionId,
      ruleId: rule.ruleId,
      status: 'running',
      startedAt: new Date(),
      metadata: {},
    }

    this.executions.set(executionId, execution)

    console.log(`[ReportScheduler] 開始執行調度規則: ${rule.ruleId}`)

    try {
      const handler = this.executeHandlers.get(rule.templateId)
      if (!handler) {
        throw new Error(`未註冊的執行處理器: ${rule.templateId}`)
      }

      // 執行報表生成
      const reportId = await handler(rule)

      execution.reportId = reportId
      execution.status = 'completed'
      execution.completedAt = new Date()
      execution.duration = (execution.completedAt?.getTime() ?? 0) - execution.startedAt.getTime()

      this.completedExecutions.set(executionId, execution)
      this.executions.delete(executionId)

      rule.lastRunAt = execution.startedAt

      console.log(`[ReportScheduler] 調度執行完成: ${executionId}`)
      console.log(`  報表 ID: ${reportId}`)
      console.log(`  耗時: ${execution.duration}ms`)

      // 重新調度
      this.scheduleRule(rule)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      execution.status = 'failed'
      execution.completedAt = new Date()
      execution.error = errorMessage
      execution.duration = (execution.completedAt?.getTime() ?? 0) - execution.startedAt.getTime()

      this.completedExecutions.set(executionId, execution)
      this.executions.delete(executionId)

      console.error(`[ReportScheduler] 調度執行失敗: ${executionId} - ${errorMessage}`)

      // 重新調度（即使失敗）
      this.scheduleRule(rule)
    }
  }

  /**
   * 計算下次運行時間
   */
  private calculateNextRun(cronExpression: string): Date | null {
    // 簡化的 Cron 解析: "分 時 日 月 周"
    // 例如 "0 2 * * *" 表示每天凌晨 2:00
    const parts = cronExpression.split(' ')

    if (parts.length !== 5) {
      return null
    }

    const [minute, hour, _day, _month, _dow] = parts

    const now = new Date()
    const nextRun = new Date(now)

    // 只支持簡單的規則
    if (minute !== '*' && hour !== '*') {
      const nextHour = parseInt(hour, 10)
      const nextMinute = parseInt(minute, 10)

      nextRun.setHours(nextHour, nextMinute, 0, 0)

      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1)
      }

      return nextRun
    }

    return null
  }

  /**
   * 獲取調度規則
   */
  getScheduleRule(ruleId: string): ScheduleRule | undefined {
    return this.scheduleRules.get(ruleId)
  }

  /**
   * 獲取所有調度規則
   */
  getAllScheduleRules(): ScheduleRule[] {
    return Array.from(this.scheduleRules.values())
  }

  /**
   * 更新調度規則
   */
  updateScheduleRule(ruleId: string, updates: Partial<ScheduleRule>): boolean {
    const rule = this.scheduleRules.get(ruleId)
    if (!rule) {
      return false
    }

    // 清除現有的定時器
    const timer = this.timers.get(ruleId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(ruleId)
    }

    // 應用更新
    Object.assign(rule, updates)
    rule.updatedAt = new Date()

    // 重新調度
    if (rule.enabled) {
      this.scheduleRule(rule)
    }

    console.log(`[ReportScheduler] 調度規則已更新: ${ruleId}`)
    return true
  }

  /**
   * 啟用/禁用調度規則
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.scheduleRules.get(ruleId)
    if (!rule) {
      return false
    }

    rule.enabled = enabled

    if (enabled) {
      this.scheduleRule(rule)
    } else {
      const timer = this.timers.get(ruleId)
      if (timer) {
        clearTimeout(timer)
        this.timers.delete(ruleId)
      }
    }

    console.log(`[ReportScheduler] 調度規則 ${enabled ? '已啟用' : '已禁用'}: ${ruleId}`)
    return true
  }

  /**
   * 刪除調度規則
   */
  deleteScheduleRule(ruleId: string): boolean {
    const timer = this.timers.get(ruleId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(ruleId)
    }

    return this.scheduleRules.delete(ruleId)
  }

  /**
   * 獲取執行歷史
   */
  getExecutionHistory(ruleId: string, limit = 100): ScheduleExecution[] {
    const results: ScheduleExecution[] = []

    for (const execution of this.completedExecutions.values()) {
      if (execution.ruleId === ruleId) {
        results.push(execution)
      }
    }

    // 按時間倒序
    results.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())

    return results.slice(0, limit)
  }

  /**
   * 獲取調度統計
   */
  getStats(): ScheduleStats {
    const rules = Array.from(this.scheduleRules.values())
    const executions = Array.from(this.completedExecutions.values())

    const totalExecutions = this.executions.size + executions.length
    const successfulExecutions = executions.filter((e) => e.status === 'completed').length
    const failedExecutions = executions.filter((e) => e.status === 'failed').length

    const totalDuration = executions.reduce((sum, e) => sum + (e.duration || 0), 0)
    const averageExecutionTime = executions.length > 0 ? totalDuration / executions.length : 0

    const executedRules = executions.filter((e) => e.status === 'completed')
    const lastExecutionTime = executedRules.length > 0 ? executedRules[0].startedAt : undefined

    const nextRuns = rules
      .filter((r) => r.nextRunAt)
      .map((r) => r.nextRunAt as Date)
      .sort((a, b) => a.getTime() - b.getTime())
    const nextScheduledExecution = nextRuns.length > 0 ? nextRuns[0] : undefined

    return {
      totalRules: rules.length,
      enabledRules: rules.filter((r) => r.enabled).length,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime,
      lastExecutionTime,
      nextScheduledExecution,
    }
  }

  /**
   * 生成狀態報告
   */
  generateStatusReport(): string {
    const stats = this.getStats()

    const lines: string[] = []
    lines.push('========== REPORT SCHEDULER STATUS ==========')
    lines.push('')

    lines.push('--- SCHEDULE RULES ---')
    lines.push(`總規則數: ${stats.totalRules}`)
    lines.push(`已啟用: ${stats.enabledRules}`)
    lines.push(`已禁用: ${stats.totalRules - stats.enabledRules}`)
    lines.push('')

    lines.push('--- EXECUTION STATISTICS ---')
    lines.push(`總執行數: ${stats.totalExecutions}`)
    lines.push(`成功執行: ${stats.successfulExecutions}`)
    lines.push(`失敗執行: ${stats.failedExecutions}`)
    lines.push(
      `成功率: ${stats.totalExecutions > 0 ? ((stats.successfulExecutions / stats.totalExecutions) * 100).toFixed(2) : 0}%`
    )
    lines.push(`平均執行時間: ${(stats.averageExecutionTime / 1000).toFixed(2)}s`)
    lines.push('')

    if (stats.lastExecutionTime) {
      lines.push(`最後執行時間: ${stats.lastExecutionTime.toISOString()}`)
    }

    if (stats.nextScheduledExecution) {
      lines.push(`下次執行時間: ${stats.nextScheduledExecution.toISOString()}`)
    }

    return lines.join('\n')
  }
}
