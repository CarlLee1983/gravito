# Event System 可觀測性遷移指南

## 概述

本指南說明如何在現有的 Flash Sale 搶購系統中啟用 Event System 可觀測性。整個遷移過程需要約 3 小時，包括配置、驗證和測試。

## 遷移步驟

### Step 1: 環境準備（15 分鐘）

#### 1.1 檢查先決條件

```bash
# 檢查 Node.js/Bun 版本
bun --version  # 需要 >= 1.0

# 檢查依賴
bun list | grep @opentelemetry
```

#### 1.2 安裝可選依賴（如需分佈式追蹤）

```bash
# OpenTelemetry 核心依賴（已包含在 @gravito/core）
bun add @opentelemetry/api@^1.6.0
bun add @opentelemetry/sdk-metrics@^0.45.0
bun add @opentelemetry/exporter-prometheus@^0.45.0
```

**注意：** 如果使用 Prometheus 導出器，需要上述依賴。應用程序會自動處理缺失依賴。

### Step 2: 配置更新（20 分鐘）

#### 2.1 更新 gravito.config.ts

應用程序已預先配置，您可以驗證配置：

```typescript
// examples/flash-sale-fullstack/src/gravito.config.ts

observability: {
  enabled: process.env.OBSERVABILITY_ENABLED !== 'false',
  tracing: process.env.OBSERVABILITY_TRACING === 'true',
  metricsPrefix: process.env.OBSERVABILITY_METRICS_PREFIX || 'gravito_event_',
  prometheus: {
    enabled: process.env.PROMETHEUS_ENABLED !== 'false',
    port: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
    endpoint: process.env.PROMETHEUS_ENDPOINT || '/metrics',
  },
}
```

#### 2.2 創建或更新 .env 文件

複製 `.env.example` 並調整配置：

```bash
cp .env.example .env
```

編輯 `.env`：

```env
# 啟用可觀測性（推薦在所有環境啟用）
OBSERVABILITY_ENABLED=true

# 分佈式追蹤（開發環境啟用，生產環境關閉以節省性能）
OBSERVABILITY_TRACING=false

# Prometheus 配置
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
```

#### 2.3 驗證配置

```bash
# 檢查配置文件
grep -A 10 'observability' src/gravito.config.ts

# 檢查環境變數
env | grep OBSERVABILITY
```

### Step 3: 啟動驗證（30 分鐘）

#### 3.1 啟動應用程序

```bash
bun run src/app.ts
```

**預期日誌：**

```
[INFO] [Observability] Enabling event system observability
[DEBUG] [Observability] ObservableHookManager initialized
[INFO] [Observability] Prometheus metrics at http://localhost:9090/metrics
[INFO] [Observability] ✅ Event system observability enabled
```

#### 3.2 驗證 Prometheus 端點

```bash
# 測試端點
curl http://localhost:9090/metrics | head -20

# 搜索 gravito_event 指標
curl -s http://localhost:9090/metrics | grep gravito_event | wc -l
```

**預期：** 應看到至少 8 個 gravito_event_ 開頭的指標

#### 3.3 運行驗證腳本

```bash
bash scripts/verify-observability.sh
```

**預期輸出：**

```
🔍 開始 Event System 可觀測性驗證...
✅ 已可用...
✅ 找到指標: gravito_event_dispatch_duration_seconds
✅ 找到指標: gravito_event_queue_depth
...
✨ 可觀測性驗證完成！所有 8 個指標已找到
```

### Step 4: Prometheus 設置（20 分鐘）

#### 4.1 配置 Prometheus（如果使用獨立 Prometheus）

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'gravito-event-system'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: '/metrics'
```

**注意：** Flash Sale 應用程序內置了 Prometheus 導出器，無需單獨安裝

#### 4.2 加載告警規則

將 `monitoring/prometheus-alerts.yml` 複製到 Prometheus 告警目錄：

```bash
cp monitoring/prometheus-alerts.yml /path/to/prometheus/rules/
```

在 `prometheus.yml` 中引用：

```yaml
rule_files:
  - 'rules/*.yml'
```

重啟 Prometheus：

```bash
# 檢查配置有效性
promtool check config prometheus.yml

# 重啟服務
systemctl restart prometheus
```

### Step 5: Grafana 設置（25 分鐘）

#### 5.1 啟動 Grafana（如果尚未啟動）

```bash
# Docker
docker run -d -p 3000:3000 grafana/grafana

# 或本地安裝
brew services start grafana  # macOS
systemctl start grafana-server  # Linux
```

訪問 http://localhost:3000（預設用戶名/密碼：admin/admin）

#### 5.2 添加 Prometheus 數據源

1. 進入 **Configuration** → **Data Sources**
2. 點擊 **Add data source**
3. 選擇 **Prometheus**
4. 配置：
   - URL: `http://localhost:9090`
   - Access: Browser
5. 點擊 **Save & Test**

#### 5.3 導入 Dashboard

1. 進入 **Dashboards** → **Import**
2. 點擊 **Upload JSON file**
3. 選擇 `monitoring/grafana-event-system-dashboard.json`
4. 選擇 Prometheus 數據源
5. 點擊 **Import**

**預期：** Dashboard 加載 8 個 Panel，初始可能無數據（正常）

### Step 6: 性能測試（30 分鐘）

#### 6.1 生成測試流量

```bash
# 方案 1：使用 K6（推薦）
k6 run tests/k6/flash-sale-with-metrics.js

# 方案 2：使用 curl 腳本
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/orders \
    -H "Content-Type: application/json" \
    -d "{\"userId\":\"user-$i\",\"productId\":\"product-1\",\"quantity\":1}"
  sleep 0.1
done
```

