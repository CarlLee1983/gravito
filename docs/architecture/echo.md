# 🌌 Echo Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/echo` 的內部架構、Webhook 接收與發送機制以及重試與回放策略。

---

## 1. 核心哲學：Unified Webhook Orchestration

Echo 旨在成為 Gravito 生態系的 Webhook 統一處理中心。
- **Secure Reception**：提供標準化的簽章驗證 (HMAC) 與時間戳檢查，防止重放攻擊。
- **Reliable Dispatch**：內建指數退避重試與死信隊列 (DLQ)，確保外發 Webhook 的最終一致性。
- **Observability**：深度整合 OpenTelemetry 與 Prometheus，提供全鏈路的 Webhook 追蹤。

---

## 2. 模組組件分析

### 2.1 OrbitEcho (Orchestrator)
- **職責**：作為 Orbit 插件，負責初始化接收器與發送器。
- **位置**：`src/OrbitEcho.ts`
- **機制**：
  - 將 `WebhookReceiver` 與 `WebhookDispatcher` 註冊到 IoC 容器。
  - 註冊中介軟體，將 `echo` 實例注入到請求 Context。

### 2.2 WebhookReceiver (Ingress)
- **職責**：處理入站 Webhook。
- **位置**：`src/receive/WebhookReceiver.ts`
- **流程**：
  1. **Provider Resolution**：根據名稱 (如 'stripe') 查找已註冊的 Provider。
  2. **Verification**：呼叫 Provider 的 `verify` 方法驗證簽章。
  3. **Storage**：若配置了 `WebhookStore`，將原始事件持久化 (Audit Trail)。
  4. **Routing**：分發事件到註冊的 Handler (`on` 或 `onAll`)。

### 2.3 WebhookDispatcher (Egress)
- **職責**：發送出站 Webhook。
- **位置**：`src/send/WebhookDispatcher.ts`
- **特性**：
  - **HMAC Signing**：自動計算 Payload 簽章。
  - **Retry Loop**：內建重試邏輯，支援 `retry-after` 標頭或自定義退避策略。
  - **Batching**：支援 `dispatchBatch` 進行並發發送。

### 2.4 WebhookReplayService (Recovery)
- **職責**：重發歷史事件。
- **位置**：`src/replay/WebhookReplayService.ts`
- **用途**：當下游服務故障修復後，可從 Store 中查詢失敗的 Webhook 並重新發送。

---

## 3. 技術規格與設計決策

### 3.1 Provider 抽象層
Echo 定義了 `WebhookProvider` 介面，標準化了不同服務商的驗證邏輯。
- **內建支援**：Stripe, GitHub, Shopify, Slack, Twilio 等。
- **擴展性**：開發者可透過 `registerProviderType` 輕鬆新增自定義 Provider。

### 3.2 可觀測性 (Observability)
Echo 不依賴特定的監控工具，而是定義了 `MetricsProvider` 與 `Tracer` 介面。
- **Metrics**：追蹤 `incoming_total`, `verification_failures`, `outgoing_duration` 等指標。
- **Tracing**：為每個 Webhook 處理流程建立 Span，便於分佈式追蹤。

### 3.3 死信隊列 (DLQ)
當重試耗盡仍無法送達時，Dispatcher 會將事件寫入 DLQ。
- **介面**：`DeadLetterQueue`。
- **實作**：預設提供 `MemoryDeadLetterQueue`，生產環境建議實作基於 Redis 或 SQS 的 DLQ。

---

## 4. 潛在風險與效能評估

### 4.1 驗證效能
`SignatureValidator` 使用 `crypto.timingSafeEqual` 防止時序攻擊。
- **影響**：這是 CPU 密集型操作，但在 Node.js/Bun 中經過優化，通常不是瓶頸。

### 4.2 儲存壓力
若啟用 `WebhookStore` 且 Webhook 流量巨大，資料庫可能成為瓶頸。
- **建議**：使用非同步寫入或取樣記錄策略。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **Request Buffer**：在驗證前緩存原始 Body，防止某些框架自動解析 JSON 導致簽章驗證失敗。
2. **Circuit Breaker**：為 Dispatcher 新增熔斷機制，防止對故障的下游服務持續發送請求。

### 中期 (v1.2)
1. **Key Rotation**：支援 Provider 密鑰的動態輪換，無需重啟應用。

### 長期 (v2.0)
1. **Webhook Proxy**：提供獨立的 Proxy 服務，將內網開發環境暴露給外部 Webhook (類似 ngrok 但專為 Webhook 優化)。

---
*Created by Gravito Architect.*
