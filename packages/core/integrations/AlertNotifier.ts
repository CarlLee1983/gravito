/**
 * AlertNotifier - Prometheus 告警轉發到 Slack/PagerDuty
 *
 * 功能：
 * - 接收 Prometheus webhook 告警
 * - 轉發到 Slack 與 PagerDuty
 * - 限流與去重
 * - 失敗重試
 */

import { EventEmitter } from 'events'

export interface AlertPayload {
  status: 'firing' | 'resolved'
  alerts: Alert[]
  groupLabels: Record<string, string>
  commonLabels: Record<string, string>
  commonAnnotations: Record<string, string>
}

export interface Alert {
  status: 'firing' | 'resolved'
  labels: Record<string, string>
  annotations: Record<string, string>
  startsAt: string
  endsAt: string
}

export interface AlertNotifierConfig {
  slackWebhookUrl?: string
  pagerDutyIntegrationKey?: string
  rateLimit?: {
    maxPerMinute: number
    deduplicationWindow: number
  }
  retryPolicy?: {
    maxAttempts: number
    delayMs: number
  }
}

/**
 * PagerDuty 告警格式化
 */
function formatPagerDutyEvent(alert: Alert) {
  const severity = alert.labels.severity || 'warning'
  const severityMap: Record<string, string> = {
    critical: 'critical',
    warning: 'warning',
    info: 'info',
  }

  return {
    routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
    event_action: alert.status === 'firing' ? 'trigger' : 'resolve',
    payload: {
      summary: alert.annotations.summary || alert.labels.alertname,
      severity: severityMap[severity] || 'warning',
      source: 'Prometheus',
      custom_details: {
        alert_name: alert.labels.alertname,
        description: alert.annotations.description,
        runbook_url: alert.annotations.runbook_url,
        labels: alert.labels,
        started_at: alert.startsAt,
      },
    },
    client: 'Gravito Retry System',
    links: [
      {
        href: alert.annotations.runbook_url,
        text: 'Runbook',
      },
    ],
  }
}

/**
 * AlertNotifier 類
 */
export class AlertNotifier extends EventEmitter {
  private config: AlertNotifierConfig
  private rateLimiter: Map<string, number> = new Map()
  private deduplication: Map<string, number> = new Map()
  private retryQueue: Array<{
    notifier: 'slack' | 'pagerduty'
    payload: any
    attempts: number
  }> = []

  constructor(config: AlertNotifierConfig = {}) {
    super()
    this.config = {
      rateLimit: {
        maxPerMinute: 100,
        deduplicationWindow: 300000, // 5 分鐘
      },
      retryPolicy: {
        maxAttempts: 3,
        delayMs: 5000,
      },
      ...config,
    }

    this.startRetryWorker()
  }

  /**
   * 處理 Prometheus webhook
   */
  async handlePrometheusAlert(payload: AlertPayload): Promise<void> {
    const { alerts } = payload

    // 去重
    const uniqueAlerts = alerts.filter((alert) => {
      const key = `${alert.labels.alertname}:${alert.status}`
      const lastSeen = this.deduplication.get(key) || 0
      const now = Date.now()

      if (now - lastSeen < (this.config.rateLimit?.deduplicationWindow || 300000)) {
        return false
      }

      this.deduplication.set(key, now)
      return true
    })

    if (uniqueAlerts.length === 0) {
      this.emit('deduplicated', { count: alerts.length })
      return
    }

    // 限流檢查
    if (!this.checkRateLimit()) {
      this.emit('rate-limited')
      return
    }

    // 發送通知
    for (const alert of uniqueAlerts) {
      await this.sendAlert(alert)
    }

    this.emit('processed', { count: uniqueAlerts.length })
  }