#### 6.2 驗證指標記錄

在 Grafana Dashboard 中驗證：

1. 打開 Dashboard: **Gravito Event System - Flash Sale**
2. 檢查 Panel 數據：
   - [ ] Event Dispatch Latency - 應顯示曲線
   - [ ] Queue Depth by Priority - 應顯示隊列變化
   - [ ] Event Throughput - 應顯示 events/sec
   - [ ] Circuit Breaker State - 應顯示狀態

#### 6.3 驗證告警

檢查 Prometheus 告警狀態：

```bash
# 訪問 Prometheus UI
open http://localhost:9090/alerts

# 或使用 API
curl http://localhost:9090/api/v1/alerts
```

**預期：** 基於負載可能觸發告警（如隊列深度告警）

### Step 7: 文檔和交接（30 分鐘）

#### 7.1 更新團隊文檔

在您的內部文檔中添加：

```markdown
### Event System 可觀測性

- **Prometheus 端點：** http://localhost:9090/metrics
- **Grafana Dashboard：** Gravito Event System - Flash Sale
- **告警規則：** monitoring/prometheus-alerts.yml
- **K6 測試：** tests/k6/flash-sale-with-metrics.js
- **指南：** docs/EVENT_OBSERVABILITY_GUIDE.md
```

#### 7.2 培訓 DevOps 團隊

講解內容：

1. **指標含義**
   - 如何讀取 P95 延遲
   - 隊列深度監控
   - Circuit Breaker 狀態解釋

2. **告警響應**
   - 常見告警及原因
   - 故障排除步驟
   - Runbook 鏈接

3. **日常監控**
   - 檢查 Dashboard 頻率
   - 設置自定義告警
   - 性能趨勢分析

#### 7.3 建立監控清單

```markdown
# 日常監控清單

- [ ] 檢查 Event Dispatch Latency (P95 < 100ms)
- [ ] 驗證 Queue Depth (所有優先級 < 5000)
- [ ] 確認 Circuit Breaker 無開啟
- [ ] 檢查 Prometheus 指標計數 > 0
- [ ] 驗證 Grafana Dashboard 有數據
```

## 驗收清單

### 功能驗收

- [ ] ObservableHookManager 已正確初始化
- [ ] Prometheus 端點可訪問 (http://localhost:9090/metrics)
- [ ] 所有 8 個核心指標可見
- [ ] Grafana Dashboard 導入成功，8 個 Panel 有數據
- [ ] Prometheus 告警規則加載成功
- [ ] K6 測試成功運行，metrics_endpoint_success > 99%

### 性能驗收

- [ ] 指標收集延遲 < 0.1ms (P95)
- [ ] Prometheus 端點響應時間 < 50ms
- [ ] 啟用可觀測性後，P95 事件延遲增加 < 5%
- [ ] 無記憶體洩漏（24 小時運行測試）

### 文檔驗收

- [ ] EVENT_OBSERVABILITY_GUIDE.md 完整
- [ ] EVENT_OBSERVABILITY_MIGRATION.md 完整
- [ ] 所有代碼示例可執行
- [ ] Runbook 鏈接有效

## 回滾計劃

如需禁用可觀測性：

```bash
# 編輯 .env
OBSERVABILITY_ENABLED=false

# 重啟應用
bun run src/app.ts
```

**影響：**
- Prometheus 端點不可用
- ObservableHookManager 降級到標準 HookManager
- 無性能影響（完全向後兼容）

## 常見問題

### Q1: 可觀測性會影響性能嗎？

**A:** 非常小的影響（< 1%）。指標收集使用高效的直方圖，不阻塞事件派發。

### Q2: 分佈式追蹤有多大的性能開銷？

**A:** 約 5-10%。建議僅在開發環境或調試時啟用。

### Q3: 如何自定義指標？

**A:** 編輯 `gravito.config.ts` 的 `metricsPrefix`，或修改應用程序代碼調用 `eventMetrics` API。

### Q4: 可以在 Kubernetes 中使用嗎？

**A:** 可以。Prometheus 端點暴露於應用程序端口，可配置 ServiceMonitor 或 Prometheus 自動發現。

### Q5: 如何設置告警通知？

**A:** 配置 Prometheus Alertmanager，編輯 `alertmanager.yml` 並指定接收器（Slack、PagerDuty 等）。

## 支持和聯繫

- **文檔：** [EVENT_OBSERVABILITY_GUIDE.md](./EVENT_OBSERVABILITY_GUIDE.md)
- **問題報告：** https://github.com/gravito/gravito-core/issues
- **Slack 頻道：** #gravito-observability

## 下一步

遷移完成後：

1. **設置告警通知** - 配置 Slack/PagerDuty 集成
2. **創建自定義 Dashboard** - 根據業務需求定制
3. **建立響應流程** - 定義告警響應和升級程序
4. **性能基準測試** - 建立效能基線以檢測異常

## 時間表

| 步驟 | 預計時間 | 依賴 |
|------|---------|------|
| 環境準備 | 15 分鐘 | - |
| 配置更新 | 20 分鐘 | Step 1 |
| 啟動驗證 | 30 分鐘 | Step 2 |
| Prometheus 設置 | 20 分鐘 | Step 3 |
| Grafana 設置 | 25 分鐘 | Step 4 |
| 性能測試 | 30 分鐘 | Step 5 |
| 文檔交接 | 30 分鐘 | Step 6 |
| **總計** | **~3 小時** | - |

---

**版本：** 1.0  
**最後更新：** 2026-02-07
