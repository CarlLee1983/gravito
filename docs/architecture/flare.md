---
title: Flare Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# 🌌 Flare Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/flare` 的內部架構、多通道通知路由機制以及與隊列系統的整合。

---

## 1. 核心哲學：Multi-Channel Notification Center

Flare 的設計靈感來自 Laravel Notification，旨在提供一個統一的介面來發送訊息到各種通道 (Mail, Slack, SMS 等)。
- **Unified API**：開發者只需定義一個 `Notification` 類別，即可描述該通知在不同通道上的表現形式。
- **Zero Overhead**：核心僅負責路由與分發，具體的發送邏輯委派給底層驅動 (如 `@gravito/mail`)。
- **Queueable**：支援將發送任務推送到 `@gravito/stream` 背景處理，避免阻塞請求。

---

## 2. 快速開始

### 安裝
```bash
bun add @gravito/flare
```

### 基本用法
```typescript
import { Notification, NotificationManager } from '@gravito/flare';

class WelcomeNotification extends Notification {
  via() { return ['mail']; }
  toMail() { return { subject: 'Welcome', body: 'Hello!' }; }
}

const manager = new NotificationManager();
await manager.send(user, new WelcomeNotification());
```

## 3. 模組組件分析

### 2.1 OrbitFlare (Orchestrator)
- **職責**：作為 Orbit 插件，負責初始化與安裝。
- **位置**：`src/OrbitFlare.ts`
- **機制**：
  - 根據配置 (`enableMail`, `enableSlack`) 註冊對應的 `NotificationChannel`。
  - 將 `NotificationManager` 註冊到 IoC 容器。
  - **Auto-Discovery**：嘗試從容器中解析 `mail`, `db`, `broadcast`, `queue` 等相依服務，若存在則自動整合。

### 2.2 NotificationManager (Router)
- **職責**：決定通知應發送到哪些通道，並協調發送過程。
- **位置**：`src/NotificationManager.ts`
- **流程**：
  1. 呼叫 `notification.via(notifiable)` 獲取目標通道列表 (如 `['mail', 'slack']`)。
  2. **Hooks**：觸發 `notification:sending` 事件。
  3. **Queue Check**：若通知實作了 `ShouldQueue` 介面，則序列化並推送到隊列。
  4. **Dispatch**：若非隊列模式，則並行 (`sendParallel`) 或依序 (`sendSequential`) 呼叫各通道的 `send` 方法。
  5. **Hooks**：觸發 `notification:sent` 事件。

### 2.3 Channels (Adapters)
- **職責**：將通用的 `Notification` 物件轉換為特定平台的 Payload 並發送。
- **位置**：`src/channels/`
- **實作**：
  - `MailChannel`: 呼叫 `notification.toMail()` 並委派給 `MailService`。
  - `DatabaseChannel`: 呼叫 `notification.toDatabase()` 並寫入 `notifications` 資料表。
  - `SlackChannel`: 呼叫 `notification.toSlack()` 並發送 Webhook。

### 2.4 Notification (Base Class)
- **職責**：定義通知的內容與路由邏輯。
- **位置**：`src/Notification.ts`
- **特性**：
  - `via(notifiable)`: 動態決定通道 (例如：若用戶未驗證信箱，則不發送郵件)。
  - `toXxx(notifiable)`: 定義各通道的具體內容。

---

## 4. 技術規格與架構設計

### 4.1 隊列整合 (Queue Integration)
Flare 不直接依賴 `@gravito/stream`，而是透過 `QueueService` 介面進行鬆耦合。
- **序列化**：為了將 `Notification` 物件放入隊列，Flare 使用 `deepSerialize` 將其轉換為純 JSON。這意味著 Notification 類別必須是無狀態的 (Stateless) 或只包含可序列化的屬性。
- **反序列化**：Worker 取出任務時，會重新建構 Notification 實例 (需要 Worker 端的類別定義)。

### 4.2 批次發送 (Batch Sending)
為了優化效能，`NotificationManager` 提供了 `sendBatch` 與 `sendBatchStream`。
- **用途**：發送系統公告給 10,000 名用戶。
- **實作**：控制並發度 (Concurrency Limit)，避免瞬間淹沒下游服務 (如 SMTP Server)。

### 4.3 可觀測性 (Observability)
Flare 內建了 `NotificationMetricsCollector`。
- **指標**：追蹤每個通道的成功率、延遲與失敗原因。
- **Prometheus**：提供 `toPrometheusFormat` 導出器，方便整合 Grafana。

---

## 5. 潛在風險與效能評估

### 5.1 序列化限制
若 `Notification` 建構子包含無法序列化的物件 (如 DB Connection 或 Socket)，隊列發送會失敗。
- **建議**：Notification 應只包含 ID 或純資料，在 `toMail` 等方法中再進行資料庫查詢 (Lazy Loading)。

### 5.2 通道阻塞
若某個通道 (如 Slack Webhook) 回應極慢且未設定超時，會拖慢整個 `send` 過程 (即使是並行發送，Promise.all 也會等待最慢的)。
- **解法**：`SlackChannel` 等內建通道應實作嚴格的 Timeout 機制。

---

## 6. API 參考

### NotificationManager
- `send(notifiable: any, notification: Notification): Promise<void>`
- `sendBatch(notifiables: any[], notification: Notification): Promise<void>`

### Notification
- `via(notifiable: any): string[]`
- `toMail?(notifiable: any): MailMessage`
- `toSlack?(notifiable: any): SlackMessage`

---

## 7. 後續優化建議
