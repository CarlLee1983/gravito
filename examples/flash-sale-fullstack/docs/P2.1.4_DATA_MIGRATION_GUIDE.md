# P2.1.4 - 數據遷移和灰度驗證

## 概述

本文檔介紹 Flash Sale 系統從單庫架構遷移到分片架構的完整無停機遷移方案、灰度發佈策略和回滾計劃。

**目標**：
- ✅ 實現零停機數據遷移
- ✅ 支持灰度發佈（10% → 50% → 100%）
- ✅ 完整的數據驗證和對帳
- ✅ 快速安全的回滾機制

**性能指標**：
- 遷移吞吐量：50,000+ 記錄/秒
- 遷移延遲：100ms 內
- 驗證成功率：> 99.9%
- 回滾時間：< 5 分鐘

---

## 1. 架構設計

### 1.1 遷移流程

```
┌─────────────────────────────────────────────────────────┐
│                  五階段遷移流程                          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  準備階段           驗證源系統、目標系統、Schema       │
│    (10 min)        ├─ 檢查連接性                      │
│                    ├─ 驗證 Schema 兼容性              │
│                    └─ 創建臨時表                      │
│       ↓                                                 │
│  雙寫階段           開啟新舊並行寫                     │
│    (30 sec)        ├─ 新寫操作同時寫兩個系統         │
│                    ├─ 舊系統作為 master               │
│                    └─ 新系統為影子副本                │
│       ↓                                                 │
│  影子遷移           後台並發遷移歷史數據              │
│    (1-10 hour)     ├─ 分批遷移（5000 records/batch） │
│                    ├─ 並發度：5-10                    │
│                    ├─ 控制延遲：避免過載             │
│                    └─ 進度監控和失敗重試             │
│       ↓                                                 │
│  驗證階段           全量對帳和數據驗證               │
│    (1-5 hour)      ├─ 記錄數驗證                     │
│                    ├─ 數據完整性檢查                 │
│                    ├─ Checksum 驗證                  │
│                    └─ 採樣驗證加快速度               │
│       ↓                                                 │
│  切流階段           關閉舊系統，啟用新系統           │
│    (10-30 sec)     ├─ 停止接受新請求 (10s)          │
│                    ├─ 等待運行中請求完成 (30s)      │
│                    ├─ 更新路由配置 (10s)            │
│                    ├─ 恢復接受請求 (5s)             │
│                    └─ 監控新系統運行 (24h)          │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 1.2 雙寫策略

```typescript
// 應用層雙寫示意
async function createOrder(order: Order) {
  // 1. 寫舊系統（master）
  const legacyResult = await legacyDB.insert(order);

  // 2. 非同步寫新系統（影子副本）
  // 不阻塞主流程，失敗不影響用戶
  asyncWrite(newShardDB.insert(order)).catch(error => {
    // 記錄失敗並進入 DLQ
    failureQueue.push({ order, error });
  });

  return legacyResult;
}
```

### 1.3 數據映射

```
舊系統（單庫）                    新系統（8 個分片）
┌──────────────┐                 ┌─────────────────────┐
│  orders      │   遷移轉換       │  shard_0.orders     │
│  (100M rows) │   ────────────→  │  shard_1.orders     │
│              │   shardId=ID%8   │  ...                │
└──────────────┘                 │  shard_7.orders     │
                                 └─────────────────────┘

shardId 計算：
  - 秒殺系統：shardId = userId % 8
  - 訂單系統：shardId = orderId % 8
  - 庫存系統：shardId = productId % 8
```

---

## 2. 核心組件

### 2.1 MigrationManager - 遷移管理器

```typescript
import { MigrationManager } from '@gravito/sharding'

const migration = new MigrationManager({
  batchSize: 5000,        // 每批 5000 條
  concurrency: 5,         // 5 個並發遷移
  delayMs: 100,          // 批次延遲 100ms
  verifyAfterMigration: true  // 遷移後驗證
})

