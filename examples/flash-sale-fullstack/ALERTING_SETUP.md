# Flash Sale 告警系統設置指南（P0.2）

**文檔版本**：v1.0
**最後更新**：2026-02-10
**狀態**：實施中

---

## 📋 概覽

此指南説明如何設置和配置 Flash Sale 的 Prometheus 監控和 AlertManager 告警系統。

---

## 🚀 快速開始

### 1. 啟動告警基礎設施

```bash
# 重新啟動 Docker 服務（包含 AlertManager）
docker-compose down
docker-compose up -d

# 驗證所有服務
docker-compose ps
```

### 2. 驗證各個組件狀態

```bash
# Prometheus
curl -s http://localhost:9090/api/v1/rules | jq '.data.groups | length'

# AlertManager
curl -s http://localhost:9093/api/v1/status | jq '.config'

# Grafana
curl -s http://localhost:3001/api/health | jq '.status'
```

---

## 📊 告警規則詳解

### 告警規則文件位置

```
alerting/
├── prometheus-alerts.yml      # Prometheus 告警規則定義
├── alertmanager-config.yml    # AlertManager 路由和接收器配置
```

### 主要告警組（P0.2.1）

#### 1. 延遲告警

| 告警名 | 條件 | 嚴重級別 | 說明 |
|--------|------|---------|------|
| HighP95Latency | P95 > 20ms 持續 5m | warning | 輕度性能下降 |
| VeryHighP95Latency | P95 > 50ms 持續 2m | critical | 嚴重性能問題 |
| HighP99Latency | P99 > 50ms 持續 5m | warning | 尾部延遲過高 |

**查詢語句**：
```promql
# P95 延遲
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.02

# P99 延遲
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 0.05
```

#### 2. 錯誤率告警

| 告警名 | 條件 | 嚴重級別 |
|--------|------|---------|
| HighErrorRate | 5xx 錯誤 > 0.1% | warning |
| CriticalErrorRate | 5xx 錯誤 > 1% | critical |
| HighClientErrorRate | 4xx 錯誤 > 5% | info |

**查詢語句**：
```promql
# 5xx 錯誤率
rate(http_requests_total{status=~"5.."}[5m]) > 0.001

# 4xx 錯誤率
rate(http_requests_total{status=~"4.."}[5m]) > 0.05
```

#### 3. 業務層告警

| 告警名 | 條件 | 說明 |
|--------|------|------|
| JobQueueBacklog | 待處理任務 > 1000 | 隊列堆積 |
| HighJobFailureRate | Job 失敗率 > 1% | 任務失敗過多 |

#### 4. 數據庫告警

| 告警名 | 條件 | 嚴重級別 |
|--------|------|---------|
| HighDatabaseConnections | 活躍連接 > 8/10 | warning |
| DatabaseConnectionExhausted | 活躍連接 >= 10/10 | critical |
| HighDatabaseQueryTime | 平均查詢時間 > 100ms | warning |

#### 5. 可用性告警

| 告警名 | 條件 | 嚴重級別 |
|--------|------|---------|
| ServiceDown | 服務無法訪問 > 1m | critical |
| DatabaseDown | 數據庫無法訪問 > 1m | critical |
| RedisDown | Redis 無法訪問 > 1m | critical |

---

## 🔔 通知渠道配置（P0.2.2）

### Slack 集成

#### 1. 創建 Slack Webhook

1. 訪問 Slack App Directory: https://api.slack.com/apps
2. 創建新應用或選擇現有應用
3. 在 "Incoming Webhooks" 中啟用
4. 創建新 Webhook，指向您的頻道（例如 #flash-sale-alerts）
5. 複製 Webhook URL

#### 2. 配置環境變數

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

#### 3. 測試 Slack 通知

