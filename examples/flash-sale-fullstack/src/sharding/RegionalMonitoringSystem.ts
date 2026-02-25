/**
 * Regional Monitoring System
 * 多區域監控系統
 *
 * 職責：
 * 1. 收集跨區域指標
 * 2. 管理告警規則和評估
 * 3. 執行健康檢查
 * 4. 生成監控報告和告警通知
 */

export interface RegionMetrics {
  regionId: string
  timestamp: Date
  latency: {
    p50: number // ms
    p95: number
    p99: number
    p999: number
  }
  throughput: number // requests/sec
  errorRate: number // %
  cpuUsage: number // %
  memoryUsage: number // %
  cacheHitRate: number // %
  activeConnections: number
  diskUsage: number // %
}

export interface AlertRule {
  ruleId: string
  name: string
  description: string
  enabled: boolean
  condition: {
    metric: keyof Omit<RegionMetrics, 'regionId' | 'timestamp'>
    operator: '>' | '<' | '=' | '!='
    threshold: number
    duration: number // seconds
  }
  severity: 'critical' | 'warning' | 'info'
  actions: AlertAction[]
  createdAt: Date
  lastTriggeredAt?: Date
  triggerCount: number
}

export interface AlertAction {
  type: 'email' | 'slack' | 'pagerduty' | 'webhook'
  target: string
  message?: string
}

export interface Alert {
  alertId: string
  ruleId: string
  regionId: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  triggeredAt: Date
  resolvedAt?: Date
  value: number
  threshold: number
  status: 'active' | 'resolved' | 'acknowledged'
}

export interface HealthStatus {
  regionId: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  checkedAt: Date
  metrics: Partial<RegionMetrics>
  issues: string[]
}

export interface MonitoringConfig {
  collectInterval: number // ms
  aggregationWindow: number // ms
  retentionDays: number
  enableAutoRemediation: boolean
}

/**
 * 多區域監控系統
 */
