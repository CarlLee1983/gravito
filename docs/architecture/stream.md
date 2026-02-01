---
title: Stream Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# 🌌 Stream Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/stream` 的內部架構、異步作業處理機制以及與 Gravito 生態系的整合。

---

## 1. 核心哲學：Universal Job Processing

Stream 受到 Laravel Queue 的啟發，旨在提供一個統一的背景作業處理介面，無論底層基礎設施如何。
- **Polyglot Drivers**：透過統一的 `QueueDriver` 介面，支援從 Memory 到 Kafka 的無縫遷移。
- **Developer Experience**：以 Class 為基礎的 Job 定義，支援 Fluent API (`delay`, `backoff`) 配置。
- **Resilience**：內建重試 (Retry)、死信隊列 (DLQ) 與速率限制 (Rate Limiting)，確保作業可靠執行。

---

## 2. 模組組件分析

### 2.1 QueueManager (Orchestrator)
- **職責**：管理多個連線 (Connections) 與驅動 (Drivers)。
- **位置**：`src/QueueManager.ts`
- **機制**：
  - 維護 `drivers` Map，根據配置懶加載特定驅動 (如 `SQSDriver`)。
  - 協調 Job 的序列化 (`JobSerializer`) 與持久化 (`PersistenceAdapter`)。
  - 提供高階 API：`push`, `pop`, `pushMany`。

### 2.2 Drivers (Adapters)
- **職責**：適配不同的訊息代理 (Message Broker)。
- **位置**：`src/drivers/`
- **實作**：
  - `RedisDriver`: 支援優先順序、延遲作業 (ZSET) 與原子操作 (Lua Scripts)。
  - `SQSDriver`: 適配 AWS SQS，支援長輪詢 (Long Polling) 與可見性超時 (Visibility Timeout)。
  - `MemoryDriver`: 用於測試與開發的暫態隊列。

### 2.3 Consumer (Worker Engine)
- **職責**：從隊列拉取作業並執行。
- **位置**：`src/Consumer.ts`
- **演算法**：
  - **Adaptive Polling**：當隊列為空時，逐漸增加輪詢間隔 (`backoffMultiplier`)，減少空轉 CPU。
  - **Concurrency Control**：使用 `p-limit` 限制同時執行的作業數量。
  - **Group Locking**：若設定 `groupJobsSequential`，同一 `groupId` 的作業會被序列化執行，保證 FIFO。

### 2.4 Worker (Executor)
- **職責**：執行單一作業的生命週期。
- **位置**：`src/Worker.ts`
- **流程**：
  1. 檢查 `maxAttempts`。
  2. 設定執行超時 (`Promise.race`)。
  3. 呼叫 `job.handle()`。
  4. 若失敗，判斷是否重試或標記為永久失敗 (`failed`)。

---

## 3. 技術規格與設計決策

### 3.1 Job 序列化策略
Stream 支援多種序列化方式：
- **ClassNameSerializer** (Default): 僅儲存 `className` 與屬性。Worker 需註冊 Job Class 才能反序列化。適合單體應用。
- **JsonSerializer**: 儲存完整的 Job 結構。適合微服務架構，但無法還原方法 (Methods)。
- **MessagePack**: 二進制序列化，體積更小。

### 3.2 持久化與審計 (Persistence)
為了滿足企業級審計需求，Stream 提供了 `PersistenceAdapter`。
- **功能**：將作業的完整生命週期 (Enqueued, Processing, Completed, Failed) 記錄到 SQL 資料庫。
- **效能**：使用 `BufferedPersistence` 進行批次寫入，避免拖慢主流程。

### 3.3 批量操作 (Batch Operations)
為了優化高吞吐量場景，`pushMany` 與 `popMany` 被設計為一等公民。
- **Push**: 將多個作業合併為一次 Redis `RPUSH` 或 SQS `SendMessageBatch`。
- **Pop**: 一次拉取多個作業，減少網路往返 (RTT)。

---

## 4. 潛在風險與效能評估

