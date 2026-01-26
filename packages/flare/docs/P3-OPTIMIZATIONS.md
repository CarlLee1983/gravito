# P3 - 長期優化計劃

> **目標版本**: v3.3.0
> **預估工時**: 5-7 天

---

## P3-01：實現重試機制

### 問題描述

當通道發送失敗時，目前只記錄錯誤，無法自動重試。對於暫時性錯誤（網路波動、rate limit），缺乏恢復能力。

### 修復方案

#### 定義重試配置

```typescript
// src/types.ts

export interface RetryConfig {
  /** 最大重試次數（預設 3） */
  maxAttempts: number
  /** 重試間隔基數，毫秒（預設 1000） */
  baseDelay: number
  /** 退避策略：fixed | linear | exponential（預設 exponential） */
  backoff: 'fixed' | 'linear' | 'exponential'
  /** 最大延遲，毫秒（預設 30000） */
  maxDelay: number
  /** 可重試的錯誤類型（預設所有錯誤） */
  retryableErrors?: (error: Error) => boolean
}

export interface SendOptions {
  throwOnError?: boolean
  parallel?: boolean
  concurrency?: number
  /** 重試配置 */
  retry?: Partial<RetryConfig> | boolean
}

// 通知級別的重試配置
export interface ShouldRetry {
  retry?: Partial<RetryConfig>
}
```

#### 重試工具函數

```typescript
// src/utils/retry.ts

export interface RetryOptions {
  maxAttempts: number
  baseDelay: number
  backoff: 'fixed' | 'linear' | 'exponential'
  maxDelay: number
  shouldRetry?: (error: Error, attempt: number) => boolean
  onRetry?: (error: Error, attempt: number, delay: number) => void
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  backoff: 'exponential',
  maxDelay: 30000
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // 檢查是否應該重試
      if (config.shouldRetry && !config.shouldRetry(lastError, attempt)) {
        throw lastError
      }

      // 最後一次嘗試不重試
      if (attempt === config.maxAttempts) {
        break
      }

      // 計算延遲
      const delay = calculateDelay(attempt, config)

      // 觸發重試回調
      config.onRetry?.(lastError, attempt, delay)

      // 等待
      await sleep(delay)
    }
  }

  throw lastError
}

function calculateDelay(attempt: number, config: RetryOptions): number {
  let delay: number

  switch (config.backoff) {
    case 'fixed':
      delay = config.baseDelay
      break
    case 'linear':
      delay = config.baseDelay * attempt
      break
    case 'exponential':
      delay = config.baseDelay * Math.pow(2, attempt - 1)
      break
  }

  // 添加隨機抖動（jitter）避免雷群效應
  const jitter = delay * 0.1 * Math.random()
  delay = delay + jitter

  return Math.min(delay, config.maxDelay)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 常見可重試錯誤判斷
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase()
  
  // 網路錯誤
  if (message.includes('network') || message.includes('timeout')) {
    return true
  }
  
  // Rate limit
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return true
  }
  
  // 暫時性服務錯誤
  if (message.includes('503') || message.includes('service unavailable')) {
    return true
  }
  
  return false
}
```

#### 整合到 NotificationManager

