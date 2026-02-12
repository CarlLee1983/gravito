# Flash Sale 後續改進 - P0 優先級規劃

**優先級**：🔴 P0（優先實施）
**預計週期**：1-2 週（40-60 小時）
**目標**：實現分佈式追蹤、自動告警、動態連接池，提升可觀測性和可靠性

---

## 📋 P0 任務分解

### Task P0.1: 分佈式追蹤 - OpenTelemetry 完整集成

**預計工作量**：8 小時
**技術棧**：OpenTelemetry (Spans, Baggage, Context Propagation)
**風險等級**：Low（基礎設施，不影響核心業務）

#### 設計方案

```typescript
// 應用啟動時初始化 OTEL
const tracer = opentelemetry.trace.getTracer('flash-sale-service')

// HTTP 中間件自動追蹤
middleware: (req, res, next) => {
  const span = tracer.startSpan(`${req.method} ${req.path}`)
  span.setAttributes({
    'http.method': req.method,
    'http.url': req.url,
    'http.target': req.path,
  })
  res.on('finish', () => {
    span.setAttributes({ 'http.status_code': res.statusCode })
    span.end()
  })
  next()
}

// 業務邏輯追蹤（在關鍵路徑上）
const span = tracer.startSpan('order:creation')
try {
  await createOrder(orderData)
  span.addEvent('order_created', { orderId: order.id })
} catch (error) {
  span.recordException(error)
  span.setStatus({ code: SpanStatusCode.ERROR })
} finally {
  span.end()
}
```

#### 實施清單

- [ ] **Task P0.1.1**：安裝 OpenTelemetry 依賴（1 小時）
  - @opentelemetry/api
  - @opentelemetry/sdk-node
  - @opentelemetry/sdk-trace-node
  - @opentelemetry/resources
  - @opentelemetry/semantic-conventions

- [ ] **Task P0.1.2**：配置 Tracer Provider（1 小時）
  - 創建 TracingSetup.ts
  - 配置 Jaeger Exporter
  - 設定採樣策略（預設 10%）
  - 配置 Span Processors

- [ ] **Task P0.1.3**：HTTP 層自動追蹤（2 小時）
  - Photon HTTP 中間件集成
  - 請求/響應屬性記錄
  - 錯誤和異常捕獲
  - 性能指標（延遲、狀態碼分布）

- [ ] **Task P0.1.4**：業務層手動追蹤（2 小時）
  - 訂單流程追蹤
  - 支付流程追蹤
  - 庫存操作追蹤
  - 事件派發追蹤

- [ ] **Task P0.1.5**：Jaeger UI 驗證（2 小時）
  - 部署 Jaeger (docker-compose)
  - 驗證 Span 收集
  - 查詢端到端追蹤
  - 製作文檔範例

#### 預期收益

| 指標 | 當前 | 目標 | 提升 |
|------|------|------|------|
| 追蹤覆蓋率 | 0% | 100% | 新增 |
| 故障排查時間 | 30+ min | < 5 min | ⬇ 6x |
| 瓶頸識別時間 | 手動分析 | 自動報告 | 自動化 |
| 可觀測性 | 低 | 高 | +50% |

#### 驗收標準

- [ ] HTTP 請求都有 Span
- [ ] 關鍵業務路徑完整追蹤
- [ ] 異常自動記錄到 Span
- [ ] Jaeger UI 能正確查詢軌跡
- [ ] 文檔涵蓋常見追蹤場景

---

### Task P0.2: 性能告警規則 - Prometheus + Grafana

**預計工作量**：4 小時
**技術棧**：Prometheus, Grafana, AlertManager
**風險等級**：Low（監控工具，不影響業務）

#### 設計方案

```yaml
# Prometheus 告警規則 (alerts.yml)
groups:
  - name: flash_sale_alerts
    interval: 30s
    rules:
      # 延遲告警
      - alert: HighP95Latency
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.02
        for: 5m
        annotations:
          summary: "P95 延遲超過 20ms"

      # 錯誤率告警
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.001
        for: 5m
        annotations:
          summary: "錯誤率超過 0.1%"

      # 資源告警
      - alert: HighCPUUsage
        expr: node_cpu_usage > 0.8
        for: 5m
        annotations:
          summary: "CPU 使用率超過 80%"
```

#### 實施清單

- [ ] **Task P0.2.1**：告警規則設定（1 小時）
  - 延遲告警（P95、P99）
  - 錯誤率告警（全局、端點級）
  - 資源告警（CPU、Memory、DB）
  - 業務告警（訂單、支付、庫存）

- [ ] **Task P0.2.2**：告警通知渠道（1 小時）
  - Slack 集成
  - 電郵通知
  - Webhook 自定義處理
  - 告警分級（INFO/WARNING/CRITICAL）

- [ ] **Task P0.2.3**：Grafana 儀表板（1.5 小時）
  - 性能概覽面板
  - 延遲分布面板
  - 錯誤率面板
  - 資源使用面板
  - 告警歷史面板

