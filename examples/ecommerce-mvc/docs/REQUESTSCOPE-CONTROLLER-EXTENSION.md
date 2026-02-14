# RequestScope 擴展到多個控制器

此文檔說明如何將 RequestScope 模式擴展到 OrderController 和 WishlistController。

## 概述

在成功整合 CartController 之後，RequestScope 模式進一步應用到其他需要產品快取的控制器，減少整個應用的 N+1 查詢問題。

## OrderController 整合

### 實施內容

**檔案**：`src/Http/Controllers/OrderController.ts`

#### 1. 建立服務工廠方法

```typescript
private static getService(ctx: GravitoContext): OrderService {
  const productCache = ctx.scoped('product:cache', () => new RequestProductCache())
  return new OrderService(undefined, productCache)
}
```

#### 2. 更新所有方法

| 方法 | 變更 |
|------|------|
| `pay()` | `new OrderService()` → `getService(ctx)` |
| `index()` | `new OrderService()` → `getService(ctx)` |
| `show()` | `new OrderService()` → `getService(ctx)` |
| `cancel()` | `new OrderService()` → `getService(ctx)` |

#### 3. 效果

訂單相關操作現在共享單一請求級快取：

```
single request:
├─ show(order 1) → fetch products [1, 2, 3] → cache
├─ getOrderItems(order 1) → products already cached
├─ show(order 2) → fetch products [2, 4, 5]
│  └─ product 2 cached, fetch [4, 5]
└─ Total: 2 queries instead of N+1
```

## WishlistController 整合

### 實施內容

**新檔案**：`src/Services/WishlistService.ts`

創建完整的服務層用於願望清單操作：

```typescript
export class WishlistService {
  constructor(private productCache?: RequestProductCache) {}

  async getUserWishlists(userId: number) {
    // 使用請求級快取批量載入產品
    const wishlists = await WishlistModel.where('user_id', userId).get()
    const productIds = wishlists.map(w => w.product_id)
    const productMap = await this.productCache?.getProducts(productIds) ?? []
    // 組裝返回資料...
  }

  async addToWishlist(userId: number, productId: number)
  async removeFromWishlist(wishlistId: number, userId: number)
}
```

### 控制器更新

**檔案**：`src/Http/Controllers/WishlistController.ts`

```typescript
private static getService(ctx: GravitoContext): WishlistService {
  const productCache = ctx.scoped('product:cache', () => new RequestProductCache())
  return new WishlistService(productCache)
}

static async index(ctx: GravitoContext) {
  const service = WishlistController.getService(ctx)
  const wishlists = await service.getUserWishlists(user.id)
  return inertia.render('Account/Wishlist', { wishlists })
}
```

### 效果

原始代碼（直接查詢）：

```typescript
// 載入 5 個願望清單項目
const wishlists = await Wishlist.where('user_id', userId).get()
const productIds = wishlists.map(w => w.product_id) // [1, 2, 3, 4, 5]
// ❌ 5 次查詢
const products = await Promise.all(
  productIds.map(id => Product.find(id))
)
```

最佳化代碼（使用 RequestScope）：

```typescript
// 載入 5 個願望清單項目
const wishlists = await Wishlist.where('user_id', userId).get()
const productIds = wishlists.map(w => w.product_id)
// ✅ 1 次查詢
const productMap = await cache.getProducts(productIds)
```

## 服務層改進

### 更新 Services/index.ts

新增導出：

```typescript
export { RequestProductCache } from './RequestProductCache'
export type { CachedProduct } from './RequestProductCache'
export { WishlistService } from './WishlistService'
```

### 設計原則

1. **可選快取注入**
   ```typescript
   constructor(private productCache?: RequestProductCache) {}
   ```
   服務可以在有或無快取的情況下工作

2. **降級支持**
   ```typescript
   const products = this.productCache
     ? await this.productCache.getProducts(ids)
     : await Product.whereIn('id', ids).get()
   ```
   如果快取不可用，直接查詢

3. **單一責任**
   - OrderService：訂單相關邏輯
   - WishlistService：願望清單相關邏輯
   - RequestProductCache：產品快取策略

## 測試覆蓋

### 新增測試檔案

**檔案**：`tests/order-wishlist-requestscope.test.ts`

包含 12 個測試：

#### OrderController 測試
- ✅ 提供請求級快取給 OrderService
- ✅ 清理快取（請求結束時）
- ✅ 多請求隔離驗證

#### WishlistController 測試
- ✅ 建立 WishlistService with 快取
- ✅ 跨多個服務呼叫重用快取
- ✅ 提供統計資訊
- ✅ 清理快取

#### 多控制器隔離
- ✅ 不同請求獨立快取
- ✅ 獨立清理（互不影響）

#### 性能測試
- ✅ 清理速度測量（< 100ms）
- ✅ 多服務同一作用域

### 測試結果

```
✅ 12/12 order/wishlist tests passing
✅ 105/105 total ecommerce-mvc tests passing (new + existing)
✅ 104/104 typecheck
✅ 79/79 build
```

## 性能對比

### OrderController 場景：查看訂單詳情與相關訂單

**之前（無快取）：**
```
show(orderId=1)
├─ SELECT * FROM orders WHERE id = 1
├─ SELECT * FROM order_items WHERE order_id = 1
├─ SELECT * FROM products WHERE id = 10
├─ SELECT * FROM products WHERE id = 11
└─ SELECT * FROM products WHERE id = 12

Total: 5 queries
```

