# Gravito 事件系統 - 可觀測性指南

**版本**：Phase 2 (2026-02-03)
**作者**：Gravito Framework Team
**狀態**：✅ 已實施

---

## 目錄

1. [概述](#概述)
2. [快速開始](#快速開始)
3. [分佈式追蹤](#分佈式追蹤)
4. [指標監控](#指標監控)
5. [Grafana 監控面板](#grafana-監控面板)
6. [告警規則](#告警規則)
7. [故障排查](#故障排查)
8. [最佳實踐](#最佳實踐)

---

## 概述

Gravito 事件系統提供完整的可觀測性支持，包括：

- **分佈式追蹤**：使用 OpenTelemetry 追蹤事件派發流程
- **指標監控**：Prometheus 格式的性能指標
- **Grafana 面板**：實時監控儀表板
- **智能告警**：自動檢測性能問題

### 核心指標

| 指標 | 類型 | 描述 |
|------|------|------|
| `gravito_event_dispatch_latency_seconds` | Histogram | 事件派發延遲分佈 |
| `gravito_event_listener_execution_seconds` | Histogram | 監聽器執行時間 |
| `gravito_event_queue_depth` | Gauge | 隊列深度（按優先級） |
| `gravito_event_failures_total` | Counter | 失敗計數 |
| `gravito_event_timeouts_total` | Counter | 超時計數 |
| `gravito_event_throughput_total` | Counter | 吞吐量 |

---

## 快速開始

### 1. 初始化 Tracing

```typescript
import { setupTracing } from '@gravito/core/observability'

// 在應用程序啟動時
const provider = await setupTracing({
  serviceName: 'my-service',
  jaegerEndpoint: 'http://jaeger:14268/api/traces',
  samplingRate: 0.1, // 10% 採樣率
})
```

### 2. 初始化 Prometheus 指標

```typescript
import { setupPrometheusMetrics } from '@gravito/core/observability'

// 在應用程序啟動時
const metricsInfo = await setupPrometheusMetrics({
  port: 9090,
  prefix: 'gravito_event_',
})

// Prometheus 現在可以在 http://localhost:9090/metrics 抓取指標
```

### 3. 啟用事件系統可觀測性

```typescript
import { ObservableHookManager } from '@gravito/core'
import { MetricsRegistry } from '@gravito/monitor'

// 初始化指標註冊表
const registry = new MetricsRegistry()

// 創建 Observable Hook Manager
const hookManager = new ObservableHookManager(
  {
    /* HookManager 配置 */
  },
  {
    enabled: true,
    metrics: registry,
    tracing: true,
  }
)

// 現在所有事件派發都會自動被追蹤和測量
await hookManager.doActionAsync('my-event', { data: 'value' })
```

---

## 分佈式追蹤

### 使用 OpenTelemetry API

```typescript
import { getTracer } from '@gravito/core/observability'

const tracer = getTracer('my-service')

const span = tracer.startSpan('custom-operation', {
  attributes: {
    'user.id': '12345',
    'operation.type': 'payment',
  },
})

try {
  // 執行操作
  await processPayment()
  span.setStatus({ code: SpanStatusCode.OK })
} catch (error) {
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message,
  })
  span.recordException(error)
} finally {
  span.end()
}
```

### 事件系統追蹤層級

```
事件派發 Span
  ├─ 監聽器 1 執行 Span
  ├─ 監聽器 2 執行 Span
  └─ 隊列操作 Span
```

每個 Span 包含：
- 事件名稱與優先級
- 監聽器標識與執行時間
- 異常與錯誤信息
- 時間戳與上下文

---

## 指標監控

### 監控事件派發延遲

```typescript
// 推薦查詢
histogram_quantile(0.95, rate(gravito_event_dispatch_latency_seconds_bucket[5m]))
histogram_quantile(0.99, rate(gravito_event_dispatch_latency_seconds_bucket[5m]))
```

### 監控隊列狀態

```typescript
// 查看各優先級隊列深度
gravito_event_queue_depth{priority="high"}
gravito_event_queue_depth{priority="normal"}
gravito_event_queue_depth{priority="low"}
```

### 計算失敗率

```typescript
// 失敗率（%）
(rate(gravito_event_failures_total[5m]) / rate(gravito_event_throughput_total[5m])) * 100
```

### 吞吐量分析

```typescript
// 當前吞吐量（事件/秒）
rate(gravito_event_throughput_total[1m])

// 同比增長
rate(gravito_event_throughput_total[5m:1d])
```

---

## Grafana 監控面板

### 配置 Prometheus 數據源

1. 進入 Grafana → Configuration → Data Sources
2. 添加新的 Prometheus 數據源
3. 設置 URL：`http://prometheus:9090`
4. 保存並測試

### 導入儀表板

```bash
# 1. 複製 event-system.json 到 Grafana dashboards 目錄
cp monitoring/grafana/dashboards/event-system.json \
   /etc/grafana/provisioning/dashboards/

# 2. 重啟 Grafana
systemctl restart grafana-server
```

### 面板說明

#### 1. Event Dispatch Latency (P50/P95/P99)
- 顯示事件派發延遲的三個百分位數
- 幫助識別性能變化
- 告警閾值：P99 > 800ms

#### 2. Queue Depth by Priority
- 監控三個優先級隊列的深度
- 幫助發現隊列堆積問題
- 告警閾值：High > 1000

#### 3. Event Throughput (events/sec)
- 實時吞吐量監控
- 幫助檢測性能異常
- 告警閾值：< 100 events/sec（如果歷史吞吐量更高）

#### 4. Listener Execution Time (Top 10 Slowest)
- 識別最慢的監聽器
- 按執行時間排序
- 幫助性能優化

#### 5. Failure Rate
- 實時失敗率（%）
- 紅/黃/綠色代碼
- 告警閾值：> 5%

#### 6. Timeout Count
- 統計超時次數
- 幫助識別超時問題
- 告警閾值：> 1%

---

## 告警規則

### Prometheus 告警配置

```yaml
# prometheus.yml
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - localhost:9093

rule_files:
  - /etc/prometheus/rules/gravito-events.yml
```

### 告警規則清單

| 告警 | 嚴重性 | 條件 | 持續時間 |
|------|--------|------|---------|
| HighEventDispatchLatency | Critical | P99 > 800ms | 5 分鐘 |
| HighEventQueueDepth | Warning | 隊列 > 1000 | 2 分鐘 |
| HighEventFailureRate | Critical | 失敗率 > 5% | 3 分鐘 |
| SlowEventListener | Warning | 監聽器 P99 > 1s | 5 分鐘 |
| EventThroughputDrop | Critical | 吞吐 < 100 | 2 分鐘 |

### 集成 Alertmanager

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  receiver: 'default'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: 'default'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#gravito-alerts'
        title: 'Gravito Alert'
        text: '{{ .GroupLabels.alertname }}'
```

---

## 故障排查

### 問題：看不到 Grafana 面板數據

1. 檢查 Prometheus 連接：
   ```bash
   curl http://prometheus:9090/api/v1/query?query=up
   ```

2. 驗證指標名稱：
   ```bash
   curl 'http://prometheus:9090/api/v1/label/__name__/values' | grep gravito
   ```

3. 檢查 Prometheus 配置：
   ```yaml
   scrape_configs:
     - job_name: 'gravito'
       static_configs:
         - targets: ['localhost:9090']
   ```

### 問題：追蹤未出現在 Jaeger

1. 驗證 Jaeger 連接：
   ```bash
   curl http://jaeger:14268/api/traces
   ```

2. 檢查採樣率配置：
   ```typescript
   await setupTracing({
     samplingRate: 1.0, // 臨時改為 100% 用於調試
   })
   ```

3. 檢查應用程序日誌：
   ```
   [Tracing] OpenTelemetry initialized
   ```

### 問題：告警未觸發

1. 驗證 Prometheus 告警規則：
   ```bash
   curl 'http://prometheus:9090/api/v1/rules'
   ```

2. 查看 Alertmanager 狀態：
   ```bash
   curl http://alertmanager:9093/api/v1/alerts
   ```

3. 檢查規則表達式語法：
   ```bash
   promtool check rules /etc/prometheus/rules/gravito-events.yml
   ```

---

## 最佳實踐

### 1. 設置合適的採樣率

```typescript
// 生產環境：10-20% 採樣率
const provider = await setupTracing({
  samplingRate: 0.1,
  environment: 'production',
})

// 開發環境：100% 採樣率
const provider = await setupTracing({
  samplingRate: 1.0,
  environment: 'development',
})
```

### 2. 監控關鍵指標

- **P99 延遲**：應 < 800ms
- **失敗率**：應 < 1%
- **隊列深度**：應 < 500（高優先級）
- **吞吐量**：應穩定且可預測

### 3. 定期審視告警

- 避免告警疲勞：調整閾值以減少誤報
- 定期驗證告警規則有效性
- 記錄告警觸發的根本原因

### 4. 使用標籤進行分組

```typescript
// 在指標中添加有意義的標籤
metrics.recordDispatchLatency('order:created', 'high', duration)
metrics.recordFailure('order:created', 'TimeoutError')
```

### 5. 與告警整合

```yaml
# 在告警中使用標籤進行路由
route:
  routes:
    - match:
        severity: critical
      receiver: 'critical-team'
    - match:
        component: event-system
      receiver: 'event-system-team'
```

### 6. 定期檢查性能趨勢

```
每週檢查：
- 吞吐量是否有下降趨勢？
- 延遲是否在上升？
- 隊列深度是否變深？
- 失敗率是否在增加？
```

---

## 環境變數

### Tracing 配置

| 變數 | 默認值 | 說明 |
|------|--------|------|
| `OTEL_SERVICE_NAME` | gravito-app | 服務名稱 |
| `OTEL_SERVICE_VERSION` | 1.0.0 | 服務版本 |
| `JAEGER_ENDPOINT` | http://localhost:14268 | Jaeger 端點 |
| `OTEL_SAMPLING_RATE` | 0.1 | 採樣率 |
| `NODE_ENV` | development | 環境 |

### Metrics 配置

| 變數 | 默認值 | 說明 |
|------|--------|------|
| `PROMETHEUS_PORT` | 9090 | Prometheus 端口 |
| `PROMETHEUS_PREFIX` | gravito_event_ | 指標前綴 |
| `PROMETHEUS_INTERVAL` | 60000 | 上報間隔（毫秒） |
| `PROMETHEUS_DEFAULT_METRICS` | true | 啟用默認指標 |

---

## 參考資源

- [OpenTelemetry 文檔](https://opentelemetry.io/)
- [Prometheus 查詢語言](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana 儀表板最佳實踐](https://grafana.com/docs/)
- [Alertmanager 配置](https://prometheus.io/docs/alerting/latest/configuration/)

---

**最後更新**：2026-02-03
**維護者**：Gravito Framework Team