```typescript
// src/NotificationManager.ts
import { withRetry, isRetryableError } from './utils/retry'

export class NotificationManager {
  private async sendToChannel(
    notifiable: Notifiable,
    notification: Notification,
    channelName: string,
    retryConfig?: Partial<RetryConfig>
  ): Promise<SendResult> {
    const channel = this.channels.get(channelName)
    const startTime = Date.now()

    if (!channel) {
      return {
        success: false,
        channel: channelName,
        error: new Error(`Channel '${channelName}' not registered`)
      }
    }

    // 取得重試配置
    const retry = this.getRetryConfig(notification, retryConfig)

    try {
      if (retry) {
        await withRetry(
          () => channel.send(notification, notifiable),
          {
            ...retry,
            shouldRetry: retry.retryableErrors || isRetryableError,
            onRetry: (error, attempt, delay) => {
              this.core.logger.warn(
                `[NotificationManager] Channel '${channelName}' failed, ` +
                `retrying (${attempt}/${retry.maxAttempts}) in ${delay}ms`,
                error
              )
              this.core.hooks.emit('notification:channel:retry', {
                notification,
                notifiable,
                channel: channelName,
                error,
                attempt,
                nextDelay: delay
              })
            }
          }
        )
      } else {
        await channel.send(notification, notifiable)
      }

      const duration = Date.now() - startTime
      return { success: true, channel: channelName, duration }
    } catch (error) {
      const duration = Date.now() - startTime
      const err = error instanceof Error ? error : new Error(String(error))
      return { success: false, channel: channelName, error: err, duration }
    }
  }

  private getRetryConfig(
    notification: Notification,
    options?: Partial<RetryConfig>
  ): RetryConfig | undefined {
    // 檢查通知是否實現 ShouldRetry
    const notificationRetry = (notification as unknown as ShouldRetry).retry

    if (options === false || notificationRetry === false) {
      return undefined
    }

    if (options || notificationRetry) {
      return {
        maxAttempts: 3,
        baseDelay: 1000,
        backoff: 'exponential',
        maxDelay: 30000,
        ...notificationRetry,
        ...options
      }
    }

    return undefined
  }
}
```

### 使用範例

```typescript
// 通知級別的重試配置
class ImportantNotification extends Notification implements ShouldRetry {
  retry = {
    maxAttempts: 5,
    baseDelay: 2000,
    backoff: 'exponential' as const
  }

  via() { return ['mail', 'slack'] }
  // ...
}

// 發送時指定重試
await notifications.send(user, new WelcomeEmail(), {
  retry: {
    maxAttempts: 3,
    backoff: 'linear'
  }
})

// 禁用重試
await notifications.send(user, new WelcomeEmail(), {
  retry: false
})
```

---

## P3-02：添加發送指標監控

### 問題描述

缺乏對通知發送的可觀察性，難以監控系統健康狀態。

### 修復方案

#### 定義指標類型

```typescript
// src/metrics/NotificationMetrics.ts

export interface NotificationMetric {
  notification: string
  channel: string
  success: boolean
  duration: number
  timestamp: Date
  error?: string
  retryCount?: number
}

export interface MetricsSummary {
  totalSent: number
  totalSuccess: number
  totalFailed: number
  avgDuration: number
  byChannel: Record<string, {
    sent: number
    success: number
    failed: number
    avgDuration: number
  }>
  byNotification: Record<string, {
    sent: number
    success: number
    failed: number
    avgDuration: number
  }>
}

export class NotificationMetricsCollector {
  private metrics: NotificationMetric[] = []
  private readonly maxHistory: number

  constructor(maxHistory = 10000) {
    this.maxHistory = maxHistory
  }

  record(metric: NotificationMetric): void {
    this.metrics.push(metric)
    
    // 保持歷史記錄在限制內
    if (this.metrics.length > this.maxHistory) {
      this.metrics = this.metrics.slice(-this.maxHistory)
    }
  }

  getSummary(since?: Date): MetricsSummary {
    let filtered = this.metrics
    if (since) {
      filtered = this.metrics.filter(m => m.timestamp >= since)
    }

    const byChannel: MetricsSummary['byChannel'] = {}
    const byNotification: MetricsSummary['byNotification'] = {}

    for (const metric of filtered) {
      // 按通道統計
      if (!byChannel[metric.channel]) {
        byChannel[metric.channel] = { sent: 0, success: 0, failed: 0, avgDuration: 0 }
      }
      byChannel[metric.channel].sent++
      if (metric.success) {
        byChannel[metric.channel].success++
      } else {
        byChannel[metric.channel].failed++
      }

      // 按通知類型統計
      if (!byNotification[metric.notification]) {
        byNotification[metric.notification] = { sent: 0, success: 0, failed: 0, avgDuration: 0 }
      }
      byNotification[metric.notification].sent++
      if (metric.success) {
        byNotification[metric.notification].success++
      } else {
        byNotification[metric.notification].failed++
      }
    }

    // 計算平均時長
    for (const channel of Object.keys(byChannel)) {
      const channelMetrics = filtered.filter(m => m.channel === channel)
      byChannel[channel].avgDuration = 
        channelMetrics.reduce((sum, m) => sum + m.duration, 0) / channelMetrics.length
    }

    for (const notification of Object.keys(byNotification)) {
      const notificationMetrics = filtered.filter(m => m.notification === notification)
      byNotification[notification].avgDuration = 
        notificationMetrics.reduce((sum, m) => sum + m.duration, 0) / notificationMetrics.length
    }

    const successMetrics = filtered.filter(m => m.success)

    return {
      totalSent: filtered.length,
      totalSuccess: successMetrics.length,
      totalFailed: filtered.length - successMetrics.length,
      avgDuration: filtered.length > 0
        ? filtered.reduce((sum, m) => sum + m.duration, 0) / filtered.length
        : 0,
      byChannel,
      byNotification
    }
  }

  getRecentFailures(limit = 10): NotificationMetric[] {
    return this.metrics
      .filter(m => !m.success)
      .slice(-limit)
  }

  getSlowNotifications(threshold: number, limit = 10): NotificationMetric[] {
    return this.metrics
      .filter(m => m.duration > threshold)
      .slice(-limit)
  }

  clear(): void {
    this.metrics = []
  }
}
```

