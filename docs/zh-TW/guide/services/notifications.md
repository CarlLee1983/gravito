---
title: 通知系統 (Notifications)
description: 了解如何透過多渠道（郵件、資料庫、Slack、簡訊）發送通知。
---

# 通知系統 (Notifications)

> 透過 `@gravito/flare`，您可以輕鬆地將通知發送到多個通路，如電子郵件、資料庫儲存、Slack 頻道或 SMS 簡訊。

## 建立通知

通知類別定義了通知的傳遞方式與各個通路的內容。

```typescript
import { Notification } from '@gravito/flare'
import type { Notifiable, MailMessage, DatabaseNotification } from '@gravito/flare'

export class OrderShipped extends Notification {
  constructor(private order: any) {
    super()
  }

  // 定義要發送的通路
  via(user: Notifiable): string[] {
    return ['mail', 'database']
  }

  // 電子郵件內容
  toMail(user: Notifiable): MailMessage {
    return {
      subject: `您的訂單 #${this.order.id} 已出貨`,
      view: 'emails/shipped',
      data: { order: this.order }
    }
  }

  // 資料庫儲存內容
  toDatabase(user: Notifiable): DatabaseNotification {
    return {
      type: 'order_shipped',
      data: { order_id: this.order.id }
    }
  }
}
```

## 發送通知

您可以使用 `NotificationManager` 來發送通知：

```typescript
import { NotificationManager } from '@gravito/flare'

core.app.post('/orders/:id/ship', async (c) => {
  const notifications = c.get('notifications') as NotificationManager
  const user = await User.find(1)

  // 發送通知
  const result = await notifications.send(user, new OrderShipped(order))

  // 檢查結果
  if (result.failed.length > 0) {
    console.warn('部分通道發送失敗:', result.failed)
  }

  return c.json({ message: '通知已發送' })
})
```

## 進階功能

### 重試機制 (Retries)

您可以為失敗的通知配置自動重試機制。這可以全域設定，也可以針對個別通知設定。

```typescript
// 個別通知的重試配置
export class CriticalAlert extends Notification {
  // 最多重試 5 次，使用線性退避
  retry = {
    maxAttempts: 5,
    backoff: 'linear',
    baseDelay: 1000
  }

  // 或者使用方法定義動態邏輯
  shouldRetry(attempt: number, error: Error): boolean {
    return attempt < 3 && error.message.includes('Network')
  }
}
```

### 指標監控 (Metrics)

`@gravito/flare` 內建指標收集功能，用於監控發送成功率與延遲。

```typescript
import { NotificationMetricsCollector, toPrometheusFormat } from '@gravito/flare'

const metrics = new NotificationMetricsCollector()
// 將指標收集器掛載到管理器
notifications.setMetricsCollector(metrics)

// 導出 Prometheus 格式指標
app.get('/metrics', (c) => {
  return c.text(toPrometheusFormat(metrics.getSummary()))
})
```

### 批次發送 (Batch Sending)

在高流量場景下，使用 `sendBatch` 可以高效地向大量使用者發送通知。

```typescript
const users = await User.all()
// 並行發送通知，並自動控制並發數
await notifications.sendBatch(users, new SystemUpdateNotification())
```

### 模板系統 (Templates)

使用 `TemplatedNotification` 可在應用程式中保持一致的通知訊息格式。

```typescript
import { TemplatedNotification } from '@gravito/flare'

class OrderShipped extends TemplatedNotification {
  constructor(order: Order) {
    super('order-shipped', { orderId: order.id })
  }
}
```

## 背景處理

通知預設會立即發送。若要非同步發送，可以讓通知類別實作 `ShouldQueue`：

```typescript
import { ShouldQueue } from '@gravito/flare'

export class OrderShipped extends Notification implements ShouldQueue {
  queue = 'notifications'
  delay = 60 // 延遲 60 秒發送

  // ...
}
```

---

## 下一步
了解如何透過 [廣播系統](./broadcasting.md) 實現即時互動。
