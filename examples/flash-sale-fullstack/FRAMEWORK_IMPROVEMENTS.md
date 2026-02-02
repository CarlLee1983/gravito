# Gravito 框架改善優化建議

基於搶購系統完整開發過程，總結框架功能需要改善優化的事項。

---

## 🔴 優先級 1: 立即修復 (Critical)

### Issue 1.1: Event System 性能瓶頸

**發現時間**：Week 3-4
**嚴重性**：⭐⭐⭐⭐⭐ Critical
**影響度**：高併發訂單流程延遲

#### 問題描述

```typescript
// 當前問題：同步事件派發導致堆積延遲
await core.hooks.doAction('order:created', { orderId: '123' })
// 上述操作會同步執行所有監聽器，造成延遲累積
```

**現象**：
- 高頻事件派發時，P99 延遲 > 800ms
- 事件監聽器性能瓶頸累積
- 無優先級控制，重要事件被延遲

**根本原因**：
- Event System 採用同步派發
- 無隊列緩衝機制
- 缺少事件優先級

#### 應用影響

```
訂單建立流程：
1. order:created 事件
2. 觸發 inventory-lock 監聽
3. 觸發 payment 監聽
4. 觸發 analytics 監聽
   └─ 所有監聽器同步執行，耗時相加
   └─ 若任一監聽器慢，整個流程阻塞
```

#### 臨時解決方案

```typescript
// 使用 Bull 隊列替代 Event System
const job = new OrderCreatedJob({ orderId })
await queueManager.push(job.onQueue('orders'))
// 優勢：異步、可重試、可監控
```

#### 改進建議

```typescript
// 1. 支持異步事件派發
interface EventOptions {
  async: boolean        // 異步派發
  priority: 'high' | 'normal' | 'low'
  timeout: number      // 執行超時
  retry: number        // 重試次數
}

await core.hooks.doAction('order:created', payload, {
  async: true,
  priority: 'high',
  timeout: 5000
})

// 2. Event Priority Queue
// 優先級高的事件（支付確認）優先執行
// 優先級低的事件（分析）後台執行

// 3. 事件聚合(Event Aggregation)
// 合併相同事件，減少派發次數

// 4. Circuit Breaker
// 監聽器失敗自動熔斷，不中斷整個流程
```

#### 實施計畫

1. **Phase 1**: 在 Signal 包中加入 `AsyncEventDispatcher`
2. **Phase 2**: 實現 Event Priority Queue
3. **Phase 3**: 集成 Bull 隊列作為事件後端
4. **Phase 4**: 添加 Circuit Breaker 和重試機制

**預期收益**：
- P99 延遲降低 50%
- 事件派發吞吐提升 3-5x
- 系統穩定性提高

---

### Issue 1.2: 數據庫連接池管理不足

**發現時間**：Week 5
**嚴重性**：⭐⭐⭐⭐ High
**影響度**：高併發下連接耗盡

#### 問題描述

```typescript
// 當前配置（atlas package）
pool: {
  min: 2,
  max: 10,  // ❌ 太小，高併發下會耗盡
}
```

**現象**：
- 100+ 並發用戶時連接池耗盡
- 新請求等待空閒連接（等待時間 > 500ms）
- 無自動調整機制
- 無連接池監控告警

**根本原因**：
- 默認池大小太小 (max: 10)
- 無根據負載自動調整
- 缺少監控指標曝露

#### 臨時解決方案

```typescript
// 手動增大連接池
pool: {
  min: 5,
  max: 50,  // 根據負載手動調整
  idleTimeoutMillis: 30000,
}
```

#### 改進建議

```typescript
// 1. 自適應連接池
interface AdaptivePoolConfig {
  minSize: number
  maxSize: number
  targetUtilization: 0.7  // 目標利用率 70%
  adjustInterval: 60000   // 每 60 秒調整
  metrics: true           // 曝露 Prometheus 指標
}

// 2. 連接池監控指標
metrics:
  - db.connections.active
  - db.connections.idle
  - db.connections.waiting
  - db.query.time (P50/P95/P99)
  - db.connection.timeout.count

// 3. 自動告警
alerts:
  - connections_exhausted > 95%
  - query_wait_time > 1000ms
  - connection_timeout_rate > 1%

// 4. 健康檢查
healthCheck: {
  interval: 30000,
  timeout: 5000,
  testQuery: 'SELECT 1'
}
```

#### 實施計畫

