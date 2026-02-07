# Retry System Monitoring & Alerting Guide

> 📊 **目標**：完整監控 Bull Queue 重試系統的性能、可靠性和健康狀態
> 🎯 **適用於**：運維、SRE、以及需要實時監控重試系統的團隊

---

## 目錄

1. [快速開始](#快速開始)
2. [Prometheus 指標](#prometheus-指標)
3. [告警規則](#告警規則)
4. [Grafana 儀表板](#grafana-儀表板)
5. [K6 性能測試](#k6-性能測試)
6. [監控最佳實踐](#監控最佳實踐)
7. [故障排除](#故障排除)

---

## 快速開始

### 前置條件

- Prometheus 0.37+（用於指標收集）
- Grafana 8.0+（用於可視化）
- K6 0.40+（用於性能測試，可選）
- Redis 6.0+（Bull Queue 後端）

### 部署步驟

#### 1. 複製配置文件

```bash
# Prometheus 告警規則
cp packages/core/monitoring/prometheus-retry-alerts.yml \
   /etc/prometheus/rules/

# Grafana 儀表板
cp packages/core/monitoring/grafana-retry-dashboard.json \
   /etc/grafana/provisioning/dashboards/
```

#### 2. 配置 Prometheus

在 `prometheus.yml` 中添加告警規則：

```yaml
rule_files:
  - 'rules/prometheus-retry-alerts.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']  # AlertManager 地址
```

重啟 Prometheus：

```bash
systemctl restart prometheus
```

#### 3. 配置 Grafana

使用 Grafana API 導入儀表板：

```bash
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @packages/core/monitoring/grafana-retry-dashboard.json
```

#### 4. 驗證設置

```bash
# 檢查 Prometheus 目標
curl http://localhost:9090/api/v1/targets

# 檢查告警規則
curl http://localhost:9090/api/v1/rules

# 檢查 Grafana 儀表板
curl http://localhost:3000/api/dashboards/uid/gravito-retry-system
```

---

## Prometheus 指標

### 核心指標

#### 1. Retry Queue Depth

**指標名稱**: `gravito_event_retry_queue_depth`

**類型**: Gauge
**維度**: `event_name`, `queue_name`

```promql
# 查詢特定事件的重試隊列深度
gravito_event_retry_queue_depth{event_name="order:created"}

# 查詢所有事件的總隊列深度
sum(gravito_event_retry_queue_depth)

# 查詢隊列深度增長趨勢
rate(gravito_event_retry_queue_depth[5m])
```

**告警閾值**:
- ⚠️ WARNING: > 500 任務（3 分鐘）
- 🔴 CRITICAL: > 2000 任務（1 分鐘）

#### 2. Retry Attempt Total

**指標名稱**: `gravito_event_retry_attempt_total`

**類型**: Counter
**維度**: `event_name`, `status` (success|failed), `retry_attempt`

```promql
# 查詢重試成功率
rate(gravito_event_retry_attempt_total{status="success"}[5m]) /
rate(gravito_event_retry_attempt_total[5m])

# 查詢特定事件的重試失敗率
rate(gravito_event_retry_attempt_total{event_name="payment:processed", status="failed"}[5m]) /
rate(gravito_event_retry_attempt_total{event_name="payment:processed"}[5m])

# 查詢重試嘗試分佈
sum by (retry_attempt) (rate(gravito_event_retry_attempt_total[5m]))
```

**告警閾值**:
- ⚠️ WARNING: > 30% 失敗率（5 分鐘）
- 🔴 CRITICAL: > 50% 失敗率（2 分鐘）

#### 3. DLQ Entry Total

**指標名稱**: `gravito_event_dlq_entry_total`

**類型**: Counter
**維度**: `event_name`, `source` (retry_exhausted|circuit_breaker|backpressure_overflow|manual)

```promql
# 查詢 DLQ 進入率
rate(gravito_event_dlq_entry_total[5m])

# 按源分類的 DLQ 進入率
rate(gravito_event_dlq_entry_total[5m]) by (source)

# 查詢特定事件的 DLQ 條目
sum by (event_name) (gravito_event_dlq_entry_total)
```

**告警閾值**:
- ⚠️ WARNING: > 1 條目/秒（5 分鐘）

#### 4. DLQ Size

**指標名稱**: `gravito_event_dlq_size`

**類型**: Gauge

```promql
# 查詢 DLQ 當前大小
gravito_event_dlq_size

# 監控 DLQ 增長趨勢
rate(gravito_event_dlq_size[5m])
```

**告警閾值**:
- 🔴 CRITICAL: > 5000 條目（3 分鐘）

#### 5. Retry Schedule Duration

**指標名稱**: `gravito_event_retry_schedule_duration_seconds`

**類型**: Histogram
**維度**: `event_name`

```promql
# 查詢排程延遲 P95
histogram_quantile(0.95, rate(gravito_event_retry_schedule_duration_seconds_bucket[5m]))

# 查詢排程延遲 P99
histogram_quantile(0.99, rate(gravito_event_retry_schedule_duration_seconds_bucket[5m]))

# 查詢排程延遲分佈
rate(gravito_event_retry_schedule_duration_seconds_bucket[5m])
```

**告警閾值**:
- ⚠️ WARNING: P95 > 1s（5 分鐘）

#### 6. Retry Delay Duration

**指標名稱**: `gravito_event_retry_delay_seconds`

**類型**: Histogram
**維度**: `event_name`, `retry_attempt`

```promql
# 查詢指數回退延遲 P95
histogram_quantile(0.95, rate(gravito_event_retry_delay_seconds_bucket[5m]))

# 驗證回退係數（應約為 2.0）
histogram_quantile(0.50, rate(gravito_event_retry_delay_seconds_bucket{retry_attempt="2"}[5m])) /
histogram_quantile(0.50, rate(gravito_event_retry_delay_seconds_bucket{retry_attempt="1"}[5m]))
```

#### 7. Backpressure Rejection Total

**指標名稱**: `gravito_event_backpressure_rejection_total`

**類型**: Counter
**維度**: `event_name`, `priority`, `reason` (OVERFLOW|CRITICAL|QUEUE_FULL|etc)

```promql
# 查詢 OVERFLOW 拒絕率
rate(gravito_event_backpressure_rejection_total{reason="OVERFLOW"}[5m])

# 按優先級分類的拒絕
rate(gravito_event_backpressure_rejection_total[5m]) by (priority)
```

**告警閾值**:
- ⚠️ WARNING: OVERFLOW > 0.5 次/秒（2 分鐘）
- 🔴 CRITICAL: OVERFLOW > 1 次/秒（5 分鐘，持續）

---

## 告警規則

### 已配置的告警

查看 `prometheus-retry-alerts.yml` 了解完整的告警規則列表。

#### 關鍵告警

| 告警名稱 | 嚴重度 | 觸發條件 | 建議行動 |
|---------|--------|---------|---------|
| RetryQueueDepthHigh | ⚠️ WARNING | 隊列 > 500（3m） | 檢查事件監聽器性能 |
| RetryQueueDepthCritical | 🔴 CRITICAL | 隊列 > 2000（1m） | 立即擴展監聽器或檢查故障 |
| HighRetryFailureRate | ⚠️ WARNING | 失敗率 > 30%（5m） | 檢查事件來源或監聽器邏輯 |
| CriticalRetryFailureRate | 🔴 CRITICAL | 失敗率 > 50%（2m） | 重大故障，檢查系統日誌 |
| HighDLQEntryRate | ⚠️ WARNING | DLQ > 1/s（5m） | 檢查失敗事件，考慮手動恢復 |
| DLQDepthCritical | 🔴 CRITICAL | DLQ 大小 > 5000（3m） | 立即調查，可能需要資料庫恢復 |
| BackpressureOverflowDetected | ⚠️ WARNING | OVERFLOW > 0.5/s（2m） | 監控系統負載，檢查背壓配置 |
| PersistentBackpressureOverflow | 🔴 CRITICAL | OVERFLOW > 1/s（5m） | 系統過載，啟動容量規劃 |
| RetrySchedulerQueueStuck | 🔴 CRITICAL | 10m 無進展 + 隊列 > 100 | RetryScheduler 可能卡住，重啟 |
| HighRetrySchedulerLatency | ⚠️ WARNING | 排程延遲 P95 > 1s（5m） | Bull Queue 或 Redis 效能問題 |

---

## Grafana 儀表板

### 儀表板概覽

**儀表板 ID**: `gravito-retry-system`
**刷新頻率**: 30 秒

### 面板說明

#### 1. Retry Queue Depth by Event Name
- **類型**: 時序圖
- **用途**: 監控各個事件的重試隊列堆積情況
- **解讀**: 健康狀態應保持在 500 以下

#### 2. Total Retry Queue Depth (Gauge)
- **類型**: 儀表
- **用途**: 一眼看出系統總隊列深度
- **顏色代碼**:
  - 🟢 綠色: < 500
  - 🟡 黃色: 500-2000
  - 🔴 紅色: > 2000

#### 3. Retry Success Rate by Event
- **類型**: 時序圖（表格圖例）
- **用途**: 監控各事件的重試成功率
- **目標**: 應 > 80% 表示系統健康

#### 4. DLQ Entry Rate by Source
- **類型**: 堆疊面積圖
- **用途**: 監控 DLQ 條目進入來源分佈
- **來源分類**:
  - `retry_exhausted`: 重試次數用盡
  - `circuit_breaker`: 熔斷器打開
  - `backpressure_overflow`: 背壓溢位
  - `manual`: 手動操作

#### 5. DLQ Size (Gauge)
- **類型**: 儀表
- **用途**: DLQ 當前大小
- **警告閾值**: > 5000

#### 6. Exponential Backoff Delays (P95/P50)
- **類型**: 時序圖
- **用途**: 驗證指數回退延遲計算正確性
- **驗證**: P95/P50 比率應約為 2.0

#### 7. Retry Attempt Distribution
- **類型**: 柱狀圖
- **用途**: 顯示重試嘗試分佈
- **分析**: 健康系統大多在第 1-2 次嘗試成功

---

## K6 性能測試

### 運行測試

#### 基本運行

```bash
# 使用預設配置
k6 run packages/core/tests/k6/retry-system-load.js

# 指定自定義 BASE_URL
k6 run --env BASE_URL=http://staging.example.com \
  packages/core/tests/k6/retry-system-load.js
```

#### 高級運行

```bash
# 輸出詳細指標
k6 run --out json=result.json \
  packages/core/tests/k6/retry-system-load.js

# 發送到 Prometheus
k6 run --out prometheus=http://localhost:9090 \
  packages/core/tests/k6/retry-system-load.js

# 自定義虛擬用戶和持續時間
k6 run -u 100 -d 30m \
  packages/core/tests/k6/retry-system-load.js
```

### 測試場景

測試包含以下場景：

1. **預熱階段** (0→50 VU, 2m)
   - 漸進式增加負載，穩定系統狀態

2. **正常負載** (50 VU, 5m)
   - 驗證正常操作下的性能

3. **尖峰測試** (50→200 VU, 3m)
   - 測試背壓和 OVERFLOW 處理

4. **降載** (200→0 VU, 1m)
   - 驗證系統優雅降級

### 驗收標準

```
✅ P95 延遲 < 500ms
✅ P99 延遲 < 1000ms
✅ 失敗率 < 10%
✅ 無內存洩漏
```

---

## 監控最佳實踐

### 1. 告警聯繫方式配置

在 AlertManager 中配置通知管道：

```yaml
receivers:
  - name: 'retry-system'
    slack_configs:
      - api_url: 'https://hooks.slack.com/...'
        channel: '#alerts-retry-system'
        title: 'Retry System Alert'
    pagerduty_configs:
      - service_key: '...'
        severity: 'critical'
```

### 2. 定期檢查

- **每天**: 檢查 DLQ 大小，確保無過度堆積
- **每週**: 審視重試失敗率趨勢，識別問題模式
- **每月**: 性能基準測試，驗證系統效率未下降

### 3. 容量規劃

根據以下指標進行容量規劃：

```promql
# 平均隊列深度
avg(gravito_event_retry_queue_depth)

# 峰值隊列深度
max(gravito_event_retry_queue_depth)

# 平均重試率
avg(rate(gravito_event_retry_attempt_total[5m]))

# DLQ 增長速度
rate(gravito_event_dlq_size[1h])
```

### 4. SLO 定義

建議的 SLO：

| 指標 | 目標 | 測量周期 |
|------|------|---------|
| 重試成功率 | > 90% | 每日 |
| P95 延遲 | < 500ms | 每小時 |
| OVERFLOW 率 | < 0.5/s | 持續 |
| DLQ 進入率 | < 1/s | 持續 |

---

## 故障排除

### 場景 1: 重試隊列持續增長

**症狀**: `gravito_event_retry_queue_depth` 不斷增加

**原因分析**:
1. 監聽器性能下降
2. 重試指數回退延遲過長
3. Redis 連接超時

**解決步驟**:

```bash
# 1. 檢查監聽器執行時間
curl http://localhost:3000/metrics | grep gravito_event_listener_duration

# 2. 檢查 Redis 連接
redis-cli ping

# 3. 檢查重試佇列大小
curl http://localhost:3000/api/metrics/retry-queues

# 4. 考慮增加監聽器實例或優化邏輯
```

### 場景 2: 高 DLQ 進入率

**症狀**: `gravito_event_dlq_entry_total` 快速增長

**原因分析**:
1. 事件來源問題（格式錯誤、依賴故障）
2. 監聽器邏輯錯誤
3. 資料庫連接故障

**解決步驟**:

```bash
# 1. 檢查 DLQ 條目詳情
curl http://localhost:3000/api/dlq/latest?limit=10

# 2. 分析錯誤原因
curl http://localhost:3000/api/dlq/stats-by-source

# 3. 手動恢復（如必要）
curl -X POST http://localhost:3000/api/dlq/retry/[dlq-id]
```

### 場景 3: OVERFLOW 拒絕率高

**症狀**: `gravito_event_backpressure_rejection_total{reason="OVERFLOW"}` 持續增加

**原因分析**:
1. 系統過載
2. 背壓配置過於激進
3. 隊列處理能力不足

**解決步驟**:

```bash
# 1. 檢查當前負載
curl http://localhost:3000/api/metrics/current-load

# 2. 調整背壓配置
curl -X POST http://localhost:3000/api/config/backpressure \
  -H "Content-Type: application/json" \
  -d '{
    "maxQueueSize": 2000,
    "overflowRetryStrategy": "delayed",
    "overflowRetryDelayMs": 5000
  }'

# 3. 檢查隊列深度趨勢
curl http://localhost:3000/metrics | grep gravito_event_queue_depth
```

### 場景 4: RetryScheduler 卡住

**症狀**: 告警 `RetrySchedulerQueueStuck`

**原因分析**:
1. Bull Queue 連接失敗
2. Redis 故障
3. Worker 進程崩潰

**解決步驟**:

```bash
# 1. 檢查 Bull Queue 狀態
redis-cli
> KEYS "bull:*"  # 查看隊列鍵

# 2. 檢查 Worker 進程
ps aux | grep worker

# 3. 檢查 Redis 連接
redis-cli INFO server

# 4. 重啟 RetryScheduler（如必要）
systemctl restart retry-scheduler-service
```

---

## 參考資源

- [Bull Queue 文檔](https://docs.bullmq.io/)
- [Prometheus 查詢語言](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana 儀表板指南](https://grafana.com/docs/grafana/latest/dashboards/)
- [K6 性能測試](https://k6.io/docs/)

---

## 支持與反饋

如有問題或建議，請提交 Issue 或聯繫運維團隊。

**最後更新**: 2026-02-07
**版本**: Phase 4 完整版
