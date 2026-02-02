# Phase 2: 可觀測性整合

**週期**：Week 3-4
**任務數**：5 個
**技術棧**：OpenTelemetry + Prometheus + Grafana
**預期交付物**：完整的監控與告警系統

---

## 📋 任務清單

### ✅ Task 1.1.2.1: 集成 OpenTelemetry SDK

**檔案**：`packages/core/src/observability/TracingSetup.ts`

**目標**：
初始化 OpenTelemetry 追蹤，支持自動儀器化

**詳細需求**：

```typescript
import { NodeTracerProvider } from '@opentelemetry/node'
import { registerInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { JaegerExporter } from '@opentelemetry/exporter-jaeger'

export function setupTracing() {
  const provider = new NodeTracerProvider()

  // 自動儀器化：HTTP、DB、Redis 等
  registerInstrumentations()

  // Jaeger 匯出器
  const exporter = new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
  })

  provider.addSpanProcessor(new BatchSpanProcessor(exporter))
  provider.register()

  return provider
}
```

**環境變數**：
- `JAEGER_ENDPOINT`：Jaeger 服務地址（默認：http://localhost:14268）
- `OTEL_TRACES_EXPORTER`：導出器類型（默認：jaeger）
- `OTEL_EXPORTER_JAEGER_AGENT_HOST`：Jaeger Agent 主機
- `OTEL_EXPORTER_JAEGER_AGENT_PORT`：Jaeger Agent 端口

**驗收標準**：
- [ ] OpenTelemetry SDK 初始化正確
- [ ] 自動儀器化配置完整
- [ ] Jaeger 集成正常
- [ ] 採樣率配置（默認 10%）

**估計工作量**：2-3 小時

---

### ✅ Task 1.1.2.2: 實現事件追蹤（Tracing）

**檔案**：`packages/core/src/observability/EventTracing.ts`

**目標**：
為每個事件派發添加 OpenTelemetry Span

**詳細需求**：

```typescript
// 事件派發追蹤
async doActionAsync(
  name: string,
  payload: any,
  options: EventOptions
): Promise<void> {
  const span = trace.getTracer('gravito').startSpan('event.dispatch', {
    attributes: {
      'event.name': name,
      'event.priority': options.priority,
      'event.listeners': this.getListeners(name).length,
      'event.timestamp': Date.now(),
      'event.ordering': options.ordering,
    },
    events: [
      { name: 'event.start' }
    ]
  })

  try {
    // 派發事件
    await this.dispatchAsync(name, payload, options)

    span.setStatus({ code: SpanStatusCode.OK })
    span.addEvent('event.success')
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    })
    span.recordException(error)
    throw error
  } finally {
    span.end()
  }
}

// 監聽器執行追蹤
private async executeListener(
  listener: ListenerFunction,
  payload: any,
  listenerName: string
): Promise<void> {
  const span = trace.getTracer('gravito').startSpan('listener.execute', {
    attributes: {
      'listener.name': listenerName,
      'payload.size': JSON.stringify(payload).length,
    }
  })

  try {
    await listener(payload)
    span.setStatus({ code: SpanStatusCode.OK })
  } catch (error) {
    span.recordException(error)
    throw error
  } finally {
    span.end()
  }
}
```

**追蹤層級**：
1. **Root Span**：整個事件派發流程
2. **Child Span**：每個監聽器執行
3. **Child Span**：隊列操作（入隊/出隊）

**驗收標準**：
- [ ] 事件派發自動生成 Span
- [ ] 監聽器執行自動追蹤
- [ ] 異常捕獲並記錄
- [ ] 追蹤信息上下文傳遞正確

**估計工作量**：3-4 小時

---

### ✅ Task 1.1.2.3: 實現 Prometheus 指標導出

**檔案**：`packages/core/src/observability/Metrics.ts`

**目標**：
曝露 Prometheus 指標，用於性能監控

**詳細需求**：

