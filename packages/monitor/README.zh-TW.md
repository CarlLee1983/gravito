# @gravito/monitor 🛰️

輕量級的 Gravito 可觀測性模組 (Observability) - 包含健康檢查 (Health Checks)、指標監控 (Metrics) 與鏈路追蹤 (Tracing)。基於 **Galaxy Architecture** 設計，此 Orbit 為您的星球提供必備的監控基礎設施。

## 🚀 核心特性

- 🏥 **健康檢查 (Health Checks)** - 支援 Kubernetes 標準的 `/health`、`/ready`、`/live` 端點，並可自定義檢查項。
- 📊 **指標監控 (Metrics)** - 相容 Prometheus 格式的 `/metrics` 端點，內建 Node.js 執行階段與 HTTP 監控。
- 🔍 **鏈路追蹤 (Tracing)** - 支援 OpenTelemetry OTLP 標準，實現跨服務的分散式追蹤。
- 🛡️ **雲原生整合** - 完美適配 Kubernetes Probe 設定與 Prometheus ServiceMonitor。

## 📦 安裝

```bash
bun add @gravito/monitor
```

如需使用 OpenTelemetry 追蹤功能（選用）：

```bash
bun add @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http
```

## 🌌 快速上手

只需將 `MonitorOrbit` 加入您的 `PlanetCore` 即可啟用。

```typescript
import { PlanetCore } from '@gravito/core'
import { MonitorOrbit } from '@gravito/monitor'

const core = new PlanetCore()

core.orbit(new MonitorOrbit({
  health: {
    enabled: true,
    path: '/health',
  },
  metrics: {
    enabled: true,
    prefix: 'myapp_',
  },
  tracing: {
    enabled: process.env.NODE_ENV === 'production',
    serviceName: 'order-service',
  },
}))

await core.liftoff()
```

## 🏥 健康檢查 (Health Checks)

健康檢查系統提供三個符合 Kubernetes 最佳實踐的端點：

- **Liveness (`/live`)**: 指示程序是否正常運行。
- **Readiness (`/ready`)**: 指示應用是否準備好接收流量（需通過所有註冊的檢查項）。
- **Health (`/health`)**: 完整的健康報告，包含所有註冊的細節。

### 註冊自定義檢查項

您可以透過 `monitor` 服務註冊自定義檢查邏輯。

```typescript
const monitor = core.services.get('monitor')

// 簡單檢查
monitor.health.register('database', async () => {
  const isOk = await db.ping()
  return isOk ? { status: 'healthy' } : { status: 'unhealthy', message: '資料庫連線中斷' }
})

// 詳細報告
monitor.health.register('disk_space', () => {
  const usage = getDiskUsage()
  return {
    status: usage < 90 ? 'healthy' : 'degraded',
    details: { usage: `${usage}%` }
  }
})
```

## 📊 指標監控 (Metrics)

指標會以 Prometheus 文字格式暴露於 `/metrics` 端點。

### 內建指標
- **執行階段 (Runtime)**: 堆積記憶體 (Heap usage)、運行時間 (Uptime)、活躍控制代碼 (Active handles)。
- **HTTP**: 請求總數 (`http_requests_total`)、請求耗時分佈 (`http_request_duration_seconds`)。

### 自定義指標

```typescript
const monitor = core.services.get('monitor')

// 1. Counter (單調遞增的計數器)
const orders = monitor.metrics.counter({
  name: 'orders_total',
  help: '處理的訂單總數',
  labels: ['status']
})
orders.inc({ status: 'completed' })

// 2. Gauge (可增可減的量表)
const activeUsers = monitor.metrics.gauge({
  name: 'active_users',
  help: '當前活躍使用者數'
})
activeUsers.set(42)

// 3. Histogram (數值分佈統計)
const processTime = monitor.metrics.histogram({
  name: 'order_processing_seconds',
  help: '訂單處理耗時',
  buckets: [0.1, 0.5, 1, 2, 5]
})
const stop = processTime.startTimer()
// ... 執行邏輯 ...
stop()
```

## 🔍 鏈路追蹤 (Tracing)

鏈路追蹤由 OpenTelemetry (OTLP) 驅動，會自動透過 W3C `traceparent` Header 傳遞追蹤上下文。

### 配置範例
```typescript
tracing: {
  enabled: true,
  serviceName: 'gateway',
  endpoint: 'http://otel-collector:4318/v1/traces',
  sampleRate: 0.1, // 取樣 10% 的請求
  resourceAttributes: {
    env: 'production'
  }
}
```

### 手動建立 Span
```typescript
const tracer = core.services.get('tracing')

const span = tracer.startSpan('compute_heavy_logic')
try {
  // ... 執行複雜運算 ...
  tracer.setAttribute(span, 'items_count', 100)
  tracer.endSpan(span, 'ok')
} catch (e) {
  tracer.endSpan(span, 'error')
}
```

## ⚙️ 配置參數參考

| 參數 | 類型 | 預設值 | 說明 |
|--------|------|---------|-------------|
| `health.enabled` | `boolean` | `true` | 是否啟用健康檢查端點 |
| `health.path` | `string` | `/health` | 完整健康報告路徑 |
| `health.timeout` | `number` | `5000` | 檢查項逾時時間 (ms) |
| `health.cacheTtl` | `number` | `0` | 結果快取時間 (ms, 0 代表不快取) |
| `metrics.enabled` | `boolean` | `true` | 是否啟用 Prometheus 指標端點 |
| `metrics.prefix` | `string` | `gravito_` | 指標名稱前綴 |
| `metrics.defaultMetrics` | `boolean` | `true` | 是否收集 Node.js 執行階段指標 |
| `tracing.enabled` | `boolean` | `false` | 是否啟用 OpenTelemetry 追蹤 |
| `tracing.endpoint` | `string` | `http://localhost:4318/v1/traces` | OTLP Collector 路徑 |
| `tracing.sampleRate` | `number` | `1.0` | 取樣率 (0.0 - 1.0) |

## 📄 授權協議

MIT © Carl Lee
