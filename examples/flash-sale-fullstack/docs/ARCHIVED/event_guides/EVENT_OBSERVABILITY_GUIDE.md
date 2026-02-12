# Event System 可觀測性使用指南

## 概述

本指南說明如何在 Flash Sale 搶購系統中使用 Event System 可觀測性功能，以監控事件派發延遲、隊列深度、Circuit Breaker 狀態等關鍵指標。

## 快速開始

### 1. 配置環境變數

創建或複製 `.env` 文件：

```bash
cp .env.example .env
```

確保啟用可觀測性（預設已啟用）：

```bash
# .env
OBSERVABILITY_ENABLED=true
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
```

### 2. 啟動應用程序

```bash
bun run src/app.ts
```

預期日誌輸出：

```
[INFO] [Observability] Enabling event system observability
[INFO] [Observability] Prometheus metrics at http://localhost:9090/metrics
[INFO] [Observability] ✅ Event system observability enabled
```

### 3. 驗證可觀測性

運行驗證腳本：

```bash
bash scripts/verify-observability.sh
```

或手動檢查 Prometheus 端點：

```bash
curl http://localhost:9090/metrics | grep gravito_event_
```

### 4. 導入 Grafana Dashboard

1. 打開 Grafana UI: http://localhost:3000
2. 進入 **Dashboards** → **Import**
3. 選擇文件: `monitoring/grafana-event-system-dashboard.json`
4. 選擇 Prometheus 數據源
5. 點擊 **Import**

## 可用指標

### 事件派發指標

#### `gravito_event_dispatch_duration_seconds` (Histogram)

事件派發耗時分佈，支持 P50/P95/P99 分位數計算。

**維度：**
- `event_name`: 事件名稱（如 `order:created`）
- `priority`: 優先級（`high`, `normal`, `low`）

**Prometheus 查詢示例：**

```promql
# P95 延遲（所有事件）
histogram_quantile(0.95, rate(gravito_event_dispatch_duration_seconds_bucket[5m]))

# 特定事件的延遲
histogram_quantile(0.95, rate(gravito_event_dispatch_duration_seconds_bucket{event_name="order:created"}[5m]))

# 按優先級查看
histogram_quantile(0.95, rate(gravito_event_dispatch_duration_seconds_bucket{priority="high"}[5m]))
```

**正常範圍：** < 100ms (P95)

### 隊列指標

#### `gravito_event_queue_depth` (Gauge)

當前隊列深度，按優先級分組。

**維度：**
- `priority`: `high`, `normal`, `low`

**Prometheus 查詢示例：**

```promql
# 當前隊列深度（按優先級）
gravito_event_queue_depth

# 高優先級隊列深度
gravito_event_queue_depth{priority="high"}

# 隊列增長趨勢
rate(gravito_event_queue_depth[5m])
```

**警告閾值：**
- 高優先級 > 1000
- 總隊列深度 > 5000

### 監聽器指標

#### `gravito_event_listener_duration_seconds` (Histogram)

監聽器執行耗時分佈。

**維度：**
- `event_name`: 事件名稱
- `listener_index`: 監聽器索引（0-based）

**Prometheus 查詢示例：**

```promql
# 監聽器 P95 延遲
histogram_quantile(0.95, rate(gravito_event_listener_duration_seconds_bucket[5m]))

# 特定事件的監聽器延遲
histogram_quantile(0.95, rate(gravito_event_listener_duration_seconds_bucket{event_name="order:created"}[5m]))
```

**正常範圍：** < 50ms (P95)

### Circuit Breaker 指標

#### `gravito_event_circuit_breaker_state` (Gauge)

Circuit Breaker 當前狀態。

**狀態值：**
- `0`: CLOSED（正常）
- `1`: HALF_OPEN（恢復中）
- `2`: OPEN（斷開）

**維度：**
- `event_name`: 事件名稱
- `listener_index`: 監聽器索引

**Prometheus 查詢示例：**

```promql
# 所有開啟的 Circuit Breaker
count(gravito_event_circuit_breaker_state == 2)

# 特定事件的 Circuit Breaker 狀態
gravito_event_circuit_breaker_state{event_name="order:created"}

# OPEN 狀態的 Circuit Breaker（告警用）
gravito_event_circuit_breaker_state == 2
```

#### `gravito_event_circuit_breaker_failures_total` (Counter)

Circuit Breaker 記錄的失敗次數。

**Prometheus 查詢示例：**

```promql
# 失敗速率
rate(gravito_event_circuit_breaker_failures_total[5m])

# 累計失敗數
gravito_event_circuit_breaker_failures_total
```

#### `gravito_event_circuit_breaker_successes_total` (Counter)

Circuit Breaker 記錄的成功次數。

#### `gravito_event_circuit_breaker_transitions_total` (Counter)

Circuit Breaker 狀態轉換次數。

#### `gravito_event_circuit_breaker_open_duration_seconds` (Histogram)

Circuit Breaker 保持 OPEN 狀態的耗時。

## Grafana Dashboard 說明

Dashboard 包含 8 個 Panel：