```typescript
import { metrics } from '@opentelemetry/api'
import { MeterProvider } from '@opentelemetry/sdk-metrics'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'

interface EventMetrics {
  // 核心指標
  dispatchLatency: Histogram          // 事件派發延遲分佈
  listenerExecutionTime: Histogram    // 個別監聽器耗時
  queueDepth: Gauge                   // 隊列深度（按優先級）

  // 錯誤追蹤
  failureRate: Counter                // 失敗率
  timeoutCount: Counter               // 超時次數

  // 吞吐量
  throughput: Counter                 // 事件處理吞吐量
}

export function setupMetrics() {
  const prometheus = new PrometheusExporter({
    port: parseInt(process.env.PROMETHEUS_PORT || '9090'),
  })

  const meterProvider = new MeterProvider({
    exporter: prometheus,
    interval: 60000, // 60 秒上報一次
  })

  const meter = meterProvider.getMeter('gravito-events')

  return {
    dispatchLatency: meter.createHistogram('gravito_event_dispatch_duration_seconds', {
      description: 'Event dispatch latency distribution',
      unit: 's',
    }),

    listenerExecutionTime: meter.createHistogram('gravito_event_listener_duration_seconds', {
      description: 'Individual listener execution time',
      unit: 's',
      boundaries: [0.01, 0.05, 0.1, 0.5, 1.0],
    }),

    queueDepth: meter.createGauge('gravito_event_queue_depth', {
      description: 'Current queue depth by priority',
    }),

    failureRate: meter.createCounter('gravito_event_failures_total', {
      description: 'Total event processing failures',
    }),

    timeoutCount: meter.createCounter('gravito_event_timeouts_total', {
      description: 'Total event timeouts',
    }),

    throughput: meter.createCounter('gravito_event_throughput_total', {
      description: 'Total events processed',
    }),
  }
}

// 使用方式
metrics.dispatchLatency.record(duration, {
  event: 'order:created',
  priority: 'high',
  success: true,
})
```

**Prometheus 指標格式**：
```
# HELP gravito_event_dispatch_duration_seconds Event dispatch latency distribution
# TYPE gravito_event_dispatch_duration_seconds histogram
gravito_event_dispatch_duration_seconds_bucket{event="order:created",priority="high",le="0.1"} 100
gravito_event_dispatch_duration_seconds_bucket{event="order:created",priority="high",le="0.5"} 250
gravito_event_dispatch_duration_seconds_bucket{event="order:created",priority="high",le="1.0"} 280
gravito_event_dispatch_duration_seconds_sum{event="order:created",priority="high"} 150
gravito_event_dispatch_duration_seconds_count{event="order:created",priority="high"} 280
```

**驗收標準**：
- [ ] 所有指標正確導出
- [ ] Prometheus 抓取配置正確
- [ ] 指標標籤完整（event, priority, listener）
- [ ] 直方圖邊界合理

**估計工作量**：2-3 小時

---

### ✅ Task 1.1.2.4: 創建 Grafana 監控面板

**檔案**：`monitoring/grafana/dashboards/event-system.json`

**目標**：
創建視覺化監控面板，實時展示事件系統狀態

**監控面板內容**：

```json
{
  "dashboard": {
    "title": "Gravito Event System",
    "panels": [
      {
        "title": "Event Dispatch Latency (P50/P95/P99)",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(gravito_event_dispatch_duration_seconds_bucket[5m]))"
          },
          {
            "expr": "histogram_quantile(0.95, rate(gravito_event_dispatch_duration_seconds_bucket[5m]))"
          },
          {
            "expr": "histogram_quantile(0.99, rate(gravito_event_dispatch_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Queue Depth by Priority",
        "targets": [
          {
            "expr": "gravito_event_queue_depth{priority='high'}"
          },
          {
            "expr": "gravito_event_queue_depth{priority='normal'}"
          },
          {
            "expr": "gravito_event_queue_depth{priority='low'}"
          }
        ]
      },
      {
        "title": "Event Throughput (events/sec)",
        "targets": [
          {
            "expr": "rate(gravito_event_throughput_total[1m])"
          }
        ]
      },
      {
        "title": "Listener Execution Time (Top 10 Slowest)",
        "targets": [
          {
            "expr": "topk(10, histogram_quantile(0.99, rate(gravito_event_listener_duration_seconds_bucket[5m])))"
          }
        ]
      },
      {
        "title": "Failure Rate",
        "targets": [
          {
            "expr": "rate(gravito_event_failures_total[5m]) / rate(gravito_event_throughput_total[5m])"
          }
        ]
      }
    ]
  }
}
```

**面板清單**：
- Event Dispatch Latency（P50/P95/P99）
- Queue Depth by Priority
- Event Throughput（events/sec）
- Listener Execution Time（Top 10）
- Failure Rate
- Timeout Count

