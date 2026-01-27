# P2 - 功能強化計劃

> **目標版本**: v3.2.0
> **預估工時**: 3-5 天

---

## P2-01：添加通知生命週期 Hook

### 問題描述

目前通知發送過程無法被監聽，開發者無法：
- 追蹤通知發送狀態
- 在發送前/後執行自訂邏輯
- 整合外部監控系統

### 修復方案

#### 定義 Hook 類型

```typescript
// src/types.ts - 新增 Hook 類型

export interface NotificationHookPayload {
  notification: Notification
  notifiable: Notifiable
  channels: string[]
}

export interface ChannelHookPayload {
  notification: Notification
  notifiable: Notifiable
  channel: string
}

export interface ChannelSuccessPayload extends ChannelHookPayload {
  duration: number
}

export interface ChannelFailurePayload extends ChannelHookPayload {
  error: Error
  duration: number
}

export interface NotificationCompletePayload {
  notification: Notification
  notifiable: Notifiable
  results: SendResult[]
  allSuccess: boolean
  totalDuration: number
}
```

#### 實現 Hook 發射

```typescript
// src/NotificationManager.ts

export class NotificationManager {
  private channels = new Map<string, NotificationChannel>()
  private queueManager?: QueueManager

  constructor(private core: PlanetCore) {}

  async send(
    notifiable: Notifiable,
    notification: Notification,
    options: SendOptions = {}
  ): Promise<NotificationResult> {
    const channels = notification.via(notifiable)
    const startTime = Date.now()

    // 發射開始 Hook
    await this.core.hooks.emit('notification:sending', {
      notification,
      notifiable,
      channels
    })

    // 處理佇列...
    if (notification.shouldQueue() && this.queueManager) {
      await this.core.hooks.emit('notification:queued', {
        notification,
        notifiable,
        channels
      })
      // ... 佇列邏輯
    }

    // 發送通知
    const results = await this.sendNow(notifiable, notification, channels)
    const totalDuration = Date.now() - startTime

    // 發射完成 Hook
    await this.core.hooks.emit('notification:sent', {
      notification,
      notifiable,
      results,
      allSuccess: results.every(r => r.success),
      totalDuration
    })

    return {
      notification: notification.constructor.name,
      notifiable: notifiable.getNotifiableId(),
      results,
      allSuccess: results.every(r => r.success),
      timestamp: new Date()
    }
  }

  private async sendNow(
    notifiable: Notifiable,
    notification: Notification,
    channels: string[]
  ): Promise<SendResult[]> {
    const results: SendResult[] = []

    for (const channelName of channels) {
      const channel = this.channels.get(channelName)
      const startTime = Date.now()

      if (!channel) {
        results.push({
          success: false,
          channel: channelName,
          error: new Error(`Channel '${channelName}' not registered`)
        })
        continue
      }

      // 發射通道開始 Hook
      await this.core.hooks.emit('notification:channel:sending', {
        notification,
        notifiable,
        channel: channelName
      })

      try {
        await channel.send(notification, notifiable)
        const duration = Date.now() - startTime

        // 發射通道成功 Hook
        await this.core.hooks.emit('notification:channel:sent', {
          notification,
          notifiable,
          channel: channelName,
          duration
        })

        results.push({ success: true, channel: channelName, duration })
      } catch (error) {
        const duration = Date.now() - startTime
        const err = error instanceof Error ? error : new Error(String(error))

        // 發射通道失敗 Hook
        await this.core.hooks.emit('notification:channel:failed', {
          notification,
          notifiable,
          channel: channelName,
          error: err,
          duration
        })

        this.core.logger.error(
          `[NotificationManager] Failed to send notification via '${channelName}':`,
          error
        )

        results.push({
          success: false,
          channel: channelName,
          error: err,
          duration
        })
      }
    }

    return results
  }
}
```

#### Hook 清單

| Hook 名稱 | 時機 | Payload |
|-----------|------|---------|
| `notification:sending` | 發送開始前 | `NotificationHookPayload` |
| `notification:queued` | 加入佇列後 | `NotificationHookPayload` |
| `notification:sent` | 所有通道完成後 | `NotificationCompletePayload` |
| `notification:channel:sending` | 單一通道發送前 | `ChannelHookPayload` |
| `notification:channel:sent` | 單一通道成功後 | `ChannelSuccessPayload` |
| `notification:channel:failed` | 單一通道失敗後 | `ChannelFailurePayload` |

### 使用範例

