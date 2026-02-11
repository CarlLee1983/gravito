# Flash Sale 追蹤系統設置指南

## 📋 概覽

此指南説明如何設置和驗證 Flash Sale 搶購系統的分佈式追蹤（OpenTelemetry + Jaeger）。

---

## 🚀 快速開始

### 1. 啟動基礎設施

```bash
# 啟動 PostgreSQL、Redis、Jaeger、Prometheus、Grafana
docker-compose up -d

# 驗證所有服務都已啟動
docker-compose ps
```

### 2. 驗證服務狀態

```bash
# 檢查各服務端口
# Jaeger UI:      http://localhost:16686
# Prometheus:     http://localhost:9090
# Grafana:        http://localhost:3001
# Redis-Commander: http://localhost:8081
# PgAdmin:        http://localhost:5050

curl http://localhost:16686/api/services  # 檢查 Jaeger 是否運行
```

---

## 🏃 啟動應用

```bash
# 開發環境
bun run dev

# 生產環境
NODE_ENV=production bun run dev

# 自定義 OpenTelemetry 配置
OTEL_TRACING_ENABLED=true \
OTEL_TRACING_EXPORTER=jaeger \
JAEGER_ENDPOINT=http://localhost:14268/api/traces \
OTEL_SAMPLING_RATE=0.1 \
bun run dev
```

### 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `OTEL_SERVICE_NAME` | `flash-sale-service` | 服務名稱 |
| `OTEL_SERVICE_VERSION` | `0.1.0` | 服務版本 |
| `OTEL_TRACING_ENABLED` | `true` | 啟用追蹤 |
| `OTEL_TRACING_EXPORTER` | `jaeger` | 追蹤導出器 (jaeger/otlp/console) |
| `JAEGER_ENDPOINT` | `http://localhost:14268/api/traces` | Jaeger 端點 |
| `OTEL_SAMPLING_RATE` | `0.1` | 採樣率 (0-1) |
| `PROMETHEUS_ENABLED` | `true` | 啟用 Prometheus |
| `PROMETHEUS_PORT` | `9090` | Prometheus metrics 端口 |

---

## 🔍 驗證追蹤

### 1. 生成測試流量

```bash
# 創建訂單
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "test-product",
    "quantity": 1
  }'

# 查看訂單
curl http://localhost:3000/api/orders
```

### 2. 在 Jaeger UI 查看追蹤

訪問 http://localhost:16686，執行以下步驟：

1. **選擇服務**：`flash-sale-service`
2. **選擇操作**：查看所有操作或選擇特定操作
3. **搜索追蹤**：點擊 "Find Traces"
4. **查看詳情**：
   - 展開追蹤查看 Span 層次
   - 查看每個 Span 的屬性和事件
   - 檢查錯誤和異常

### 3. 查看重要的追蹤

| 操作 | Span 名稱 | 說明 |
|------|----------|------|
| 創建訂單 | `POST /api/orders` | HTTP 層追蹤 |
| | `integration.order_to_queue` | 訂單到隊列集成 |
| | `job.lock_inventory` | 庫存鎖定任務 |
| | `job.deduct_inventory` | 庫存扣減任務 |
| | `job.confirm_order` | 訂單確認任務 |

---

## 📊 Prometheus 和 Grafana

### Prometheus 配置

Prometheus 已配置自動採集以下指標源：

```yaml
scrape_configs:
  - job_name: 'prometheus'
    targets: ['localhost:9090']

  - job_name: 'flash-sale-service'
    targets: ['localhost:9090']
    metrics_path: '/metrics'
```

### Grafana 儀表板

Grafana 已配置數據源，但尚未配置儀表板。你可以：

1. **訪問 Grafana**: http://localhost:3001
   - 用戶名：`admin`
   - 密碼：`admin`

2. **添加儀表板**：
   - 點擊 "+" → "Dashboard"
   - 添加 Prometheus 數據源的查詢