| Panel | 指標 | 說明 |
|-------|------|------|
| 1 | Event Dispatch Latency (P95) | 事件派發延遲分佈 |
| 2 | Queue Depth by Priority | 各優先級隊列深度 |
| 3 | Event Throughput (events/sec) | 事件吞吐量 |
| 4 | Circuit Breaker State | 各事件的 CB 狀態 |
| 5 | Listener Execution Duration | 監聽器執行延遲 |
| 6 | Circuit Breaker Failures | CB 失敗速率 |
| 7 | Circuit Breaker Open Duration | CB 開啟持續時間 |
| 8 | Circuit Breaker Transitions | CB 狀態轉換次數 |

## Prometheus 告警規則

已配置 8 個告警規則，詳見 `monitoring/prometheus-alerts.yml`。

### 關鍵告警

| 告警 | 條件 | 嚴重程度 |
|------|------|---------|
| HighEventDispatchLatency | P95 > 0.8s（5分鐘） | CRITICAL |
| HighPriorityQueueBacklog | 高優先級隊列 > 1000 | WARNING |
| QueueDepthCritical | 總隊列深度 > 5000 | CRITICAL |
| CircuitBreakerOpen | CB 持續開啟 5 分鐘 | WARNING |
| HighCircuitBreakerFailureRate | 失敗速率 > 5/s | CRITICAL |

## 性能測試

運行 K6 性能測試以驗證可觀測性：

```bash
k6 run tests/k6/flash-sale-with-metrics.js
```

測試將驗證：
- Prometheus 端點可訪問性
- 所有 8 個核心指標存在
- 指標數據正確記錄

**預期結果：**
- Metrics endpoint success rate > 99%
- Prometheus metrics count ≥ 8

## 最佳實踐

### 1. 指標命名

遵循 `gravito_event_<metric_type>_<name>` 的命名約定：

```promql
# ✅ 好
gravito_event_dispatch_duration_seconds
gravito_event_queue_depth

# ❌ 不好
event_dispatch_time
queue_length
```

### 2. 標籤使用

使用一致的標籤進行分組：

```promql
# ✅ 推薦
histogram_quantile(0.95, rate(gravito_event_dispatch_duration_seconds_bucket{event_name="order:created"}[5m]))

# ⚠️  避免高基數標籤
rate(gravito_event_dispatch_duration_seconds_bucket{user_id="xyz"}[5m])  # 不建議
```

### 3. 告警配置

根據業務需求調整閾值：

```yaml
# 編輯 monitoring/prometheus-alerts.yml
- alert: HighEventDispatchLatency
  expr: histogram_quantile(0.95, ...) > 0.8  # 根據需要調整
```

### 4. 告警消息

使用 Slack 或 PagerDuty 集成接收通知：

```yaml
# Prometheus alertmanager 配置
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#alerts'
```

## 故障排除

### 問題 1: Prometheus 端點無響應

**症狀：** `curl http://localhost:9090/metrics` 返回 503 或超時

**解決方案：**

1. 檢查應用程序日誌：
```bash
grep -i observability logs/app.log
```

2. 驗證 PROMETHEUS_PORT 未被佔用：
```bash
lsof -i :9090
```

3. 確認 @opentelemetry/exporter-prometheus 已安裝：
```bash
npm list @opentelemetry/exporter-prometheus
```

### 問題 2: 指標計數為 0

**症狀：** `gravito_event_dispatch_duration_seconds_count` 為 0

**解決方案：**

1. 確保應用程序處理事件：
```bash
curl -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" -d '{"userId":"test","productId":"product-1","quantity":1}'
```

2. 等待 2-5 秒讓指標記錄

3. 檢查應用程序是否啟用可觀測性：
```bash
grep -i observability .env
```

### 問題 3: Grafana 無法連接 Prometheus

**症狀：** Dashboard Panel 顯示 "No Data"

**解決方案：**

1. 在 Grafana 中添加數據源：
   - 進入 **Configuration** → **Data Sources**
   - 添加 Prometheus，URL: http://localhost:9090
   - 點擊 **Save & Test**

2. 驗證 Prometheus 可訪問：
```bash
curl http://localhost:9090/api/v1/query?query=up
```

## 高級配置

### 啟用分佈式追蹤

編輯 `.env`：

```bash
OBSERVABILITY_TRACING=true
```

**注意：** 會增加 5-10% 的性能開銷

### 自定義指標前綴

```bash
OBSERVABILITY_METRICS_PREFIX=my_app_events_
```

### 自定義 Prometheus 端口

```bash
PROMETHEUS_PORT=9091
```

## 相關資源

- [Prometheus 官方文檔](https://prometheus.io/docs/)
- [Grafana 官方文檔](https://grafana.com/docs/)
- [OpenTelemetry 官方文檔](https://opentelemetry.io/docs/)
- [Gravito Event System 架構](../../WHITEPAPER_ZH_TW.md)

## 支持

遇到問題？請提交 Issue：

https://github.com/gravito/gravito-core/issues

或查閱 [Event Observability Migration Guide](./EVENT_OBSERVABILITY_MIGRATION.md)