// 監聽遷移事件
migration.on('migration:progress', (data) => {
  console.log(`進度: ${data.progress}%`)
  console.log(`已遷移: ${data.migratedRecords}/${totalRecords}`)
  console.log(`預估時間: ${data.estimatedTimeRemaining}ms`)
})

migration.on('phase:shadow:completed', (phase) => {
  console.log('影子遷移完成')
})

// 啟動遷移
await migration.startMigration(100_000_000)
```

**事件系統**：
- `migration:start` - 遷移開始
- `phase:preparation:start/completed/failed` - 準備階段
- `phase:dual-write:start/completed` - 雙寫啟用
- `phase:shadow:start/completed` - 影子遷移
- `phase:validation:start/completed` - 驗證階段
- `phase:cutover:start/completed` - 切流完成
- `migration:progress` - 進度更新
- `migration:completed/failed` - 遷移結束

### 2.2 DataReconciliation - 數據對帳

```typescript
import { DataReconciliation } from '@gravito/sharding'

const reconciliation = new DataReconciliation({
  sampleSize: 100_000,      // 取樣 100K（0=全量）
  checksumAlgorithm: 'md5', // 檢查和算法
  batchSize: 5000,         // 對帳批次
  toleranceLevel: 5        // 5% 容差
})

// 全量對帳
const sourceData = await legacyDB.exportAll()
const targetData = await newShardDB.exportAll()

const result = await reconciliation.reconcile(sourceData, targetData)

console.log(reconciliation.generateReport(result))
```

**對帳結果**：
```
=========== DATA RECONCILIATION REPORT ===========
Status: PASSED
Duration: 2345ms

--- SUMMARY ---
Total Records: 10,000,000
Match Rate: 99.95%
Matched: 9,995,000
Mismatches: 5,000
Missing in Target: 0
Missing in Source: 0
```

**檢測能力**：
- ✅ 記錄計數驗證
- ✅ 數據完整性檢查（Checksum）
- ✅ 缺失記錄檢測（Target）
- ✅ 多餘記錄檢測（Source）
- ✅ Schema 不匹配檢測

### 2.3 CanaryDeployment - 灰度發佈

```typescript
import { CanaryDeployment } from '@gravito/sharding'

const canary = new CanaryDeployment({
  phases: [
    {
      name: 'canary-10',
      trafficPercentage: 10,
      durationMinutes: 60,           // 監控 1 小時
      successThreshold: 99.5,        // 成功率 > 99.5%
      errorRateThreshold: 0.5,       // 錯誤率 < 0.5%
      p99LatencyThreshold: 200       // P99 延遲 < 200ms
    },
    {
      name: 'rollout-50',
      trafficPercentage: 50,
      durationMinutes: 120,          // 監控 2 小時
      successThreshold: 99.5,
      errorRateThreshold: 0.5,
      p99LatencyThreshold: 200
    },
    {
      name: 'full-100',
      trafficPercentage: 100,
      durationMinutes: 1440,         // 監控 24 小時
      successThreshold: 99.5,
      errorRateThreshold: 0.5,
      p99LatencyThreshold: 200
    }
  ],
  metricsCheckInterval: 10000,       // 每 10 秒檢查指標
  autoRollback: true                 // 自動回滾
})

// 監聽灰度進度
canary.on('canary:canary-10:progress', (data) => {
  console.log(`Canary 流量: 10%, 進度: ${data.elapsed}/${data.duration}ms`)
  console.log(`成功率: ${((data.metrics.successfulRequests / data.metrics.requests) * 100).toFixed(2)}%`)
})

// 啟動灰度發佈
await canary.startCanaryDeployment()
```

**灰度階段**：

| 階段 | 流量 | 時長 | 監控指標 | 回滾閾值 |
|------|------|------|---------|---------|
| Canary | 10% | 1h | 實時 | <99.5% 成功率或 >0.5% 錯誤率 |
| Rollout | 50% | 2h | 實時 | 同上 |
| Full | 100% | 24h | 定期 | 同上 |

**監控指標**：
- Success Rate：成功請求百分比
- Error Rate：HTTP 5xx 錯誤百分比
- Latency：平均和 P99 延遲
- Throughput：每秒請求數

### 2.4 RollbackManager - 回滾管理

```typescript
import { RollbackManager } from '@gravito/sharding'

