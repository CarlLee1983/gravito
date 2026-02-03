---
title: 廣播系統 (Broadcasting)
description: 了解如何將伺服器端事件即時推播到前端瀏覽器。
---

# 廣播系統 (Broadcasting)

> Gravito `@gravito/radiance` 讓您能輕易實現即時功能，如聊天訊息、即時通知或數據儀表板。

## 核心工作流程

1.  **伺服器端**：派發一個實現 `ShouldBroadcast` 的事件。
2.  **廣播層**：事件被序列化並推送到驅動程式（如 Redis、Pusher）。
3.  **用戶端**：瀏覽器透過 WebSocket 監聽並響應。

## 定義廣播事件

```typescript
import { Event } from '@gravito/core'
import { ShouldBroadcast, PrivateChannel } from '@gravito/radiance'

export class MessageSent extends Event implements ShouldBroadcast {
  constructor(public message: string, public userId: string) {
    super()
  }

  // 指定廣播頻道
  broadcastOn() {
    return new PrivateChannel(`user.${this.userId}`)
  }

  // 自定義廣播數據
  broadcastWith() {
    return {
      message: this.message,
      sent_at: new Date().toISOString()
    }
  }
}
```

## 派發廣播

當您在 `PlanetCore` 中派發支援廣播的事件時，它會自動被推送到廣播驅動程式：

```typescript
await core.events.dispatch(new MessageSent('Hello!', '123'))
```

## 客戶端監聽

Gravito 提供了一個輕量級的客戶端 SDK `@gravito/ripple-client`：

```typescript
import { Ripple } from '@gravito/ripple-client'

const ripple = new Ripple({
  driver: 'pusher',
  key: 'your-key'
})

ripple.private(`user.123`)
  .listen('MessageSent', (data) => {
    console.log('收到新訊息:', data.message)
  })
```

---

## 下一步
查看 [CLI 工具](./pulse-cli.md) 了解如何管理您的應用程式。
