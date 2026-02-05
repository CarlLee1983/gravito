---
title: Monitor Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# 🌌 Monitor Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/monitor` 的內部架構、可觀測性三支柱（Metrics, Tracing, Health）的實作機制以及 Kubernetes 整合策略。

## 快速開始

### 1. 安裝
```bash
bun add @gravito/monitor
```

### 2. 基本用法
```typescript
import { MonitorOrbit } from '@gravito/monitor'

const app = new Application({
  orbits: [new MonitorOrbit()]
})
```

## 架構設計

### 核心元件

- **MonitorOrbit**: 初始化監控服務並註冊 `/health` 與 `/metrics` 路由。
- **Health System**: 管理 Liveness 與 Readiness 探針。
- **Metrics System**: 收集 HTTP 指標與 Runtime 數據。

## API 參考

- `/health/live`: 存活探針
- `/health/ready`: 就緒探針
- `/metrics`: Prometheus 指標端點

---

## 1. 核心哲學：Kubernetes-Native Observability

Monitor 是 Gravito 的可觀測性 Orbit，專為雲原生環境設計。
- **Standardized**: 遵循 Prometheus 與 OpenTelemetry 標準。
- **Lightweight**: 在不依賴龐大 SDK 的情況下，提供足夠的監控能力。
- **Kubernetes Ready**: 內建 `/live`, `/ready`, `/health` 端點。

---

## 2. 模組組件分析

### 2.1 Health System (Probes)
- **HealthRegistry**: 儲存檢查函式。
- **Caching**: 支援 `cacheTtl`，減輕高頻 Probe 對下游的壓力。

### 2.2 Metrics System (Prometheus)
- **MetricsRegistry**: 管理 Counter, Gauge, Histogram。
- **內建指標**：`http_requests_total`, `http_request_duration_seconds`。

---

### 3. 修復歷史

#### 修復：健康檢查雪崩風險 (2026-01-31)

**新增 Metrics**：
```yaml
health_cache_hits_total       - Cache 命中次數
health_cache_misses_total     - Cache 未命中次數
health_cache_hit_rate         - Cache 命中率 (0.0-1.0)
```

**Health Cache 監控**：
```bash
# 查看 cache 統計
curl http://localhost:3000/health
```
