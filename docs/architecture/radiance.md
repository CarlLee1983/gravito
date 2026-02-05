---
title: Radiance Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# 🌌 Radiance Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/radiance` 的內部架構、廣播驅動機制以及與事件系統的深度整合。

---

## 1. 核心哲學：Zero-Overhead Broadcasting

Radiance 的設計目標是提供一個輕量、統一的實時廣播介面，同時將對核心框架的侵入降到最低。
- **Type-Safe Wrappers**：使用 `PublicChannel`, `PrivateChannel` 等強型別物件取代字串拼接，減少錯誤。
- **Driver Agnostic**：業務邏輯 (Events) 無需感知底層是 Pusher、Ably 還是 Redis。
- **Event-Driven**：深度整合 `ShouldBroadcast` 介面，讓事件類別自我描述其廣播行為。

---

## 2. 模組組件分析

### 2.1 OrbitRadiance (Facade)
- **職責**：Orbit 入口點，負責初始化驅動並註冊到核心。
- **位置**：`src/OrbitRadiance.ts`
- **機制**：
  - 根據配置實例化特定的 Driver (Pusher/Ably/Redis)。
  - 將 `BroadcastManager` 注入到 DI 容器。
  - **Hooking**：透過 `core.events.setBroadcastManager` 攔截所有事件分發，自動處理實現了 `ShouldBroadcast` 的事件。

### 2.2 BroadcastManager (Orchestrator)
- **職責**：協調廣播流程與權限驗證。
- **位置**：`src/BroadcastManager.ts`
- **關鍵流程**：
  1. **Broadcast**：接收事件 → 檢查 Driver → 呼叫 `driver.broadcast()`。
  2. **Authorization**：
     - 檢查 `authorizeChannel` 回調 (使用者自定義邏輯)。
     - 委派給 Driver 生成簽名 (如 Pusher 的 HMAC)。

### 2.3 Drivers (Adapters)
- **職責**：適配第三方服務的 SDK。
- **介面**：`BroadcastDriver`
- **實作**：
  - `PusherDriver`: 使用 `pusher` Node.js SDK。
  - `AblyDriver`: 使用 `ably` REST API。
  - `RedisDriver`: 使用 `ioredis` 的 `PUBLISH` 指令 (適用於 Socket.io 服務端)。
  - `WebSocketDriver`: 簡單的內建 WebSocket 實作 (僅供開發/測試)。

### 2.4 Channels (Value Objects)
- **職責**：定義頻道的類型與名稱。
- **位置**：`src/channels/Channel.ts`
- **類型**：
  - `PublicChannel`: 無需驗證。
  - `PrivateChannel`: 需驗證 (Pusher `private-` 前綴)。
  - `PresenceChannel`: 需驗證且包含用戶資訊 (Pusher `presence-` 前綴)。

---

## 3. 技術規格與設計決策

### 3.1 事件整合模式
Radiance 不強制要求使用者手動呼叫 `broadcast()`。
- **自動化**：只要 Event 類別實作了 `broadcastOn()` 方法，Gravito 的事件分發器 (`EventManager`) 就會自動觸發廣播。
- **優點**：解耦了業務邏輯與廣播邏輯。Controller 只需要 `dispatch(new OrderPlaced(order))`，無需關心是否需要推送到前端。

### 3.2 權限驗證架構
對於私有頻道，客戶端 (Socket.io/Pusher-js) 會向 `/broadcasting/auth` 發送請求。
- **流程**：
  1. `OrbitRadiance` 雖然不直接提供 HTTP Endpoint (這是 `OrbitLuminosity` 的職責)，但它提供了 `authorizeChannel` 方法。
  2. 開發者需要在 Controller 中呼叫此方法，並回傳 Driver 生成的簽名。
  3. 這種分離確保了 Radiance 不依賴特定的 HTTP 框架。

### 3.3 Redis Driver 的角色
Redis Driver 並非直接推送到瀏覽器，而是作為 Pub/Sub 管道，將訊息傳遞給獨立運行的 Socket 伺服器 (如 Laravel Echo Server 或自建的 Socket.io 服務)。
- **協議**：發送 JSON 格式的 payload，包含 `channel`, `event`, `data`。

---

## 4. 潛在風險與效能評估

### 4.1 廣播延遲
若事件處理器是同步執行的，廣播操作 (HTTP 請求到 Pusher) 會阻塞主流程。
- **建議**：對於高並發場景，應將廣播事件放入 Queue (`ShouldQueue`)，由 Worker 異步處理。

### 4.2 權限驗證瓶頸
大量的 `authorizeChannel` 請求 (例如頁面重整時所有用戶同時重連) 可能導致瞬間高負載。
- **優化**：考慮在前端實作重連退避 (Backoff) 策略，或在後端快取權限結果。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **Server-Sent Events (SSE) Driver**：新增原生的 SSE 支援，無需依賴第三方服務即可實現單向推送。
2. **Socket.io Integration**：提供官方的 Socket.io 適配器與前端整合指南。

### 中期 (v1.2)
1. **Batch Broadcasting**：對於高頻事件，支援在 Driver 層進行批次發送 (若 Driver 支援)。

### 長期 (v2.0)
1. **Unified Presence**：在 Redis Driver 中實作分散式的 Presence 管理，不依賴 Pusher 也能獲取「在線用戶列表」。

---
*Created by Gravito Architect.*


## 快速開始

> 內容補齊中...


## 架構設計

> 內容補齊中...


## API 參考

> 內容補齊中...