const rollback = new RollbackManager()

// 創建回滾點（在灰度前）
const point1 = rollback.createRollbackPoint(
  'v1.0.0',
  '當前穩定版本',
  sourceDataSnapshot,
  configSnapshot
)

// 生成回滾計劃
const plan = rollback.generateRollbackPlan(
  'v1.1.0',  // 當前版本
  'v1.0.0',  // 目標版本
  '灰度失敗，P99 延遲過高'
)

// 執行回滾
const result = await rollback.executeRollback(plan.planId)

console.log(rollback.generateRollbackReport(result))
```

**回滾步驟**（6 步）：
1. **停止接受新請求** (10s) - 負載均衡器切流
2. **等待運行中請求完成** (30s) - Grace shutdown
3. **恢復配置** (20s) - 應用層配置恢復
4. **恢復數據** (60s) - 數據庫狀態恢復
5. **驗證恢復** (30s) - 系統健康檢查
6. **恢復接受請求** (10s) - 負載均衡器恢復

**回滾時間表**：
```
總預估時間：~2-3 分鐘
├─ 步驟 1-2：40s（流量切流）
├─ 步驟 3-5：110s（數據和配置恢復）
└─ 步驟 6：10s（恢復接受請求）
```

---

## 3. 實施計畫

### 3.1 時間表（假設 100M 記錄）

| 階段 | 活動 | 時長 | 人員 |
|------|------|------|------|
| **日 1** | | | |
| 上午 | 準備階段、驗證系統 | 1h | 運維 + DBA |
| 中午 | 雙寫啟用、開始影子遷移 | 1h | 運維 |
| 下午 | 影子遷移進行 | 8h | 自動 |
| **日 2** | | | |
| 上午 | 影子遷移完成、對帳驗證 | 4h | DBA + QA |
| 下午 | Canary 10% 灰度 | 1h | 運維 |
| | 監控和調優 | 8h | 值班 |
| **日 3** | | | |
| 上午 | Rollout 50% 灰度 | 1h | 運維 |
| 全天 | 監控和調優 | 8h | 值班 |
| **日 4** | | | |
| 上午 | Full 100% 上線 | 1h | 運維 |
| 全天 | 監控和優化 | 8h | 值班 |
| **日 5** | | | |
| 全天 | 監控、清理、文檔 | 8h | 團隊 |

### 3.2 關鍵控制點

```yaml
遷移開始：
  ✅ 源系統備份完成
  ✅ 目標系統初始化完成
  ✅ 監控系統就位
  ✅ 值班團隊待命

影子遷移完成：
  ✅ 遷移記錄數 == 源系統記錄數
  ✅ 對帳成功率 > 99.9%
  ✅ 未遷移記錄進入 DLQ（可手動重試）

Canary 完成：
  ✅ 成功率 > 99.5%
  ✅ 錯誤率 < 0.5%
  ✅ P99 延遲穩定
  ✅ 無異常日誌

Rollout 完成：
  ✅ 性能指標正常
  ✅ 無用戶投訴
  ✅ 數據一致

Full 上線：
  ✅ 100% 流量轉移
  ✅ 舊系統置為只讀
  ✅ 監控 24 小時無異常
