# ORM 查詢優化 - 常見性能陷阱

## 1. 背景 (Background)

### 1.1 為什麼 ORM 查詢很容易成為瓶頸？

現代應用中，數據庫查詢常占總耗時的 40-60%。不當的 ORM 使用會導致：
- **N+1 查詢問題** - 一個查詢變成 N 個
- **過度讀取** - 讀取不需要的列或關聯
- **循環查詢** - 應該 JOIN 的寫成循環查詢
- **缺乏索引** - 查詢執行計劃不佳

在 Gravito 中，Atlas ORM 基於 Knex.js，提供靈活但需小心使用的 API。

### 1.2 性能影響

```
良好實踐：一個查詢 + 一個 JOIN
  └─ 執行時間：5ms

N+1 問題：1 個查詢 + 100 個循環查詢
  └─ 執行時間：500ms (100 倍慢)

過度讀取：SELECT * vs 有選擇的列
  └─ 網路傳輸增加 5-10 倍
```

---

## 2. N+1 查詢問題 (N+1 Query Problem)

### 2.1 反面案例：最常見的錯誤

```typescript
// ❌ 反面：findAll() 中的 N+1
async findAll(): Promise<Product[]> {
  const products = await DB.table('products').get()  // 1 個查詢

  const result = []
  for (const product of products) {
    // 每個產品執行 1 次查詢 → N 個查詢
    const variants = await DB.table('variants')
      .where('product_id', product.id)
      .get()

    const categories = await DB.table('category_product')
      .where('product_id', product.id)
      .get()

    result.push({
      ...product,
      variants,
      categories
    })
  }

  return result  // 總共 1 + N + N = 1 + 2N 個查詢！
}

// 實際影響（假設 100 個產品）：
// - 預期：1 個查詢
// - 實際：201 個查詢
// - 性能差異：~20-50 倍
```

**問題根源**：
1. 先查詢主表（products）
2. 在迴圈中逐個查詢關聯數據（variants、categories）
3. 這是經典的 N+1 問題

### 2.2 正面案例：使用 JOIN

```typescript
// ✅ 正確：使用 JOIN
async findAll(): Promise<Product[]> {
  const products = await DB.table('products')
    .leftJoin('variants', 'products.id', '=', 'variants.product_id')
    .leftJoin('category_product', 'products.id', '=', 'category_product.product_id')
    .select(
      'products.*',
      'variants.id as variant_id',
      'variants.sku',
      'variants.price',
      'category_product.category_id'
    )
    .get()  // 1 個查詢，一次性取得所有數據

  // 在應用層組合
  return this.groupAndMap(products)
}

// 查詢統計：1 個查詢 ✅
// 性能：5ms vs 500ms ✅
```

### 2.3 批量查詢替代

某些場景無法 JOIN，改用批量查詢：

```typescript
// ❌ 錯誤（迴圈查詢）
async findByIds(ids: string[]): Promise<Product[]> {
  const products = []
  for (const id of ids) {
    const product = await DB.table('products')
      .where('id', id)
      .first()
    products.push(product)
  }
  return products  // N 個查詢
}

// ✅ 正確（一次性批量查詢）
async findByIds(ids: string[]): Promise<Product[]> {
  return DB.table('products')
    .whereIn('id', ids)
    .get()  // 1 個查詢
}
```

### 2.4 階段性載入（分頁時的 N+1）

```typescript
// ❌ 錯誤：分頁查詢 + 逐一載入關聯
async paginate(page: number, perPage: number): Promise<Product[]> {
  const products = await DB.table('products')
    .limit(perPage)
    .offset((page - 1) * perPage)
    .get()  // 1 個查詢，取得 20 條

  // 然後逐一載入變體 → 20 個額外查詢
  for (const product of products) {
    product.variants = await DB.table('variants')
      .where('product_id', product.id)
      .get()
  }

  return products  // 總共 21 個查詢
}

// ✅ 正確：使用 JOIN + GROUP
async paginate(page: number, perPage: number): Promise<Product[]> {
  const rows = await DB.table('products')
    .leftJoin('variants', 'products.id', '=', 'variants.product_id')
    .limit(perPage)
    .offset((page - 1) * perPage)
    .get()  // 1 個查詢，返回多行（產品 × 變體）

  return this.groupByProduct(rows)  // 在應用層組合
}
```

---

## 3. 過度讀取問題 (Over-fetching)

### 3.1 選擇列而非 SELECT *

