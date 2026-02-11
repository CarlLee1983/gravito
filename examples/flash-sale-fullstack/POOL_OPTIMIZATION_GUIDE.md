# P0.3 連接池優化指南

**文檔版本**：v1.0
**最後更新**：2026-02-10
**狀態**：實施完成

---

## 📋 概覽

此指南説明 Flash Sale 搶購系統的動態連接池優化實施，自動調整數據庫連接池大小以適應實時負載。

---

## 🎯 優化目標

| 指標 | 當前 | 目標 | 提升 |
|------|------|------|------|
| 最大支持 QPS | 1000 | 5000+ | **5 倍** |
| 連接池效率 | 固定配置 | 動態適應 | 自動化 |
| 記憶體使用 | 浪費 | 最優化 | 降低 |
| 響應時間 | 變動 | 穩定 | 優化 |

---

## 🔧 實施內容

### 1. 動態連接池管理器 ✅

**文件**：`src/database/DynamicPoolManager.ts`

**主要功能**：
- 監控連接池使用情況
- 根據利用率自動調整池大小
- 防止頻繁變動（60 秒冷卻時間）
- 記錄調整歷史和指標

**核心算法**：
```
每 30 秒檢查一次連接池利用率：
- 利用率 > 80% → 擴展池（+25%）
- 利用率 < 20% → 縮減池（-25%）
- 60 秒內最多調整一次（防止振蕩）
- 支持範圍：2-50 個連接
```

### 2. 應用集成 ✅

**修改**：`src/app.ts`

**集成點**：
```typescript
// 初始化動態連接池管理器
const poolManager = new DynamicPoolManager(config, logger)
poolManager.startMonitoring(app.core)

// 關閉時停止監控
process.on('SIGTERM/SIGINT', () => {
  poolManager.stopMonitoring()
})
```

### 3. 監控 API ✅

**文件**：`src/routes/pool-monitoring.ts`

**可用端點**：
- `GET /api/admin/pool/metrics` - 查詢當前指標
- `GET /api/admin/pool/health` - 檢查健康狀態

---

## 📊 配置說明

### DynamicPoolManager 配置

```typescript
interface PoolConfig {
  minPoolSize: number        // 最小連接數（默認：2）
  maxPoolSize: number        // 最大連接數（默認：50）
  checkInterval: number      // 檢查間隔毫秒（默認：30000）
  changeThreshold: number    // 調整冷卻時間毫秒（默認：60000）
  expandThreshold: number    // 擴展觸發比例（默認：0.8）
  shrinkThreshold: number    // 縮減觸發比例（默認：0.2）
}
```

### 預設配置

```typescript
{
  minPoolSize: 2,           // 基礎 2 個連接
  maxPoolSize: 50,          // 最多 50 個連接
  checkInterval: 30000,     // 每 30 秒檢查
  changeThreshold: 60000,   // 調整間隔 60 秒
  expandThreshold: 0.8,     // 80% 利用率時擴展
  shrinkThreshold: 0.2,     // 20% 利用率時縮減
}
```

---

## 🚀 使用方法

### 1. 啟動應用

```bash
# 標準啟動（已自動啟用動態連接池）
bun run dev

# 應用日誌中應該看到：
# [PoolManager] 動態連接池已初始化
# [PoolManager] 啟動動態連接池監控 {...}
```

### 2. 查詢連接池狀態

```bash
# 查詢健康狀態
curl http://localhost:3000/api/admin/pool/health | jq

# 響應示例
{
  "success": true,
  "data": {
    "totalConnections": 10,
    "activeConnections": 2,
    "idleConnections": 8,
    "utilization": "20.0%",
    "maxPoolSize": 10,
    "waitingRequests": 0,
    "status": "healthy"
  }
}
```

### 3. 監控連接池調整

應用日誌會記錄所有調整事件：

```
[PoolManager] 連接池已擴展
{
  from: 10,
  to: 12,
  utilization: "85.0%",
  reason: "高利用率"
}

[PoolManager] 連接池已縮減
{
  from: 12,
  to: 10,
  utilization: "15.0%",
  reason: "低利用率"
}
```

---

## 📈 性能測試

### 測試場景 1：正常流量

```bash
# 啟動應用
bun run dev

# 生成正常流量
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": "test", "productId": "product-0", "quantity": 1}'

# 預期：連接池穩定在 2-10 個連接
# 利用率應該在 10-30% 之間
```

### 測試場景 2：高負載

```bash
# 使用 k6 進行負載測試
bun run test:load

# 觀察連接池擴展：
# - 檢查間隔前：利用率 > 80%
# - 調整後：連接數從 10 增加到 12-15
# - 目標：支持 5000+ QPS
```

### 測試場景 3：流量下降

```bash
# 完成測試後停止負載生成
# 等待 90 秒（30 秒檢查 + 60 秒冷卻）

# 預期結果：
# - 連接池逐漸縮減回 2-10
# - 利用率下降到 < 20%
# - 記憶體使用回到基線
```

---

## 📊 監控指標

### 關鍵指標

| 指標 | 含義 | 正常範圍 | 警告 |
|------|------|---------|------|
| 利用率 | 活躍連接/總連接 | 20%-80% | > 85% 或 < 10% |
| 等待請求 | 隊列中等待的請求 | < 5 | > 10 |
| 調整次數 | 池調整總數 | 動態 | 頻繁變動 |
| 最大連接 | 池當前大小 | 2-50 | > 50 或 < 2 |