**驗收標準**：
- [ ] 所有面板數據源正確
- [ ] 查詢語句有效
- [ ] 視覺化展示清晰
- [ ] 告警規則集成

**估計工作量**：2-3 小時

---

### ✅ Task 1.1.2.5: 添加性能告警規則

**檔案**：`monitoring/prometheus/rules/gravito-events.yml`

**目標**：
定義自動告警規則，及時發現性能問題

**詳細需求**：

```yaml
groups:
  - name: gravito_events
    interval: 30s
    rules:
      # Critical: P99 延遲過高
      - alert: HighEventDispatchLatency
        expr: histogram_quantile(0.99, gravito_event_dispatch_duration_seconds) > 0.8
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "事件派發 P99 延遲過高"
          description: "P99 延遲: {{ $value }}s，已超過 800ms"

      # Warning: 隊列深度過高
      - alert: EventQueueDepthHigh
        expr: gravito_event_queue_depth{priority='high'} > 1000
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "高優先級事件隊列堆積"
          description: "隊列深度: {{ $value }}，應調查原因"

      # Critical: 失敗率過高
      - alert: HighEventFailureRate
        expr: |
          (rate(gravito_event_failures_total[5m]) /
           rate(gravito_event_throughput_total[5m])) > 0.05
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "事件處理失敗率過高"
          description: "失敗率: {{ $value | humanizePercentage }}，超過 5%"

      # Warning: 監聽器執行時間過長
      - alert: SlowListener
        expr: histogram_quantile(0.99, gravito_event_listener_duration_seconds) > 1.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "監聽器執行時間過長"
          description: "P99 耗時: {{ $value }}s，監聽器: {{ $labels.listener }}"

      # Critical: 吞吐量異常下降
      - alert: EventThroughputDrop
        expr: |
          rate(gravito_event_throughput_total[5m]) < 100
          and on() increase(gravito_event_throughput_total[1h]) > 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "事件吞吐量異常下降"
          description: "當前吞吐: {{ $value | humanize }} events/sec"
```

**告警規則清單**：
1. **High Event Dispatch Latency** - P99 > 800ms（Critical）
2. **Event Queue Depth High** - 隊列 > 1000（Warning）
3. **High Event Failure Rate** - 失敗率 > 5%（Critical）
4. **Slow Listener** - 監聽器 P99 > 1s（Warning）
5. **Event Throughput Drop** - 吞吐 < 100 events/s（Critical）

**驗收標準**：
- [ ] 所有告警規則有效
- [ ] 告警條件合理
- [ ] 告警消息清晰
- [ ] 告警集成到 Alertmanager

**估計工作量**：2 小時

---

## 📊 工作量統計

| 任務 | 工作量 | 總計 |
|------|--------|------|
| 1.1.2.1 | 2-3 h | 2.5 h |
| 1.1.2.2 | 3-4 h | 3.5 h |
| 1.1.2.3 | 2-3 h | 2.5 h |
| 1.1.2.4 | 2-3 h | 2.5 h |
| 1.1.2.5 | 2 h | 2 h |
| **總計** | | **13 h** |

---

## ✅ 驗收標準

**Integration**：
- [ ] OpenTelemetry 正確初始化
- [ ] Prometheus 指標導出
- [ ] Grafana 面板配置
- [ ] Alertmanager 集成

**Monitoring**：
- [ ] 事件派發延遲可見
- [ ] 隊列深度實時展示
- [ ] 告警及時通知
- [ ] 歷史數據可查詢

**Performance**：
- [ ] 監控開銷 < 5%（採樣率 10%）
- [ ] Prometheus 抓取時間 < 1s
- [ ] 告警觸發延遲 < 1 分鐘

---

## 📝 交付物清單

- `packages/core/src/observability/TracingSetup.ts` - OpenTelemetry 初始化
- `packages/core/src/observability/EventTracing.ts` - 事件追蹤實現
- `packages/core/src/observability/Metrics.ts` - Prometheus 指標
- `monitoring/grafana/dashboards/event-system.json` - Grafana 面板
- `monitoring/prometheus/rules/gravito-events.yml` - 告警規則
- `docs/OBSERVABILITY_GUIDE.md` - 可觀測性指南

---

## 🔗 相關文檔

- [Phase 1: 核心異步派發](./Phase1-核心异步派发.md)
- [Phase 3: 向後兼容性測試](./Phase3-向后兼容性测试.md)

---

**最後更新**：2026-02-02