```bash
# 重啟 AlertManager 使新配置生效
docker-compose restart alertmanager

# 手動觸發測試告警
docker-compose exec -T prometheus \
  curl -X POST http://alertmanager:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "status": "firing",
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning"
    },
    "annotations": {
      "summary": "Test Alert from Prometheus"
    }
  }]'
```

### Email 通知

#### 1. 配置 SMTP 參數

```bash
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USERNAME="your-email@gmail.com"
export SMTP_PASSWORD="your-app-password"  # 不是普通密碼，需要使用應用密碼
export SMTP_FROM="alerts@flash-sale.local"
export CRITICAL_ALERT_EMAIL="ops@example.com"
export WARNING_ALERT_EMAIL="dev@example.com"
```

#### 2. Gmail 應用密碼設置

1. 訪問 https://myaccount.google.com/security
2. 啟用兩步驗證
3. 創建應用密碼
4. 使用生成的密碼作為 `SMTP_PASSWORD`

### Webhook 自定義（高級）

如果需要集成自定義系統：

```bash
export WEBHOOK_URL="https://your-system.example.com/alerts/webhook"
```

您的系統應該實現以下端點：

```bash
POST /alerts/webhook
Content-Type: application/json

{
  "alerts": [
    {
      "status": "firing|resolved",
      "labels": {
        "alertname": "AlertName",
        "severity": "critical|warning|info"
      },
      "annotations": {
        "summary": "Alert summary",
        "description": "Detailed description"
      }
    }
  ]
}
```

---

## 📊 Grafana 儀表板（P0.2.3）

### 預設儀表板

系統包含一個預配置的 Grafana 儀表板 "Flash Sale 性能監控"，展示：

1. **HTTP 延遲分位數** - P50/P95/P99 實時追蹤
2. **QPS 分布** - 按狀態碼分類的請求速率
3. **成功率** - 實時成功率百分比
4. **5xx 錯誤速率** - 服務器錯誤趨勢
5. **隊列任務** - 待處理任務數
6. **數據庫連接** - 活躍連接使用情況

### 訪問儀表板

```bash
# 訪問 Grafana
http://localhost:3001

# 登錄
用戶名: admin
密碼: admin

# 查看 Flash Sale 儀表板
Dashboards → Flash Sale → Flash Sale 性能監控
```

### 自定義儀表板

您可以在 Grafana UI 中編輯儀表板：

1. 打開儀表板
2. 點擊 "Edit" 按鈕
3. 添加、編輯或刪除面板
4. 保存變更

變更將自動保存到 Grafana 數據庫。

---

## 🧪 告警測試（P0.2.4）

### 測試 1：延遲告警

#### 模擬高延遲

```bash
# 使用 k6 進行壓力測試
cd examples/flash-sale-fullstack
bun run test:load

# 監控 Prometheus
# http://localhost:9090/graph?expr=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# 在 AlertManager 中查看告警
# http://localhost:9093
```

**預期結果**：
- ✅ P95 延遲增加
- ✅ HighP95Latency 告警觸發
- ✅ Slack 收到通知（如配置）
- ✅ Grafana 儀表板顯示告警狀態

### 測試 2：錯誤率告警

#### 模擬錯誤

```bash
# 配置應用返回錯誤
# 修改 src/app.ts 或路由器返回 500

# 監控告警
curl -s http://localhost:9093/api/v1/alerts | jq '.data'
```

**預期結果**：
- ✅ HighErrorRate 告警觸發
- ✅ CriticalErrorRate 告警（錯誤率 > 1%）
- ✅ 通知發送

### 測試 3：告警消除

```bash
# 停止壓力測試
# 等待 5 分鐘

# 檢查告警狀態
curl -s http://localhost:9093/api/v1/alerts | jq '.data[] | select(.status == "resolved")'
```

**預期結果**：
- ✅ 告警自動消除
- ✅ 發送 "resolved" 通知

### 測試 4：告警抑制

