# Flash Sale 分佈式追蹤指南

## 快速開始

### 1. 啟動依賴服務

```bash
# 啟動 PostgreSQL、Redis 和 Jaeger
docker-compose up -d postgres redis jaeger

# 驗證 Jaeger 已啟動
curl http://localhost:16686
```

### 2. 啟動應用

```bash
# 開發模式（啟用追蹤）
OTEL_TRACING_ENABLED=true bun run src/app.ts

# 或使用預設設置（預設啟用）
bun run src/app.ts
```

### 3. 訪問 Jaeger UI

打開瀏覽器，訪問 http://localhost:16686

在「Service」下拉菜單中選擇 `flash-sale-service`

## 架構概覽

### Span 層次結構

```
HTTP POST /api/orders (http-tracing-middleware)
└── integration.order_to_queue (order-queue-handler hook)
    └── job.lock_inventory (LockInventoryJob)
        ├── event: inventory_locked
        └── hook.dispatch.order:ready_for_payment (EventTracer)
            └── integration.payment_to_queue (payment-queue-handler hook)
                └── job.deduct_inventory (DeductInventoryJob)
                    ├── event: inventory_deducted
                    ├── job.compensation.release_inventory (如果失敗)
                    └── job.confirm_order (ConfirmOrderJob)
                        ├── event: order_confirmed
                        └── hook.dispatch.order:confirmed
```

### 主要 Span 類型

| Span 名稱 | 來源 | 屬性 | 用途 |
|----------|------|------|------|
| `{METHOD} {PATH}` | HTTP 中間件 | http.method, http.status_code, http.duration_seconds | 追蹤 HTTP 請求 |
| `job.lock_inventory` | LockInventoryJob | job.type, flash_sale.order_id | 庫存鎖定 |
| `job.deduct_inventory` | DeductInventoryJob | job.type, flash_sale.order_id | 庫存扣減 |
| `job.confirm_order` | ConfirmOrderJob | job.type, flash_sale.order_id | 訂單確認 |
| `job.release_inventory` | ReleaseInventoryJob | job.type, flash_sale.compensation | 庫存釋放（補償） |
| `integration.order_to_queue` | order-queue-handler | flash_sale.order_id, integration.target | 訂單轉隊列 |
| `integration.payment_to_queue` | payment-queue-handler | flash_sale.order_id, integration.target | 支付轉隊列 |

## HTTP 追蹤

### 自動屬性

所有 HTTP 請求自動記錄以下屬性：

```
http.method         - HTTP 方法 (GET, POST, 等)
http.url            - 完整 URL
http.target         - 請求路徑
http.scheme         - 協議 (http, https)
http.host           - 主機名
http.user_agent     - 用戶代理
http.status_code    - 響應狀態碼
http.duration_seconds - 請求延遲（秒）
```

### 例子：查詢 POST /api/orders

1. 在 Jaeger UI 中打開 Traces
2. 搜索條件：
   - Service: `flash-sale-service`
   - Operation: `POST /api/orders`
3. 點擊一條 trace，查看完整的 Span 層次

## 業務層追蹤

### LockInventoryJob

**Span 名稱**: `job.lock_inventory`

**核心事件**:
- `inventory_locked` - 庫存成功鎖定

**屬性**:
```
flash_sale.order_id    - 訂單 ID
flash_sale.product_id  - 商品 ID
flash_sale.quantity    - 數量
flash_sale.lock_id     - 鎖定 ID
```

**示例追蹤**:
```
POST /api/orders
└── integration.order_to_queue
    └── job.lock_inventory ✓
        ├── event: inventory_locked
        └── hook.dispatch.order:ready_for_payment
```

### DeductInventoryJob

**Span 名稱**: `job.deduct_inventory`

**核心事件**:
- `inventory_deducted` - 庫存成功扣減
- `job.compensation.release_inventory` - (失敗時) 補償操作

**屬性**:
```
flash_sale.order_id          - 訂單 ID
flash_sale.lock_id           - 鎖定 ID
flash_sale.compensation_reason - 補償原因 (如果失敗)
```

**失敗場景追蹤**:
```
job.deduct_inventory ✗ (ERROR)
└── job.compensation.release_inventory
    └── job.release_inventory
```

### ConfirmOrderJob

**Span 名稱**: `job.confirm_order`

