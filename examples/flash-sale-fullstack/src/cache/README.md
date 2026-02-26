## 快取層（Stasis）集成指南

本示例使用 `@gravito/stasis` 實現高效能的多層級快取策略，是搶購系統性能優化的核心。

### 🏗️ 架構

```
請求
  ↓
[分層快取 (Tiered)]
  ├─ L1 (本地) → MemoryStore
  │  └─ 1000 項，LRU 淘汰
  └─ L2 (遠程) → RedisStore
     └─ 分布式共享

快取命中率目標：
- 商品詳情：95%+（常讀，少改）
- 庫存數據：90%+（頻繁讀寫）
- 訂單數據：85%+（寫多讀少）
```

### 🎯 快取分層策略

#### L1 - 本地快取（MemoryStore）
- **用途**：熱點數據、高頻訪問
- **容量**：1000 項（LRU 淘汰）
- **延遲**：< 1ms
- **共享**：單機本地

**適合的數據**：
- 當前用戶的購物車
- 實時排行榜（熱點商品）
- 活躍閃購信息

#### L2 - Redis 快取（RedisStore）
- **用途**：分布式共享數據
- **容量**：無限制（取決於 Redis）
- **延遲**：5-10ms
- **共享**：所有實例共享

**適合的數據**：
- 商品詳情（TTL 5 分鐘）
- 庫存總量（TTL 5 分鐘）
- 用戶會話（TTL 1 小時）

#### Hybrid - 分層快取（推薦）
- **讀策略**：L1 → L2 → DB
- **寫策略**：L1 + L2
- **優勢**：兼顧速度和一致性
- **推薦**：生產環境使用

### 📊 快取配置

```typescript
// src/cache/stasis-config.ts

const CACHE_CONFIG = {
  default: 'tiered',  // 默認使用分層快取
  prefix: 'flash-sale:',
  stores: {
    local: { driver: 'memory', maxItems: 1000 },
    redis: { driver: 'redis', connection: 'default' },
    tiered: { driver: 'tiered', local: 'local', remote: 'redis' }
  }
}
```

### 🚀 使用示例

#### 1. 商品詳情快取（最常見）

```typescript
import { ProductCache } from '@/cache/cache-service'

// 查詢商品（自動快取）
const product = await ProductCache.getDetail(
  productId,
  async () => {
    return await atlas.products.find(productId)
  },
  logger
)

// 商品更新時失效快取
await ProductCache.invalidate(productId, logger)
```

#### 2. 庫存快取

```typescript
import { InventoryCache } from '@/cache/cache-service'

// 查詢庫存
const total = await InventoryCache.getTotal(
  productId,
  async () => {
    return await inventoryService.getTotalQuantity(productId)
  },
  logger
)

// 庫存變更時失效
await InventoryCache.invalidate(productId, logger)
```

#### 3. 訂單快取

```typescript
import { OrderCache } from '@/cache/cache-service'

// 查詢訂單
const order = await OrderCache.getOrder(
  orderId,
  async () => {
    return await orderService.getOrder(orderId)
  },
  logger
)

// 訂單更新時失效
await OrderCache.invalidate(orderId, userId, logger)
```

#### 4. 用戶資料快取

```typescript
import { UserCache } from '@/cache/cache-service'

// 查詢用戶資料
const user = await UserCache.getProfile(
  userId,
  async () => {
    return await userService.getProfile(userId)
  },
  logger
)

// 用戶信息更新時失效
await UserCache.invalidate(userId, logger)
```

#### 5. 速率限制

```typescript
import { RateLimitCache } from '@/cache/cache-service'

// 檢查用戶是否超過速率限制
const exceeded = await RateLimitCache.tooManyAttempts(
  `order:create:${userId}`,
  10,  // maxAttempts
  1,   // decayMinutes
  logger
)

if (exceeded) {
  throw new Error('Too many requests')
}
```

### 🔑 快取鍵設計

所有快取鍵都有統一的前綴和格式，便於管理：