1. **Phase 1**: 曝露連接池監控指標 (Prometheus)
2. **Phase 2**: 實現自適應連接池管理
3. **Phase 3**: 集成 Grafana 監控面板
4. **Phase 4**: 自動告警與恢復機制

**預期收益**：
- 連接耗盡率降低 99%
- 查詢響應時間穩定
- 自動化容量管理

---

### Issue 1.3: 缺少內置分佈式鎖支持

**發現時間**：Week 3
**嚴重性**：⭐⭐⭐⭐ High
**影響度**：庫存一致性保證

#### 問題描述

```typescript
// 當前做法：手動使用 Redis 客戶端
const locked = await redis.set(
  `lock:${productId}`,
  userId,
  'NX',    // 只在不存在時設置
  'EX',
  900      // 900 秒過期
)
if (!locked) {
  throw new Error('Already locked')
}
```

**問題**：
- 無統一的鎖管理接口
- 無死鎖偵測機制
- 無自動重試邏輯
- 無 Redlock 容錯支持

#### 改進建議

```typescript
// 新增 @gravito/distributed-lock 包

interface LockOptions {
  ttl: number                    // 鎖定時間
  retry: {
    attempts: number
    delayMs: number
    backoff: 'linear' | 'exponential'
  }
  deadlockDetection: true        // 死鎖偵測
  replication: 'single' | 'redlock'  // 複製策略
}

// 使用方式
const lock = await core.container
  .make('distributed-lock')
  .acquire(`inventory:${productId}`, {
    ttl: 900000,                 // 900 秒
    retry: {
      attempts: 3,
      delayMs: 100,
      backoff: 'exponential'
    },
    deadlockDetection: true,
    replication: 'redlock'       // 多 Redis 容錯
  })

try {
  // 執行臨界段代碼
  await deductInventory()
} finally {
  await lock.release()
}
```

#### 實施計畫

1. **Phase 1**: 創建 `@gravito/distributed-lock` 包
2. **Phase 2**: 實現基礎 Redis Lock
3. **Phase 3**: 實現 Redlock 算法（多 Redis）
4. **Phase 4**: 添加死鎖偵測與自動恢復

**預期收益**：
- 鎖管理統一標準化
- 支持多 Redis 部署
- 自動容錯與恢復

---

## 🟠 優先級 2: 短期改進 (High)

### Issue 2.1: 缺少分佈式追蹤支持

**發現時間**：Week 7
**嚴重性**：⭐⭐⭐⭐ High
**影響度**：性能診斷與問題排查

#### 問題描述

```
當前：單機日誌記錄
問題：
  - 無法追蹤跨 Satellite 請求
  - 無法看到完整的調用鏈路
  - 無法自動識別性能瓶頸
  - 無法關聯多個 Job 執行
```

#### 改進建議

```typescript
// 集成 OpenTelemetry

// 1. 自動追蹤儀器化
import { NodeTracerProvider } from '@opentelemetry/node'
import { registerInstrumentations } from '@opentelemetry/auto-instrumentations-node'

const provider = new NodeTracerProvider()
registerInstrumentations()  // 自動追蹤 HTTP、DB、Redis 等

// 2. Satellite 間追蹤
@Hook('order:created')
async onOrderCreated(payload) {
  const span = tracer.startSpan('inventory.lock')
  try {
    await core.container.make('inventory-lock').lock()
  } finally {
    span.end()
  }
}

// 3. Job 執行追蹤
class OrderJob {
  async handle() {
    const span = tracer.startSpan('order.processing', {
      attributes: { jobId: this.id }
    })
    try {
      await this.process()
    } finally {
      span.end()
    }
  }
}

// 4. 匯出到 Jaeger/Zipkin
const exporter = new JaegerExporter({
  endpoint: 'http://localhost:14268/api/traces'
})
provider.addSpanProcessor(new BatchSpanProcessor(exporter))
```

**預期收益**：
- 自動生成完整調用鏈路
- 自動識別性能瓶頸 (>1s 自動告警)
- 支持分佈式追蹤可視化

---

### Issue 2.2: 缺少速率限制與熔斷機制

**發現時間**：Week 6
**嚴重性**：⭐⭐⭐ Medium
**影響度**：系統穩定性與級聯故障

#### 改進建議

