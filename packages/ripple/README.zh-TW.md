# @gravito/ripple

> 🌊 高性能 WebSocket 廣播模組，專為 Bun 打造。支援頻道式即時通訊。

[![Test Coverage](https://img.shields.io/badge/coverage-95.24%25-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-198%20passing-success)]()
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)]()
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.0-orange)]()

## 特性

- ⚡ **Bun 原生 WebSocket** - 零外部依賴，比 ws 函式庫快 3 倍
- 📡 **頻道式廣播** - 支援公開 (Public)、私有 (Private) 與存在 (Presence) 頻道
- 🔒 **安全授權** - 靈活的基於回呼 (Callback) 的授權系統
- 📊 **生產級可靠性** - 95.24% 測試覆蓋率，經過實戰檢驗的架構
- 🚀 **水平擴展** - 支援 Redis 驅動，實現多伺服器部署
- 🔍 **全方位可觀測性** - 內建日誌、健康檢查與連線追蹤
- 💪 **類型安全** - 全面的 TypeScript 支援與完整的 JSDoc 文檔
- 🎯 **Laravel Echo 相容** - 開發者熟悉的 API 設計

## 為什麼選擇 Ripple？

### 性能優先
- **亞毫秒延遲**：Bun 原生 WebSocket 實現 <1ms 的訊息傳遞
- **低內存占用**：10,000 個並發連線僅需約 25MB 內存
- **高效序列化**：訊息快取機制減少 60% 的 CPU 開銷

### 生產準備
- **198 個測試案例**，95.24% 代碼覆蓋率
- **優雅停機**：確保連線正確清理
- **內建監控**：即時健康檢查與性能指標
- **錯誤追蹤**：結構化日誌記錄

### 可擴展架構
- **LocalDriver**：零依賴的單機部署
- **RedisDriver**：跨伺服器的水平擴展
- **自定義驅動**：可輕鬆實作 NATS、RabbitMQ 等驅動

## 安裝

```bash
bun add @gravito/ripple
```

## 快速開始

### 伺服器設定

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitRipple, RippleServer } from '@gravito/ripple'

const core = new PlanetCore()

// 安裝 Ripple 模組
core.install(new OrbitRipple({
  path: '/ws',
  authorizer: async (channel, userId, socketId) => {
    // 私有頻道授權邏輯
    if (channel.startsWith('private-orders.')) {
      return userId !== undefined
    }
    // 存在頻道範例
    if (channel.startsWith('presence-chat.')) {
      return { id: userId, info: { name: 'User' } }
    }
    return true
  }
}))

const ripple = core.container.make<OrbitRipple>('ripple')

// 啟動伺服器
Bun.serve({
  port: 3000,
  fetch: (req, server) => {
    // 處理 WebSocket 升級
    if (ripple.getServer().upgrade(req, server)) return
    return new Response('Hello World')
  },
  websocket: ripple.getHandler()
})
```

### 發送廣播

```typescript
import { broadcast, PrivateChannel, BroadcastEvent } from '@gravito/ripple'

// 定義廣播事件
class OrderShipped extends BroadcastEvent {
  constructor(public orderId: number, public userId: string) {
    super()
  }

  broadcastOn() {
    return new PrivateChannel(`orders.${this.userId}`)
  }

  broadcastAs() {
    return 'order.shipped'
  }
}

// 在應用程式任何地方發送
broadcast(new OrderShipped(123, 'user_abc'))
```

## 性能表現

### 基準測試 (10,000 連線, 100KB 訊息)

| 指標 | LocalDriver | RedisDriver | ws library |
|--------|-------------|-------------|------------|
| **延遲 (p95)** | 0.8ms | 2.1ms | 2.5ms |
| **內存占用** | 25MB | 35MB | 65MB |
| **CPU 占用** | 12% | 18% | 45% |
| **吞吐量** | 100K msg/s | 50K msg/s | 30K msg/s |

## 文檔連結 (英文)

- **[架構概覽](./docs/architecture/overview.md)**
- **[授權模型](./docs/architecture/ADR-002-channel-authorization.md)**
- **[驅動層設計](./docs/architecture/ADR-003-driver-abstraction.md)**
- **[故障排除指南](./docs/troubleshooting.md)**
- **[安全指南](./docs/security.md)**

## 授權條款

MIT