#### 整合到 NotificationManager

```typescript
// src/NotificationManager.ts
import { NotificationMetricsCollector, type NotificationMetric } from './metrics/NotificationMetrics'

export class NotificationManager {
  private metrics?: NotificationMetricsCollector

  /**
   * 啟用指標收集
   */
  enableMetrics(maxHistory = 10000): void {
    this.metrics = new NotificationMetricsCollector(maxHistory)
  }

  /**
   * 獲取指標摘要
   */
  getMetrics(since?: Date): MetricsSummary | undefined {
    return this.metrics?.getSummary(since)
  }

  /**
   * 獲取最近失敗
   */
  getRecentFailures(limit = 10): NotificationMetric[] {
    return this.metrics?.getRecentFailures(limit) ?? []
  }

  private async sendToChannel(/* ... */): Promise<SendResult> {
    // ... 發送邏輯

    // 記錄指標
    if (this.metrics) {
      this.metrics.record({
        notification: notification.constructor.name,
        channel: channelName,
        success: result.success,
        duration: result.duration ?? 0,
        timestamp: new Date(),
        error: result.error?.message
      })
    }

    return result
  }
}
```

#### 匯出指標（可選整合）

```typescript
// src/metrics/exporters/PrometheusExporter.ts

export function toPrometheusFormat(summary: MetricsSummary): string {
  const lines: string[] = []

  // 總量指標
  lines.push(`# HELP notification_total Total notifications sent`)
  lines.push(`# TYPE notification_total counter`)
  lines.push(`notification_total ${summary.totalSent}`)

  lines.push(`# HELP notification_success_total Successful notifications`)
  lines.push(`# TYPE notification_success_total counter`)
  lines.push(`notification_success_total ${summary.totalSuccess}`)

  lines.push(`# HELP notification_failed_total Failed notifications`)
  lines.push(`# TYPE notification_failed_total counter`)
  lines.push(`notification_failed_total ${summary.totalFailed}`)

  // 按通道
  lines.push(`# HELP notification_channel_total Notifications by channel`)
  lines.push(`# TYPE notification_channel_total counter`)
  for (const [channel, stats] of Object.entries(summary.byChannel)) {
    lines.push(`notification_channel_total{channel="${channel}",status="success"} ${stats.success}`)
    lines.push(`notification_channel_total{channel="${channel}",status="failed"} ${stats.failed}`)
  }

  // 平均時長
  lines.push(`# HELP notification_duration_avg Average notification duration in ms`)
  lines.push(`# TYPE notification_duration_avg gauge`)
  lines.push(`notification_duration_avg ${summary.avgDuration.toFixed(2)}`)

  return lines.join('\n')
}
```

### 使用範例

```typescript
// 啟用指標
const manager = core.container.make('notifications')
manager.enableMetrics()