**核心事件**:
- `order_confirmed` - 訂單已確認

**屬性**:
```
flash_sale.order_id  - 訂單 ID
flash_sale.lock_id   - 鎖定 ID
```

### ReleaseInventoryJob

**Span 名稱**: `job.release_inventory`

**核心事件**:
- `inventory_released` - 庫存已釋放

**特殊屬性**:
```
flash_sale.compensation: true          - 標記為補償操作
flash_sale.release_reason             - 釋放原因
```

## 使用 Jaeger UI

### 1. 搜索 Traces

**按服務搜索**:
1. Service 下拉菜單 → `flash-sale-service`
2. Operation 下拉菜單 → 選擇操作（例如 `POST /api/orders`）
3. 點擊 "Find Traces"

**按標籤搜索** (高級):

在搜索框中輸入標籤查詢，例如：

```
flash_sale.order_id="order-123"
http.status_code=200
http.duration_seconds>0.5
```

### 2. 分析 Span

**在 Trace 詳情頁中**:
- 點擊 Span 查看詳細屬性
- 「Logs」標籤顯示事件日誌
- 「Tags」標籤顯示所有屬性
- 「Errors」標籤顯示異常信息

### 3. 找到瓶頸

**延遲排序**:
1. 在 Traces 列表中點擊「Span Duration」排序
2. 查看耗時最長的 Span

**失敗排序**:
1. 在 Service 下拉菜單中選擇 `flash-sale-service`
2. 在 Tags 中搜索：`otel.status_code=ERROR`

## 配置

### 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `OTEL_TRACING_ENABLED` | true | 啟用 OpenTelemetry 追蹤 |
| `OTEL_SERVICE_NAME` | flash-sale-service | 服務名稱 |
| `OTEL_SERVICE_VERSION` | 0.1.0 | 服務版本 |
| `OTEL_TRACING_EXPORTER` | jaeger | 導出器 (jaeger, otlp, console) |
| `JAEGER_ENDPOINT` | http://localhost:14268/api/traces | Jaeger HTTP 端點 |
| `OTEL_SAMPLING_RATE` | 0.1 | 採樣率 (0.0-1.0) |
| `NODE_ENV` | development | 環境 (development, production) |

### 採樣策略

**開發環境** (預設 10% 採樣):
```bash
OTEL_SAMPLING_RATE=0.1 bun run src/app.ts
```

**性能敏感環境** (1% 採樣):
```bash
OTEL_SAMPLING_RATE=0.01 bun run src/app.ts
```

**禁用追蹤**:
```bash
OTEL_TRACING_ENABLED=false bun run src/app.ts
```

**生產環境** (確保設置低採樣率):
```bash
NODE_ENV=production \
OTEL_SAMPLING_RATE=0.01 \
JAEGER_ENDPOINT=http://jaeger.prod:14268/api/traces \
bun run src/app.ts
```

## 常見場景

### 場景 1：調查訂單建立失敗

```
1. 在 Jaeger UI 搜索: flash_sale.order_id="order-123"
2. 查看 HTTP POST /api/orders Span
3. 如果有 ERROR status，點擊查看異常詳情
4. 追蹤後續 Job (LockInventoryJob) 的狀態
```

### 場景 2：分析庫存鎖定延遲

```
1. 按 Span Duration 排序 Traces
2. 找到耗時超過 1 秒的 trace
3. 展開 job.lock_inventory Span
4. 檢查是否有重試或外部服務延遲
```

### 場景 3：追蹤補償流程

```
1. 搜索: otel.status_code=ERROR
2. 找到 job.deduct_inventory ERROR Span
3. 查看是否有 job.compensation.release_inventory 子 Span
4. 驗證補償成功：job.release_inventory status=OK
```

### 場景 4：性能基準測試

```bash
# 使用 k6 進行負載測試
bun run test:load

# Jaeger 會記錄所有 Span
# 在 UI 中可以查看：
# - P50/P95/P99 延遲分布
# - 平均服務時間
# - 錯誤率
```

## 驗證追蹤

### 自動驗證腳本

```bash
# 驗證環境和服務
./scripts/verify-tracing.sh
```