```typescript
// 1. 內置速率限制
const rateLimiter = core.container.make('rate-limiter')

// 基於 IP 的速率限制
app.use(rateLimiter.middleware({
  keyGenerator: (req) => req.ip,
  limit: 100,         // 100 請求
  window: 60000,      // 60 秒窗口
}))

// 基於用戶的速率限制
app.post('/api/orders',
  rateLimiter.middleware({
    keyGenerator: (req) => req.user.id,
    limit: 10,         // 單用戶 10 個/分鐘
    window: 60000,
    skipSuccessfulRequests: false,  // 失敗也計數
  }),
  orderController.create
)

// 2. 熔斷器
const circuitBreaker = core.container.make('circuit-breaker')

class PaymentService {
  async processPayment(order) {
    return await circuitBreaker.execute(
      async () => this.stripe.charge(order),
      {
        name: 'stripe-payment',
        failureThreshold: 5,        // 5 次失敗後熔斷
        resetTimeout: 30000,        // 30 秒後嘗試恢復
        onOpen: () => {
          logger.error('Payment service circuit breaker opened')
        }
      }
    )
  }
}

// 3. 自適應降級
class InventoryService {
  async getInventory(productId) {
    try {
      // 優先使用快取
      return await cache.get(`inventory:${productId}`)
    } catch (error) {
      // 快取失敗，降級到過期數據
      return await cache.getStale(`inventory:${productId}`)
    }
  }
}
```

**預期收益**：
- 防止單個服務故障級聯
- 自動限流保護系統
- 優雅降級提升可用性

---

## 🟡 優先級 3: 中期優化 (Medium)

### Issue 3.1: 快取層還需優化

**發現時間**：Week 6
**嚴重性**：⭐⭐⭐ Medium

#### 改進建議

```typescript
// 1. 二級快取（本地 + Redis）
class MultiLevelCache {
  async get(key) {
    // L1: 本地記憶體快取 (100ms TTL)
    let value = this.localCache.get(key)
    if (value) return value

    // L2: Redis 快取 (5分鐘 TTL)
    value = await redis.get(key)
    if (value) {
      this.localCache.set(key, value)  // 回源到本地
      return value
    }

    // L3: 資料庫
    value = await db.query(key)
    await redis.setex(key, 300, value)  // 放回 Redis
    return value
  }
}

// 2. 快取預熱
class CacheWarmer {
  async warmUp() {
    // 應用啟動時預熱熱點數據
    const products = await db.getHotProducts(100)
    for (const product of products) {
      await cache.set(`product:${product.id}`, product, {
        ttl: 3600  // 1 小時
      })
    }
  }
}

// 3. 快取失效策略
// 當前：TTL 失效
// 改進：
//   - 事件驅動失效
//   - 模式匹配清理
//   - 預測性刷新
```

---

### Issue 3.2: 缺少事件溯源支持

**發現時間**：Week 8
**嚴重性**：⭐⭐ Low
**影響度**：審計日誌與故障恢復

#### 改進建議

```typescript
// Event Sourcing 支持
interface Event {
  id: string
  aggregate: 'Order' | 'Inventory'
  aggregateId: string
  type: 'OrderCreated' | 'OrderConfirmed' | string
  version: number
  timestamp: Date
  data: any
  metadata: {
    userId: string
    source: string
  }
}

// 事件存儲
class EventStore {
  async append(event: Event) {
    // 追加事件到不可變日誌
    await db.table('events').insert(event)
    // 觸發訂閱者
    await bus.publish(event)
  }

  async getEvents(aggregateId: string, fromVersion: number = 0) {
    // 重放事件重構狀態
    return db.table('events')
      .where('aggregateId', aggregateId)
      .where('version', '>', fromVersion)
      .orderBy('version')
  }
}

// 狀態重構
class OrderAggregate {
  async loadFromHistory(orderId: string) {
    const events = await eventStore.getEvents(orderId)
    let order = new Order()

    for (const event of events) {
      switch(event.type) {
        case 'OrderCreated':
          order = Order.create(event.data)
          break
        case 'OrderConfirmed':
          order.confirm(event.data)
          break
        case 'OrderCancelled':
          order.cancel(event.data)
          break
      }
    }

    return order
  }
}
```

**應用場景**：
- 完整審計日誌
- 時間旅行調試
- 故障恢復與重放
- 跨系統同步

---

## 📊 優化優先級排序