### 4.1 記憶體洩漏 (Memory Leak)
在長執行的 Worker Process 中，若 Job 實例化後未被釋放 (如閉包引用)，會導致 OOM。

#### 已識別的風險來源
1. **Group Limiters 累積**: `groupLimiters` Map 在高頻率不同 `groupId` 場景下會無限增長
2. **Job 閉包引用**: Job 物件在閉包中被引用，延長 GC 周期
3. **BufferedPersistence 緩衝區**: 資料庫連線中斷時 buffer 可能無限增長

#### ✅ 已實作的修復 (v1.0.1)
- **自動清理機制**: 新增 `groupLimiterLastUsed` 追蹤，每 30 秒清理超過 60 秒未使用的 group limiters
- **maxRequests 機制**: 類似 PHP-FPM 的 `max_requests`，可設定處理上限後自動停止 worker
  ```typescript
  const consumer = new Consumer(manager, {
    maxRequests: 10000, // 處理 10000 個 jobs 後自動停止
    // ...
  })
  ```

#### 建議
- 定期重啟 Worker (類似 PHP-FPM 的 `max_requests`)，或使用 PM2 管理
- 監控記憶體使用量，設定告警閾值

### 4.2 佇列阻塞 (Head-of-Line Blocking)
在 `RedisDriver` 中，若某個 Job 處理極慢且並發度低，會阻塞後續 Job。

#### 已識別的風險來源
1. **同步 Pop 模型**: 若第一個 queue 有 job，後面的 queue 完全被忽略
2. **Group Sequential 的全局鎖**: 同一 `groupId` 的 job 被強制序列化
3. **優先級遍歷成本**: 每次 pop 都要遍歷所有優先級

#### 解法
- 增加 `concurrency` 或將慢作業移至獨立隊列
- 使用獨立的 Consumer 實例處理不同優先級

---

## 5. 後續優化建議

### ✅ 已完成 (v1.0.1)
1. **Memory Leak 修復**: 自動清理 group limiters，避免記憶體累積
2. **maxRequests 機制**: 支援設定處理上限後自動停止，確保 worker 定期重啟

### 短期 (v1.1)
1. **Sandboxed Worker** 🔧 規劃中
   - 在獨立的 Thread/Worker 執行 Job，隔離上下文並防止主線程崩潰
   - 技術選型: Node.js `worker_threads` 或 `child_process.fork`
   - 預期效益: 提升穩定性，防止單一 job OOM 導致整個 process 崩潰
   - 技術挑戰: 序列化成本、共享狀態處理、除錯困難

2. **Cron Scheduler 分散式鎖** 🔧 規劃中
   - 增強 Scheduler 以支援分散式 Cron (避免多節點重複執行)
   - 實作方式: Redlock 風格的分散式鎖 + Leader Election
   - 預期效益: 確保 cron job 在多節點環境下只執行一次
   - 技術挑戰: 時鐘漂移、網路分區、鎖續約

### 中期 (v1.2)
1. **Horizon Dashboard** 📋 待實作
   - 開發類似 Laravel Horizon 的即時監控面板
   - 功能: 即時隊列狀態、Worker 健康監控、Job 詳情瀏覽與重試、效能趨勢圖表
   - 技術棧: REST API + WebSocket + React/Vue 前端
   - 整合: `OrbitSpectrum` 或 `OrbitZenith`

### 長期 (v2.0)
1. **gRPC Driver** 📋 待實作
   - 支援透過 gRPC 直接推送作業到其他微服務，實現同步/異步混合架構
   - 使用場景: 跨服務 Job 派發、高效能二進制協議、強型別契約
   - 技術挑戰: Proto 版本管理、連線管理、錯誤處理

---

## 6. 變更歷史

### v1.0.1 (2026-01-31)
- ✅ 修復 `groupLimiters` 記憶體洩漏問題
- ✅ 新增 `maxRequests` 選項支援定期重啟 worker
- ✅ 完成深度架構分析與優化規劃 (由 Opus 4.5 分析，Sonnet 4.5 實作)

---
*Created by Gravito Architect.*