```

---

## 4. 監控和告警

### 4.1 遷移監控

```typescript
// 關鍵指標監控
const metrics = {
  migrationProgress: {
    totalRecords: 100_000_000,
    migratedRecords: 0,
    failedRecords: 0,
    progress: 0  // 0-100%
  },
  performance: {
    throughput: 50_000,     // records/sec
    batchLatency: 100,      // ms
    estimatedTime: 2000     // seconds
  },
  quality: {
    matchRate: 99.95,       // %
    checksumErrors: 5000,
    missingRecords: 0
  }
}
```

### 4.2 灰度監控告警規則

| 告警名 | 條件 | 動作 |
|--------|------|------|
| CanaryHighErrorRate | 錯誤率 > 1% | 自動回滾 |
| CanaryHighLatency | P99 > 300ms | 自動回滾 |
| CanaryLowSuccessRate | 成功率 < 99% | 自動回滾 |
| ReconciliationFailed | 對帳成功率 < 99.5% | 阻止灰度 |
| MigrationSlowdown | 吞吐 < 10K/s | 告警 |
| DLQAccumulation | 失敗隊列堆積 > 100K | 告警+重試 |

---

## 5. 回滾計劃

### 5.1 快速回滾（< 5 分鐘）

```typescript
// 場景：灰度失敗
if (canaryResult.status === 'failed') {
  // 1. 快速判定
  const analysis = await analyzeFailure(canaryResult)

  // 2. 生成回滾計劃
  const plan = rollback.generateRollbackPlan(
    'v1.1.0',
    'v1.0.0',
    analysis.reason
  )

  // 3. 執行回滾
  const rollbackResult = await rollback.executeRollback(plan.planId)

  // 4. 驗證回滾
  if (rollbackResult.status === 'success') {
    await notifyTeam('回滾成功')
    await postmortem(canaryResult, rollbackResult)
  }
}
```

### 5.2 全量回滾步驟

1. **流量切流** (10s)
   - 負載均衡器切流回舊系統
   - 停止新系統接收請求

2. **數據恢復** (60s)
   - 恢復舊系統數據快照
   - 或使用 binlog 進行增量恢復

3. **配置恢復** (20s)
   - 恢復應用配置
   - 重啟應用實例

4. **驗證** (30s)
   - 健康檢查
   - 日誌審計
   - 數據一致性驗證

5. **公告通知** (即時)
   - 通知用戶恢復正常
   - 發送失敗根因分析

---

## 6. 測試驗證

### 6.1 單元測試

```bash
# 運行遷移測試
bun test tests/sharding/migration-deployment.test.ts

# 測試覆蓋
✅ MigrationManager 初始化
✅ 遷移進度追蹤
✅ 階段順序執行
✅ 事件系統
✅ 錯誤處理

✅ DataReconciliation 初始化
✅ 數據匹配檢測
✅ Checksum 驗證
✅ 缺失記錄檢測
✅ 報告生成

✅ CanaryDeployment 初始化
✅ 灰度階段執行
✅ 指標收集
✅ 報告生成

✅ RollbackManager 初始化
✅ 回滾點創建
✅ 計劃生成
✅ 執行回滾
```

### 6.2 集成測試

```bash
# 完整流程測試
bun test tests/sharding/migration-deployment.test.ts -t "Integration"