| 優先級 | Issue | 嚴重性 | 工作量 | 收益 | 建議實施時間 |
|--------|-------|--------|--------|------|-------------|
| 🔴 1 | Event System 性能 | 🔴 Critical | 中 | 🌟🌟🌟 高 | 即刻 |
| 🔴 1 | 連接池管理 | 🟠 High | 小 | 🌟🌟🌟 高 | 即刻 |
| 🔴 1 | 分佈式鎖 | 🟠 High | 中 | 🌟🌟🌟 高 | 即刻 |
| 🟠 2 | 分佈式追蹤 | 🟠 High | 中 | 🌟🌟🌟 高 | Week 1-2 |
| 🟠 2 | 速率限制 | 🟡 Medium | 小 | 🌟🌟 中 | Week 2-3 |
| 🟡 3 | 快取層優化 | 🟡 Medium | 小 | 🌟🌟 中 | Week 4-6 |
| 🟡 3 | 事件溯源 | 🟢 Low | 大 | 🌟 低 | Week 8+ |

---

## 🎯 建議實施路線圖

### Phase 1: 立即修復 (1-2 個月)

**目標**：解決關鍵性能和可靠性問題

```
Week 1-2:
  ├─ Event System 異步改造
  ├─ 連接池自適應管理
  └─ 分佈式鎖 MVP

Week 3-4:
  ├─ 分佈式追蹤集成
  ├─ 監控告警配置
  └─ 自動容錯機制
```

### Phase 2: 短期改進 (2-4 個月)

```
  ├─ 速率限制完整實現
  ├─ 熔斷器優雅降級
  └─ Redlock 多副本支持
```

### Phase 3: 中期優化 (4-6 個月)

```
  ├─ 多級快取策略
  ├─ 快取預熱機制
  └─ 性能自動優化
```

### Phase 4: 長期規劃 (6+ 個月)

```
  ├─ 事件溯源支持
  ├─ 多區域部署
  └─ 高級分析系統
```

---

## 📋 對 Gravito 框架的總體評價

### 優勢 ⭐⭐⭐⭐⭐

✅ **Satellite 架構設計優秀**
- 高內聚、低耦合
- 易於擴展和測試
- 適合微服務應用

✅ **事件系統易用直觀**
- Hooks 模式簡潔
- 跨 Satellite 通訊清晰
- 基礎功能完善

✅ **TypeScript 支持完善**
- 類型安全
- 開發體驗好
- 編譯檢查嚴格

✅ **整體架構合理**
- 依賴注入完整
- 生命週期管理好
- 配置靈活

### 改進空間 ⭐⭐

❌ **高併發場景還需優化**
- Event System 同步派發瓶頸
- 連接池管理不夠自適應
- 缺少內置容錯機制

❌ **可觀測性工具不足**
- 無內置分佈式追蹤
- 監控指標曝露不完整
- 性能診斷工具缺乏

❌ **分佈式特性支持不完整**
- 無內置分佈式鎖
- 無限流熔斷機制
- 無事件溯源支持

---

## 💡 最終建議

### 對 Gravito 框架團隊

1. **優先處理 Event System 性能**
   - 這是最常見的瓶頸
   - 影響所有 Satellite 應用
   - 改造難度相對較小

2. **建立內置分佈式工具庫**
   - `@gravito/distributed-lock`
   - `@gravito/rate-limiter`
   - `@gravito/circuit-breaker`

3. **集成分佈式追蹤**
   - OpenTelemetry 集成
   - 自動儀器化
   - 內置 Jaeger/Zipkin 支持

4. **加強文檔和示例**
   - 高併發場景最佳實踐
   - 性能調優指南
   - 故障排除手冊

### 對使用 Gravito 的開發者

1. **做好準備**
   - 高併發應用提前測試
   - 準備降級方案
   - 監控告警配置充分

2. **主動優化**
   - 使用快取層減輕負擔
   - 非同步隊列替代 Event
   - 定期性能測試

3. **参與貢獻**
   - 反饋發現的問題
   - 提交改進建議
   - 參與框架優化

---

**評價總結**：

Gravito 是一個優秀的框架，**架構設計先進，基礎功能完善**。但在 **高併發和分佈式** 場景下還需要進一步優化。建議：

- **適用於**：電商搶購、高併發 API、多微服務應用
- **需要改進**：Event System 性能、分佈式工具、可觀測性
- **綜合評分**：⭐⭐⭐⭐ (4/5)

---

**最後更新**：2026-02-02
**版本**：1.0
**撰寫者**：搶購系統開發團隊
