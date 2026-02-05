---
title: Horizon Architecture 技術架構規格書
version: 1.1.0
status: Stable
tier: C
last_updated: 2026-01-31
---

# 🌌 Horizon Architecture 技術架構規格書 (v1.1)

本文件詳述 `@gravito/horizon` 的內部架構、排程器 (Scheduler) 的設計模式以及分散式鎖定機制。

---

## 1. 核心哲學：Distributed Task Scheduler

Horizon 是 Gravito 的任務排程核心，旨在解決在多伺服器環境下執行 Cron Job 的難題。
- **Fluent API**：提供直觀的鏈式調用 (`daily().at('03:00')`) 來定義排程，取代晦澀的 Cron 表達式。
- **Distributed Locking**：確保同一時間、同一任務只會在一個節點上執行，防止重複跑批。
- **Node Targeting**：支援指定任務只在特定角色的節點 (如 `worker`) 執行。

---

## 2. 模組組件分析

### 2.1 OrbitHorizon (Entrypoint)
- **職責**：Orbit 插件入口，負責初始化 Scheduler 與 Lock Manager。
- **位置**：`src/OrbitHorizon.ts`
- **機制**：
  - 根據配置選擇鎖驅動 (`cache` 或 `memory`)。若選擇 `cache`，則依賴 `@gravito/stasis`。
  - 初始化 `SchedulerManager` 並注入到 IoC 容器與 Context。

### 2.2 SchedulerManager (Engine)
- **職責**：管理任務註冊與執行循環。
- **位置**：`src/SchedulerManager.ts`
- **流程**：
  1. `run(date)`: 每分鐘被觸發一次 (由系統 Cron 或 Daemon 呼叫)。
  2. **Evaluation**: 遍歷所有任務，檢查 Cron 表達式是否匹配當前時間 (`isDue`)。
  3. **Filtering**: 檢查 `nodeRole` 是否匹配當前節點。
  4. **Locking**: 嘗試獲取分散式鎖 (`lockManager.acquire`)。
  5. **Execution**: 執行任務 Callback 或 Shell Command。

### 2.3 TaskSchedule (Builder)
- **職責**：定義單一任務的屬性。
- **位置**：`src/TaskSchedule.ts`
- **特性**：
  - **Constraints**: `onOneServer`, `withoutOverlapping`, `onNode`, `timezone`。
  - **Reliability**: `retry`, `timeout`。
  - **Hooks**: `onSuccess`, `onFailure`。

### 2.4 CronParser (Evaluator)
- **職責**：解析 Cron 表達式並判斷是否執行。
- **位置**：`src/CronParser.ts`
- **優化**：
  - **SimpleCronParser**: 針對簡單的標準表達式 (`* * * * *`) 實作了零依賴的解析器。
  - **Fallback**: 對於複雜表達式 (如 `L`, `W`)，動態加載 `cron-parser` 庫。
  - **Caching**: 對解析結果進行 LRU 快取，減少重複計算。

---

## 3. 技術規格與設計決策

### 3.1 分散式鎖 (Distributed Locking)

Horizon 使用兩種鎖機制來確保任務正確執行：

#### 3.1.1 時間窗口鎖 (Time-window Lock)
用於 `onOneServer()` 功能，防止多個 Worker 在同一分鐘內執行同一個排程任務：
- **Lock Key**: `task:{name}:{timestamp_minute}`
- **TTL**: 預設 300 秒，或是任務預估執行時間
- **原子性**: 依賴底層 Storage (Redis `SET NX` 或 Cache Atomic Add) 保證互斥
- **釋放策略**: TTL 自動過期，不主動釋放（防止同一分鐘內重複執行）

#### 3.1.2 執行鎖 (Execution Lock)
用於 `withoutOverlapping()` 功能，防止任務在前次執行未完成時重複觸發：
- **Lock Key**: `task:running:{name}`
- **TTL**: 預設 3600 秒（1 小時），可自訂
- **原子性**: 使用 `forceAcquire` 強制取得，確保任務開始時一定有鎖
- **釋放策略**: 任務完成後主動釋放，失敗時也釋放
- **容錯**: TTL 作為保底機制，防止鎖永久占用

兩種鎖可以同時使用，提供全面的執行保護：
```typescript
scheduler.task('heavy-task', callback)
  .everyMinute()
  .onOneServer()         // 時間窗口鎖
  .withoutOverlapping()  // 執行鎖
```

### 3.2 節點角色 (Node Roles)
在微服務架構中，我們可能不希望 API 節點執行重型 Cron Job。
- **機制**: `OrbitHorizon` 啟動時讀取 `config.scheduler.nodeRole`。
- **比對**: `scheduler.task(...).onNode('worker')`，若當前節點角色不符，則 `isDue` 直接返回 false。

### 3.3 執行模式
Horizon 支援兩種執行模式：
1. **Cron Mode**: 系統 Crontab 每分鐘呼叫一次 `bun run gravito schedule:run`。這是最穩定的方式。
2. **Daemon Mode**: `bun run gravito schedule:work` 啟動一個長執行進程，內部使用 `setInterval` 每分鐘觸發。

---

## 4. 潛在風險與效能評估

### 4.1 時鐘偏移 (Clock Drift)
若不同伺服器的系統時間不一致，可能導致鎖失效或任務漏跑。
- **要求**: 所有伺服器必須啟用 NTP 同步。
- **容錯**: 鎖的 Key 包含分鐘級時間戳，若偏移超過 1 分鐘，可能導致重複執行。

### 4.2 鎖釋放
目前設計中，鎖在任務執行期間不會釋放，而是等待 TTL 過期。
- **原因**: 防止在同一分鐘內，任務執行極快 (1s)，鎖釋放後，另一台慢半拍的伺服器又搶到鎖並執行。
- **影響**: 任務頻率最高只能是每分鐘一次 (Cron 限制)。

---

## 5. 後續優化建議

### ✅ 已完成 (v1.1)
1. **Overlapping Control**：已實作 `withoutOverlapping()`，在任務尚未結束前，即使下一分鐘到了也不執行。
   - 使用執行鎖 (`task:running:{name}`) 追蹤任務狀態
   - 支援自訂 TTL，預設 3600 秒
   - 任務完成後主動釋放鎖
   - 新增 `scheduler:task:skipped` Hook 事件

### 短期 (v1.2)
1. **Sub-minute Scheduling**：支援秒級排程 (如每 10 秒)，需改變 Loop 機制與鎖策略。

### 中期 (v1.3)
1. **Dashboard**：整合到 `Zenith` 控制台，顯示排程任務的下次執行時間與歷史結果。

### 長期 (v2.0)
1. **Event Trigger**：除了時間觸發，支援事件觸發 (`scheduler.onEvent('user.created')`)，實現類似 IFTTT 的邏輯。

---
*Created by Gravito Architect.*


## 快速開始

> 內容補齊中...


## 架構設計

> 內容補齊中...


## API 參考

> 內容補齊中...