export class RegionalMonitoringSystem {
  private metricsHistory: Map<string, RegionMetrics[]> = new Map() // regionId -> metrics[]
  private alertRules: Map<string, AlertRule> = new Map()
  private alerts: Alert[] = []
  private healthStatus: Map<string, HealthStatus> = new Map()
  private eventListeners: Map<string, Function[]> = new Map()
  private config: MonitoringConfig
  private activeRegions: Set<string> = new Set()

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      collectInterval: 30000, // 30 seconds
      aggregationWindow: 300000, // 5 minutes
      retentionDays: 7,
      enableAutoRemediation: true,
      ...config,
    }
  }

  /**
   * 註冊區域
   */
  registerRegion(regionId: string): void {
    if (!this.activeRegions.has(regionId)) {
      this.activeRegions.add(regionId)
      this.metricsHistory.set(regionId, [])
      this.emit('region:registered', { regionId })

      console.log(`[RegionalMonitoringSystem] 區域已註冊: ${regionId}`)
    }
  }

  /**
   * 收集區域指標
   */
  collectMetrics(regionId: string, metrics: RegionMetrics): void {
    if (!this.activeRegions.has(regionId)) {
      throw new Error(`區域未註冊: ${regionId}`)
    }

    const history = this.metricsHistory.get(regionId)!
    history.push(metrics)

    // 保留最近的數據點（基於 retentionDays）
    const cutoffTime = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000
    const retained = history.filter((m) => m.timestamp.getTime() > cutoffTime)
    this.metricsHistory.set(regionId, retained)

    // 評估告警規則
    this.evaluateAlertRules(regionId, metrics)

    // 更新健康狀態
    this.updateHealthStatus(regionId, metrics)

    this.emit('metrics:collected', { regionId, metrics })

    console.log(
      `[RegionalMonitoringSystem] 指標已收集: ${regionId} (延遲: ${metrics.latency.p99.toFixed(2)}ms, 錯誤率: ${metrics.errorRate.toFixed(2)}%)`
    )
  }

  /**
   * 創建告警規則
   */
  createAlertRule(
    rule: Omit<AlertRule, 'createdAt' | 'triggerCount' | 'lastTriggeredAt'>
  ): AlertRule {
    const alertRule: AlertRule = {
      ...rule,
      createdAt: new Date(),
      triggerCount: 0,
    }

    this.alertRules.set(alertRule.ruleId, alertRule)
    this.emit('rule:created', alertRule)

    console.log(`[RegionalMonitoringSystem] 告警規則已建立: ${alertRule.name}`)
    console.log(
      `  條件: ${rule.condition.metric} ${rule.condition.operator} ${rule.condition.threshold} (持續 ${rule.condition.duration}s)`
    )

    return alertRule
  }

  /**
   * 評估告警規則
   */
  private evaluateAlertRules(regionId: string, metrics: RegionMetrics): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) {
        continue
      }

      const metricValue = metrics[rule.condition.metric] as number | undefined
      if (metricValue === undefined) {
        continue
      }

      let triggered = false
      switch (rule.condition.operator) {
        case '>':
          triggered = metricValue > rule.condition.threshold
          break
        case '<':
          triggered = metricValue < rule.condition.threshold
          break
        case '=':
          triggered = metricValue === rule.condition.threshold
          break
        case '!=':
          triggered = metricValue !== rule.condition.threshold
          break
      }

      if (triggered) {
        this.triggerAlert(rule, regionId, metricValue)
      }
    }
  }

  /**
   * 觸發告警
   */
  private triggerAlert(rule: AlertRule, regionId: string, value: number): void {
    // 檢查是否已存在活動告警
    const existingAlert = this.alerts.find(
      (a) => a.ruleId === rule.ruleId && a.regionId === regionId && a.status === 'active'
    )

    if (existingAlert) {
      return // 避免重複觸發
    }

    const alert: Alert = {
      alertId: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.ruleId,
      regionId,
      severity: rule.severity,
      message: `${rule.name}: ${rule.condition.metric} 觸發閾值 ${rule.condition.threshold} (當前值: ${value.toFixed(2)})`,
      triggeredAt: new Date(),
      value,
      threshold: rule.condition.threshold,
      status: 'active',
    }

    this.alerts.push(alert)
    rule.lastTriggeredAt = new Date()
    rule.triggerCount++

    this.emit('alert:triggered', alert)

    // 執行告警動作
    this.executeAlertActions(rule, alert)

    // 自動修復
    if (this.config.enableAutoRemediation) {
      this.attemptAutoRemediation(regionId, rule, alert)
    }

    console.log(
      `[RegionalMonitoringSystem] 告警已觸發 [${alert.severity.toUpperCase()}]: ${alert.message}`
    )
  }

  /**
   * 執行告警動作
   */
  private executeAlertActions(rule: AlertRule, alert: Alert): void {
    for (const action of rule.actions) {
      switch (action.type) {
        case 'email':
          console.log(`[RegionalMonitoringSystem] 發送郵件到 ${action.target}: ${alert.message}`)
          break
        case 'slack':
          console.log(
            `[RegionalMonitoringSystem] 發送 Slack 訊息到 ${action.target}: ${alert.message}`
          )
          break
        case 'pagerduty':
          console.log(
            `[RegionalMonitoringSystem] 觸發 PagerDuty 事件 (${action.target}): ${alert.message}`
          )
          break
        case 'webhook':
          console.log(`[RegionalMonitoringSystem] 調用 Webhook ${action.target}: ${alert.message}`)
          break
      }
    }

    this.emit('alert:action-executed', { alert, actions: rule.actions })
  }

  /**
   * 嘗試自動修復
   */
  private attemptAutoRemediation(regionId: string, rule: AlertRule, alert: Alert): void {
    console.log(`[RegionalMonitoringSystem] 嘗試自動修復: ${regionId} (規則: ${rule.name})`)

    // 根據指標類型進行自動修復
    if (
      rule.condition.metric === 'cpuUsage' &&
      (rule.condition.operator === '>' || rule.condition.operator === '=')
    ) {
      console.log(`[RegionalMonitoringSystem] 啟動水平擴展: ${regionId}`)
      this.emit('remediation:scale-out', { regionId, alert })
    } else if (
      rule.condition.metric === 'memoryUsage' &&
      (rule.condition.operator === '>' || rule.condition.operator === '=')
    ) {
      console.log(`[RegionalMonitoringSystem] 清理記憶體快取: ${regionId}`)
      this.emit('remediation:clear-cache', { regionId, alert })
    } else if (
      rule.condition.metric === 'errorRate' &&
      (rule.condition.operator === '>' || rule.condition.operator === '=')
    ) {
      console.log(`[RegionalMonitoringSystem] 觸發區域故障轉移: ${regionId}`)
      this.emit('remediation:failover', { regionId, alert })
    }
  }

  /**
   * 更新健康狀態
   */
  private updateHealthStatus(regionId: string, metrics: RegionMetrics): void {
    const issues: string[] = []

    // 檢查各項指標
    if (metrics.latency.p99 > 200) {
      issues.push(`P99 延遲高: ${metrics.latency.p99.toFixed(2)}ms`)
    }
    if (metrics.errorRate > 1) {
      issues.push(`錯誤率高: ${metrics.errorRate.toFixed(2)}%`)
    }
    if (metrics.cpuUsage > 80) {
      issues.push(`CPU 使用率高: ${metrics.cpuUsage.toFixed(2)}%`)
    }
    if (metrics.memoryUsage > 80) {
      issues.push(`記憶體使用率高: ${metrics.memoryUsage.toFixed(2)}%`)
    }
    if (metrics.cacheHitRate < 80) {
      issues.push(`快取命中率低: ${metrics.cacheHitRate.toFixed(2)}%`)
    }

    const status: HealthStatus = {
      regionId,
      status: issues.length === 0 ? 'healthy' : issues.length <= 2 ? 'degraded' : 'unhealthy',
      checkedAt: new Date(),
      metrics,
      issues,
    }

    this.healthStatus.set(regionId, status)
    this.emit('health:updated', status)
  }

  /**
   * 執行健康檢查
   */
  async performHealthCheck(regionId: string): Promise<HealthStatus | null> {
    const status = this.healthStatus.get(regionId)
    if (!status) {
      return null
    }

    // 執行自定義健康檢查邏輯
    const history = this.metricsHistory.get(regionId) || []
    if (history.length === 0) {
      return status
    }

    const recentMetrics = history.slice(-10) // 最近 10 個數據點
    const avgLatency =
      recentMetrics.reduce((sum, m) => sum + m.latency.p99, 0) / recentMetrics.length
    const avgErrorRate =
      recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length

    const updatedStatus: HealthStatus = {
      ...status,
      metrics: {
        ...status.metrics,
        latency: { p50: 0, p95: 0, p99: avgLatency, p999: 0 },
        errorRate: avgErrorRate,
      },
      checkedAt: new Date(),
    }

    this.healthStatus.set(regionId, updatedStatus)
    this.emit('health:checked', updatedStatus)

    return updatedStatus
  }

  /**
   * 解決告警
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.alertId === alertId)
    if (!alert) {
      return false
    }

    alert.status = 'resolved'
    alert.resolvedAt = new Date()

    this.emit('alert:resolved', alert)
    console.log(`[RegionalMonitoringSystem] 告警已解決: ${alert.alertId}`)

    return true
  }

  /**
   * 獲取告警
   */
  getAlerts(regionId?: string, status?: Alert['status'], severity?: Alert['severity']): Alert[] {
    return this.alerts.filter(
      (a) =>
        (!regionId || a.regionId === regionId) &&
        (!status || a.status === status) &&
        (!severity || a.severity === severity)
    )
  }

  /**
   * 獲取指標統計
   */
  getMetricsStats(
    regionId: string,
    window: number = this.config.aggregationWindow
  ): Partial<RegionMetrics> | null {
    const history = this.metricsHistory.get(regionId)
    if (!history || history.length === 0) {
      return null
    }

    const cutoff = Date.now() - window
    const recentMetrics = history.filter((m) => m.timestamp.getTime() > cutoff)

    if (recentMetrics.length === 0) {
      return null
    }

    const avgLatencyP99 =
      recentMetrics.reduce((sum, m) => sum + m.latency.p99, 0) / recentMetrics.length
    const avgErrorRate =
      recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length
    const avgThroughput =
      recentMetrics.reduce((sum, m) => sum + m.throughput, 0) / recentMetrics.length

    return {
      latency: { p50: 0, p95: 0, p99: avgLatencyP99, p999: 0 },
      errorRate: avgErrorRate,
      throughput: avgThroughput,
    }
  }

  /**
   * 獲取健康狀態
   */
  getHealthStatus(regionId: string): HealthStatus | undefined {
    return this.healthStatus.get(regionId)
  }

  /**
   * 獲取所有健康狀態
   */
  getAllHealthStatus(): HealthStatus[] {
    return Array.from(this.healthStatus.values())
  }

  /**
   * 生成監控報告
   */
  generateMonitoringReport(): string {
    const lines = [
      '='.repeat(70),
      'REGIONAL MONITORING REPORT',
      '='.repeat(70),
      '',
      '--- ACTIVE REGIONS ---',
    ]

    for (const regionId of this.activeRegions) {
      const health = this.healthStatus.get(regionId)
      const stats = this.getMetricsStats(regionId)
      const alerts = this.getAlerts(regionId, 'active')

      lines.push(`${regionId}:`)
      lines.push(`  Status: ${health?.status ?? 'unknown'}`)
      if (stats) {
        lines.push(`  Latency P99: ${stats.latency?.p99?.toFixed(2) ?? 'N/A'}ms`)
        lines.push(`  Error Rate: ${stats.errorRate?.toFixed(2) ?? 'N/A'}%`)
        lines.push(`  Throughput: ${stats.throughput?.toFixed(0) ?? 'N/A'} req/s`)
      }
      lines.push(`  Active Alerts: ${alerts.length}`)
      lines.push('')
    }

    lines.push('--- ALERT RULES ---')
    lines.push(`Total Rules: ${this.alertRules.size}`)
    for (const rule of this.alertRules.values()) {
      lines.push(`${rule.name}:`)
      lines.push(
        `  Condition: ${rule.condition.metric} ${rule.condition.operator} ${rule.condition.threshold}`
      )
      lines.push(`  Severity: ${rule.severity}`)
      lines.push(`  Triggered: ${rule.triggerCount} times`)
    }

    lines.push('')
    lines.push('--- ACTIVE ALERTS ---')
    const activeAlerts = this.getAlerts(undefined, 'active')
    lines.push(`Total: ${activeAlerts.length}`)
    for (const alert of activeAlerts.slice(0, 10)) {
      lines.push(`[${alert.severity.toUpperCase()}] ${alert.message}`)
    }

    lines.push('')
    lines.push('='.repeat(70))
    return lines.join('\n')
  }

  /**
   * 事件監聽
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)?.push(callback)
  }

  /**
   * 觸發事件
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data)
        } catch (error) {
          console.error(`[RegionalMonitoringSystem] Event listener error for ${event}:`, error)
        }
      }
    }
  }
}