```typescript
// ❌ 錯誤：SELECT *（讀取所有列）
async getProductPrice(id: string): Promise<number> {
  const product = await DB.table('products')
    .where('id', id)
    .first()  // 讀取所有列，包括 description、metadata 等大字段

  return product.price
}

// 數據庫傳輸：可能 50KB（大量 JSON metadata）
// 浪費寬帶：超過 49KB

// ✅ 正確：只選擇必要的列
async getProductPrice(id: string): Promise<number> {
  const row = await DB.table('products')
    .where('id', id)
    .select('id', 'price')  // 僅選擇必要列
    .first()

  return row.price
}

// 數據庫傳輸：1KB
// 節省寬帶：99%
```

### 3.2 避免不必要的關聯

```typescript
// ❌ 錯誤：載入不需要的關聯
async listProducts(): Promise<Product[]> {
  return DB.table('products')
    .leftJoin('variants', 'products.id', '=', 'variants.product_id')
    .leftJoin('category_product', 'products.id', '=', 'category_product.product_id')
    .leftJoin('categories', 'category_product.category_id', '=', 'categories.id')
    .get()
  // 返回很多重複的行，應用層需要大量組合邏輯
}

// ✅ 正確：按需載入
async listProducts(): Promise<Product[]> {
  return DB.table('products').get()  // 基礎數據
}

async getProductDetails(id: string): Promise<ProductWithRelations> {
  const product = await DB.table('products').where('id', id).first()
  const variants = await DB.table('variants')
    .where('product_id', id)
    .get()
  const categories = await DB.table('category_product')
    .where('product_id', id)
    .get()

  return { product, variants, categories }
}
```

### 3.3 大字段分離

```typescript
// ❌ 錯誤：product 表包含大 JSON 字段
CREATE TABLE products (
  id VARCHAR(36),
  name VARCHAR(255),
  description TEXT,           -- 通常很大
  metadata JSON,               -- 可能很大
  image_data LONGBLOB          -- 圖片二進制
)

// 即使只需要 name，也會讀取整個 metadata 和 image_data

// ✅ 正確：分離大字段
CREATE TABLE products (
  id VARCHAR(36),
  name VARCHAR(255),
  description_id VARCHAR(36)   -- 外鍵
}

CREATE TABLE product_details {
  id VARCHAR(36),
  product_id VARCHAR(36),
  description TEXT,
  metadata JSON,
  image_data LONGBLOB
}

// 常用查詢只讀 products 表（小）
// 需要詳情時才 JOIN product_details
```

---

## 4. 查詢執行計劃優化 (Query Execution Plan)

### 4.1 添加適當的索引

```typescript
// ❌ 缺乏索引的查詢
const orders = await DB.table('orders')
  .where('customer_id', customerId)
  .where('status', 'completed')
  .get()

// 執行計劃：Full Table Scan（掃描所有行）
// 耗時：O(n) → 100 萬行需要掃描全表

// ✅ 添加索引
CREATE INDEX idx_orders_customer_status
  ON orders (customer_id, status)

// 執行計劃：Index Seek（直接定位）
// 耗時：O(log n) → 100 萬行只需幾毫秒
```

### 4.2 複合索引順序很重要

```typescript
// 查詢 1：WHERE customer_id = ? AND status = ?
const orders = await DB.table('orders')
  .where('customer_id', customerId)
  .where('status', 'completed')
  .get()

// 查詢 2：WHERE status = ? AND created_date > ?
const recentOrders = await DB.table('orders')
  .where('status', 'pending')
  .where('created_date', '>', startDate)
  .get()

// ✅ 複合索引應按查詢最常見的順序
CREATE INDEX idx_orders_customer_status
  ON orders (customer_id, status)

CREATE INDEX idx_orders_status_date
  ON orders (status, created_date)
```

### 4.3 EXPLAIN 查詢執行計劃

```typescript
// 檢查查詢是否有效使用索引
const explain = await DB.raw(
  `EXPLAIN SELECT * FROM products WHERE id = ?`,
  ['prod-123']
)

console.log(explain)
// 輸出：
// rows: 1, type: ref (使用索引 ✅)
// key: PRIMARY
// key_len: 36

// vs 未使用索引：
// rows: 1000000, type: ALL (掃描全表 ❌)
```

---

## 5. 批量操作 (Batch Operations)

### 5.1 批量插入

