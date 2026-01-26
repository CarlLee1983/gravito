# @gravito/flare 🌌

> 輕量化、高效能的 Gravito 通知引擎，支援多通路發送（郵件、資料庫、廣播、Slack、SMS）。

`@gravito/flare` 是 Gravito 框架官方提供的通知引擎。它提供了一套簡潔且具表現力的 API，讓開發者能夠輕鬆地透過多種通路發送通知，並原生支援背景隊列處理。

**狀態**: v1.0.0 - 生產環境可用。

## 🌟 核心特性

- **零執行負擔 (Zero Runtime Overhead)**：純 TypeScript 實作，直接委派給高效的通路驅動程式。
- **多通路支援**：單一通知可同時透過多個通路（Mail, DB, Slack 等）發送。
- **背景隊列支援**：與 `@gravito/stream` (OrbitStream) 無縫整合，處理高流量通知發送而不阻塞請求。
- **類型安全 (Type-Safe)**：為每個通路提供嚴格的訊息結構定義，確保資料完整性。
- **易於擴充**：可輕鬆註冊自定義的通知通路。
- **Galaxy 架構相容**：設計為標準的 Gravito Orbit，支援零配置整合。

## 📦 安裝

```bash
bun add @gravito/flare
```

## 🚀 快速上手

### 1. 定義您的通知

建立一個繼承自 `Notification` 的類別。實作 `via` 方法來指定發送通路，以及實作 `to[Channel]` 方法來定義發送內容。

```typescript
import { Notification } from '@gravito/flare'
import type { MailMessage, DatabaseNotification, Notifiable } from '@gravito/flare'

class OrderShipped extends Notification {
  constructor(private order: any) {
    super()
  }

  // 指定發送通路
  via(user: Notifiable): string[] {
    return ['mail', 'database']
  }

  // 郵件內容
  toMail(user: Notifiable): MailMessage {
    return {
      subject: `訂單 #${this.order.id} 已出貨！`,
      view: 'emails.order-shipped',
      data: { order: this.order },
      to: user.email,
    }
  }

  // 資料庫通知內容
  toDatabase(user: Notifiable): DatabaseNotification {
    return {
      type: 'order_shipped',
      data: {
        order_id: this.order.id,
        tracking_number: this.order.tracking,
      },
    }
  }
}
```

### 2. 配置 OrbitFlare

在 `PlanetCore` 啟動程序中註冊 `OrbitFlare`。

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitFlare } from '@gravito/flare'

const core = await PlanetCore.boot({
  orbits: [
    OrbitFlare.configure({
      enableMail: true,
      enableDatabase: true,
      channels: {
        slack: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
        },
      },
    }),
  ],
})
```

### 3. 發送通知

透過核心容器或上下文變數取得 `notifications` 管理器。

```typescript
// 在業務邏輯或控制器中
const notifications = core.container.make('notifications')

await notifications.send(user, new OrderShipped(order))
```

## ⏳ 非同步隊列

若要將通知放入背景發送，只需在通知類別中實作 `ShouldQueue` 介面。

```typescript
import { Notification, ShouldQueue } from '@gravito/flare'

class WeeklyReport extends Notification implements ShouldQueue {
  queue = 'notifications' // 可選：指定隊列名稱
  delay = 3600            // 可選：延遲秒數

  via(user: Notifiable): string[] {
    return ['mail']
  }
  
  // ... toMail 實作
}
```

## 🛠️ 支援的通路

| 通路 | 依賴模組 | 描述 |
|---|---|---|
| **Mail** | `@gravito/signal` | 透過配置的郵件驅動發送電子郵件。 |
| **Database** | `@gravito/atlas` | 將通知儲存至 `notifications` 資料表。 |
| **Broadcast**| `@gravito/radiance`| 透過 WebSockets 推送即時更新。 |
| **Slack** | 無 | 透過 Webhooks 發送訊息至 Slack。 |
| **SMS** | 供應商配置 | 透過配置的簡訊供應商發送簡訊。 |

## 🧩 API 參考

### `Notification` 基礎類別
- `via(notifiable)`：回傳通路名稱陣列。
- `toMail(notifiable)`：回傳 `MailMessage`。
- `toDatabase(notifiable)`：回傳 `DatabaseNotification`。
- `toBroadcast(notifiable)`：回傳 `BroadcastNotification`。
- `toSlack(notifiable)`：回傳 `SlackMessage`。
- `toSms(notifiable)`：回傳 `SmsMessage`。

### `NotificationManager`
- `send(notifiable, notification)`：將通知發送至所有指定的通路。
- `channel(name, implementation)`：註冊自定義的發送通路。

## 🤝 參與貢獻

我們歡迎任何形式的貢獻！詳細資訊請參閱 [貢獻指南](../../CONTRIBUTING.md)。

## 📄 開源授權

MIT © Carl Lee