### 通過 Prometheus 監控

添加以下 PromQL 查詢：

```promql
# 連接池利用率
db_pool_utilization

# 活躍連接數
db_pool_active_connections

# 池大小變化
db_pool_size

# 連接等待時間
db_connection_wait_seconds
```

---

## 🐛 故障排除

### 問題 1：連接池不調整

**症狀**：連接數保持不變，即使負載變化

**排查**：
```bash
# 1. 檢查應用日誌
tail -100 /tmp/app.log | grep PoolManager

# 2. 確認動態池已初始化
grep "動態連接池已初始化" /tmp/app.log

# 3. 檢查數據庫連接
curl http://localhost:3000/api/admin/pool/health
```

**解決**：
- 驗證數據庫連接正常
- 檢查日誌級別是否設置為 info
- 確保應用正在運行

### 問題 2：連接洩漏

**症狀**：連接數持續增長，不返回到基線

**排查**：
```bash
# 監控連接趨勢
for i in {1..10}; do
  curl -s http://localhost:3000/api/admin/pool/health | jq '.data.activeConnections'
  sleep 10
done
```

**解決**：
- 檢查應用代碼是否正確關閉連接
- 查看數據庫查詢是否掛起
- 檢查事務是否正確提交/回滾

### 問題 3：性能下降

**症狀**：即使連接充足，響應時間仍然長

**排查**：
```bash
# 檢查數據庫查詢時間
curl 'http://localhost:9090/api/v1/query?query=db_query_duration_seconds'

# 檢查 GC 暫停
curl 'http://localhost:9090/api/v1/query?query=go_gc_duration_seconds'
```

**解決**：
- 優化慢查詢
- 添加數據庫索引
- 考慮增加連接數上限

---

## ⚙️ 調優建議

### 1. 根據工作負載調整

```typescript
// 高並發系統
const highConcurrencyConfig = {
  minPoolSize: 5,
  maxPoolSize: 100,
  expandThreshold: 0.7,  // 更激進的擴展
  shrinkThreshold: 0.1,  // 更保守的縮減
}

// 低並發系統
const lowConcurrencyConfig = {
  minPoolSize: 2,
  maxPoolSize: 20,
  expandThreshold: 0.85,
  shrinkThreshold: 0.15,
}
```

### 2. 監控和告警

```yaml
# 在 Prometheus 中添加告警
- alert: PoolUtilizationHigh
  expr: db_pool_active_connections / db_pool_max > 0.8
  for: 5m
  annotations:
    summary: "連接池利用率高"

- alert: ConnectionLeak
  expr: increase(db_pool_active_connections[30m]) > 10
  for: 10m
  annotations:
    summary: "可能存在連接洩漏"
```

### 3. 定期檢查

```bash
# 每天檢查一次連接池健康狀態
# 將其添加到監控腳本中
curl -s http://localhost:3000/api/admin/pool/health | jq '.'

# 分析調整歷史
# 查找異常模式
```

---

## 📚 完整示例

### 自定義配置啟動

```typescript
// 在 src/app.ts 中修改初始化
globalPoolManager = new DynamicPoolManager(
  {
    minPoolSize: 3,           // 最少 3 個連接
    maxPoolSize: 100,         // 最多 100 個連接
    checkInterval: 20000,     // 每 20 秒檢查
    changeThreshold: 45000,   // 45 秒調整冷卻
    expandThreshold: 0.75,    // 75% 時擴展
    shrinkThreshold: 0.15,    // 15% 時縮減
  },
  app.core.logger
)
```

### 集成告警

```typescript
// 在監控循環中添加健康檢查
const healthStatus = poolManager.getHealthStatus()
if (!healthStatus.healthy) {
  app.core.logger.warn('[Alert] 連接池警告:', healthStatus.message)
  // 發送告警（Slack/Email）
}
```

---

## ✅ 驗收檢查清單

- [x] 動態連接池管理器實施
- [x] 自動擴展/縮減邏輯
- [x] 應用集成成功
- [x] 監控 API 可用
- [x] 日誌記錄完整
- [x] 配置參數可自定義
- [x] 健康檢查實現
- [x] 調整歷史追蹤
- [x] 文檔完整

---

## 🎯 預期成果

### 性能提升

```
QPS 支持：1000 → 5000+（5 倍提升）
平均延遲：7.6ms（保持或改善）
連接複用率：> 90%
記憶體使用：自動調整，無浪費
```

### 系統穩定性

```
連接洩漏：零
無效連接：自動檢測和清理
響應時間：更穩定
資源使用：自動最優化
```

---

## 📞 後續步驟

1. **P0 整合測試** - 完整功能驗證
2. **灰度部署** - 10% → 100%
3. **生產環境驗證** - 實時監控
4. **團隊培訓** - 運維文檔

---

## 🔗 相關文檔

- **路線圖**：`IMPROVEMENTS_ROADMAP.md`
- **P0 計劃**：`IMPROVEMENTS_P0_PLANNING.md`
- **追蹤指南**：`TRACING_SETUP.md`
- **告警指南**：`ALERTING_SETUP.md`

---

**版本**：v1.0 - P0.3 完成
**維護者**：Flash Sale 開發團隊