```typescript
// ❌ 錯誤：循環插入
async createVariants(productId: string, variants: Variant[]) {
  for (const variant of variants) {
    await DB.table('variants').insert({
      product_id: productId,
      sku: variant.sku,
      price: variant.price
    })
  }
  // N 個 INSERT 查詢
}

// ✅ 正確：一次性批量插入
async createVariants(productId: string, variants: Variant[]) {
  await DB.table('variants').insert(
    variants.map(v => ({
      product_id: productId,
      sku: v.sku,
      price: v.price
    }))
  )
  // 1 個 INSERT 查詢
}

// 性能對比（100 個變體）：
// 循環：200ms
// 批量：5ms （40 倍快）
```

### 5.2 批量更新

```typescript
// ❌ 錯誤：循環更新
async updatePrices(updates: { id: string; price: number }[]) {
  for (const update of updates) {
    await DB.table('variants')
      .where('id', update.id)
      .update({ price: update.price })
  }
  // N 個 UPDATE 查詢
}

// ✅ 正確：使用 CASE 語句批量更新
async updatePrices(updates: { id: string; price: number }[]) {
  // 生成動態 SQL
  let query = DB.table('variants')

  const ids = updates.map(u => u.id)
  const caseStatement = DB.raw(
    `CASE ${updates.map(u => `WHEN id = '${u.id}' THEN ${u.price}`).join(' ')} END`
  )

  await query
    .whereIn('id', ids)
    .update({
      price: caseStatement
    })
  // 1 個 UPDATE 查詢
}

// 性能對比（100 個更新）：
// 循環：300ms
// 批量：10ms （30 倍快）
```

---

## 6. 事務與死鎖 (Transactions & Deadlocks)

### 6.1 正確使用事務

```typescript
// ❌ 錯誤：未使用事務的 CRUD
async transferInventory(fromProductId: string, toProductId: string, qty: number) {
  // 減少來源產品庫存
  await DB.table('variants')
    .where('product_id', fromProductId)
    .increment('stock', -qty)

  // 如果這裡失敗，來源庫存已減但目標庫存未增 → 不一致！

  // 增加目標產品庫存
  await DB.table('variants')
    .where('product_id', toProductId)
    .increment('stock', qty)
}

// ✅ 正確：使用事務保證原子性
async transferInventory(fromProductId: string, toProductId: string, qty: number) {
  return DB.transaction(async (trx) => {
    // 使用 trx 替代 DB
    await trx.table('variants')
      .where('product_id', fromProductId)
      .increment('stock', -qty)

    // 即使失敗，整個事務會 ROLLBACK
    await trx.table('variants')
      .where('product_id', toProductId)
      .increment('stock', qty)
  })
}
```

### 6.2 避免死鎖

```typescript
// ❌ 錯誤的順序（易導致死鎖）
async swapPrices(id1: string, id2: string) {
  return DB.transaction(async (trx) => {
    const p1 = await trx.table('products').where('id', id1).forUpdate().first()
    await new Promise(r => setTimeout(r, 100))  // 模擬延遲
    const p2 = await trx.table('products').where('id', id2).forUpdate().first()

    await trx.table('products').where('id', id1).update({ price: p2.price })
    await trx.table('products').where('id', id2).update({ price: p1.price })
  })
}

// 線程 A：鎖定 id1，等待 id2
// 線程 B：鎖定 id2，等待 id1
// → 死鎖！

// ✅ 正確：統一排序
async swapPrices(id1: string, id2: string) {
  // 確保總是按相同順序鎖定
  const [minId, maxId] = [id1, id2].sort()

  return DB.transaction(async (trx) => {
    const p1 = await trx.table('products')
      .where('id', minId)
      .forUpdate()
      .first()

    const p2 = await trx.table('products')
      .where('id', maxId)
      .forUpdate()
      .first()

    // 交換邏輯...
  })
}
```

---

## 7. Gravito 中的常見性能陷阱 (Gravito-Specific Issues)

### 7.1 Repository 中的 N+1

