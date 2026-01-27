# 🌌 Monitor Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/monitor` 的內部架構、可觀測性三支柱（Metrics, Tracing, Health）的實作機制以及 Kubernetes 整合策略。

---

## 1. 核心哲學：Kubernetes-Native Observability

Monitor 是 Gravito 的可觀測性 Orbit，專為雲原生環境設計。
- **Standardized**: 遵循 Prometheus 與 OpenTelemetry 標準。
- **Lightweight**: 在不依賴龐大 SDK 的情況下，提供足夠的監控能力 (Node.js runtime metrics + HTTP metrics)。
- **Kubernetes Ready**: 內建 `/live`, `/ready`, `/health` 端點，完美對接 K8s Probes。

---

## 2. 模組組件分析

### 2.1 MonitorOrbit (Entrypoint)
- **職責**：初始化監控服務並註冊路由。
- **位置**：`src/MonitorOrbit.ts`
- **機制**：
  - 根據配置 (`health.enabled`, `metrics.enabled`) 決定是否啟用功能。
  - 初始化 `HealthRegistry`, `MetricsRegistry`, `TracingManager`。
  - 將服務注入到 IoC 容器 (`monitor`, `metrics`, `tracing`)。

### 2.2 Health System (Probes)
- **職責**：管理與執行健康檢查。
- **位置**：`src/health/`
- **組件**：
  - `HealthRegistry`: 儲存檢查函式 (`Map<string, CheckFn>`)。
  - `HealthController`: 處理 HTTP 請求，回傳 JSON 報告。
- **特性**：
  - **Timeout**: 每個檢查有預設 5s 超時，防止單一依賴拖垮整個檢查。
  - **Caching**: 支援 `cacheTtl`，減輕高頻 Probe 對下游的壓力。
  - **Liveness vs Readiness**: `/live` 僅檢查進程存活，`/ready` 檢查所有依賴 (DB, Redis)。

### 2.3 Metrics System (Prometheus)
- **職責**：收集與導出指標。
- **位置**：`src/metrics/`
- **組件**：
  - `MetricsRegistry`: 管理 Counter, Gauge, Histogram。
  - **Format**: `toPrometheus()` 方法生成 Prometheus Text Format。
- **內建指標**：
  - `http_requests_total`: 請求計數 (Method, Path, Status)。
  - `http_request_duration_seconds`: 延遲直方圖。
  - `process_uptime_seconds`, `nodejs_heap_size_*`: Runtime 狀態。

### 2.4 Tracing System (OpenTelemetry)
- **職責**：分散式追蹤。
- **位置**：`src/tracing/`
- **機制**：
  - 嘗試動態 import `@opentelemetry/sdk-node`。若不存在，則降級為輕量級的內部追蹤 (Log based)。
  - **Context Propagation**: 解析與注入 W3C `traceparent` 標頭。
  - **Span Management**: 提供 `startSpan`, `endSpan` API。

---

## 3. 技術規格與設計決策

### 3.1 零依賴策略 (Zero-Dependency Default)
Monitor 的設計原則是「開箱即用」。
- **Metrics**: 不依賴 `prom-client`，而是自幹了輕量的 `MetricsRegistry`。這減少了套件體積，且對於基礎監控已足夠。
- **Tracing**: OpenTelemetry SDK 是 `optionalDependencies`。若使用者未安裝，Monitor 會退回到「No-op」或「Log-only」模式，不會報錯。

### 3.2 健康檢查並發 (Concurrency)
- **實作**: `Promise.all` 並發執行所有檢查。
- **理由**: 減少整體延遲。若有 5 個檢查各需 1s，循序執行需 5s (可能超時 K8s timeout)，並發僅需 1s。

### 3.3 HTTP 中間件整合
- **Metrics**: 提供 `createHttpMetricsMiddleware`，自動記錄請求時間與狀態碼。
- **Tracing**: 提供 `createTracingMiddleware`，自動開啟 Root Span 並注入 Trace Context。

---

## 4. 潛在風險與效能評估

### 4.1 指標基數爆炸 (High Cardinality)
若 `http_requests_total` 的 label 包含動態路徑 (如 `/users/123`)，指標數量會無限增長。
- **防護**: Gravito Router 的 Path 是參數化的 (`/users/:id`)，Monitor 應使用 Route Pattern 而非 Raw Path。
- **現狀**: 需確認 Middleware 是否正確獲取了 Route Pattern。

### 4.2 健康檢查雪崩
若 K8s Probe 頻率過高 (e.g. 1s)，且檢查包含複雜 DB 查詢。
- **解法**: 必須配置 `cacheTtl` (如 10s)，讓多次 Probe 共用一次檢查結果。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **Route Pattern Detection**：確保 Metrics Middleware 使用參數化路徑 (如 `/api/posts/:id`) 而非具體 URL。
2. **Push Gateway**：支援將 Metrics 推送到 Pushgateway (適合短生命週期 Job)。

### 中期 (v1.2)
1. **Logging Integration**：將 Tracing ID (TraceId) 自動注入到 `OrbitLogger`，實現 Log 與 Trace 的關聯 (Correlation)。

### 長期 (v2.0)
1. **eBPF Agent**：整合 eBPF 自動收集 RED (Rate, Errors, Duration) 指標，無需手動埋點。

---
*Created by Gravito Architect.*
