# P1 - 緊急修復計劃

> **目標版本**: v3.1.0
> **預估工時**: 1-2 天

---

## P1-01：改善錯誤處理機制

### 問題描述

**檔案**: `src/NotificationManager.ts`
**行號**: 115-124

**現況代碼**:
```typescript
try {
  await channel.send(notification, notifiable)
} catch (error) {
  this.core.logger.error(
    `[NotificationManager] Failed to send notification via '${channelName}':`,
    error
  )
  // Continue with other channels.
}
```

**問題分析**:
- 錯誤只記錄不拋出，調用方無法得知發送失敗
- 無法區分「部分失敗」與「完全成功」
- 生產環境難以監控通知發送狀態

### 修復方案

#### 方案 A：返回發送結果（推薦）

```typescript
// src/types.ts - 新增類型
export interface SendResult {
  success: boolean
  channel: string
  error?: Error
  duration?: number
}

export interface NotificationResult {
  notification: string
  notifiable: string | number
  results: SendResult[]
  allSuccess: boolean
  timestamp: Date
}

// src/NotificationManager.ts - 修改 send 方法
async send(notifiable: Notifiable, notification: Notification): Promise<NotificationResult> {
  const channels = notification.via(notifiable)
  const startTime = Date.now()
  
  // 處理佇列邏輯...
  if (notification.shouldQueue() && this.queueManager) {
    // ... 現有佇列邏輯
    return {
      notification: notification.constructor.name,
      notifiable: notifiable.getNotifiableId(),
      results: [{ success: true, channel: 'queue' }],
      allSuccess: true,
      timestamp: new Date()
    }
  }

  const results = await this.sendNow(notifiable, notification, channels)
  
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
      this.core.logger.warn(`[NotificationManager] Channel '${channelName}' not found, skipping`)
      results.push({
        success: false,
        channel: channelName,
        error: new Error(`Channel '${channelName}' not registered`)
      })
      continue
    }

    try {
      await channel.send(notification, notifiable)
      results.push({
        success: true,
        channel: channelName,
        duration: Date.now() - startTime
      })
    } catch (error) {
      this.core.logger.error(
        `[NotificationManager] Failed to send notification via '${channelName}':`,
        error
      )
      results.push({
        success: false,
        channel: channelName,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime
      })
    }
  }

  return results
}
```

#### 方案 B：可選拋出錯誤

```typescript
interface SendOptions {
  /** 若任何通道失敗則拋出 AggregateError */
  throwOnError?: boolean
}

async send(
  notifiable: Notifiable,
  notification: Notification,
  options: SendOptions = {}
): Promise<NotificationResult> {
  const result = await this.sendInternal(notifiable, notification)
  
  if (options.throwOnError && !result.allSuccess) {
    const errors = result.results
      .filter(r => !r.success && r.error)
      .map(r => r.error!)
    throw new AggregateError(
      errors,
      `Notification failed on ${errors.length} channel(s)`
    )
  }
  
  return result
}
```

### 使用範例

```typescript
// 方案 A：檢查結果
const result = await notifications.send(user, new WelcomeEmail())
if (!result.allSuccess) {
  const failed = result.results.filter(r => !r.success)
  console.error('Failed channels:', failed.map(f => f.channel))
}

// 方案 B：拋出錯誤
try {
  await notifications.send(user, new WelcomeEmail(), { throwOnError: true })
} catch (error) {
  if (error instanceof AggregateError) {
    console.error('Failed to send:', error.errors)
  }
}
```

### 測試案例

```typescript
// tests/error-handling.test.ts
describe('NotificationManager error handling', () => {
  it('should return detailed results for each channel', async () => {
    const manager = new NotificationManager(mockCore)
    
    manager.channel('mail', { send: async () => {} })
    manager.channel('broken', { send: async () => { throw new Error('fail') } })

    class TestNotification extends Notification {
      via() { return ['mail', 'broken'] }
      toMail() { return { subject: 'Test', to: 'test@example.com' } }
    }

    const result = await manager.send(notifiable, new TestNotification())

    expect(result.allSuccess).toBe(false)
    expect(result.results).toHaveLength(2)
    expect(result.results[0]).toEqual({
      success: true,
      channel: 'mail',
      duration: expect.any(Number)
    })
    expect(result.results[1]).toMatchObject({
      success: false,
      channel: 'broken',
      error: expect.any(Error)
    })
  })

  it('should throw AggregateError when throwOnError is true', async () => {
    const manager = new NotificationManager(mockCore)
    manager.channel('broken', { send: async () => { throw new Error('fail') } })

    class TestNotification extends Notification {
      via() { return ['broken'] }
    }

    await expect(
      manager.send(notifiable, new TestNotification(), { throwOnError: true })
    ).rejects.toBeInstanceOf(AggregateError)
  })
})
```

