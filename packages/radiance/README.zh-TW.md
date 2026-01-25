# @gravito/radiance

輕量級、高效能的 Gravito 廣播系統，支援多種驅動（Pusher、Ably、Redis、WebSocket）。

**狀態**: v0.1.0 - 核心功能完整，支援多種廣播驅動。

## ✨ 功能特色

- **零運行時開銷**：純類型封裝，直接委派給驅動程式
- **多驅動支援**：Pusher、Ably、Redis、WebSocket
- **模組化設計**：僅需安裝您需要的驅動程式
- **事件整合**：事件可實現 `ShouldBroadcast` 介面自動廣播
- **通道授權**：完整支援私有（Private）與存在（Presence）通道
- **AI 友善**：強型別、清晰的 JSDoc 與可預測的 API

## 📦 安裝

```bash
bun add @gravito/radiance
```

## 🚀 快速開始

### 1. 配置 OrbitRadiance

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitRadiance } from '@gravito/radiance'

const core = await PlanetCore.boot({
  orbits: [
    OrbitRadiance.configure({
      driver: 'pusher',
      config: {
        appId: 'your-app-id',
        key: 'your-key',
        secret: 'your-secret',
        cluster: 'mt1',
      },
      // 錯誤處理選項 (v0.1.1+)
      throwOnError: true,
      
      // 通道授權回調
      authorizeChannel: async (channel, socketId, userId) => {
        // 在此實作您的授權邏輯
        return true
      },
    }),
  ],
})
```

### 2. 建立可廣播事件

```typescript
import { Event, ShouldBroadcast } from '@gravito/core'
import { PrivateChannel } from '@gravito/radiance'

class OrderShipped extends Event implements ShouldBroadcast {
  constructor(public order: Order) {
    super()
  }

  // 定義廣播通道
  broadcastOn(): PrivateChannel {
    return new PrivateChannel(`user.${this.order.userId}`)
  }

  // 定義廣播資料 (可選)
  broadcastWith(): Record<string, unknown> {
    return {
      order_id: this.order.id,
      status: 'shipped',
      tracking_number: this.order.trackingNumber,
    }
  }

  // 定義事件名稱 (可選)
  broadcastAs(): string {
    return 'OrderShipped'
  }
}
```

### 3. 發送事件 (自動廣播)

```typescript
await core.events.dispatch(new OrderShipped(order))
```

### 4. 手動廣播

```typescript
const broadcast = c.get('broadcast') as BroadcastManager

await broadcast.broadcast(
  event,
  { name: 'user.123', type: 'private' },
  { message: 'Hello' },
  'CustomEvent'
)
```

## 🔌 驅動程式配置

### Pusher

```typescript
OrbitRadiance.configure({
  driver: 'pusher',
  config: {
    appId: 'your-app-id',
    key: 'your-key',
    secret: 'your-secret',
    cluster: 'mt1',
    useTLS: true,
  },
})
```

### Ably

```typescript
OrbitRadiance.configure({
  driver: 'ably',
  config: {
    apiKey: 'your-api-key',
  },
})
```

### Redis

適用於內部微服務通訊。

```typescript
import { RedisDriver } from '@gravito/radiance'

// 若 Core Container 已有 'redis' 實例，會自動注入
OrbitRadiance.configure({
  driver: 'redis',
  config: {
    keyPrefix: 'gravito:broadcast:',
  },
})
```

### WebSocket

適用於單節點開發或自定義 WebSocket 伺服器。

```typescript
OrbitRadiance.configure({
  driver: 'websocket',
  config: {
    // 提供獲取所有連線的方法
    getConnections: () => {
      return Array.from(websocketConnections.values())
    },
    // 可選：自訂 Logger
    logger: core.logger,
  },
})
```

## 📡 通道類型

### 公開通道 (Public)

任何人都可以訂閱。

```typescript
import { PublicChannel } from '@gravito/radiance'

class PublicEvent extends Event implements ShouldBroadcast {
  broadcastOn(): PublicChannel {
    return new PublicChannel('public-channel')
  }
}
```

### 私有通道 (Private)

需要授權才能訂閱。名稱以 `private-` 開頭。

```typescript
import { PrivateChannel } from '@gravito/radiance'

class PrivateEvent extends Event implements ShouldBroadcast {
  broadcastOn(): PrivateChannel {
    return new PrivateChannel(`user.${this.userId}`)
  }
}
```

### 存在通道 (Presence)

需要授權，並包含使用者資訊。名稱以 `presence-` 開頭。

```typescript
import { PresenceChannel } from '@gravito/radiance'

class PresenceEvent extends Event implements ShouldBroadcast {
  broadcastOn(): PresenceChannel {
    return new PresenceChannel('presence-room')
  }
}
```

## 🔐 通道授權

私有與存在通道需要授權回調。

```typescript
OrbitRadiance.configure({
  driver: 'pusher',
  config: { /* ... */ },
  authorizeChannel: async (channel, socketId, userId) => {
    if (channel.startsWith('private-user.')) {
      const channelUserId = channel.replace('private-user.', '')
      // 驗證當前使用者 ID 是否匹配
      return userId?.toString() === channelUserId
    }
    return false
  },
})
```

## 📚 API 參考

### BroadcastManager

#### 方法

- `broadcast(event, channel, data, eventName): Promise<void>` - 廣播事件
- `authorizeChannel(channel, socketId, userId): Promise<{ auth, channel_data? } | null>` - 授權通道存取
- `setDriver(driver: BroadcastDriver): void` - 設定廣播驅動
- `setAuthCallback(callback): void` - 設定授權回調
- `setThrowOnError(throwOnError: boolean): void` - 設定是否在錯誤時拋出異常

### ShouldBroadcast 介面

實作此介面的事件會被自動廣播：

- `broadcastOn(): string | Channel` - 廣播通道（必須）
- `broadcastWith?(): Record<string, unknown>` - 廣播資料（可選）
- `broadcastAs?(): string` - 事件名稱（可選）

## ❓ 疑難排解

### 廣播失敗但不拋出錯誤？

檢查 `throwOnError` 設定。預設為 `true`，若設為 `false` 則只會記錄錯誤日誌。

### WebSocket 驅動沒有送出訊息？

確認 `getConnections()` 回傳了正確的連線陣列，且連線狀態為 `OPEN`。WebSocket 驅動會自動忽略非開啟狀態的連線。

### Redis 驅動報錯 "Redis client not set"？

Redis 驅動需要一個 Redis 客戶端實例。請確保在 `OrbitRadiance.configure` 之前或通過依賴注入提供了 `redis` 實例。

---

MIT © Carl Lee
