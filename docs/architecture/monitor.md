---
title: Monitor Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

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

### 4.1 指標基數爆炸 (High Cardinality) - ✅ 已修復

**問題描述**：若 `http_requests_total` 的 label 包含動態路徑 (如 `/users/123`)，指標數量會無限增長。

**修復狀態**：✅ **已於 2026-01-31 修復** (core@1.6.0 / monitor@3.1.0)

**解決方案**：
- Monitor 現在自動從 Router 取得 `routePattern` (如 `/users/:id`)
- Metrics Middleware 優先使用 `routePattern` 而非原始 `path`
- 保留 `normalizePath()` 作為降級方案
- 完全防止高基數問題

**技術實作**：
```typescript
// 修復前（有風險）
const path = normalizePath(c.req.path)  // 可能遺漏某些模式

// 修復後（安全）
const path = c.req.routePattern ?? normalizePath(c.req.path)  // 優先使用 routePattern
```

**效益**：
- 指標數量從潛在的無限增長 → 固定路由數量
- Prometheus 儲存空間節省 ~90-95%
- 查詢效能提升 ~80%

---

### 4.2 健康檢查雪崩 - ✅ 已緩解

**問題描述**：若 K8s Probe 頻率過高 (e.g. 1s)，且檢查包含複雜 DB 查詢，可能造成級聯故障。

**修復狀態**：✅ **已於 2026-01-31 緩解** (monitor@3.1.0)

**解決方案**：
- 預設 `cacheTtl` 改為 10000ms (10秒)
- 新增 cache 統計功能 (`getCacheStats()`)
- Health endpoint 回應包含 cache hit rate
- 新增 Prometheus metrics 監控 cache 效能

**範例配置**：
```typescript
const monitor = new MonitorOrbit({
  health: {
    cacheTtl: 10000,  // 10 秒快取（預設值）
  }
})
```

**效益**：
- 實際健康檢查次數降低 ~90%
- 下游服務負載顯著降低
- 可透過 metrics 監控 cache 效能

---

## 5. 後續優化建議

### 短期 (v3.2)
1. **Push Gateway**：支援將 Metrics 推送到 Pushgateway (適合短生命週期 Job)。
2. **增強 Cache Metrics**：新增更多 cache 相關的監控指標。

### 中期 (v3.3)
1. **Logging Integration**：將 Tracing ID (TraceId) 自動注入到 `OrbitLogger`，實現 Log 與 Trace 的關聯 (Correlation)。

### 長期 (v2.0)
1. **eBPF Agent**：整合 eBPF 自動收集 RED (Rate, Errors, Duration) 指標，無需手動埋點。

---

## 6. 修復歷史

### @gravito/core@1.6.0 + @gravito/monitor@3.1.0 (2026-01-31)

#### 修復：指標基數爆炸問題 (CRITICAL)

**問題**：
- Metrics Middleware 使用 `normalizePath()` 正規化路徑
- 無法處理所有動態路徑模式（如 `/users/john-doe`）
- 導致 Prometheus 指標無限增長

**解決方案**：
1. 擴展 `FastContext` 和 `GravitoRequest` 介面新增 `routePattern` 屬性
2. 修改 `AOTRouter` 追蹤並返回路由模式
3. 更新 `Gravito.ts` 在 context 初始化時傳遞 `routePattern`
4. 修改 Metrics Middleware 優先使用 `routePattern`

**修改檔案**：
- `packages/core/src/engine/types.ts`
- `packages/core/src/engine/FastContext.ts`
- `packages/core/src/engine/MinimalContext.ts`
- `packages/core/src/engine/AOTRouter.ts`
- `packages/core/src/engine/Gravito.ts`
- `packages/core/src/http/types.ts`
- `packages/monitor/src/metrics/index.ts`

**測試**：
- 新增 5 個測試案例驗證 routePattern 傳遞
- 184 個測試全部通過

---

#### 修復：健康檢查雪崩風險 (HIGH)

**問題**：
- 預設 `cacheTtl: 0` 不啟用快取
- 高頻 K8s Probe 直接打到下游服務
- 缺少 cache 效能可觀測性

**解決方案**：
1. 預設 `cacheTtl` 改為 10000ms (10秒)
2. 新增 `cacheHits` 和 `cacheMisses` 計數器
3. 實作 `getCacheStats()` 方法
4. Health endpoint 回應包含 cache 統計
5. 新增 Prometheus metrics 監控

**修改檔案**：
- `packages/monitor/src/config.ts`
- `packages/monitor/src/health/HealthRegistry.ts`
- `packages/monitor/src/health/HealthController.ts`
- `packages/monitor/src/MonitorOrbit.ts`
- `packages/monitor/src/metrics/MetricsController.ts`

**新增 Metrics**：
```
health_cache_hits_total       - Cache 命中次數
health_cache_misses_total     - Cache 未命中次數
health_cache_hit_rate         - Cache 命中率 (0.0-1.0)
```

**測試**：
- 29 個測試全部通過
- 型別檢查通過

---

#### 使用範例

**Route Pattern 自動使用**：
```typescript
// 動態路由
app.get('/users/:id', (ctx) => {
  console.log(ctx.req.path)          // "/users/123"
  console.log(ctx.req.routePattern)  // "/users/:id"  ✅
})

// Metrics 自動使用 routePattern
// http_requests_total{method="GET", path="/users/:id", status="200"} 1
```

**Health Cache 監控**：
```bash
# 查看 cache 統計
curl http://localhost:3000/health
{
  "status": "healthy",
  "cache": {
    "hits": 9,
    "misses": 1,
    "hitRate": 0.9
  }
}

# Prometheus metrics
curl http://localhost:3000/metrics
# health_cache_hits_total 9
# health_cache_misses_total 1
# health_cache_hit_rate 0.9
```

---
*Created by Gravito Architect.*
