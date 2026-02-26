# 監控和可觀測性（@gravito/monitor）

本示例使用 `@gravito/monitor` 實現完整的可觀測性解決方案，涵蓋健康檢查、指標收集和分布式追蹤。

## 🏗️ 架構

```
應用
  ↓
[Monitor Orbit]
  ├─ [Health Registry]
  │  ├─ Database check
  │  ├─ Redis check
  │  ├─ Queue check
  │  └─ Cache check
  │
  ├─ [Metrics Registry]
  │  ├─ Counter（訂單、支付、庫存）
  │  ├─ Gauge（活躍計數、可用性）
  │  └─ Histogram（延遲分布）
  │
  └─ [Tracing Manager]
     └─ OpenTelemetry OTLP 追蹤
```

## 🏥 健康檢查

提供三種健康檢查端點，支持 Kubernetes 部署：

### 端點

- **`GET /health`** - 完整健康報告
  ```json
  {
    "status": "healthy",
    "timestamp": "2024-02-26T10:30:00Z",
    "uptime": 3600000,
    "checks": {
      "database": {
        "status": "healthy",
        "latency": 12,
        "details": { "driver": "postgres" }
      },
      "redis": {
        "status": "healthy",
        "latency": 5
      }
    }
  }
  ```

- **`GET /ready`** - Kubernetes 就緒探針（readiness probe）
  - 當所有關鍵依賴就緒時返回 200
  - 用於流量路由決策

- **`GET /live`** - Kubernetes 存活探針（liveness probe）
  - 當應用程序正在運行時返回 200
  - 用於自動重啟故障實例

### 健康檢查項

| 檢查 | 目的 | 失敗後果 |
|------|------|--------|
| **database** | 檢查資料庫連接 | 無法查詢數據 |
| **redis** | 檢查快取服務 | 快取層失效，回退到 DB |
| **queue-service** | 檢查隊列系統 | 無法處理異步任務 |
| **cache-system** | 檢查多層快取 | 性能下降 |
| **payment-service** | 檢查支付閘道 | 無法接受訂單 |
| **inventory-lock** | 檢查庫存鎖定服務 | 無法防止超賣 |

## 📊 指標（Prometheus 格式）

端點：**`GET /metrics`**

### 訂單指標

```
# 已創建訂單總數
flash_sale_orders_created_total 1234

# 已完成訂單
flash_sale_orders_completed_total 1100

# 失敗的訂單
flash_sale_orders_failed_total 15

# 訂單處理時間分布（秒）
flash_sale_order_processing_seconds_bucket{le="0.1"} 200
flash_sale_order_processing_seconds_bucket{le="0.5"} 850
flash_sale_order_processing_seconds_bucket{le="1"} 1050
flash_sale_order_processing_seconds_bucket{le="5"} 1200

# 當前活躍訂單
flash_sale_active_orders 19
```

### 支付指標

```
# 按支付方式統計
flash_sale_payments_initiated_total{payment_method="credit_card"} 500
flash_sale_payments_initiated_total{payment_method="alipay"} 300

# 支付成功
flash_sale_payments_completed_total 750

# 按失敗原因統計
flash_sale_payments_failed_total{failure_reason="network_error"} 20
flash_sale_payments_failed_total{failure_reason="insufficient_funds"} 10

# 支付處理時間（秒）
flash_sale_payment_processing_seconds_bucket{le="0.1"} 100
flash_sale_payment_processing_seconds_bucket{le="0.5"} 650
flash_sale_payment_processing_seconds_bucket{le="1"} 750
```

### 庫存指標

```
# 按商品統計
flash_sale_inventory_deductions_total{product_id="prod_123"} 500
flash_sale_inventory_deductions_total{product_id="prod_456"} 300

# 庫存恢復
flash_sale_inventory_restores_total 35

# 庫存鎖定
flash_sale_inventory_locked_total 800

# 可用庫存
flash_sale_available_inventory{product_id="prod_123"} 250
flash_sale_available_inventory{product_id="prod_456"} 1500
```

### 快閃活動指標

```
# 當前活躍快閃活動數量
flash_sale_flash_sales_active 3

# 活動頁面瀏覽
flash_sale_flash_sales_views_total{sale_id="sale_2024_feb"} 50000

# 活動轉化（實際購買）
flash_sale_flash_sales_conversions_total{sale_id="sale_2024_feb"} 1200
```