---

## P1-02：修正 Notification 類型定義

### 問題描述

**檔案**: `src/Notification.ts`
**行號**: 41-75

**現況代碼**:
```typescript
toMail?(_notifiable: Notifiable): import('./types').MailMessage {
  throw new Error('toMail method not implemented')
}
```

**問題分析**:
- 方法標記為可選 (`?`)，但預設實現會拋出錯誤
- 使用者呼叫 `notification.toMail?.(notifiable)` 時不會得到 `undefined`，而是拋出錯誤
- 類型簽名與實際行為不一致

### 修復方案

#### 方案 A：移除預設實現（推薦）

```typescript
export abstract class Notification {
  abstract via(notifiable: Notifiable): string[]

  /**
   * Get mail message (optional).
   * Implement this if the notification will be sent via the mail channel.
   */
  toMail?(notifiable: Notifiable): MailMessage

  /**
   * Get database notification (optional).
   * Implement this if the notification will be stored via the database channel.
   */
  toDatabase?(notifiable: Notifiable): DatabaseNotification

  /**
   * Get broadcast notification (optional).
   * Implement this if the notification will be sent via the broadcast channel.
   */
  toBroadcast?(notifiable: Notifiable): BroadcastNotification

  /**
   * Get Slack message (optional).
   * Implement this if the notification will be sent via the Slack channel.
   */
  toSlack?(notifiable: Notifiable): SlackMessage

  /**
   * Get SMS message (optional).
   * Implement this if the notification will be sent via the SMS channel.
   */
  toSms?(notifiable: Notifiable): SmsMessage

  // ... 其他方法保持不變
}
```

#### 通道端的驗證（維持現狀）

通道已有驗證邏輯，無需修改：

```typescript
// src/channels/MailChannel.ts
async send(notification: Notification, notifiable: Notifiable): Promise<void> {
  if (!notification.toMail) {
    throw new Error('Notification does not implement toMail method')
  }
  // ...
}
```

### 向後相容性

此變更**向後相容**：
- 現有實現了 `toMail()` 等方法的通知類別不受影響
- 移除預設拋出錯誤的實現，讓 `notification.toMail` 正確返回 `undefined`

---

## P1-03：改善序列化方法

### 問題描述

**檔案**: `src/NotificationManager.ts`
**行號**: 133-141

**現況代碼**:
```typescript
private serializeNotification(notification: Notification): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(notification)) {
    if (!key.startsWith('_') && typeof value !== 'function') {
      data[key] = value
    }
  }
  return data
}
```

**問題分析**:
- 不處理巢狀物件（深層引用會丟失）
- 不處理 `Date` 物件（會變成空物件 `{}`）
- 不處理 `Map`、`Set` 等特殊類型
- 循環引用會導致無限迴圈

### 修復方案

#### 新增序列化工具

