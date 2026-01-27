# 🌌 Zenith Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/zenith` (原 Flux Console) 的內部架構、全端整合模式以及即時監控機制。

---

## 1. 核心哲學：Zero-Config Control Plane

Zenith 是 Gravito 異步生態系 (`stream`, `quasar`, `pulse`) 的統一控制平面 (Control Plane)。
- **Zero Config**: 開箱即用，自動偵測本地 Redis 與 Worker。
- **Real-Time**: 基於 SSE (Server-Sent Events) 與 Redis Pub/Sub 的即時狀態同步。
- **Full-Stack Bundle**: 前後端一體化，單一 NPM 套件內含已編譯的 React SPA 與 Hono API 伺服器。

---

## 2. 模組組件分析

### 2.1 Backend (Server)
- **職責**：提供 API、管理 WebSocket/SSE 連線、協調各個 Service。
- **位置**：`src/server/index.ts`
- **技術棧**：Hono (HTTP), IORedis (Pub/Sub), SQLite/MySQL (Persistence)。
- **關鍵服務**：
  - `QueueService`: 與 `@gravito/stream` 互動，管理 Job 狀態 (Retry, Delete)。
  - `PulseService`: 聚合來自 Quasar Agent 的心跳數據。
  - `AlertService`: 評估監控規則，觸發 Slack/Discord 通知。
  - `CommandService`: 發送遠端控制指令到 Worker 節點。

### 2.2 Frontend (Client)
- **職責**：提供使用者互動介面。
- **位置**：`src/client/`
- **技術棧**：React, Vite, Tailwind CSS, TanStack Query, Recharts。
- **架構**：
  - **SPA**: 單頁應用，路由由 `react-router-dom` 管理。
  - **Live Data**: 使用 SSE (`/api/logs/stream`) 接收即時更新，並透過 React Context 分發。

### 2.3 Alerting Engine
- **職責**：監控系統健康狀態。
- **位置**：`src/server/services/AlertService.ts`
- **機制**：
  - 定義規則 (Rule)：如 "Queue Backlog > 1000", "Error Rate > 5%"。
  - **Evaluation Loop**: 每次收到新的 Metrics 時評估規則。
  - **Cooldown**: 防止警報風暴 (Alert Storm)，每個規則有獨立的冷卻時間。

---

## 3. 技術規格與設計決策

### 3.1 混合儲存策略 (Hybrid Storage)
Zenith 使用兩種儲存引擎來平衡效能與持久性：
- **Redis**: 儲存即時狀態 (Queues, Workers, Metrics)。這是 Truth of Source。
- **SQLite/MySQL**: 儲存歷史記錄 (Completed/Failed Jobs, Audit Logs)。這是為了長期查詢與審計。
- **決策**：Redis 適合高頻讀寫，但內存昂貴；SQL 適合複雜查詢與冷數據。Zenith 自動將 Redis 中的已完成作業歸檔到 SQL。

### 3.2 遠端控制協議 (Remote Control Protocol)
Zenith 可以控制遠端 Worker (如重啟、暫停)。
- **通道**: Redis Pub/Sub (`gravito:quasar:cmd:{nodeId}`).
- **安全性**: 所有指令需攜帶 HMAC 簽名 (若設定了 Secret)。
- **流程**:
  1. Zenith UI 發起請求。
  2. `CommandService` 發布 Redis 訊息。
  3. 遠端 `QuasarAgent` 收到訊息，驗證並執行。
  4. Agent 回報執行結果。

### 3.3 單體分發 (Monolithic Distribution)
為了簡化部署，前端在發布前被編譯為靜態檔案 (`dist/client`)。
- **Hono Static**: `src/server/index.ts` 使用 `serveStatic` 託管這些檔案。
- **優點**: 用戶只需 `bunx zenith start`，無需分別啟動前後端伺服器。

---

## 4. 潛在風險與效能評估

### 4.1 SSE 連接數限制
瀏覽器對同一域名的 HTTP 連接數有限制 (通常 6 個)。
- **風險**: 若開啟多個 Tab，SSE 可能會阻塞。
- **緩解**: 使用 HTTP/2 (Bun 支援) 或 SharedWorker (前端優化)。

### 4.2 歷史數據膨脹
若未設定 TTL，SQLite/MySQL 可能會無限增長。
- **機制**: 內建 `CleanupService` (需手動觸發 API `/maintenance/cleanup-archive`)，未來應自動化。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **RBAC**: 實作細粒度的使用者權限控制 (Viewer, Editor, Admin)。
2. **Auto Cleanup**: 新增 Cron Job 定期清理過期的歷史數據。

### 中期 (v1.2)
1. **Cluster Mode**: 支援多個 Zenith 實例的高可用部署 (目前依賴單一實例聚合數據)。

### 長期 (v2.0)
1. **Plugin System**: 允許開發者編寫自定義 UI 元件與後端邏輯，擴展 Zenith 功能。

---
*Created by Gravito Architect.*