```typescript
// ❌ Catalog 衛星中的實際問題
export class AtlasProductRepository {
  async findAll(): Promise<Product[]> {
    const products = await DB.table('products').get()  // 1 查詢

    const result = []
    for (const row of products) {
      // 每個產品 2 次額外查詢
      const variants = await DB.table('product_variants')
        .where('product_id', row.id)
        .get()

      const categories = await DB.table('category_product')
        .where('product_id', row.id)
        .get()

      result.push(this.mapToDomain(row, variants, categories))
    }

    return result  // 總共 1 + 2N 個查詢！
  }
}

// ✅ 優化版本
export class AtlasProductRepository {
  async findAll(): Promise<Product[]> {
    // 一次性查詢所有關聯
    const variantsRows = await DB.table('product_variants').get()
    const categoriesRows = await DB.table('category_product').get()
    const products = await DB.table('products').get()

    // 在應用層組合（使用 Map 加速查找）
    const variantMap = new Map<string, any[]>()
    const categoryMap = new Map<string, any[]>()

    for (const v of variantsRows) {
      if (!variantMap.has(v.product_id)) variantMap.set(v.product_id, [])
      variantMap.get(v.product_id)!.push(v)
    }

    for (const c of categoriesRows) {
      if (!categoryMap.has(c.product_id)) categoryMap.set(c.product_id, [])
      categoryMap.get(c.product_id)!.push(c)
    }

    return products.map(row =>
      this.mapToDomain(
        row,
        variantMap.get(row.id) || [],
        categoryMap.get(row.id) || []
      )
    )
  }
}

// 查詢統計：3 個（vs 201 個）
// 性能提升：67 倍
```

### 7.2 衛星間的查詢協調

```typescript
// ❌ 錯誤：Commerce 衛星逐一查詢 Catalog
async placeOrder(itemIds: string[]) {
  const items = []

  for (const itemId of itemIds) {
    // 這會導致 Commerce 衛星逐一查詢 Catalog 的商品
    const productInfo = await this.queryProduct(itemId)
    items.push(productInfo)
  }
}

// ✅ 正確：批量查詢
async placeOrder(itemIds: string[]) {
  // 一次性查詢所有商品
  const productInfos = await this.queryProducts(itemIds)

  return productInfos
}

// 或使用事件系統（更解耦）：
async placeOrder(itemIds: string[]) {
  const products = await core.hooks.applyFilters(
    'catalog:query:products-bulk',
    [],
    { productIds: itemIds }
  )
}
```

---

## 8. 監測與分析 (Monitoring & Analysis)

### 8.1 記錄慢查詢

```typescript
// 啟用慢查詢日誌
const db = DB.connection()

db.on('query', (query) => {
  const duration = query.duration

  if (duration > 100) {  // 超過 100ms
    console.warn(`[SLOW QUERY] ${duration}ms`)
    console.warn(`SQL: ${query.sql}`)
    console.warn(`Bindings: ${query.bindings}`)
  }
})
```

### 8.2 性能基準測試

```typescript
import { performance } from 'perf_hooks'

async function benchmarkProductFetch() {
  const start = performance.now()
  const products = await productRepository.findAll()
  const duration = performance.now() - start

  console.log(`Fetched ${products.length} products in ${duration}ms`)
  console.log(`Per product: ${(duration / products.length).toFixed(2)}ms`)

  // 預期：
  // - 100 個產品：< 50ms（✅ 好）
  // - 100 個產品：> 500ms（❌ 有 N+1）
}
```

### 8.3 查詢計數與分析

```typescript
// 在測試中驗證查詢數量
import { QueryLogger } from '@test/helpers'

test('should fetch products with minimal queries', async () => {
  const logger = new QueryLogger()
  const products = await productRepository.findAll()

  console.log(`Total queries: ${logger.count}`)
  // 期望 ≤ 3，超過 10 則可能有 N+1

  expect(logger.count).toBeLessThan(10)
})
```

---

## 9. 檢查清單：ORM 查詢審查 (Checklist)

### 新增查詢時

- [ ] 檢查是否有 N+1 查詢（使用迴圈 + 子查詢）
- [ ] 驗證 SELECT 列數（避免 SELECT *）
- [ ] 檢查是否缺乏索引（EXPLAIN）
- [ ] 評估批量操作是否需要優化
- [ ] 確保事務正確使用（ACID 特性）
- [ ] 撰寫性能基準測試

### 性能優化時

- [ ] 分析慢查詢日誌
- [ ] 運行 EXPLAIN 分析執行計劃
- [ ] 測試不同索引策略
- [ ] 使用批量操作替代循環
- [ ] 考慮查詢分層（熱數據 vs 冷數據）
- [ ] 驗證優化效果（基準測試）

---

## 10. 相關文檔與資源

- **[packages/atlas/](../../packages/atlas/)** - ORM 實現
- **[satellites/catalog/src/Infrastructure/Persistence/](../../satellites/catalog/src/Infrastructure/Persistence/)** - Repository 範例
- **[Atlas Performance Whitepaper](../../docs/benchmarks/ATLAS_PERFORMANCE_WHITEPAPER.md)** - 詳細性能分析
- **MySQL EXPLAIN 文檔** - https://dev.mysql.com/doc/refman/8.0/en/explain.html

---

**撰寫日期**：2026-02-08
**版本**：1.0