**之後（RequestScope）：**
```
show(orderId=1)
├─ SELECT * FROM orders WHERE id = 1
├─ SELECT * FROM order_items WHERE order_id = 1
└─ SELECT * FROM products WHERE id IN (10,11,12)

Total: 3 queries (-40%)
```

### WishlistController 場景：顯示願望清單

**之前（無快取）：**
```
index(userId=5)
├─ SELECT * FROM wishlists WHERE user_id = 5
├─ SELECT * FROM products WHERE id = 20
├─ SELECT * FROM products WHERE id = 21
├─ SELECT * FROM products WHERE id = 22
├─ SELECT * FROM products WHERE id = 23
└─ SELECT * FROM products WHERE id = 24

Total: 6 queries
```

**之後（RequestScope）：**
```
index(userId=5)
├─ SELECT * FROM wishlists WHERE user_id = 5
└─ SELECT * FROM products WHERE id IN (20,21,22,23,24)

Total: 2 queries (-67%)
```

## 監控輸出

### 請求結束時的統計

```
[ProductCache] Request stats: products=8, queries=2, hits=3, hitRate=37.50%
```

說明：
- **products=8**: 快取中存儲的商品總數
- **queries=2**: 執行的資料庫查詢次數
- **hits=3**: 快取命中次數
- **hitRate=37.50%**: 快取命中率

## ProductController - 為什麼不整合？

**檔案**：`src/Http/Controllers/ProductController.ts`

ProductController 使用**類別式模式**（extends BaseController），不適合應用 RequestScope：

1. **無 N+1 問題**
   - `index()`: 單一 Product.all() 查詢
   - `show()`: 單一 Product.find(id) 查詢
   - `store()`: 單一 Product.create() 操作

2. **不同架構模式**
   - ProductController: 類別式（this.context）
   - CartController/OrderController/WishlistController: 靜態方法式（ctx parameter）

3. **非快取受益者**
   - ProductController 主要關注商品本身
   - 不處理商品與其他實體的關係

**建議**：若未來需要優化 ProductController，考慮：
- 實現 HotnessTracker 記錄商品訪問
- 預熱熱門商品到 L1 快取
- 這是 P1.1 智能預熱的對象

## 最佳實踐總結

### ✅ 推薦模式

1. **設計服務層支持快取**
```typescript
constructor(private productCache?: RequestProductCache) {}
```

2. **提供降級方案**
```typescript
const products = this.cache
  ? await this.cache.getProducts(ids)
  : await Product.whereIn('id', ids).get()
```

3. **控制器中使用工廠方法**
```typescript
private static getService(ctx: GravitoContext): MyService {
  const cache = ctx.scoped('product:cache', () => new RequestProductCache())
  return new MyService(cache)
}
```

4. **批量操作而非迴圈**
```typescript
// ❌ 不好
const products = await Promise.all(ids.map(id => Product.find(id)))

// ✅ 好
const products = await productCache.getProducts(ids)
```

### ❌ 避免的模式

1. **在控制器中直接管理快取**
```typescript
// ❌ 不好
const cache = new RequestProductCache()
const products = await cache.getProducts([1, 2, 3])
// 應該在 Service 中！
```

2. **跨越多個控制器共享快取**
```typescript
// ❌ 不好 - 違反單一責任
const cache = new RequestProductCache()
cartController.setCache(cache)
orderController.setCache(cache)
// 每個請求應有獨立快取
```

3. **忽視降級情況**
```typescript
// ❌ 不好 - 如果快取為 null 會崩潰
const products = await this.cache.getProducts(ids)

// ✅ 好 - 有備用方案
const products = await this.cache?.getProducts(ids) ?? fallback
```

## 相關資源

- **[RequestScope 基礎整合](./REQUESTSCOPE-INTEGRATION.md)** - CartController 詳細指南
- **[RequestScope 完整指南](../../docs/guides/RequestScope.md)** - 全面的概念說明
- **[RequestScope + Orbit 範例](../../docs/guides/RequestScope-orbit-example.md)** - 完整的實戰案例

## 驗收標準

✅ **代碼質量**
- OrderController: 4 個方法全部更新 ✓
- WishlistController: 3 個方法全部更新 ✓
- WishlistService: 完整的服務層 ✓
- Biome lint: 通過 ✓

✅ **測試覆蓋**
- 12 個新的整合測試 ✓
- 105 個總測試（新 + 既有）✓
- 0 個失敗 ✓

✅ **編譯驗證**
- TypeScript: 104/104 通過 ✓
- Build: 79/79 通過 ✓

✅ **文檔**
- 本整合指南 ✓
- 代碼註解清晰 ✓
- 測試說明完整 ✓

## 提交歷史

```
98b570df test: [ecommerce-mvc] Update RequestProductCache test to use cleanup()
7f29c63e feat: [ecommerce-mvc] Extend RequestScope to OrderController & WishlistController
b013f405 docs: [ecommerce-mvc] Add RequestScope integration guide
41b64065 feat: [ecommerce-mvc] Integrate RequestScope pattern for product caching
```

---

**完成日期**：2026-02-12
**貢獻者**：Claude Code AI Agent
**狀態**：✅ 完成