3. **常見查詢**：
   ```promql
   # 請求速率 (QPS)
   rate(http_requests_total[5m])

   # 平均延遲
   histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

   # 錯誤率
   rate(http_requests_failed_total[5m])

   # GC 暫停
   go_gc_duration_seconds_sum
   ```

---

## 🎯 業務層追蹤

### 已集成的追蹤點

#### 1. 訂單建立（Order Queue Integration）

```typescript
// 文件：src/integrations/order-queue-handler.ts
await withSpan(
  'integration.order_to_queue',
  {
    'flash_sale.order_id': payload.orderId,
    'flash_sale.product_id': payload.productId,
  },
  async (_span) => {
    // 邏輯
  }
)
```

#### 2. 庫存操作（Job Handlers）

```typescript
// 鎖定庫存
await withSpan('job.lock_inventory', { 'job.type': 'LockInventoryJob' }, ...)

// 扣減庫存
await withSpan('job.deduct_inventory', { 'job.type': 'DeductInventoryJob' }, ...)

// 釋放庫存
await withSpan('job.release_inventory', { 'job.type': 'ReleaseInventoryJob' }, ...)

// 確認訂單
await withSpan('job.confirm_order', { 'job.type': 'ConfirmOrderJob' }, ...)
```

#### 3. 記錄事件

```typescript
import { recordEvent } from '@/tracing/tracer'

// 記錄業務事件
recordEvent('job_pushed', { 'job.type': 'LockInventoryJob' })
recordEvent('order_confirmed', { 'order.id': orderId })
```

---

## 🛠️ 故障排除

### 問題：Jaeger 未收到追蹤

**症狀**：Jaeger UI 中找不到任何追蹤

**排查**：
```bash
# 1. 檢查 Jaeger 是否運行
docker-compose ps | grep jaeger

# 2. 檢查應用日誌
bun run dev 2>&1 | grep -i tracing

# 3. 檢查應用是否連接 Jaeger
curl -i http://localhost:14268/api/traces  # 應該返回 200

# 4. 增加採樣率以確保追蹤被記錄
OTEL_SAMPLING_RATE=1 bun run dev
```

### 問題：高延遲或內存洩漏

**症狀**：應用變慢或內存使用不斷增加

**解決**：
```bash
# 降低採樣率
OTEL_SAMPLING_RATE=0.01 bun run dev

# 禁用追蹤以測試
OTEL_TRACING_ENABLED=false bun run dev
```

### 問題：Prometheus 未收集指標

**症狀**：Prometheus UI 中沒有指標數據

**排查**：
```bash
# 檢查 Prometheus 配置
docker-compose logs prometheus | tail -20

# 驗證應用是否暴露 metrics 端點
curl http://localhost:9090/metrics
```

---

## 📚 API 參考

### 追蹤工具函數

#### `withSpan<T>(spanName, attributes, fn)`

使用自動 Span 管理包裝異步函數

```typescript
const result = await withSpan(
  'my_operation',
  { 'key': 'value' },
  async (span) => {
    // 操作邏輯
    return result
  }
)
```

#### `recordEvent(name, attributes?)`

在當前 Span 中記錄事件

```typescript
recordEvent('user_action', {
  'action.type': 'purchase',
  'user.id': '123',
})
```

#### `getFlashSaleTracer()`

獲取 Tracer 實例以進行手動 Span 管理

```typescript
const tracer = getFlashSaleTracer()
const span = tracer.startSpan('custom_operation')
// ... 邏輯
span.end()
```

---

## 📖 後續步驟

- [ ] 配置 Prometheus 告警規則（P0.2）
- [ ] 優化動態連接池（P0.3）
- [ ] 集成測試驗證（P0 整合）
- [ ] 生產部署準備

---

## 🔗 參考資源

- [OpenTelemetry 官方文檔](https://opentelemetry.io/docs/)
- [Jaeger 使用指南](https://www.jaegertracing.io/docs/)
- [Prometheus 查詢語言](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Gravito Core OpenTelemetry 集成](../../packages/core/README.md)

---

**文檔版本**：v1.0
**最後更新**：2026-02-10
**維護者**：Flash Sale 開發團隊
