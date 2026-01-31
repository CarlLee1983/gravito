# Dark Matter 效能分析與優化建議

## Builder 物件池評估

### 問題分析

在高頻場景（10k+ RPS）下，每次查詢都會建立新的 `MongoQueryBuilder` 實例：

```typescript
// 每次調用都會建立新的 Builder
const users = await Mongo.collection('users').where('status', 'active').get()
```

**潛在問題：**
1. 大量短生命週期物件導致 GC 壓力
2. 記憶體碎片化
3. 影響 P99 延遲

### 基準測試方法

執行基準測試：

```bash
MONGODB_URI=mongodb://localhost:27017 bun run benchmarks/builder-pool.bench.ts
```

**測試項目：**
1. 查詢效能（簡單/複雜查詢）
2. Builder 建立開銷
3. 記憶體壓力（併發查詢）
4. 物件池效益模擬

### 量化指標

| 指標 | 目標 | 測量方法 |
|------|------|----------|
| Builder 建立開銷 | < 總時間的 10% | 基準測試比較 |
| 記憶體使用 | 減少 30-50% | `Bun.peek()` 監控 |
| GC 次數 | 減少 40-60% | `--expose-gc` + 監控 |
| 吞吐量 | 提升 15-25% | 基準測試 |
| P99 延遲 | 降低 10-20% | 壓力測試 |

### 決策樹

```
是否需要物件池？
│
├─ Builder 建立開銷 < 10%？
│  └─ 是 → 不需要物件池
│
├─ 預期 RPS < 5k？
│  └─ 是 → 不需要物件池
│
├─ 記憶體受限環境？
│  ├─ 是 → 建議啟用物件池
│  └─ 否 → 評估 GC 影響
│
└─ 預期 RPS > 10k？
   └─ 是 → 強烈建議啟用物件池
```

## 實作建議

### 選項 1：不實作物件池（推薦）

**理由：**
1. V8/JavaScriptCore 已經高度優化短生命週期物件
2. 現代 GC 對小物件處理效率很高
3. 增加複雜度和維護成本
4. 大多數應用不會達到 10k+ RPS

**建議：**
- 在文檔中說明何時應考慮自定義物件池
- 提供效能調優指南
- 監控實際使用場景的效能表現

### 選項 2：實作可選的物件池

如果基準測試顯示顯著效益，可以實作為可選功能：

```typescript
// 啟用物件池（適合高頻場景）
Mongo.connection().enableBuilderPool({ maxSize: 100 })

// 使用時自動從池中獲取
const users = await Mongo.collection('users').where('status', 'active').get()
// Builder 自動歸還到池中

// 關閉物件池
Mongo.connection().disableBuilderPool()
```

**實作要點：**
1. 預設不啟用（向後相容）
2. 提供清晰的使用文檔
3. 加入池統計 API（監控用）
4. 完整的測試覆蓋

## 其他效能優化建議

### 1. 查詢優化

**索引建議：**
```typescript
// 為常用查詢欄位建立索引
await Mongo.collection('users').createIndex({ status: 1, createdAt: -1 })
await Mongo.collection('users').createIndex({ email: 1 }, { unique: true })
```

**投影優化：**
```typescript
// 只選取需要的欄位
const users = await Mongo.collection('users')
  .select('name', 'email')  // 減少資料傳輸
  .where('status', 'active')
  .get()
```

### 2. 連接池配置

```typescript
Mongo.configure({
  default: 'main',
  connections: {
    main: {
      uri: 'mongodb://localhost:27017',
      database: 'myapp',
      maxPoolSize: 50,      // 根據負載調整
      minPoolSize: 10,      // 保持最小連接
      maxIdleTimeMS: 30000  // 空閒連接超時
    }
  }
})
```

### 3. 批次操作

```typescript
// 使用 bulkWrite 減少往返次數
await Mongo.collection('logs').bulkWrite([
  { insertOne: { document: { event: 'login', userId: 1 } } },
  { insertOne: { document: { event: 'logout', userId: 2 } } },
  { updateOne: { filter: { _id: 3 }, update: { $set: { status: 'active' } } } }
])
```

### 4. Aggregation Pipeline 優化

```typescript
// 盡早過濾（$match 放在前面）
const stats = await Mongo.collection('orders')
  .aggregate()
  .match({ status: 'completed' })  // 先過濾
  .group({ _id: '$customerId', total: { $sum: '$amount' } })
  .sort({ total: 'desc' })
  .limit(10)
  .get()
```

## 效能監控

### 1. 啟用連接池監控

```typescript
import { MongoPoolMonitor } from '@gravito/dark-matter'

const monitor = new MongoPoolMonitor(Mongo.connection())

// 定期檢查連接池狀態
setInterval(() => {
  const metrics = monitor.getMetrics()
  console.log('連接池狀態:', metrics)
}, 60000) // 每分鐘
```

### 2. 查詢效能追蹤

```typescript
// 記錄慢查詢
const startTime = Date.now()
const users = await Mongo.collection('users').where('status', 'active').get()
const duration = Date.now() - startTime

if (duration > 100) {
  console.warn(`慢查詢警告: ${duration}ms`)
}
```

## 結論

### 當前建議

**v1.1.0 發布：**
- ✅ Soft Deletes
- ✅ Schema Builder
- ✅ GridFS 完善
- ⏸️ Builder 物件池：暫不實作

**理由：**
1. 核心功能已完整
2. 效能優化屬於進階需求
3. 可在實際使用中收集效能數據
4. 避免過早優化

**後續規劃：**
- 收集實際使用場景的效能數據
- 如果確實需要，可在 v1.1.1 加入
- 提供效能調優文檔和最佳實踐

### 效能調優檢查清單

在考慮物件池之前，先檢查：

- [ ] 是否已建立適當的索引
- [ ] 是否使用了投影（select）減少資料傳輸
- [ ] 連接池配置是否合理
- [ ] 是否使用批次操作減少往返
- [ ] Aggregation Pipeline 是否優化
- [ ] 是否有慢查詢需要優化

如果以上都已優化，RPS 仍然超過 10k，再考慮物件池。