```typescript
// 監聽所有通知
core.hooks.on('notification:sent', (payload) => {
  console.log(`Notification sent to ${payload.notifiable.getNotifiableId()}`)
  console.log(`Success: ${payload.allSuccess}, Duration: ${payload.totalDuration}ms`)
})

// 監聽失敗
core.hooks.on('notification:channel:failed', (payload) => {
  alertService.send({
    message: `Notification failed on ${payload.channel}`,
    error: payload.error.message
  })
})

// 整合外部監控
core.hooks.on('notification:sent', (payload) => {
  metrics.increment('notifications.sent', {
    success: payload.allSuccess,
    channels: payload.results.length
  })
})
```

---

## P2-02：實現並行通道發送

### 問題描述

**檔案**: `src/NotificationManager.ts`

**現況代碼**:
```typescript
for (const channelName of channels) {
  // 序列執行，效能差
  await channel.send(notification, notifiable)
}
```

當通知需要透過多個通道發送時，目前是序列執行，若 Mail 通道耗時 500ms、Slack 通道耗時 300ms，總共需要 800ms。

### 修復方案

#### 配置選項

```typescript
// src/types.ts
export interface SendOptions {
  throwOnError?: boolean
  /** 是否並行發送到所有通道（預設 true） */
  parallel?: boolean
  /** 並行發送時的最大並發數（預設無限制） */
  concurrency?: number
}
```

#### 並行發送實現

```typescript
// src/NotificationManager.ts

private async sendNow(
  notifiable: Notifiable,
  notification: Notification,
  channels: string[],
  options: SendOptions = {}
): Promise<SendResult[]> {
  const { parallel = true, concurrency } = options

  if (!parallel) {
    // 保持原有序列邏輯
    return this.sendSequential(notifiable, notification, channels)
  }

  if (concurrency && concurrency > 0) {
    // 限制並發數
    return this.sendWithConcurrencyLimit(notifiable, notification, channels, concurrency)
  }

  // 完全並行
  return this.sendParallel(notifiable, notification, channels)
}

private async sendParallel(
  notifiable: Notifiable,
  notification: Notification,
  channels: string[]
): Promise<SendResult[]> {
  const promises = channels.map(channelName => 
    this.sendToChannel(notifiable, notification, channelName)
  )
  
  return Promise.all(promises)
}

private async sendWithConcurrencyLimit(
  notifiable: Notifiable,
  notification: Notification,
  channels: string[],
  concurrency: number
): Promise<SendResult[]> {
  const results: SendResult[] = []
  const pending: Promise<void>[] = []

  for (const channelName of channels) {
    const promise = this.sendToChannel(notifiable, notification, channelName)
      .then(result => {
        results.push(result)
      })

    pending.push(promise)

    if (pending.length >= concurrency) {
      await Promise.race(pending)
      // 移除已完成的 promise
      const completed = pending.findIndex(p => 
        p === Promise.resolve(p)
      )
      if (completed !== -1) {
        pending.splice(completed, 1)
      }
    }
  }

  await Promise.all(pending)
  return results
}

private async sendToChannel(
  notifiable: Notifiable,
  notification: Notification,
  channelName: string
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

  try {
    await this.core.hooks.emit('notification:channel:sending', {
      notification,
      notifiable,
      channel: channelName
    })

    await channel.send(notification, notifiable)
    const duration = Date.now() - startTime

    await this.core.hooks.emit('notification:channel:sent', {
      notification,
      notifiable,
      channel: channelName,
      duration
    })

    return { success: true, channel: channelName, duration }
  } catch (error) {
    const duration = Date.now() - startTime
    const err = error instanceof Error ? error : new Error(String(error))

    await this.core.hooks.emit('notification:channel:failed', {
      notification,
      notifiable,
      channel: channelName,
      error: err,
      duration
    })

    this.core.logger.error(
      `[NotificationManager] Failed to send notification via '${channelName}':`,
      error
    )

    return { success: false, channel: channelName, error: err, duration }
  }
}
```

### 使用範例

```typescript
// 完全並行（預設）
await notifications.send(user, new WelcomeEmail())

// 序列發送
await notifications.send(user, new WelcomeEmail(), { parallel: false })

// 限制並發數（避免 rate limit）
await notifications.send(user, new WelcomeEmail(), { concurrency: 2 })
```

---

## P2-03：添加批次發送 API

### 問題描述

當需要發送通知給多個接收者時，目前只能迴圈呼叫 `send()`，效能差且難以追蹤。

### 修復方案