```typescript
// src/utils/serialization.ts

/**
 * 深度序列化物件，處理特殊類型
 */
export function deepSerialize(
  obj: unknown,
  seen = new WeakSet()
): unknown {
  // 處理 null 和基本類型
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // 防止循環引用
  if (seen.has(obj as object)) {
    return '[Circular]'
  }
  seen.add(obj as object)

  // 處理 Date
  if (obj instanceof Date) {
    return { __type: 'Date', value: obj.toISOString() }
  }

  // 處理 Map
  if (obj instanceof Map) {
    return {
      __type: 'Map',
      value: Array.from(obj.entries()).map(([k, v]) => [
        deepSerialize(k, seen),
        deepSerialize(v, seen)
      ])
    }
  }

  // 處理 Set
  if (obj instanceof Set) {
    return {
      __type: 'Set',
      value: Array.from(obj).map(v => deepSerialize(v, seen))
    }
  }

  // 處理陣列
  if (Array.isArray(obj)) {
    return obj.map(item => deepSerialize(item, seen))
  }

  // 處理一般物件
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (!key.startsWith('_') && typeof value !== 'function') {
      result[key] = deepSerialize(value, seen)
    }
  }
  return result
}

/**
 * 反序列化物件，還原特殊類型
 */
export function deepDeserialize(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // 還原特殊類型
  if ('__type' in (obj as Record<string, unknown>)) {
    const typed = obj as { __type: string; value: unknown }
    switch (typed.__type) {
      case 'Date':
        return new Date(typed.value as string)
      case 'Map':
        return new Map(
          (typed.value as [unknown, unknown][]).map(([k, v]) => [
            deepDeserialize(k),
            deepDeserialize(v)
          ])
        )
      case 'Set':
        return new Set(
          (typed.value as unknown[]).map(v => deepDeserialize(v))
        )
    }
  }

  // 處理陣列
  if (Array.isArray(obj)) {
    return obj.map(item => deepDeserialize(item))
  }

  // 處理一般物件
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = deepDeserialize(value)
  }
  return result
}
```

#### 更新 NotificationManager

```typescript
import { deepSerialize } from './utils/serialization'

private serializeNotification(notification: Notification): Record<string, unknown> {
  return deepSerialize(notification) as Record<string, unknown>
}
```

### 測試案例

```typescript
// tests/serialization.test.ts
import { deepSerialize, deepDeserialize } from '../src/utils/serialization'

describe('Serialization', () => {
  it('should handle Date objects', () => {
    const date = new Date('2025-01-23T12:00:00Z')
    const serialized = deepSerialize({ createdAt: date })
    const deserialized = deepDeserialize(serialized)
    
    expect((deserialized as any).createdAt).toBeInstanceOf(Date)
    expect((deserialized as any).createdAt.toISOString()).toBe(date.toISOString())
  })

  it('should handle nested objects', () => {
    const obj = {
      user: {
        profile: {
          name: 'John',
          createdAt: new Date()
        }
      }
    }
    const serialized = deepSerialize(obj)
    const deserialized = deepDeserialize(serialized)
    
    expect((deserialized as any).user.profile.name).toBe('John')
    expect((deserialized as any).user.profile.createdAt).toBeInstanceOf(Date)
  })

  it('should handle circular references', () => {
    const obj: any = { name: 'test' }
    obj.self = obj
    
    const serialized = deepSerialize(obj)
    expect((serialized as any).self).toBe('[Circular]')
  })

  it('should handle Map and Set', () => {
    const map = new Map([['key', 'value']])
    const set = new Set([1, 2, 3])
    
    const serialized = deepSerialize({ map, set })
    const deserialized = deepDeserialize(serialized) as any
    
    expect(deserialized.map).toBeInstanceOf(Map)
    expect(deserialized.map.get('key')).toBe('value')
    expect(deserialized.set).toBeInstanceOf(Set)
    expect(deserialized.set.has(2)).toBe(true)
  })
})
```

---

## 驗收標準

| 項目 | 標準 |
|------|------|
| P1-01 | `send()` 返回 `NotificationResult`，包含所有通道結果 |
| P1-02 | `toMail()` 等方法移除預設實現，正確返回 `undefined` |
| P1-03 | 序列化正確處理 Date、巢狀物件、循環引用 |
| 測試 | 所有新增測試通過，覆蓋率不低於現狀 |
| 文檔 | CHANGELOG 更新 |

---

## CHANGELOG 更新範本

```markdown
## [3.1.0] - YYYY-MM-DD

### Changed
- `NotificationManager.send()` 現在返回 `NotificationResult` 物件，包含每個通道的發送結果 (#P1-01)
  - 新增 `SendResult` 和 `NotificationResult` 類型
  - 新增 `throwOnError` 選項，可選擇在失敗時拋出 `AggregateError`

### Fixed
- 修正 `Notification` 基類中可選方法的類型定義 (#P1-02)
- 修正序列化方法無法處理巢狀物件和 Date 的問題 (#P1-03)

### Added
- 新增 `deepSerialize` 和 `deepDeserialize` 工具函數
```

---

**文檔版本**: 1.0
**最後更新**: 2025-01-23