  /**
   * 發送單個告警
   */
  private async sendAlert(alert: Alert): Promise<void> {
    const notifiers: Array<'slack' | 'pagerduty'> = []

    if (this.config.slackWebhookUrl) {
      notifiers.push('slack')
    }
    if (this.config.pagerDutyIntegrationKey) {
      notifiers.push('pagerduty')
    }

    for (const notifier of notifiers) {
      try {
        if (notifier === 'slack') {
          await this.sendToSlack(alert)
        } else if (notifier === 'pagerduty') {
          await this.sendToPagerDuty(alert)
        }
      } catch (error) {
        this.emit('send-error', { notifier, error, alert })
        this.retryQueue.push({
          notifier,
          payload: alert,
          attempts: 0,
        })
      }
    }
  }

  /**
   * 發送到 Slack
   */
  private async sendToSlack(alert: Alert): Promise<void> {
    if (!this.config.slackWebhookUrl) {
      return
    }

    const message = {
      text: `🚨 ${alert.labels.alertname}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${alert.labels.alertname}*\n${alert.annotations.summary || ''}\n\n_Severity: ${alert.labels.severity}_`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Status*\n${alert.status === 'firing' ? '🔴 Firing' : '🟢 Resolved'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Started*\n${new Date(alert.startsAt).toLocaleString('zh-TW')}`,
            },
          ],
        },
      ],
    }

    const response = await fetch(this.config.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      throw new Error(`Slack API 錯誤: ${response.statusText}`)
    }

    this.emit('sent', { platform: 'slack', alert })
  }

  /**
   * 發送到 PagerDuty
   */
  private async sendToPagerDuty(alert: Alert): Promise<void> {
    if (!this.config.pagerDutyIntegrationKey) {
      return
    }

    const event = formatPagerDutyEvent(alert)

    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })

    if (!response.ok) {
      throw new Error(`PagerDuty API 錯誤: ${response.statusText}`)
    }

    this.emit('sent', { platform: 'pagerduty', alert })
  }

  /**
   * 檢查速率限制
   */
  private checkRateLimit(): boolean {
    const now = Date.now()
    const oneMinuteAgo = now - 60000

    // 清理過期記錄
    for (const [key, timestamp] of this.rateLimiter.entries()) {
      if (timestamp < oneMinuteAgo) {
        this.rateLimiter.delete(key)
      }
    }

    const currentCount = this.rateLimiter.size
    const limit = this.config.rateLimit?.maxPerMinute || 100

    if (currentCount >= limit) {
      return false
    }

    this.rateLimiter.set(`${now}`, now)
    return true
  }

  /**
   * 重試工作線程
   */
  private startRetryWorker(): void {
    setInterval(async () => {
      const toRetry = this.retryQueue.splice(0, 10)

      for (const item of toRetry) {
        if (item.attempts >= (this.config.retryPolicy?.maxAttempts || 3)) {
          this.emit('retry-exhausted', { notifier: item.notifier })
          continue
        }

        try {
          if (item.notifier === 'slack') {
            await this.sendToSlack(item.payload)
          } else if (item.notifier === 'pagerduty') {
            await this.sendToPagerDuty(item.payload)
          }

          this.emit('retry-success', { notifier: item.notifier })
        } catch (error) {
          item.attempts++
          this.retryQueue.push(item)
          this.emit('retry-failed', { notifier: item.notifier, error })
        }
      }
    }, this.config.retryPolicy?.delayMs || 5000)
  }

  /**
   * 健康檢查
   */
  getHealth() {
    return {
      ready: true,
      pendingRetries: this.retryQueue.length,
      rateLimitSize: this.rateLimiter.size,
      deduplicationSize: this.deduplication.size,
    }
  }
}

/**
 * Express 中間件
 */
export function createAlertNotifierMiddleware(notifier: AlertNotifier) {
  return async (req: any, res: any) => {
    try {
      const payload = req.body as AlertPayload

      await notifier.handlePrometheusAlert(payload)

      res.json({ status: 'ok', processed: payload.alerts.length })
    } catch (error) {
      console.error('告警處理錯誤:', error)
      res.status(500).json({ error: 'Internal Server Error' })
    }
  }
}
