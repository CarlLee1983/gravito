# Atlas ORM Observability (OpenTelemetry) 設計規劃

## 1. 目標
為 Atlas ORM 建立完整的可觀測性支援，確保在生產環境中可以追蹤資料庫查詢的效能瓶頸。

## 2. 追蹤規範 (Tracing)

### 2.1 Span 命名規範
- 統一格式：`Atlas:{Operation} {Table}`
- 範例：`Atlas:Select users`, `Atlas:Update orders`

### 2.2 語意屬性 (Attributes)
遵循 OpenTelemetry Semantic Conventions:
- `db.system`: "postgresql", "mysql", "sqlite"
- `db.operation`: "select", "insert", "update", "delete"
- `db.statement`: SQL 語句 (應過濾 Bindings 以保護敏感資料)
- `db.sql.table`: 存取的資料表名稱
- `db.cache.hit`: 布林值，標示是否命中快取
- `net.peer.name`: 資料庫主機位址

## 3. 指標規範 (Metrics)

### 3.1 連線池
- `db.client.connections.active`: 目前正在使用的連線數
- `db.client.connections.idle`: 閒置中的連線數
- `db.client.connections.max`: 連線池上限

### 3.2 查詢效能
- `db.client.operation.duration`: 查詢耗時直方圖 (Histogram)
- `db.client.operation.errors`: 查詢錯誤計數器 (Counter)

## 4. 實作架構

### 4.1 核心模組
在 `packages/atlas/src/observability` 建立：
- `AtlasTracer`: 封裝 OpenTelemetry Tracer 邏輯。
- `AtlasMetrics`: 封裝 Meter 與 Instrument 邏輯。

### 4.2 鉤子注入
- 利用 `QueryBuilder` 的生命週期在 `getRawResults` 執行時自動開啟 Span。
- 在 `Driver` 層級捕獲原始執行耗時。

## 5. 配置方式
```typescript
const atlas = new Atlas({
  // ...
  observability: {
    enabled: true,
    tracing: true,
    metrics: true,
    serviceName: 'my-service'
  }
})
```

## 6. 階段性開發建議
1. **第一階段**: 基礎 Tracing 整合，覆蓋 `QueryBuilder` 主要執行路徑。
2. **第二階段**: 連線池 Metrics 實作，整合 Bun.sql 提供的統計資訊。
3. **第三階段**: 快取命中率監控。