```typescript
// src/types.ts
export interface BatchResult {
  total: number
  success: number
  failed: number
  results: NotificationResult[]
  duration: number
}

// src/NotificationManager.ts
export class NotificationManager {
  /**
   * 批次發送通知給多個接收者
   */
  async sendBatch(
    notifiables: Notifiable[],
    notification: Notification,
    options: SendOptions & { 
      /** 批次處理的並發數（預設 10） */
      batchConcurrency?: number 
    } = {}
  ): Promise<BatchResult> {
    const { batchConcurrency = 10 } = options
    const startTime = Date.now()
    const results: NotificationResult[] = []

    // 發射批次開始 Hook
    await this.core.hooks.emit('notification:batch:start', {
      notification,
      count: notifiables.length
    })

    // 分批處理
    for (let i = 0; i < notifiables.length; i += batchConcurrency) {
      const batch = notifiables.slice(i, i + batchConcurrency)
      const batchPromises = batch.map(notifiable =>
        this.send(notifiable, notification, options)
      )
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    const duration = Date.now() - startTime
    const successCount = results.filter(r => r.allSuccess).length

    // 發射批次完成 Hook
    await this.core.hooks.emit('notification:batch:complete', {
      notification,
      total: notifiables.length,
      success: successCount,
      failed: notifiables.length - successCount,
      duration
    })

    return {
      total: notifiables.length,
      success: successCount,
      failed: notifiables.length - successCount,
      results,
      duration
    }
  }

  /**
   * 發送通知給多個接收者（使用生成器，適用於大量資料）
   */
  async *sendBatchStream(
    notifiables: AsyncIterable<Notifiable> | Iterable<Notifiable>,
    notification: Notification,
    options: SendOptions & { batchSize?: number } = {}
  ): AsyncGenerator<NotificationResult> {
    const { batchSize = 10 } = options
    let batch: Notifiable[] = []

    for await (const notifiable of notifiables) {
      batch.push(notifiable)
      
      if (batch.length >= batchSize) {
        const promises = batch.map(n => this.send(n, notification, options))
        const results = await Promise.all(promises)
        for (const result of results) {
          yield result
        }
        batch = []
      }
    }

    // 處理剩餘
    if (batch.length > 0) {
      const promises = batch.map(n => this.send(n, notification, options))
      const results = await Promise.all(promises)
      for (const result of results) {
        yield result
      }
    }
  }
}
```

### 使用範例

```typescript
// 批次發送
const users = await db.users.findAll()
const result = await notifications.sendBatch(users, new WeeklyDigest())
console.log(`Sent ${result.success}/${result.total} successfully`)

// 串流發送（大量資料）
const userStream = db.users.stream()
for await (const result of notifications.sendBatchStream(userStream, new WeeklyDigest())) {
  if (!result.allSuccess) {
    console.error(`Failed for user ${result.notifiable}`)
  }
}
```

---

## P2-04：重構 OrbitFlare 類型

### 問題描述

**檔案**: `src/OrbitFlare.ts`

**現況代碼**:
```typescript
const mail = core.container.make('mail') as
  | {
      send(message: import('./types').MailMessage): Promise<void>
    }
  | undefined
```

大量使用 `as` 類型斷言，類型安全性差。

### 修復方案

#### 定義服務介面

```typescript
// src/types.ts - 新增服務介面

export interface MailService {
  send(message: MailMessage): Promise<void>
}

export interface DatabaseService {
  insertNotification(data: {
    notifiableId: string | number
    notifiableType: string
    type: string
    data: Record<string, unknown>
  }): Promise<void>
}

export interface BroadcastService {
  broadcast(channel: string, event: string, data: Record<string, unknown>): Promise<void>
}

export interface QueueService {
  push(job: unknown, queue?: string, connection?: string, delay?: number): Promise<void>
}
```

#### 類型安全的服務獲取

```typescript
// src/OrbitFlare.ts
import type {
  MailService,
  DatabaseService,
  BroadcastService,
  QueueService
} from './types'

export class OrbitFlare implements GravitoOrbit {
  async install(core: PlanetCore): Promise<void> {
    const manager = new NotificationManager(core)

    // 使用類型安全的方式獲取服務
    if (this.options.enableMail) {
      this.setupMailChannel(core, manager)
    }

    if (this.options.enableDatabase) {
      this.setupDatabaseChannel(core, manager)
    }

    // ... 其他通道
  }

  private setupMailChannel(core: PlanetCore, manager: NotificationManager): void {
    const mail = core.container.make<MailService>('mail')
    
    if (mail && this.isMailService(mail)) {
      manager.channel('mail', new MailChannel(mail))
    } else {
      core.logger.warn('[OrbitFlare] Mail service not found or invalid, mail channel disabled')
    }
  }

  private isMailService(service: unknown): service is MailService {
    return (
      typeof service === 'object' &&
      service !== null &&
      'send' in service &&
      typeof (service as MailService).send === 'function'
    )
  }

  private isDatabaseService(service: unknown): service is DatabaseService {
    return (
      typeof service === 'object' &&
      service !== null &&
      'insertNotification' in service &&
      typeof (service as DatabaseService).insertNotification === 'function'
    )
  }

  // ... 其他 type guard
}
```