// 獲取摘要
const summary = manager.getMetrics()
console.log(`Success rate: ${(summary.totalSuccess / summary.totalSent * 100).toFixed(1)}%`)

// 獲取最近 1 小時的摘要
const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
const recentSummary = manager.getMetrics(hourAgo)

// 整合 Prometheus
app.get('/metrics', (c) => {
  const summary = manager.getMetrics()
  return c.text(toPrometheusFormat(summary))
})

// 監控警報
setInterval(() => {
  const summary = manager.getMetrics(new Date(Date.now() - 5 * 60 * 1000))
  if (summary && summary.totalFailed / summary.totalSent > 0.1) {
    alertService.send('Notification failure rate > 10%')
  }
}, 60000)
```

---

## P3-03：實現 AWS SNS SMS

### 問題描述

**檔案**: `src/channels/SmsChannel.ts`
**行號**: 79-83

**現況代碼**:
```typescript
private async sendViaAwsSns(_message: import('../types').SmsMessage): Promise<void> {
  throw new Error('AWS SNS SMS provider not yet implemented. Please install @aws-sdk/client-sns')
}
```

### 修復方案

```typescript
// src/channels/SmsChannel.ts

import type { Notification } from '../Notification'
import type { Notifiable, NotificationChannel, SmsMessage } from '../types'

export interface SmsChannelConfig {
  provider: 'twilio' | 'aws-sns'
  // Twilio
  apiKey?: string
  apiSecret?: string
  from?: string
  // AWS SNS
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
}

export class SmsChannel implements NotificationChannel {
  constructor(private config: SmsChannelConfig) {}

  async send(notification: Notification, notifiable: Notifiable): Promise<void> {
    if (!notification.toSms) {
      throw new Error('Notification does not implement toSms method')
    }

    const smsMessage = notification.toSms(notifiable)

    switch (this.config.provider) {
      case 'twilio':
        await this.sendViaTwilio(smsMessage)
        break
      case 'aws-sns':
        await this.sendViaAwsSns(smsMessage)
        break
      default:
        throw new Error(`Unsupported SMS provider: ${this.config.provider}`)
    }
  }

  private async sendViaTwilio(message: SmsMessage): Promise<void> {
    // ... 現有實現
  }