```bash
# 模擬服務宕機
docker-compose stop flash-sale-app

# 等待 1 分鐘

# 檢查 AlertManager 中的告警
# 應該看到 "ServiceDown" 告警
# 其他告警應該被抑制（inhibit_rules）
curl -s http://localhost:9093/api/v1/alerts | jq '.data'
```

---

## 📝 告警規則編輯

### 添加新告警規則

1. 編輯 `alerting/prometheus-alerts.yml`
2. 在相應組下添加新規則

```yaml
- alert: MyNewAlert
  expr: some_metric > 100
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "My alert summary"
    description: "{{ $value }} is high"
```

3. 重新加載 Prometheus

```bash
# 方法 1：重啟容器
docker-compose restart prometheus

# 方法 2：使用 API（如啟用了 --web.enable-lifecycle）
curl -X POST http://localhost:9090/-/reload
```

### 編輯通知規則

1. 編輯 `alerting/alertmanager-config.yml`
2. 修改 `route` 或 `receivers` 部分
3. 重啟 AlertManager

```bash
docker-compose restart alertmanager
```

---

## 🐛 故障排除

### 問題：Prometheus 無法加載告警規則

**症狀**：
```
Error loading rules: error parsing rules
```

**排查**：
```bash
# 驗證 YAML 語法
docker run -it --rm -v $(pwd)/alerting:/etc/prometheus alpine \
  sh -c 'apk add --no-cache yamllint && yamllint /etc/prometheus/prometheus-alerts.yml'

# 查看 Prometheus 日誌
docker-compose logs prometheus | grep -i alert
```

### 問題：AlertManager 無法連接

**症狀**：
```
Alertmanager unreachable
```

**排查**：
```bash
# 檢查 AlertManager 是否運行
docker-compose ps | grep alertmanager

# 檢查端口
curl http://localhost:9093

# 查看 AlertManager 日誌
docker-compose logs alertmanager
```

### 問題：Slack 通知未收到

**症狀**：告警觸發但沒有 Slack 消息

**排查**：
```bash
# 檢查 Webhook URL
echo $SLACK_WEBHOOK_URL

# 測試 Webhook
curl -X POST $SLACK_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{"text": "Test message"}'

# 查看 AlertManager 日誌
docker-compose logs alertmanager | grep -i slack
```

---

## 📚 PromQL 查詢示例

### 性能指標

```promql
# QPS（每秒請求數）
rate(http_requests_total[5m])

# 平均延遲
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# 成功率
rate(http_requests_total{status=~"2.."}[5m]) / rate(http_requests_total[5m])

# 錯誤率
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# 特定端點的 P95 延遲
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{endpoint="/api/orders"}[5m]))
```

### 業務指標

```promql
# 隊列待處理任務
queue_jobs_pending

# Job 完成速率
rate(queue_jobs_completed_total[5m])

# Job 失敗率
rate(queue_jobs_failed_total[5m]) / rate(queue_jobs_total[5m])
```

### 資源指標

```promql
# 數據庫連接使用率
db_pool_active_connections / 10

# 內存使用率
process_resident_memory_bytes / 1073741824

# GC 暫停時間
go_gc_duration_seconds_sum
```

---

## 📖 後續步驟

- [ ] 配置 Email 通知
- [ ] 配置 Slack 集成
- [ ] 執行告警規則測試（P0.2.4）
- [ ] 優化告警閾值（基於生產數據）
- [ ] 創建運維手冊
- [ ] 進行 P0.3（連接池優化）

---

## 🔗 參考資源

- [Prometheus 告警規則](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [AlertManager 文檔](https://prometheus.io/docs/alerting/latest/overview/)
- [Grafana 儀表板](https://grafana.com/grafana/dashboards/)
- [PromQL 查詢](https://prometheus.io/docs/prometheus/latest/querying/basics/)

---

**文檔版本**：v1.0 - P0.2 實施中
**維護者**：Flash Sale 開發團隊
