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
- **建議**：定期重啟 Worker (類似 PHP-FPM 的 `max_requests`)，或使用 PM2 管理。

### 4.2 佇列阻塞 (Head-of-Line Blocking)
在 `RedisDriver` 中，若某個 Job 處理極慢且並發度低，會阻塞後續 Job。
- **解法**：增加 `concurrency` 或將慢作業移至獨立隊列。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **Sandboxed Worker**：支援在獨立的 Thread/Worker 執行 Job，隔離上下文並防止主線程崩潰。
2. **Cron Scheduler**：增強 Scheduler 以支援分散式 Cron (避免多節點重複執行)。

### 中期 (v1.2)
1. **Horizon Dashboard**：開發類似 Laravel Horizon 的即時監控面板 (整合 `OrbitSpectrum` 或 `OrbitZenith`)。

### 長期 (v2.0)
1. **gRPC Driver**：支援透過 gRPC 直接推送作業到其他微服務，實現同步/異步混合架構。

---
*Created by Gravito Architect.*