  private async sendViaAwsSns(message: SmsMessage): Promise<void> {
    // 延遲載入 AWS SDK
    let SNSClient: typeof import('@aws-sdk/client-sns').SNSClient
    let PublishCommand: typeof import('@aws-sdk/client-sns').PublishCommand

    try {
      const awsSns = await import('@aws-sdk/client-sns')
      SNSClient = awsSns.SNSClient
      PublishCommand = awsSns.PublishCommand
    } catch {
      throw new Error(
        'AWS SNS SMS requires @aws-sdk/client-sns. ' +
        'Install it with: bun add @aws-sdk/client-sns'
      )
    }

    const client = new SNSClient({
      region: this.config.region || 'us-east-1',
      credentials: this.config.accessKeyId && this.config.secretAccessKey
        ? {
            accessKeyId: this.config.accessKeyId,
            secretAccessKey: this.config.secretAccessKey
          }
        : undefined // 使用環境變數或 IAM role
    })

    const command = new PublishCommand({
      PhoneNumber: message.to,
      Message: message.message,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: message.from || this.config.from || 'GRAVITO'
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional' // 或 'Promotional'
        }
      }
    })

    try {
      await client.send(command)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      throw new Error(`Failed to send SMS via AWS SNS: ${err.message}`)
    }
  }
}
```

### 使用範例

```typescript
// 使用 AWS SNS
const orbit = OrbitFlare.configure({
  enableSms: true,
  channels: {
    sms: {
      provider: 'aws-sns',
      region: 'ap-northeast-1',
      // 可選：明確指定憑證（否則使用環境變數）
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  }
})
```

---

## P3-04：通知模板系統（可選）

### 問題描述

每個通知都需要手動實現 `toMail()`、`toSlack()` 等方法，重複性工作多。

### 修復方案

```typescript
// src/templates/NotificationTemplate.ts

export interface TemplateData {
  [key: string]: unknown
}

export interface MailTemplate {
  subject: string
  view?: string
  data?: TemplateData
}

export interface SlackTemplate {
  text: string
  channel?: string
  attachments?: Array<{
    color?: string
    title?: string
    text?: string
  }>
}

export abstract class TemplatedNotification extends Notification {
  protected data: TemplateData = {}

  /**
   * 設置模板資料
   */
  with(data: TemplateData): this {
    this.data = { ...this.data, ...data }
    return this
  }

  /**
   * 子類實現：定義郵件模板
   */
  protected abstract mailTemplate(): MailTemplate

  /**
   * 子類可選覆寫：定義 Slack 模板
   */
  protected slackTemplate?(): SlackTemplate

  // 自動實現 toMail
  toMail(notifiable: Notifiable): MailMessage {
    const template = this.mailTemplate()
    return {
      subject: this.interpolate(template.subject),
      view: template.view,
      data: { ...template.data, ...this.data },
      to: this.getRecipientEmail(notifiable)
    }
  }

  // 自動實現 toSlack（如果定義了模板）
  toSlack(notifiable: Notifiable): SlackMessage {
    if (!this.slackTemplate) {
      throw new Error('slackTemplate not defined')
    }
    const template = this.slackTemplate()
    return {
      text: this.interpolate(template.text),
      channel: template.channel,
      attachments: template.attachments
    }
  }

  private interpolate(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => 
      String(this.data[key] ?? `{{${key}}}`)
    )
  }

  private getRecipientEmail(notifiable: Notifiable): string {
    // 嘗試從 notifiable 獲取 email
    if ('email' in notifiable && typeof notifiable.email === 'string') {
      return notifiable.email
    }
    throw new Error('Notifiable does not have an email property')
  }
}
```

### 使用範例

```typescript
// 使用模板通知
class WelcomeEmail extends TemplatedNotification {
  via() { return ['mail', 'slack'] }

  protected mailTemplate() {
    return {
      subject: 'Welcome, {{name}}!',
      view: 'emails.welcome'
    }
  }

  protected slackTemplate() {
    return {
      text: 'New user signed up: {{name}} ({{email}})',
      channel: '#new-users'
    }
  }
}

// 發送
await notifications.send(user, new WelcomeEmail()
  .with({ name: user.name, email: user.email }))
```

---

## 驗收標準

| 項目 | 標準 |
|------|------|
| P3-01 | 重試機制正常工作，支援多種退避策略 |
| P3-02 | 指標收集正常，可匯出 Prometheus 格式 |
| P3-03 | AWS SNS SMS 正常發送 |
| P3-04 | 模板系統簡化通知定義（可選） |
| 測試 | 所有新功能有測試覆蓋 |
| 文檔 | README 完整，包含所有新功能說明 |

---

## CHANGELOG 更新範本

```markdown
## [3.3.0] - YYYY-MM-DD

### Added
- 通知重試機制 (#P3-01)
  - 支援 fixed、linear、exponential 退避策略
  - 通知級別和發送級別配置
  - `notification:channel:retry` Hook
- 發送指標監控 (#P3-02)
  - `NotificationMetricsCollector` 類
  - `getMetrics()` 方法獲取摘要
  - Prometheus 格式匯出器
- AWS SNS SMS 支援 (#P3-03)
  - 延遲載入 @aws-sdk/client-sns
  - 支援 IAM role 和明確憑證
- 通知模板系統 (#P3-04，可選)
  - `TemplatedNotification` 基類
  - 模板插值支援
```

---

**文檔版本**: 1.0
**最後更新**: 2025-01-23
