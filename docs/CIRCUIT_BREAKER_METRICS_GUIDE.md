# CircuitBreaker Prometheus Metrics 完整指南

本指南介紹如何使用 Gravito Core 的 CircuitBreaker Prometheus Metrics，實現完整的可觀測性監控。

## 目錄

1. [概述](#概述)
2. [核心概念](#核心概念)
3. [指標定義](#指標定義)
4. [啟用 Metrics](#啟用-metrics)
5. [Prometheus 查詢](#prometheus-查詢)
6. [告警規則](#告警規則)
7. [Grafana 儀表板](#grafana-儀表板)
8. [故障排查](#故障排查)

## 概述

CircuitBreaker Metrics 提供對熔斷器狀態、轉換和性能的實時監控。結合 Prometheus 和 Grafana，您可以：

- 監控熔斷器狀態變化
- 追蹤失敗和成功率
- 分析熔斷器開啟持續時間
- 設置自動告警規則
- 檢測系統故障模式

## 核心概念

### 熔斷器狀態

熔斷器有三種狀態：

| 狀態 | 值 | 說明 |
|------|-----|------|
| **CLOSED** | 0 | 正常運行，允許請求通過 |
| **HALF_OPEN** | 1 | 測試恢復，允許有限的請求通過 |
| **OPEN** | 2 | 故障狀態，拒絕所有請求 |

### 狀態轉換流程

```
CLOSED ──(失敗次數 ≥ 閾值)──> OPEN
  ▲                            │
  │                            │ (超時)
  │                            ▼
  └─── HALF_OPEN ─(成功次數 ≥ 閾值)
       │
       └─(失敗)──> OPEN
```

## 指標定義

### 1. 熔斷器狀態（Gauge）

**名稱**: `gravito_event_circuit_breaker_state`

**說明**: 當前熔斷器狀態（0=CLOSED, 1=HALF_OPEN, 2=OPEN）

**標籤**: `event_name`

**例子**:
```
gravito_event_circuit_breaker_state{event_name="order:created"} 2
```

### 2. 狀態轉換計數（Counter）

**名稱**: `gravito_event_circuit_breaker_transitions_total`

**說明**: 熔斷器狀態轉換次數

**標籤**: `event_name`, `from_state`, `to_state`

**例子**:
```
gravito_event_circuit_breaker_transitions_total{event_name="order:created", from_state="CLOSED", to_state="OPEN"} 5
```

### 3. 失敗計數（Counter）

**名稱**: `gravito_event_circuit_breaker_failures_total`

**說明**: 熔斷器追蹤的累計失敗次數

**標籤**: `event_name`

**例子**:
```
gravito_event_circuit_breaker_failures_total{event_name="order:created"} 127
```

### 4. 成功計數（Counter）

**名稱**: `gravito_event_circuit_breaker_successes_total`

**說明**: 熔斷器追蹤的累計成功次數

**標籤**: `event_name`

**例子**:
```
gravito_event_circuit_breaker_successes_total{event_name="order:created"} 8932
```

### 5. OPEN 持續時間（Histogram）

**名稱**: `gravito_event_circuit_breaker_open_duration_seconds`

**說明**: 熔斷器保持 OPEN 狀態的持續時間分佈

**標籤**: `event_name`

**Buckets**: `[1, 5, 10, 30, 60, 120, 300]` 秒

**例子**:
```
gravito_event_circuit_breaker_open_duration_seconds_bucket{event_name="order:created", le="30"} 12
gravito_event_circuit_breaker_open_duration_seconds_bucket{event_name="order:created", le="60"} 15
```

## 啟用 Metrics

### 基本配置

使用 `ObservableHookManager` 啟用 CircuitBreaker Metrics：

```typescript
import { ObservableHookManager } from '@gravito/core'
import { MetricsRegistry } from '@gravito/monitor'

// 創建 Metrics Registry
const metricsRegistry = new MetricsRegistry({
  prefix: 'gravito_event_',
})

// 創建 ObservableHookManager 並啟用 Metrics
const hookManager = new ObservableHookManager(
  { migrationMode: 'async' },
  {
    enabled: true,
    metrics: metricsRegistry,
    metricsPrefix: 'gravito_event_',
  }
)

// 註冊帶熔斷器的事件
hookManager.addAction('order:created', async (order) => {
  await processOrder(order)
}, {
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000,
    halfOpenRequests: 3,
  }
})
```

### 環境變數配置

支持使用環境變數配置 Prometheus：

```bash
# Prometheus 抓取端口
PROMETHEUS_PORT=9090

# 指標前綴
PROMETHEUS_PREFIX=gravito_event_

# 上報間隔（毫秒）
PROMETHEUS_INTERVAL=60000

# 啟用默認指標（CPU、內存等）
PROMETHEUS_DEFAULT_METRICS=true
```

## Prometheus 查詢

### 常用 PromQL 查詢

#### 1. 當前熔斷器狀態

```promql
gravito_event_circuit_breaker_state{event_name=~".*"}
```

查找所有開啟的熔斷器：
```promql
gravito_event_circuit_breaker_state == 2
```

#### 2. 熔斷器開啟率

```promql
rate(gravito_event_circuit_breaker_transitions_total{to_state="OPEN"}[5m])
```

#### 3. 熔斷器恢復率

```promql
rate(gravito_event_circuit_breaker_transitions_total{to_state="CLOSED"}[5m])
```

#### 4. 失敗率

```promql
rate(gravito_event_circuit_breaker_failures_total[5m]) /
(rate(gravito_event_circuit_breaker_failures_total[5m]) +
 rate(gravito_event_circuit_breaker_successes_total[5m]))
```

#### 5. OPEN 持續時間分析

P95 持續時間：
```promql
histogram_quantile(0.95,
  rate(gravito_event_circuit_breaker_open_duration_seconds_bucket[5m]))
```

P99 持續時間：
```promql
histogram_quantile(0.99,
  rate(gravito_event_circuit_breaker_open_duration_seconds_bucket[5m]))
```

#### 6. 特定事件的狀態

```promql
gravito_event_circuit_breaker_state{event_name="order:created"}
```

## 告警規則

### 預定義告警規則

#### 1. 熔斷器持續開啟

**規則 ID**: `CircuitBreakerOpen`

```promql
gravito_event_circuit_breaker_state{event_name=~".+"} == 2
```

**條件**: 持續 5 分鐘

**嚴重度**: ⚠️ Warning

**說明**: 事件熔斷器已開啟超過 5 分鐘，表示底層服務可能出現持久化故障

#### 2. 熔斷器頻繁切換（Flapping）

**規則 ID**: `CircuitBreakerFlapping`

```promql
rate(gravito_event_circuit_breaker_transitions_total[5m]) > 10
```

**條件**: 持續 2 分鐘

**嚴重度**: 🔴 Critical

**說明**: 熔斷器狀態切換過於頻繁（>10/sec），表示系統不穩定

#### 3. 熔斷器故障率過高

**規則 ID**: `CircuitBreakerHighFailureRate`

```promql
rate(gravito_event_circuit_breaker_failures_total[5m]) >
rate(gravito_event_circuit_breaker_successes_total[5m])
```

**條件**: 持續 3 分鐘

**嚴重度**: 🔴 Critical

**說明**: 失敗率已超過成功率，需要立即調查

### 配置告警規則

在 Prometheus `alert.rules.yml` 中配置：

```yaml
groups:
  - name: gravito_circuit_breaker
    interval: 30s
    rules:
      - alert: CircuitBreakerOpen
        expr: gravito_event_circuit_breaker_state{event_name=~".+"} == 2
        for: 5m
        annotations:
          summary: "熔斷器開啟：{{ $labels.event_name }}"
          description: "事件 {{ $labels.event_name }} 的熔斷器已開啟 5 分鐘"

      - alert: CircuitBreakerFlapping
        expr: rate(gravito_event_circuit_breaker_transitions_total[5m]) > 10
        for: 2m
        annotations:
          summary: "熔斷器頻繁切換：{{ $labels.event_name }}"
          description: "切換速率：{{ $value }}/sec"

      - alert: CircuitBreakerHighFailureRate
        expr: |
          rate(gravito_event_circuit_breaker_failures_total[5m]) >
          rate(gravito_event_circuit_breaker_successes_total[5m])
        for: 3m
        annotations:
          summary: "熔斷器故障率過高：{{ $labels.event_name }}"
          description: "失敗率已超過成功率"
```

## Grafana 儀表板

### 儀表板模板

創建 JSON 儀表板模板：

```json
{
  "dashboard": {
    "title": "CircuitBreaker Metrics",
    "panels": [
      {
        "title": "熔斷器狀態",
        "targets": [
          {
            "expr": "gravito_event_circuit_breaker_state"
          }
        ],
        "type": "stat"
      },
      {
        "title": "失敗率趨勢",
        "targets": [
          {
            "expr": "rate(gravito_event_circuit_breaker_failures_total[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "title": "OPEN 持續時間分佈",
        "targets": [
          {
            "expr": "gravito_event_circuit_breaker_open_duration_seconds"
          }
        ],
        "type": "heatmap"
      }
    ]
  }
}
```

### 常用儀表板面板

1. **熔斷器狀態概覽** - Stat 面板，顯示所有開啟的熔斷器數量
2. **失敗率趨勢** - Graph，5m 時間窗口
3. **轉換事件** - Counter 面板，顯示各狀態轉換次數
4. **OPEN 持續時間熱圖** - Heatmap，分析持續時間分佈
5. **成功率** - Gauge，顯示當前成功率

## 故障排查

### 常見問題

#### Q1: Metrics 沒有出現在 Prometheus

**原因**: Metrics 未正確初始化或 Prometheus 未正確抓取

**解決方案**:
1. 確認 Metrics 已啟用：`enabled: true`
2. 檢查 Prometheus 配置中的抓取端口和路徑
3. 驗證 `/metrics` 端點返回數據：`curl http://localhost:9090/metrics`

#### Q2: 熔斷器狀態沒有更新

**原因**: 沒有事件觸發狀態轉換，或 metricsRecorder 為 null

**解決方案**:
1. 確認事件有足夠的失敗次數觸發轉換
2. 檢查 CircuitBreaker 配置中的 `metricsRecorder`
3. 驗證 `setEventMetrics()` 已被調用

#### Q3: 告警不觸發

**原因**: 告警規則配置不正確或條件未滿足

**解決方案**:
1. 驗證 Prometheus 告警規則語法
2. 檢查 Alertmanager 配置
3. 手動運行查詢確認數據存在

### 調試技巧

#### 1. 檢查 Metrics 收集

```typescript
const metrics = hookManager.getMetrics()
console.log('Metrics enabled:', metrics !== undefined)
```

#### 2. 手動觸發轉換進行測試

```typescript
// 觸發失敗導致熔斷器開啟
try {
  await hookManager.doActionAsync('test:event', {}, {
    circuitBreaker: { failureThreshold: 1 }
  })
} catch {}

// 檢查 Prometheus 查詢
const query = 'gravito_event_circuit_breaker_state{event_name="test:event"}'
```

#### 3. 查看日誌

CircuitBreaker 在狀態轉換時會輸出日誌：

```
[EventPriorityQueue] Circuit breaker opened for event 'order:created'
[EventPriorityQueue] Circuit breaker half-open for event 'order:created'
[EventPriorityQueue] Circuit breaker closed for event 'order:created'
```

## 最佳實踐

1. **合理設置告警閾值**
   - 不要設置過低的閾值，避免誤告警
   - 根據業務特點調整 `for` 時間窗口

2. **監控趨勢而非絕對值**
   - 使用 `rate()` 函數監控轉換速率
   - 分析 P95/P99 持續時間而非最大值

3. **定期檢查 Metrics**
   - 建立定期的 Metrics 審計流程
   - 識別異常模式

4. **文檔化自訂熔斷器配置**
   - 為不同事件記錄不同的閾值
   - 解釋為什麼選擇這些值

## 相關資源

- [CircuitBreaker 實現指南](./CIRCUIT_BREAKER_GUIDE.md)
- [可觀測性完整指南](./OBSERVABILITY_GUIDE.md)
- [Prometheus 官方文檔](https://prometheus.io/docs/)
- [PromQL 查詢語言](https://prometheus.io/docs/prometheus/latest/querying/basics/)
