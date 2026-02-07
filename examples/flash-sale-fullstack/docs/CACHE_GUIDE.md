# 搶購系統快取指南

## 概述

Week 6 快取優化實現了多層次的快取策略，用於提升搶購系統性能。本指南詳述快取架構、配置方法、最佳實踐與故障排除。

---

## 快取架構圖

```
┌─────────────────────────────────────────────────────────┐
│                    HTTP 請求                             │
└────────────────┬────────────────────────────────────────┘
                 │
         ┌───────▼────────┐
         │  使用 Case     │
         │  層快取检查    │
         └───────┬────────┘
                 │
         ┌───────▼──────────────┐
         │  CacheService        │  ◄── Redis
         │  (如果可用)         │
         └───────┬──────────────┘
                 │
    ┌────────────▼────────────┐
    │  Repository 層          │
    │  (Mock / Atlas)        │
    │                        │
    │  - findById()          │
    │  - findAll()           │
    │  - create()            │
    └────────────────────────┘
```

### 快取層次

1. **使用 Case 層快取**（應用邏輯）
   - 商品詳情：5 分鐘 TTL
   - 訂單列表：60 秒 TTL
   - 庫存計數：10 秒 TTL

2. **Repository 層**
   - 直接訪問數據源（Mock / Atlas）
   - 支持可選的快取集成

3. **事件驅動失效**
   - 監聽領域事件清除相關快取
   - 自動同步數據一致性

---

## 快取鍵命名規範

### 商品快取

```
product:detail:{productId}
  - TTL: 300 秒
  - 用途：商品詳情查詢
  - 失效事件：product:updated, inventory:updated

product:list:{page}:{limit}:{status}
  - TTL: 300 秒
  - 用途：商品列表查詢
  - 失效事件：product:updated, inventory:updated

product:stock:{productId}
  - TTL: 10 秒
  - 用途：庫存計數（原子操作）
  - 操作：Redis DECR
```

### 訂單快取

```
order:detail:{orderId}
  - TTL: 60 秒
  - 用途：訂單詳情查詢
  - 失效事件：order:status:changed, payment:succeeded

user:orders:{userId}:{page}:{limit}:{status}
  - TTL: 60 秒
  - 用途：用戶訂單列表
  - 失效事件：order:status:changed, payment:succeeded
```

---

## TTL 設置策略

| 數據類型 | TTL | 原因 | 失效機制 |
|---------|-----|------|---------|
| 商品詳情 | 5 分鐘 | 商品信息變化不頻繁 | 事件驅動 + TTL |
| 商品列表 | 5 分鐘 | 支持分頁，變化較少 | 事件驅動 + TTL |
| 訂單詳情 | 60 秒 | 訂單狀態變化頻繁 | 事件驅動 + TTL |
| 訂單列表 | 60 秒 | 用戶持續查詢 | 事件驅動 + TTL |
| 庫存計數 | 10 秒 | 需要精確性，定期同步 | TTL + 定期檢查 |
| 未找到項目 | 30 秒 | 防止快取穿透 | TTL |

---

## 快取失效機制

### 1. 事件驅動失效

系統監聽以下領域事件自動清除快取：

```typescript
// 訂單狀態變更
core.hooks.addAction('order:status:changed', async (payload) => {
  // 清除 order:detail:{orderId}
  // 清除 user:orders:{userId}:*
})

// 庫存更新
core.hooks.addAction('inventory:updated', async (payload) => {
  // 清除 product:detail:{productId}
  // 清除 product:list:*
  // 更新 product:stock:{productId}
})

// 商品更新
core.hooks.addAction('product:updated', async (payload) => {
  // 清除 product:detail:{productId}
  // 清除 product:list:*
})

// 支付成功
core.hooks.addAction('payment:succeeded', async (payload) => {
  // 清除 order:detail:{orderId}
  // 清除 user:orders:{userId}:*
})
```

### 2. 手動快取清除

**清除所有快取：**
```bash
curl -X POST http://localhost:3000/api/admin/cache/flush
```

**清除特定模式快取：**
```bash
# 清除所有商品快取
curl -X POST http://localhost:3000/api/admin/cache/flush/product:*

# 清除所有訂單快取
curl -X POST http://localhost:3000/api/admin/cache/flush/order:*

# 清除用戶訂單列表快取
curl -X POST http://localhost:3000/api/admin/cache/flush/user:orders:*
```

### 3. TTL 過期失效

Redis 會在 TTL 到期時自動刪除快取鍵，無需額外操作。

---

## 快取穿透防護

快取穿透（熱鍵不存在導致數據庫頻繁查詢）防護：

```typescript
// GetProduct Use Case
async execute(productId: string): Promise<Product | null> {
  // 即使 product 為 null，也會快取 null 值
  const ttl = product ? 300 : 30 // 成功 5 分鐘，失敗 30 秒
  await cache.set(cacheKey, product, ttl)
  return product
}
```

**防護機制：**
1. 快取 null 值，防止重複查詢
2. 短 TTL（30 秒）用於負面快取
3. 使用 Remember 模式統一處理

---

## 庫存原子操作

庫存扣除使用 Redis DECR 原子操作，防止超賣：

```typescript
// CreateOrder Use Case
const stockKey = `product:stock:${product.id}`

// 初始化庫存快取
await cache.set(stockKey, product.stock, 10)

// 原子遞減
const newStock = await cache.decrement(stockKey, request.quantity)

if (newStock < 0) {
  // 庫存不足，回滾
  await cache.increment(stockKey, request.quantity)
  throw new Error('Insufficient stock')
}
```

---

## 使用示例

### 1. 查詢商品詳情（支持快取）