# 測試場景
✅ 完整遷移和驗證流程
✅ 灰度發佈流程
✅ 回滾流程
✅ 端到端流程
```

### 6.3 壓力測試

```typescript
// 模擬 100M 記錄遷移
const stressTest = async () => {
  const totalRecords = 100_000_000
  const startTime = Date.now()

  await migration.startMigration(totalRecords)

  const duration = Date.now() - startTime
  const throughput = totalRecords / (duration / 1000)

  console.log(`吞吐量: ${throughput} records/sec`)
  console.log(`總耗時: ${duration}ms`)

  // 性能目標
  expect(throughput).toBeGreaterThan(50_000)  // > 50K/sec
  expect(duration).toBeLessThan(2_000_000)   // < 2000 sec
}
```

---

## 7. 最佳實踐

### 7.1 遷移最佳實踐

1. **分批遷移**
   - 每批 5000-10000 條
   - 避免一次性加載全量數據

2. **併發控制**
   - 5-10 個併發連接
   - 監控數據庫連接池使用

3. **延遲控制**
   - 批次間延遲 100-500ms
   - 避免源系統過載

4. **故障恢復**
   - 重試機制（3 次）
   - 失敗記錄進入 DLQ
   - 定期批量重試

5. **監控告警**
   - 遷移進度監控
   - 吞吐量監控
   - 失敗率告警

### 7.2 灰度發佈最佳實踐

1. **多階段灰度**
   - Canary：10% (1-2 小時)
   - Rollout：50% (2-4 小時)
   - Full：100% (24 小時監控)

2. **自動回滾**
   - 設置明確的回滾閾值
   - 啟用自動回滾機制
   - 記錄所有決策和原因

3. **指標監控**
   - 成功率、錯誤率、延遲
   - 業務指標（訂單、收入）
   - 資源使用（CPU、內存、連接）

4. **溝通協調**
   - 提前通知所有相關方
   - 灰度期間保持溝通
   - 及時發送進度報告

### 7.3 回滾最佳實踐

1. **提前規劃**
   - 充分測試回滾流程
   - 準備回滾腳本和命令
   - 預留足夠的回滾時間窗口

2. **快速決定**
   - 設置明確的回滾觸發條件
   - 授權值班人員做出決定
   - 不要過度容忍異常

3. **完整驗證**
   - 回滾後進行全量驗證
   - 檢查數據一致性
   - 驗證舊系統正常運行

4. **事後總結**
   - 分析根本原因
   - 改進遷移方案
   - 更新監控和告警

---

## 8. 常見問題

### Q1: 遷移期間是否支持新增數據？
**A**: 是的。雙寫策略支持在遷移期間新增數據。新數據會同時寫入舊和新系統，確保數據完整性。

### Q2: 如何處理遷移失敗的記錄？
**A**: 失敗的記錄會進入死信隊列（DLQ），可以：
1. 自動重試（指數退避）
2. 定期批量重試
3. 人工檢查後手動重試

### Q3: 灰度失敗時回滾會丟失數據嗎？
**A**: 不會。回滾時：
1. 新系統的數據保留（用於分析）
2. 舊系統恢復為回滾點狀態
3. 用戶只看到舊系統的數據
4. 灰度期間的新增數據會重新應用

### Q4: 灰度期間監控應該關注哪些指標？
**A**: 關鍵指標包括：
1. **可用性**：成功率、錯誤率
2. **性能**：平均延遲、P99 延遲、吞吐量
3. **業務**：訂單量、轉化率、客單價
4. **資源**：CPU、內存、連接數

### Q5: 遷移需要停機嗎？
**A**: 完全不需要。整個流程通過雙寫和灰度實現零停機遷移。唯一需要的是最後的流量切流瞬間（< 30 秒）。

---

## 9. 相關文檔

- [P2.1.1 - 分片架構設計](./P2.1.1_SHARDING_ARCHITECTURE.md)
- [P2.1.2 - 分片數據庫部署](./P2.1.2_SHARD_DATABASE_DEPLOYMENT.md)
- [P2.1.3 - 應用層分片邏輯](./P2.1.3_APPLICATION_LAYER_SHARDING.md)
- [P2.1.5 - 性能基準測試](./P2.1.5_PERFORMANCE_BASELINE.md)

---

## 10. 檢查清單

### 遷移前檢查
- [ ] 源系統備份完成
- [ ] 目標系統初始化完成
- [ ] 監控系統部署完成
- [ ] 告警規則配置完成
- [ ] 運維和開發團隊待命
- [ ] 通知用戶可能的服務影響
- [ ] 準備回滾計劃和腳本

### 遷移期間檢查
- [ ] 遷移進度正常（> 50K records/sec）
- [ ] 沒有異常日誌
- [ ] 雙寫成功率 > 99%
- [ ] 源系統負載正常

### 驗證階段檢查
- [ ] 對帳成功率 > 99.9%
- [ ] 沒有缺失記錄
- [ ] Checksum 驗證通過
- [ ] DLQ 失敗記錄 < 1%

### 灰度發佈檢查
- [ ] Canary 10% 成功率 > 99.5%
- [ ] Canary 期間無異常
- [ ] Rollout 50% 運行正常
- [ ] 業務指標無異常
- [ ] 用戶投訴為零

### 上線後檢查
- [ ] 100% 流量切流完成
- [ ] 舊系統置為只讀
- [ ] 監控 24 小時無異常
- [ ] 性能指標達到目標
- [ ] 數據一致性驗證通過

---

**文檔版本**：v1.0
**最後更新**：2026-02-11
**作者**：架構團隊
