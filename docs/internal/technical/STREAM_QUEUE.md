# Stream: The High-Performance Queueing Orbit

**Version**: 2.0.2
**Module**: `@gravito/stream`
**Focus**: Job Queues, Workers, Multi-broker Support, Distributed Scheduling

---

## 1. 核心概念 (Core Concepts)

Stream 是 Gravito 的隊列子系統。它採用單一抽象介面，支援從本地開發到雲端生產環境的無縫切換。

*   **Job**: 包含執行邏輯與數據的任務單元。
*   **Worker**: 獨立運行的進程，用於監聽並執行隊列中的 Job。
*   **Broker**: 持久化任務的介質。

---

## 2. 經紀人適配器 (Brokers)

Stream 支援以下傳輸介質：
*   **Atlas (Database)**: 預設驅動，使用資料庫表存儲任務，無需額外基礎設施。
*   **Redis**: 高性能、低延遲的首選。支援優先級與延遲任務。
*   **Kafka**: 適用於大規模數據串流與高吞吐量場景。
*   **SQS**: 整合 AWS Simple Queue Service，適合 Serverless 架構。

---

## 3. 關鍵特性

### 3.1 延遲與重試 (Delay & Retries)
*   **延遲任務**: 支援精確到秒的延遲執行。
*   **自動重試**: 支援自定義重試次數與 **指數退避 (Exponential Backoff)** 策略。

### 3.2 任務調度 (Scheduling)
集成 `cron-parser`，支援類 Cron 的定時任務調度。

```typescript
// 定義定時任務
schedule.command('cleanup:logs').daily().at('01:00');
```

### 3.3 負載保護 (Backpressure)
透過 `p-limit` 限制 Worker 的並發處理數，防止任務堆積耗盡系統資源。

---

## 4. 監控與觀測 (Observability)

Stream 與 **Gravito Zenith** 深度整合：
*   **實時追蹤**: 在管理面板查看任務狀態（Waiting, Active, Failed, Completed）。
*   **健康指標**: 輸出隊列堆積深度與處理成功率。