---

## P2-05：添加配置驗證

### 問題描述

`OrbitFlare` 接受配置但不驗證，無效配置只會在執行時才發現。

### 修復方案

```typescript
// src/OrbitFlare.ts

export class OrbitFlare implements GravitoOrbit {
  constructor(options: OrbitFlareOptions = {}) {
    this.validateOptions(options)
    this.options = {
      enableMail: true,
      enableDatabase: true,
      enableBroadcast: true,
      enableSlack: false,
      enableSms: false,
      ...options,
    }
  }

  private validateOptions(options: OrbitFlareOptions): void {
    // 驗證 Slack 配置
    if (options.enableSlack) {
      const slack = options.channels?.slack as { webhookUrl?: string } | undefined
      if (!slack?.webhookUrl) {
        throw new Error(
          '[OrbitFlare] Slack channel enabled but webhookUrl not provided. ' +
          'Configure channels.slack.webhookUrl or set enableSlack to false.'
        )
      }
      if (!this.isValidUrl(slack.webhookUrl)) {
        throw new Error(
          `[OrbitFlare] Invalid Slack webhook URL: ${slack.webhookUrl}`
        )
      }
    }

    // 驗證 SMS 配置
    if (options.enableSms) {
      const sms = options.channels?.sms as { provider?: string } | undefined
      if (!sms?.provider) {
        throw new Error(
          '[OrbitFlare] SMS channel enabled but provider not specified. ' +
          'Configure channels.sms.provider or set enableSms to false.'
        )
      }
      const supportedProviders = ['twilio', 'aws-sns']
      if (!supportedProviders.includes(sms.provider)) {
        throw new Error(
          `[OrbitFlare] Unsupported SMS provider: ${sms.provider}. ` +
          `Supported providers: ${supportedProviders.join(', ')}`
        )
      }
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}
```

### 測試案例

```typescript
describe('OrbitFlare configuration validation', () => {
  it('should throw when Slack enabled without webhookUrl', () => {
    expect(() => new OrbitFlare({
      enableSlack: true
    })).toThrow(/webhookUrl not provided/)
  })

  it('should throw for invalid Slack webhook URL', () => {
    expect(() => new OrbitFlare({
      enableSlack: true,
      channels: { slack: { webhookUrl: 'not-a-url' } }
    })).toThrow(/Invalid Slack webhook URL/)
  })

  it('should throw for unsupported SMS provider', () => {
    expect(() => new OrbitFlare({
      enableSms: true,
      channels: { sms: { provider: 'unknown' } }
    })).toThrow(/Unsupported SMS provider/)
  })

  it('should accept valid configuration', () => {
    expect(() => new OrbitFlare({
      enableSlack: true,
      channels: { slack: { webhookUrl: 'https://hooks.slack.com/services/xxx' } }
    })).not.toThrow()
  })
})
```

---

## 驗收標準

| 項目 | 標準 |
|------|------|
| P2-01 | 所有 Hook 正確發射，payload 類型正確 |
| P2-02 | 並行發送正常工作，支援併發限制 |
| P2-03 | 批次發送正常工作，支援串流模式 |
| P2-04 | 移除所有不必要的 `as` 類型斷言 |
| P2-05 | 無效配置在建構時即拋出錯誤 |
| 測試 | 覆蓋率達 80%，所有新功能有測試 |
| 文檔 | README 更新，CHANGELOG 更新 |

---

## CHANGELOG 更新範本

```markdown
## [3.2.0] - YYYY-MM-DD

### Added
- 通知生命週期 Hook (#P2-01)
  - `notification:sending` - 發送開始前
  - `notification:sent` - 所有通道完成後
  - `notification:queued` - 加入佇列後
  - `notification:channel:sending` - 單一通道發送前
  - `notification:channel:sent` - 單一通道成功後
  - `notification:channel:failed` - 單一通道失敗後
- 並行通道發送支援 (#P2-02)
  - `parallel` 選項（預設 true）
  - `concurrency` 選項限制並發數
- 批次發送 API (#P2-03)
  - `sendBatch()` 方法
  - `sendBatchStream()` 生成器方法
- 配置驗證 (#P2-05)
  - Slack webhookUrl 驗證
  - SMS provider 驗證

### Changed
- 重構 OrbitFlare 類型系統，移除不必要的類型斷言 (#P2-04)
```

---

**文檔版本**: 1.0
**最後更新**: 2025-01-23
