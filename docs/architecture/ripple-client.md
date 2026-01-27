# 🌌 Ripple Client Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/ripple-client` 的內部架構、頻道訂閱機制以及框架適配策略。

---

## 1. 核心哲學：Framework-Agnostic Connectivity

Ripple Client 旨在提供一個通用的 WebSocket 客戶端，連接 Gravito 的後端廣播系統 (`@gravito/ripple` 或 `@gravito/radiance`)。
- **Universal JS**：可在瀏覽器、Node.js、Bun 或 React Native 環境運行。
- **Robustness**：內建自動重連、心跳檢測與身份驗證重試。
- **Type-Safe** (v1.1)：透過 `ChannelEventMap` 提供完整的事件類型推斷。
- **DX Optimized**：提供 React Hook (`useChannel`) 與 Vue Composable (`usePresence`)，讓整合變得無感。

---

## 2. 模組組件分析

### 2.1 RippleClient (Core)
- **職責**：管理 WebSocket 連接生命週期。
- **位置**：`src/RippleClient.ts`
- **狀態機**：`disconnected` -> `connecting` -> `connected` -> `reconnecting`。
- **機制**：
  - **Socket ID**：連接成功後，伺服器會下發唯一的 `socket_id`，用於私有頻道簽名。
  - **Reconnection**：採用指數退避 (Exponential Backoff) 策略，防止伺服器重啟時遭受連線風暴。
  - **Binary Support** (v1.1)：支援發送與接收 `ArrayBuffer` 資料。
  - **State Management** (v1.1)：`ConnectionStateManager` 提供訂閱模式的狀態變更通知 (`onStateChange`)。

### 2.2 Channel System
- **職責**：管理訂閱與事件分發。
- **位置**：`src/Channel.ts`
- **類型**：
  - `Channel`: 公開頻道。
  - `PrivateChannel`: 需授權，訂閱前會自動呼叫 `/broadcasting/auth`。
  - `PresenceChannel`: 需授權，額外追蹤 `members` (在線用戶列表)。

### 2.3 Framework Adapters
- **職責**：提供框架特定的綁定。
- **React**: `src/react.tsx` (Provider + Hooks)。
- **Vue**: `src/vue.ts` (Provide/Inject + Composables)。

---

## 3. 技術規格與設計決策

### 3.1 認證流程 (Authentication Flow)
對於私有與存在頻道，Client 自動處理簽名請求。
1. `client.private('orders')` 被呼叫。
2. Client 檢查狀態，若 `connected` 且有 `socket_id`，發起 POST 請求至 `authEndpoint`。
3. Payload: `{ socket_id: "...", channel_name: "private-orders" }`。
4. 伺服器回傳簽名。
5. Client 發送 WebSocket `subscribe` 訊息帶上簽名。

### 3.2 訊息分發 (Event Dispatching)
- **格式**：伺服器推送的 JSON 包含 `{ channel, event, data }`。
- **路由**：`RippleClient` 接收後，根據 `channel` 找到對應的 `Channel` 實例，再呼叫 `_dispatch(event, data)`。

### 3.3 存在感知 (Presence Awareness)
- **Sync**: `PresenceChannel` 維護本地 `members` 陣列。
- **Events**: 自動處理 `join`, `leave` 事件並更新陣列，隨後觸發開發者註冊的 callback。

---

## 4. 潛在風險與效能評估

### 4.1 連接洩漏
在 SPA (Single Page Application) 中，若組件卸載時未取消訂閱，可能導致記憶體洩漏與頻寬浪費。
- **React/Vue**: 提供的 Hooks 自動處理了 `useEffect` / `onUnmounted` 的清理邏輯 (`channel.stopListening` / `client.leave`)。
- **Vanilla**: 開發者需手動管理。

### 4.2 認證併發
若同時訂閱 10 個私有頻道，會瞬間發起 10 個 HTTP Auth 請求。
- **優化**：目前未實作批次認證。未來可考慮將多個頻道的認證合併為一個請求。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **Batch Auth**：支援一次請求認證多個頻道，減少 HTTP 往返。
2. **Offline Buffer**：在斷線期間緩衝 `whisper` (客戶端訊息)，連線後自動發送。
3. **Binary Support (Completed)**：支援接收 `ArrayBuffer` 或 `Blob` 數據。

### 長期 (v2.0)
1. **End-to-End Encryption**：支援在客戶端進行端對端加密 (E2EE)，確保訊息即使經過伺服器也是密文。

---
*Created by Gravito Architect.*