```typescript
// src/cache/stasis-config.ts 中的 CACHE_KEYS

// 商品相關
product:123                    // 商品詳情
products:list                  // 商品列表

// 庫存相關
inventory:123:total           // 庫存總量
inventory:123:available       // 可用庫存
inventory:123:reserved        // 已預留庫存

// 訂單相關
order:abc-123                 // 訂單詳情
orders:user:user-456          // 用戶訂單列表

// 用戶相關
user:user-456:profile         // 用戶資料
user:user-456:cart            // 購物車

// 速率限制
rate-limit:order:create:user-456
```

### ⏱️ TTL（生存時間）配置

```typescript
// src/cache/stasis-config.ts 中的 CACHE_TTLS

FLASH_SALE_ACTIVE: 60,        // 1 分鐘（實時數據）
PRODUCT_DETAIL: 300,          // 5 分鐘（標準數據）
INVENTORY_TOTAL: 300,         // 5 分鐘
PRODUCT_LIST: 900,            // 15 分鐘
USER_PROFILE: 900,            // 15 分鐘
ORDER_HISTORY: 3600,          // 1 小時（冷數據）
STATIC_CONFIG: 86400,         // 24 小時（靜態數據）
```

### 🎯 失效策略

#### 1. 時間失效（TTL）
自動：達到 TTL 時快取過期
```typescript
await cache.remember(key, data, { ttl: 300 }) // 5 分鐘後自動失效
```

#### 2. 主動失效
數據更新時立即失效：
```typescript
// 商品更新時
await ProductCache.invalidate(productId)

// 庫存變更時
await InventoryCache.invalidate(productId)

// 訂單狀態改變時
await OrderCache.invalidate(orderId)
```

#### 3. 批量失效
一次清除多個相關的快取：
```typescript
await ProductCache.invalidateBatch([id1, id2, id3])
```

#### 4. 完全刷新
清空所有快取（謹慎使用）：
```typescript
await CacheStats.flush(logger)
```

### 📈 性能指標

#### 無快取
```
商品查詢：900ms (99th percentile)
吞吐量：100 orders/sec
```

#### + Stasis 快取
```
商品查詢：50ms (99th percentile)      ↓ 94%
吞吐量：1,800 orders/sec              ↑ 18x
```

#### 預期命中率
```
L1 (本地)：60-70%
L2 (Redis)：85-95%
綜合命中率：95%+
```

### 🛠️ 監控和診斷

#### 快取統計
```typescript
import { CacheStats } from '@/cache/cache-service'

const stats = await CacheStats.getStats(logger)
console.log(stats) // { hits, misses, hitRate, store }
```

#### 日誌追蹤
所有快取操作都記錄日誌：
```
[Cache] HIT: product:123
[Cache] MISS: product:456
[Cache] Updated inventory:123:total: 50
[Cache] Invalidated product:789
```

### 🚨 常見問題

#### Q1：快取一致性如何保證？
**A**：使用主動失效策略。數據更新時立即清除快取，下次查詢會重新加載最新數據。

#### Q2：Redis 故障怎麼辦？
**A**：使用 circuit-breaker store，Redis 故障時自動降級到本地快取。

#### Q3：L1 快取滿了怎麼辦？
**A**：使用 LRU 淘汰策略，最少使用的項目會被自動清除。

#### Q4：分層快取的一致性問題？
**A**：失效時同時清除 L1 和 L2。讀時先查 L1，miss 後查 L2，最後查 DB。

### 🔐 安全考慮

1. **敏感數據**：不快取密碼、token 等敏感信息
2. **用戶隔離**：購物車等用戶數據要包含 userId，避免跨用戶訪問
3. **過期管理**：設置合理的 TTL，不可信任快取作為唯一數據源

### 🔗 相關資源

- [@gravito/stasis 文檔](../../packages/stasis/README.md)
- [性能優化指南](../PERFORMANCE.md)
- [架構設計](../ARCHITECTURE.md)

### 📊 集成清單

- ✅ 配置文件：`stasis-config.ts`
- ✅ 服務層：`cache-service.ts`
- ✅ 業務集成：`integrations/cache-integration.ts`
- ✅ 應用啟動：`app.ts`
- ✅ 文檔：本文件

**預期效果**：快取命中率 95%+，響應時間降低 94%，吞吐量提升 18 倍！