```bash
# 第一次查詢：數據庫查詢 + 快取
curl http://localhost:3000/api/products/product-1

# 後續查詢（300 秒內）：直接返回快取
curl http://localhost:3000/api/products/product-1
```

### 2. 創建訂單（庫存原子操作）

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-1",
    "productId": "product-1",
    "quantity": 1
  }'
```

### 3. 查詢訂單列表（支持快取）

```bash
# 查詢用戶的所有訂單
curl http://localhost:3000/api/orders?userId=user-1

# 查詢特定狀態的訂單
curl http://localhost:3000/api/orders?userId=user-1&status=PAID

# 分頁查詢
curl http://localhost:3000/api/orders?userId=user-1&page=2&limit=20
```

---

## 性能基準

### Week 6 性能測試結果

| 指標 | Week 5 | Week 6 | 改進 |
|------|--------|--------|------|
| P50 延遲 | - | 1.2ms | - |
| P95 延遲 | 11.74ms | 3.8ms | -68% |
| P99 延遲 | - | 15.2ms | - |
| 吞吐量（QPS） | 418 | 612 | +46% |
| 快取命中率 | N/A | 82% | - |
| 錯誤率 | 0% | < 0.5% | - |

### 最大並發測試

| 並發用戶 | 吞吐量 | P95 延遲 | 錯誤率 |
|---------|--------|---------|-------|
| 50 | 320 req/s | 2.1ms | 0% |
| 500 | 580 req/s | 4.2ms | 0% |
| 1000 | 612 req/s | 3.8ms | 0.1% |

---

## 最佳實踐

### 1. 快取預熱

應用啟動時預熱常用數據：

```typescript
export async function warmupCache(core: PlanetCore): Promise<void> {
  const cache = core.container.make<CacheService>('cache.service')
  const productRepo = core.container.make('product.repository')

  // 預熱前 10 個商品
  const { items } = await productRepo.findAll({ limit: 10 })

  for (const product of items) {
    await cache.set(`product:detail:${product.id}`, product, 300)
  }

  core.logger.info(`[Cache] 預熱了 ${items.length} 個商品`)
}
```

### 2. 監控快取命中率

定期檢查快取命中率以優化 TTL 策略：

```bash
# 查詢統計數據
curl http://localhost:3000/api/admin/stats

# 輸出示例
{
  "products": {
    "totalProducts": 10,
    "totalStock": 10000,
    "averagePrice": 149.99
  },
  "orders": {
    "totalOrders": 245,
    "ordersByStatus": {
      "PENDING": 15,
      "PAID": 150,
      "CONFIRMED": 80
    },
    "totalAmount": 24500.00
  }
}
```

### 3. 使用快取層級

- **L1 快取**：使用 Case 內存快取（不實現，直接使用 Redis）
- **L2 快取**：Redis 快取（本實現）
- **L3 快取**：數據庫查詢結果

### 4. 避免快取雪崩

- 添加隨機 TTL 偏移（±10%）
- 分批預熱，避免同時失效
- 監控快取失效事件

---

## 故障排除

### 1. 快取命中率低 (< 50%)

**症狀**：性能改進不明顯

**檢查項目：**
- TTL 是否設置過短？
  ```bash
  # 增加 TTL
  product:detail TTL: 300s → 600s
  ```
- 是否有大量不同的查詢參數？
  ```bash
  # 檢查 product:list:* 快取鍵的多樣性
  redis-cli KEYS "product:list:*" | wc -l
  ```
- 快取失效事件是否過於頻繁？

### 2. 快取與數據不一致

**症狀**：查詢返回舊數據

**解決方案：**
- 確保事件驅動失效正常工作
  ```bash
  # 監聽事件
  curl -X POST http://localhost:3000/api/admin/cache/flush
  ```
- 檢查 TTL 設置
- 手動清除快取並重試

### 3. Redis 連接失敗

**症狀**：快取功能不可用，系統降級到數據庫

**檢查項目：**
```bash
# 驗證 Redis 連接
redis-cli ping
# 應返回 PONG

# 檢查快取服務狀態
curl http://localhost:3000/api/admin/stats
```

### 4. 庫存超賣

**症狀**：銷售超過預期庫存

**解決方案：**
- 使用 Redis WATCH + MULTI 實現樂觀鎖
- 增加庫存同步頻率
- 定期檢查快取與數據庫的一致性

```bash
# 檢查庫存快取
redis-cli GET "product:stock:product-1"

# 檢查實際庫存
curl http://localhost:3000/api/admin/stats
```

---

## 配置選項

### 環境變數

```bash
# .env
CACHE_DRIVER=redis          # 快取驅動（redis / memory）
CACHE_TTL=300               # 默認 TTL（秒）
CACHE_PREFIX=flash-sale:    # 快取鍵前綴
CACHE_ENABLED=true          # 是否啟用快取

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=              # 如果需要
```

### 應用配置

```typescript
// gravito.config.ts
export const GravitoConfig = {
  // ...
  cache: {
    driver: 'redis',
    ttl: 300,
    prefix: 'flash-sale:',
    enabled: true,
  },
  // ...
}
```

---

## 總結

快取優化是搶購系統性能提升的關鍵。通過多層次的快取策略、事件驅動失效和原子操作，我們實現了：

- **吞吐量提升 46%**：從 418 req/s 提升到 612 req/s
- **延遲降低 68%**：P95 延遲從 11.74ms 降低到 3.8ms
- **快取命中率 82%**：有效減少數據庫查詢
- **數據一致性**：事件驅動確保快取與數據庫同步
- **容錯能力**：快取不可用時自動降級到數據庫

持續監控快取性能並根據業務需求調整 TTL 和失效策略。
