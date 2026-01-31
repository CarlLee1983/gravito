---
title: Echo Architecture 技術架構規格書
version: 1.2.0
status: Stable
tier: C
last_updated: 2026-01-31
---

# 🌌 Echo Architecture 技術架構規格書 (v1.2)

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

### 2.5 RequestBufferMiddleware (v1.1)
- **職責**：在驗證前緩存原始 Request Body。
- **位置**：`src/middleware/RequestBufferMiddleware.ts`
- **機制**：
  - 攔截請求並緩存未解析的原始 body。
  - 防止框架自動解析 JSON 導致簽章驗證失敗。
  - 支援大小限制（預設 10MB）與 Content-Type 過濾。
  - 自動整合到 OrbitEcho（預設啟用）。

### 2.6 CircuitBreaker (v1.1)
- **職責**：保護下游服務免於雪崩效應。
- **位置**：`src/resilience/CircuitBreaker.ts`
- **機制**：
  - 實作完整狀態機（CLOSED → OPEN → HALF_OPEN）。
  - 為每個目標 host 建立獨立的熔斷器。
  - 可配置失敗閾值（預設 5 次）與恢復閾值（預設 2 次）。
  - 整合到 `WebhookDispatcher`，自動保護所有出站 Webhook。

### 2.7 KeyRotationManager (v1.2)
- **職責**：管理 Provider 密鑰的動態輪換。
- **位置**：`src/rotation/KeyRotationManager.ts`
- **機制**：
  - 支援多版本密鑰管理（主密鑰 + 多個輔助密鑰）。
  - Grace Period 機制（預設 24 小時），確保輪換期間的平滑過渡。
  - 自動清理過期密鑰。
  - `WebhookReceiver` 自動嘗試所有活動密鑰進行驗證。

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

### 3.4 Request Buffering (v1.1)
為解決框架自動解析導致簽章失敗的問題，Echo 提供 Request Buffer 中介軟體。
- **運作方式**：在驗證前讀取並緩存原始 body。
- **配置選項**：
  - `enabled`: 是否啟用（預設 `true`）。
  - `maxBodySize`: 最大 body 大小（預設 10MB）。
  - `skipContentTypes`: 跳過的內容類型（預設跳過 multipart/form-data）。

### 3.5 Circuit Breaker Pattern (v1.1)
為防止下游服務故障導致系統雪崩，Dispatcher 整合了熔斷器機制。
- **狀態轉換**：
  - **CLOSED**：正常運作，所有請求通過。
  - **OPEN**：失敗過多，立即拒絕請求。
  - **HALF_OPEN**：嘗試恢復，允許有限請求測試服務狀態。
- **隔離策略**：每個目標 host 使用獨立的熔斷器，避免單點故障影響全域。

### 3.6 Key Rotation Strategy (v1.2)
支援 Provider 密鑰的動態輪換，無需重啟應用。
- **多密鑰驗證**：在輪換期間，系統同時接受新舊密鑰。
- **Grace Period**：舊密鑰在輪換後保留 24 小時（可配置），確保正在傳輸的 Webhook 不會失敗。
- **自動清理**：過期密鑰會自動從系統中移除。

---

## 4. 潛在風險與效能評估

### 4.1 驗證效能
`SignatureValidator` 使用 `crypto.timingSafeEqual` 防止時序攻擊。
- **影響**：這是 CPU 密集型操作，但在 Node.js/Bun 中經過優化，通常不是瓶頸。

### 4.2 儲存壓力
若啟用 `WebhookStore` 且 Webhook 流量巨大，資料庫可能成為瓶頸。
- **建議**：使用非同步寫入或取樣記錄策略。

### 4.3 Request Buffering 效能影響 (v1.1)
Request Buffer 需要額外的記憶體和時間來緩存原始 body。
- **記憶體**：每個請求額外使用 10-50KB（取決於 payload 大小）。
- **延遲**：+1-5ms（讀取 body 的時間）。
- **緩解**：透過 `maxBodySize` 限制，預設拒絕超過 10MB 的請求。

### 4.4 Circuit Breaker 效能影響 (v1.1)
熔斷器的狀態檢查和計數器管理會帶來微小的效能開銷。
- **記憶體**：每個 host 約 1KB（存儲狀態和計數器）。
- **延遲**：+0.1-0.5ms（狀態檢查時間）。
- **優點**：在下游故障時，可立即拒絕請求（0ms），避免等待超時。

### 4.5 Key Rotation 效能影響 (v1.2)
多密鑰驗證在最壞情況下需要嘗試所有活動密鑰。
- **記憶體**：每個 provider 約 5KB（多密鑰存儲）。
- **延遲**：+1-10ms（worst case，需嘗試多個密鑰）。
- **優化**：主密鑰優先驗證，大多數情況下只需 1 次嘗試。

---

## 5. 已實作優化功能 (v1.1 - v1.2)

### ✅ Request Buffer (v1.1)
**問題**：框架自動解析 JSON 導致簽章驗證失敗。
**解決方案**：在驗證前緩存原始 body。
**狀態**：已實作並整合到 OrbitEcho。

### ✅ Circuit Breaker (v1.1)
**問題**：下游服務故障導致系統持續發送失敗請求。
**解決方案**：實作熔斷器模式，自動保護故障服務。
**狀態**：已整合到 WebhookDispatcher。

### ✅ Key Rotation (v1.2)
**問題**：密鑰更換需要重啟應用，影響可用性。
**解決方案**：支援多版本密鑰和動態輪換。
**狀態**：已實作 KeyRotationManager 並整合到 WebhookReceiver。

---

## 6. 未來優化規劃

### 長期 (v2.0)
1. **Webhook Proxy**：提供獨立的 Proxy 服務，將內網開發環境暴露給外部 Webhook (類似 ngrok 但專為 Webhook 優化)。
2. **Rate Limiting**：為入站 Webhook 新增速率限制，防止 DDoS 攻擊。
3. **Webhook Transformation**：支援在接收或發送前轉換 payload 格式。

---
*Created by Gravito Architect.*
*Last Updated: 2026-01-31 (v1.2.0)*