輸出示例：
```
=== Flash Sale Tracing 驗證 ===

1. Jaeger UI... ✓ OK
2. 發送測試請求...
   等待 Span 匯出 (5s)...
3. 檢查 Jaeger 中的 Traces... ✓ OK (服務已註冊)
4. 查詢最近的 Traces...
   找到 3 條 Trace

=== 驗證成功 ✓ ===

Jaeger UI: http://localhost:16686
查詢服務: flash-sale-service
```

## 效能影響

### 採樣率對效能的影響

| 採樣率 | CPU 開銷 | 記憶體開銷 | 建議場景 |
|--------|----------|----------|----------|
| 0.01 (1%) | < 0.5% | < 10 MB | 生產環境 (高流量) |
| 0.1 (10%) | 1-2% | 20-30 MB | 開發/測試 |
| 1.0 (100%) | 5-10% | 50-100 MB | 本地開發/調試 |

### 優化建議

1. **批量導出** (BatchSpanProcessor):
   - 預設啟用，非同步匯出 Spans
   - 不阻塞應用邏輯

2. **採樣策略**:
   - 生產環境: 1% 採樣
   - 開發環境: 10-100% 採樣

3. **選擇性追蹤**:
   - 對性能敏感的操作只記錄 INFO 級事件
   - 對診斷操作記錄詳細屬性

## 故障排除

### 問題 1：Jaeger 中未出現 Traces

**症狀**: Jaeger UI 中 `flash-sale-service` 服務未出現

**檢查清單**:
```bash
# 1. 驗證 Jaeger 正在運行
docker ps | grep jaeger

# 2. 驗證應用連接到 Jaeger
curl http://localhost:14268/api/traces

# 3. 檢查環境變數
echo $OTEL_TRACING_ENABLED  # 應為 true
echo $JAEGER_ENDPOINT       # 應為 http://localhost:14268/api/traces

# 4. 查看應用日誌
# 應該看到: [Tracing] OpenTelemetry SDK initialized successfully
```

**解決方案**:
1. 確保 Jaeger 正在運行：`docker-compose up -d jaeger`
2. 重啟應用
3. 發送 HTTP 請求觸發 Traces
4. 等待 5-10 秒讓 Spans 被匯出

### 問題 2：Traces 中缺少某些 Spans

**症狀**: 期望的 Job Span 未出現

**檢查清單**:
1. 檢查採樣率是否設置過低 (< 1%)
2. 驗證 Job 是否被正確推送到隊列
3. 檢查 Consumer 是否正在運行

**解決方案**:
```bash
# 臨時提高採樣率以進行診斷
OTEL_SAMPLING_RATE=1.0 bun run src/app.ts
```

### 問題 3：Jaeger UI 響應慢

**症狀**: Jaeger UI 加載緩慢或超時

**原因**: 大量 Traces 積累

**解決方案**:
1. 降低採樣率：`OTEL_SAMPLING_RATE=0.01`
2. 清理 Jaeger 資料：`docker-compose restart jaeger`
3. 在生產環境中使用 Jaeger 遠程存儲 (Elasticsearch, Cassandra)

## 相關檔案

- `src/tracing/setup.ts` - OTel SDK 初始化
- `src/tracing/tracer.ts` - Tracer 工具函式
- `src/tracing/http-tracing-middleware.ts` - HTTP 中間件
- `src/app.ts` - 應用啟動和 SDK 初始化
- `docker-compose.yml` - Jaeger 服務配置

## 進階主題

### 自訂屬性

在業務邏輯中添加自訂屬性：

```typescript
import { recordEvent } from './tracing/tracer'

// 記錄自訂事件
recordEvent('custom_business_event', {
  'business.metric': value,
  'business.timestamp': Date.now(),
})
```

### 跨進程追蹤

當需要在異步 Job 中保持 trace context 時，可以使用 Baggage：

```typescript
import { getActiveBaggage, setBaggage } from '@opentelemetry/api'

// 在 HTTP handler 中設置
setBaggage('trace.user_id', userId)

// 在 Job 中讀取
const userId = getActiveBaggage().getEntry('trace.user_id')
```

## 參考資源

- [OpenTelemetry 官方文檔](https://opentelemetry.io/docs/)
- [Jaeger UI 使用指南](https://www.jaegertracing.io/docs/latest/frontend-ui/)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/reference/specification/protocol/exporter/)

---

**最後更新**: 2026-02-08
**維護者**: Flash Sale 團隊