- [ ] **Task P0.2.4**：告警規則測試（0.5 小時）
  - 模擬高延遲場景
  - 模擬錯誤場景
  - 驗證通知發送
  - 驗證告警消除

#### 預期收益

| 指標 | 當前 | 目標 | 提升 |
|------|------|------|------|
| 故障發現時間 | 手動 | < 1 min | 自動化 |
| 告警準確率 | 無 | > 95% | 新增 |
| 響應時間 | 30+ min | < 5 min | ⬇ 6x |
| 可用性 | 99%+ | 99.9% | +0.9% |

#### 驗收標準

- [ ] 所有告警規則正常運行
- [ ] 告警信息完整清晰
- [ ] 通知渠道正常工作
- [ ] Grafana 儀表板視覺化良好
- [ ] 告警規則有對應文檔

---

### Task P0.3: 資料庫連接池優化 - 動態調整

**預計工作量**：3 小時
**技術棧**：Connection Pool Management, Knex.js
**風險等級**：Medium（涉及數據庫連接，需充分測試）

#### 設計方案

```typescript
// 動態連接池配置
export class DynamicPoolManager {
  private pool: Knex
  private metrics: PoolMetrics

  constructor(config: DatabaseConfig) {
    // 初始配置
    this.pool = knex({
      ...config,
      pool: {
        min: config.pool?.min ?? 2,
        max: config.pool?.max ?? 10,
      }
    })
  }

  // 監控連接使用
  private monitorPoolUsage() {
    setInterval(() => {
      const stats = this.pool.client.pool.__allClients?.length ?? 0
      const active = this.pool.client.pool._activeClients?.size ?? 0
      const utilization = active / stats

      // 根據利用率動態調整
      if (utilization > 0.8 && stats < MAX_POOL) {
        this.scaleUpPool()
      } else if (utilization < 0.2 && stats > MIN_POOL) {
        this.scaleDownPool()
      }
    }, 30000) // 30 秒檢查一次
  }

  private scaleUpPool() {
    // 增加連接池大小
    const newMax = Math.min(
      (this.pool.client.pool._config?.max ?? 10) + 2,
      MAX_POOL
    )
    this.pool.client.pool._config.max = newMax
  }

  private scaleDownPool() {
    // 減少連接池大小
    const newMax = Math.max(
      (this.pool.client.pool._config?.max ?? 10) - 2,
      MIN_POOL
    )
    this.pool.client.pool._config.max = newMax
  }
}
```

#### 實施清單

- [ ] **Task P0.3.1**：連接池監控（1 小時）
  - 活躍連接數追蹤
  - 連接等待時間監控
  - 連接洩漏檢測
  - 連接生命週期管理

- [ ] **Task P0.3.2**：動態調整邏輯（1 小時）
  - 擴展觸發條件（利用率 > 80%）
  - 縮減觸發條件（利用率 < 20%）
  - 調整速率限制（避免頻繁變動）
  - 告警閾值設定

- [ ] **Task P0.3.3**：配置和文檔（1 小時）
  - 配置選項文檔
  - 監控指標文檔
  - 故障排除指南
  - 性能調優建議

#### 預期收益

| 指標 | 當前 | 目標 | 提升 |
|------|------|------|------|
| 最大支持 QPS | 1000 | 5000+ | ⬆ 5x |
| 連接池效率 | 固定 | 動態適應 | 優化 |
| OOM 風險 | Medium | Low | ⬇ 降低 |
| 資源利用率 | 手動調整 | 自動調整 | 自動化 |

#### 驗收標準

- [ ] 連接池監控指標正確
- [ ] 動態調整工作正常
- [ ] 無連接洩漏
- [ ] 支持至少 5000 QPS
- [ ] 文檔完整實用

---

## 📊 P0 階段總結

| 任務 | 工作量 | 優先級 | 收益 | 風險 |
|------|--------|--------|------|------|
| P0.1 分佈式追蹤 | 8h | 🔴 High | 故障排查 6x 更快 | Low |
| P0.2 告警規則 | 4h | 🔴 High | 自動告警、99.9% 可用 | Low |
| P0.3 連接池優化 | 3h | 🔴 High | 支持 5x 更多 QPS | Medium |
| **合計** | **15h** | - | **完整可觀測性 + 可靠性** | **低風險** |

---

## 🚀 執行計劃

### Week 1 (Monday-Wednesday)
- Day 1-2：P0.1 分佈式追蹤（與 Jaeger）
- Day 2-3：P0.2 告警規則（Prometheus + Grafana）

### Week 2 (Thursday-Friday)
- Day 4-5：P0.3 連接池優化（動態調整）
- Day 5：集成測試與文檔

### 驗收標準

- [ ] 所有 3 個任務代碼完成
- [ ] 集成測試通過
- [ ] 文檔完整
- [ ] 性能基準測試確認預期收益
- [ ] 團隊培訓完成

---

**計劃開始日期**：2026-02-09
**預期完成日期**：2026-02-20
**里程碑**：可觀測性和可靠性達到生產就緒水準