## 🔍 分布式追蹤（OpenTelemetry）

通過 OpenTelemetry OTLP 進行分布式追蹤，支持：

- **Jaeger**：本地開發
- **Tempo**：Grafana 生態
- **Datadog**：商業解決方案

### 配置

環境變量控制：

```bash
# 啟用追蹤
OTEL_TRACING_ENABLED=true

# OTLP 收集器端點
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# 採樣率（0-1）
OTEL_TRACER_SAMPLE_RATE=0.1
```

### 追蹤信息

每個跨度（span）包含：

- **操作名稱**：`order.create`、`payment.process` 等
- **屬性**：userId、orderId、amount 等
- **事件**：操作中發生的關鍵事件
- **狀態**：成功、失敗、錯誤

## 📈 整合點

### 業務 Hooks

監控模組通過 hooks 與業務邏輯整合：

```
order:created     → ordersCreated.inc()
order:completed   → ordersCompleted.inc(), activeOrders--
order:failed      → ordersFailed.inc(), activeOrders--
payment:initiated → paymentsInitiated.inc()
payment:completed → paymentsCompleted.inc(), paymentProcessingTime.observe()
payment:failed    → paymentsFailed.inc()
inventory:*       → 庫存指標更新
flash-sale:*      → 活動指標更新
```

### 容錯機制（Resilience）

監控自動追蹤：

- 熔斷器狀態變化
- 背壓觸發
- 死信隊列積累

## 🚀 使用示例

### 啟動帶有監控的應用

```bash
bun run src/app.ts
```

### 查詢健康狀態

```bash
# 完整健康報告
curl http://localhost:3000/health

# Kubernetes 就緒檢查
curl http://localhost:3000/ready

# Kubernetes 存活檢查
curl http://localhost:3000/live
```

### 提取 Prometheus 指標

```bash
# 所有指標
curl http://localhost:3000/metrics

# 過濾特定指標
curl http://localhost:3000/metrics | grep flash_sale_orders
```

### 配置 Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'flash-sale'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

## 🛠️ 自定義指標

### 添加新指標

```typescript
import { metricsRegistry } from '@gravito/monitor'

// 創建計數器
const myCounter = metricsRegistry.counter({
  name: 'my_custom_metric',
  help: 'Description',
  labels: ['label_name']
})

// 使用指標
myCounter.inc({ label_name: 'value' })
```

## 📊 Grafana 儀表板

建議的 Grafana 儀表板面板：

1. **系統健康**
   - 最後 24h 健康檢查失敗次數
   - 依賴可用性時間線

2. **訂單**
   - 訂單創建速率（ops/sec）
   - 訂單完成率（%）
   - 訂單處理時間（p50, p99）

3. **支付**
   - 支付成功率
   - 按方式分類的支付分布
   - 支付延遲（p95, p99）

4. **庫存**
   - 庫存扣除率
   - 可用庫存水位線
   - 庫存鎖定等待時間

5. **快閃活動**
   - 活動轉化率（views → conversions）
   - 活躍活動數量
   - 用戶參與度（views/hour）

## ⚠️ 常見問題

### Q：健康檢查很慢怎麼辦？

**A**：使用 `cacheTtl` 減少重複檢查：
```typescript
health: {
  cacheTtl: 5000  // 快取 5 秒
}
```

### Q：指標數據不準確？

**A**：確保所有業務操作都發出了正確的 hooks。檢查 `setupMonitoringIntegration()` 中的 hooks 註冊。

### Q：追蹤數據量太大？

**A**：降低 `sampleRate`：
```typescript
tracing: {
  sampleRate: 0.1  // 只追蹤 10% 的請求
}
```

## 🔗 相關資源

- [@gravito/monitor 文檔](../../packages/monitor/README.md)
- [Prometheus 文檔](https://prometheus.io/docs/)
- [OpenTelemetry 文檔](https://opentelemetry.io/)
- [Kubernetes 健康檢查](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

## 📋 集成清單

- ✅ 配置文件：`monitor-config.ts`
- ✅ 健康檢查：`health-checks.ts`
- ✅ 業務指標：`metrics-integration.ts`
- ✅ 監控整合：`integrations/monitor-integration.ts`
- ✅ 應用啟動：`app.ts`（待更新）
- ✅ 文檔：本文件

**預期效果**：完整的可觀測性棧，支援 Kubernetes 部署、Prometheus 監控、Jaeger 追蹤！

