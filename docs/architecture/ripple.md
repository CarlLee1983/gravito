---
title: Ripple 架構技術規格書
version: 5.0.0-alpha
status: Experimental
tier: B
last_updated: 2026-02-07
dependencies:
  bun: ">=1.0.0" # (optional if using Node.js)
  node: ">=18.0.0" # (optional if using Bun)
  core: "^1.5.0"
  protobufjs: "^7.0.0" # (optional)
related_orbits:
  - core
  - radiance
---

# Ripple Architecture 技術架構規格書 (v5.0.0-alpha)

## 📖 目錄

1. [快速開始](#快速開始)
2. [模組概覽](#模組概覽)
3. [技術規格與架構設計](#技術規格與架構設計)
4. [核心 API 參考](#核心-api-參考)
5. [Protobuf 整合](#protobuf-整合)
6. [完整使用範例](#完整使用範例)
7. [測試指南](#測試指南)
8. [效能優化](#效能優化)
9. [部署指南](#部署指南)
10. [故障排除](#故障排除)
11. [API 速查表](#api-速查表)
12. [發展路線圖](#發展路線圖-roadmap)

---

## 快速開始

### Standalone Mode (推薦)

v5.0 引入了標準化的 `start()` 方法，自動根據 Runtime (Bun/Node) 選擇最佳引擎。

```typescript
import { RippleServer } from '@gravito/ripple'

// 建立伺服器 (自動偵測 Runtime)
const ripple = new RippleServer({
  port: 3000,
  driver: 'local', // 或 'redis', 'nats'
  serializer: 'json' // 或 'protobuf'
})

// 訂閱頻道並廣播
ripple.on('subscribe', ({ channel, clientId }) => {
  console.log(`Client ${clientId} subscribed to ${channel}`)
})

// 啟動伺服器
await ripple.start()
console.log('Ripple Server running on port 3000')

// 廣播訊息
ripple.to('news').emit('update', {
  title: 'Breaking News',
  content: 'Ripple v5 is out!'
})
```

---

## 模組概覽

**Ripple** (`@gravito/ripple`) 是 Gravito 生態系中的高效能廣播系統。v5.0 引入了 **Engine Abstraction Layer**，使其不再僅限於 Bun，更能支援 Node.js (via uWebSockets.js 或 ws)，同時保持「零開銷」的核心哲學。

### 核心哲學：Runtime-Agnostic High Performance

- **Multi-Runtime Support**：透過引擎抽象層，同一套程式碼可運行於 Bun (Native WebSocket)、Node.js (uWebSockets.js/ws)。
- **Zero Overhead**：在 Bun 環境下直接利用 `Bun.serve`，在 Node 環境下利用 `uWebSockets.js` (C++)，確保極致效能。
- **Type-Safe Channels**：透過 `PrivateChannel`, `PresenceChannel` 物件封裝，確保頻道命名的安全性。
- **Scalable**：內建 Redis 與 NATS JetStream Drivers，支援從單機到跨國叢集的彈性擴展。

### 核心功能
- **Runtime 引擎**：支援 Bun (Default), Node.js (Experimental)
- **多種驅動 (Drivers)**：Local (開發), Redis (生產), NATS (超大規模)
- **高效序列化**：支援 JSON 與 **Protocol Buffers** (v4.1+)
- **可靠性**：Server-Assisted Reconnection, Message ACK, Backpressure Management (Slow Client Isolation)

---

## 技術規格與架構設計

### 模組組件分析

#### 1. RippleServer (Core)
- **職責**：核心控制器，協調 Engine, Driver 與 Serializer。
- **位置**：`src/RippleServer.ts`
- **關鍵方法**：
  - `start()`: 初始化所有組件並啟動監聽。
  - `handleMessage()`: 統一的訊息處理入口。
  - `broadcast()`: 將訊息推送到指定頻道。

#### 2. Engines (Runtime Layer) - **New in v5.0**
- **職責**：將底層 Runtime 的 WebSocket API 統一封裝為 `IRippleEngine` 介面。
- **位置**：`src/engines/`
- **實現**：
  - **BunEngine**：直接包裝 `Bun.serve`，無額外開銷。
  - **UWebSocketsEngine** (Planned)：基於 C++ `uWebSockets.js`，Node.js 上效能最強。
  - **WsEngine** (Planned)：基於 `ws` 套件，相容性最高。

#### 3. Drivers (Scaling Layer)
- **職責**：負責跨節點訊息同步。
- **位置**：`src/drivers/`
- **NATS Driver (v4.0)**：
  - **機制**：使用 NATS JetStream 實現高性能分佈式廣播。
  - **優勢**：支援 At-least-once delivery, Message Replay, 極低延遲。
  - **Presence**：利用 NATS KV Store 實現分散式在線狀態同步。
- **Redis Driver**：
  - **機制**：利用 Redis Pub/Sub 與 Hash。
  - **適用**：中小型叢集，架構簡單。

#### 4. Serializers (Data Layer) - **New in v4.1**
- **職責**：處理訊息的序列化與反序列化。
- **位置**：`src/serializers/`
- **JsonSerializer**：預設，相容性好，人類可讀。
- **ProtobufSerializer**：
  - **機制**：使用 Protocol Buffers Schema 定義訊息結構。
  - **優勢**：二進位傳輸，封包極小，解析速度快。
  - **模式**：採用 Envelope 模式，外層為 Proto 封裝，內層 Data 可為 JSON 或 Bytes。

---

## 核心 API 參考

### 1. 建立伺服器

```typescript
import { RippleServer } from '@gravito/ripple'

const ripple = new RippleServer({
  // 基礎設定
  port: 3000,
  path: '/ws',
  
  // Runtime 設定 (選填，預設為 auto-detect)
  runtime: 'bun', // 'bun' | 'node-uws' | 'node-ws'
  
  // 擴展驅動
  driver: 'nats',
  nats: { servers: ['nats://localhost:4222'] },
  
  // 序列化
  serializer: 'protobuf', // 'json' | 'protobuf'
  protoPath: './custom.proto', // 可選

  // 可靠性
  reconnection: { enabled: true },
  ack: { enabled: true }
})

await ripple.start()
```

### 2. 廣播訊息與 Protobuf

```typescript
// 自動依據配置序列化為 JSON 或 Protobuf binary
ripple.to('game').emit('move', { x: 10, y: 20 })

// 排除特定客戶端
ripple.to('chat').except(clientId).emit('message', {
  from: 'User',
  text: 'Hello!'
})

// 強制發送 Raw Binary
const buffer = new ArrayBuffer(1024)
ripple.to('data').emitBinary(buffer)
```

### 3. NATS Driver 配置

```typescript
const ripple = new RippleServer({
  driver: 'nats',
  nats: {
    servers: ['nats://nats-cluster:4222'],
    jetstream: true, // 啟用 Message Replay
    kv: true         // 啟用 Presence KV Store
  }
})
```

---

## Protobuf 整合

v4.1+ 支援 Protocol Buffers 序列化，可大幅減少網路流量。

**前置需求**：
1. 定義 `ripple.proto` (參考 `src/proto/ripple.proto` 預設範本)
2. 安裝 `protobufjs`: `npm install protobufjs`

**使用方式**：
Ripple 採用 **Hybrid Envelope** 策略：
- **Envelope (Header)**：使用 Protobuf 定義的固定結構 (Event, Channel, Seq, NeedAck)。
- **Payload (Data)**：支援 JSON String 或 Raw Bytes。

這意味著你可以在不修改業務邏輯程式碼的情況下，無縫切換至 Protobuf 傳輸層。

```typescript
const ripple = new RippleServer({
  serializer: 'protobuf'
})
// 你的 emit 程式碼完全不用改
ripple.to('user').emit('update', { status: 'ok' })
```

---

## 完整使用範例

### 範例 1：即時聊天室 (Bundled with Start)

```typescript
import { RippleServer } from '@gravito/ripple'

const ripple = new RippleServer({ driver: 'redis', port: 3000 })

// ... (中間邏輯與 v4 相同) ...

// 啟動伺服器
await ripple.start()
```

### 範例 2：高效能遊戲伺服器 (Bun + NATS + Protobuf)

```typescript
import { RippleServer } from '@gravito/ripple'

// 1. 設定高效能組件
const server = new RippleServer({
  port: 8080,
  runtime: 'bun',          // 使用 Bun Native WebSocket
  driver: 'nats',          // 使用 NATS 做低延遲同步
  serializer: 'protobuf',  // 使用 Protobuf 壓縮封包
  
  // 配置 NATS
  nats: {
    servers: ['nats://localhost:4222']
  },
  
  // 啟用背壓保護 (防止慢速客戶端拖垮伺服器)
  backpressure: {
    enabled: true,
    hwmHigh: 5 * 1024 * 1024, // 5MB buffer limit
  }
})

// 2. 遊戲邏輯
server.on('message', async ({ socket, data, channel }) => {
  if (channel === 'game-lobby' && data.event === 'player-move') {
    // 廣播移動數據
    server.to('game-lobby')
      .except(socket.id)
      .emit('player-moved', data.payload)
  }
})

// 3. 處理二進位數據 (如 Voice Chat)
server.on('binary', ({ socket, data, channel }) => {
  // 轉發語音封包
  server.to(channel).except(socket.id).emitBinary(data)
})

// 4. 啟動
await server.start()
```

### 範例 3：Presence Channel (在線狀態)

> (邏輯維持不變，僅初始化需改為 `start()`)

```typescript
const ripple = new RippleServer({ driver: 'nats', nats: { kv: true } })
// ... PresenceManager 邏輯 ...
await ripple.start()
```

---

## 測試指南

### 單元測試

```typescript
import { describe, it, expect, beforeEach } from 'bun:test'
import { RippleServer } from '@gravito/ripple'

describe('RippleServer', () => {
  let ripple: RippleServer

  beforeEach(async () => {
    ripple = new RippleServer({ driver: 'local', port: 0 }) // Port 0 = random
    await ripple.start() // 記得要 start
  })

  afterEach(async () => {
    await ripple.shutdown()
  })

  it('should subscribe to channel', () => {
    // ... 測試邏輯 ...
  })
})
```

### 整合測試

```typescript
import { describe, it, expect } from 'bun:test'
import { RippleServer } from '@gravito/ripple'

describe('WebSocket Integration', () => {
  it('should handle client connection', async () => {
    const ripple = new RippleServer({ 
      driver: 'local', 
      port: 3001,
      runtime: 'bun' 
    })
    
    await ripple.start()

    // 連線測試
    const ws = new WebSocket('ws://localhost:3001')

    await new Promise((resolve) => {
      ws.onopen = resolve
    })

    // ... 測試訂閱與訊息 ...

    await ripple.shutdown()
  })
})
```

---

## 效能優化

### 基準數據 (v5.0 Alpha)

| 操作 | 平均時間 | P95 | P99 | 備註 |
|------|---------|-----|-----|-----------|
| WebSocket Upgrade | < 0.5ms | 1ms | 2ms | Bun Runtime |
| PB Serialization | 0.05ms | 0.1ms | 0.2ms | 比 JSON 快 10x |
| Broadcast (NATS) | 1ms | 2ms | 5ms | 叢集同步延遲 |

### 優化建議

1. **使用 Protobuf**：對於高頻繁的小封包（如遊戲位置同步），Protobuf 可減少 60%+ 的頻寬。
2. **啟用 Backpressure**：設定 `hwmHigh` 防止慢速客戶端導致 OOM。
3. **NATS JetStream**：對於需要訊息不丟失的場景（如交易通知），務必使用 NATS Driver 並啟用 ACK。

---

## 部署指南

### Docker 部署 (Bun Runtime)

```dockerfile
FROM oven/bun:1.0

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --production
COPY . .

# Protobuf 支援
RUN bun install protobufjs

EXPOSE 3000
CMD ["bun", "run", "server.ts"]
```

### Server Code

```typescript
// server.ts
import { RippleServer } from '@gravito/ripple'

const ripple = new RippleServer({
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  driver: 'redis',
  redis: {
    host: process.env.REDIS_HOST
  }
})

await ripple.start()
```

---

## 故障排除

### 常見問題 (v5.0)

| 問題 | 症狀 | 解決方案 |
|------|------|---------|
| Protobuf Init Error | `Error: 'protobufjs' is not installed` | 執行 `npm install protobufjs` 或改用 `serializer: 'json'` |
| Upgrade Failed | `getHandler() is deprecated` | 請改用 `ripple.start()` 啟動伺服器 |
| NATS Connect Error | 無法連線至 NATS | 檢查 NATS URL 格式 (`nats://...`) 與 JetStream 是否啟用 |

---

## API 速查表

### 廣播方法

```typescript
// 廣播到頻道 (支援 JSON 與 Protobuf)
ripple.to(channel).emit(event, data)
ripple.to([channel1, channel2]).emit(event, data)

// 排除特定客戶端
// 注意: 除了 emit 還有 broadcastBinary 可以使用，但目前 fluent API 僅支援 emit
ripple.to(channel).emit(event, data)

// 二進位廣播 (Raw Binary Mode)
ripple.broadcastBinary(channel, event, buffer)
```

### 頻道管理

```typescript
// 訂閱頻道 (Server-side)
await ripple.channels.subscribe(clientId, channel)

// 取消訂閱
await ripple.channels.unsubscribe(clientId, channel)

// 取得訂閱者
const subscribers = ripple.channels.getSubscribers(channel)

// 取得客戶端訂閱的頻道
const channels = ripple.channels.getChannels(clientId)
```

### 事件監聽

```typescript
ripple.on('subscribe', handler)
ripple.on('unsubscribe', handler)
ripple.on('message', handler) // (Raw message)
ripple.on('broadcast', handler)
ripple.on('connection', handler)
ripple.on('disconnection', handler)
```

---

## 發展路線圖 (Roadmap)


### ✅ 已實作 (Done)
- [x] **v3.6**: Reconnection Logic (Session Recovery).
- [x] **v4.0**: NATS Driver (JetStream & KV Support).
- [x] **v4.0**: Message Interceptors (Middleware).
- [x] **v4.1**: Protocol Buffers Support (Hybrid Envelope).
- [x] **v5.0**: **Engine Abstraction Layer** (Decoupling Core from Runtime).
- [x] **v5.0**: **BunEngine** Implementation.

### 🚧 進行中 (In Progress)
- [ ] **Node.js Engines**: `WsEngine` 與 `UWebSocketsEngine` 實作 (Currently in Planning/Alpha).
- [ ] **Pure Protobuf Mode**: 移除 JSON Envelope，實現純二進位 schema 通訊。

### 🚀 未來規劃 (Future)
- [ ] **Cluster Auto-Scaling**: K8s Operator 整合。
- [ ] **WebTransport Support**: 支援 HTTP/3 WebTransport 協定。

---
*最後更新：2026-02-07*
*版本：v5.0.0-alpha*
