# ORM（Atlas）與數據庫集成

## 1. 背景 (Background)

### 1.1 Atlas ORM 的角色

Atlas 是 Gravito 的 ORM（對象關係映射）層，基於 **Knex.js** 構建。它提供：
- 多數據庫支援（MySQL、PostgreSQL、SQLite）
- 查詢構建器
- 遷移系統
- 連接池管理
- 事務支援

### 1.2 為什麼基於 Knex.js？

```
ORM 對比：

Sequelize      (功能全面但笨重)
├─ 庫大小：6MB
├─ 學習曲線：陡峭
└─ 生態：大

TypeORM        (大而全)
├─ 庫大小：8MB
├─ 學習曲線：陡峭
└─ 功能：過度

Knex.js        (輕量、靈活) ← Gravito 選擇
├─ 庫大小：800KB
├─ 學習曲線：平緩
└─ 哲學：SQL 優先

Gravito 選擇 Knex 的原因：
✅ 輕量級、快速
✅ SQL 控制能力強（效能關鍵）
✅ 易於遷移到其他 ORM
✅ Bun 原生支援
```

---

## 2. 連接管理 (Connection Management)

### 2.0 驅動程式管理 (v1.1.0+)

自 Atlas v1.1.0 起，為了優化套件體積，資料庫驅動程式（如 `pg`, `mysql2`, `sqlite3`）已從直接依賴改為 **Peer Dependencies**。

- **優點**：開發者可以僅安裝所需的驅動，減少 Docker 鏡像大小與 node_modules 膨脹。
- **實踐**：在使用特定數據庫前，需手動執行 `bun add mysql2` 或 `bun add pg`。

### 2.1 連接池配置

```typescript
import { createConnection } from '@gravito/atlas'

const db = createConnection({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  },
  pool: {
    min: 2,      // 最小連接數（始終保持）
    max: 10,     // 最大連接數（高負載時擴展）
    acquireTimeoutMillis: 30000,  // 獲取連接超時
    idleTimeoutMillis: 30000      // 連接空閒超時
  },
  migrations: {
    directory: './migrations'
  }
})
```

### 2.2 多數據庫支援

```typescript
// MySQL
const mysqlDb = createConnection({
  client: 'mysql2',
  connection: { host: 'mysql.example.com', ... }
})

// PostgreSQL
const postgresDb = createConnection({
  client: 'pg',
  connection: { host: 'postgres.example.com', ... }
})

// SQLite（開發用）
const sqliteDb = createConnection({
  client: 'sqlite3',
  connection: { filename: './data.db' },
  useNullAsDefault: true  // SQLite 特有配置
})
```

### 2.3 連接池監控

```typescript
// 監控連接池狀態
setInterval(() => {
  const pool = db.client.pool
  console.log(`
    Active connections: ${pool._activeConnections.length}
    Idle connections: ${pool._idleConnections.length}
    Waiting requests: ${pool._waitQueue.length}
  `)

  // 告警：連接池即將耗盡
  if (pool._waitQueue.length > 5) {
    logger.warn('Database connection pool under pressure')
  }
}, 10000)
```

---

## 3. 遷移系統 (Migration System)

### 3.1 建立遷移

```bash
# 生成新遷移文件
bun run atlas migration:make create_products_table

# 生成的文件：
# migrations/[timestamp]_create_products_table.ts
```

### 3.2 遷移實現

```typescript
// File: migrations/20260208100000_create_products_table.ts
import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('products', (table) => {
    table.string('id').primary()
    table.string('name').notNullable()
    table.text('description')
    table.decimal('price', 10, 2).notNullable()
    table.integer('stock').notNullable().defaultTo(0)
    table.timestamps()
    table.index('name')  // 為 name 添加索引
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('products')
}
```

### 3.3 執行遷移

```bash
# 執行所有待執行的遷移
bun run atlas migration:latest

# 執行特定數量的遷移
bun run atlas migration:up --steps 5

# 回滾上一次遷移
bun run atlas migration:down

# 查看遷移狀態
bun run atlas migration:status
```

### 3.4 複雜遷移示例

```typescript
// 遷移帶數據轉換
export async function up(knex: Knex): Promise<void> {
  // 1. 建立新表
  await knex.schema.createTable('product_variants', (table) => {
    table.string('id').primary()
    table.string('product_id').notNullable()
    table.string('sku').unique()
    table.decimal('price', 10, 2)
    table.integer('stock')
    table.foreign('product_id').references('products.id').onDelete('CASCADE')
  })

  // 2. 從舊表遷移數據
  const products = await knex('products').select('*')

  for (const product of products) {
    await knex('product_variants').insert({
      id: `var-${product.id}`,
      product_id: product.id,
      sku: product.sku,
      price: product.price,
      stock: product.stock
    })
  }

  // 3. 刪除舊列
  await knex.schema.table('products', (table) => {
    table.dropColumn('sku')
    table.dropColumn('stock')
  })
}

export async function down(knex: Knex): Promise<void> {
  // 回滾邏輯...
}
```

---

## 4. Schema 管理 (Schema Management)

### 4.1 表定義

```typescript
// 查詢表的 schema
const schema = await knex.table('products').columnInfo()

console.log(schema)
// {
//   id: { type: 'string', maxLength: 36, nullable: false, ... },
//   name: { type: 'string', maxLength: 255, nullable: false, ... },
//   price: { type: 'decimal', ... },
//   created_at: { type: 'datetime', ... }
// }
```

### 4.2 動態表建立

```typescript
// 根據配置動態建立表
async function createTableFromSchema(knex: Knex, tableName: string, schema: ColumnDefinition[]) {
  return knex.schema.createTable(tableName, (table) => {
    for (const column of schema) {
      let col = table[column.type](column.name)

      if (column.nullable === false) col = col.notNullable()
      if (column.primary) col = col.primary()
      if (column.unique) col = col.unique()
      if (column.defaultValue) col = col.defaultTo(column.defaultValue)
      if (column.index) table.index(column.name)
    }
  })
}
```

---

## 5. Repository 模式 (Repository Pattern)

### 5.1 基礎 Repository

```typescript
export interface IProductRepository {
  findById(id: string): Promise<Product | null>
  findAll(filters?: any): Promise<Product[]>
  create(data: CreateProductInput): Promise<Product>
  update(id: string, data: UpdateProductInput): Promise<Product>
  delete(id: string): Promise<void>
}

export class AtlasProductRepository implements IProductRepository {
  constructor(private db: Knex) {}

  async findById(id: string): Promise<Product | null> {
    const row = await this.db('products')
      .where('id', id)
      .first()

    return row ? this.mapToDomain(row) : null
  }

  async findAll(filters?: any): Promise<Product[]> {
    let query = this.db('products')

    // 應用過濾
    if (filters?.category) {
      query = query.where('category_id', filters.category)
    }

    if (filters?.minPrice) {
      query = query.where('price', '>=', filters.minPrice)
    }

    if (filters?.search) {
      query = query.where('name', 'like', `%${filters.search}%`)
    }

    const rows = await query
      .orderBy('created_at', 'desc')
      .limit(filters?.limit || 20)
      .offset(filters?.offset || 0)

    return rows.map(row => this.mapToDomain(row))
  }

  async create(data: CreateProductInput): Promise<Product> {
    const [id] = await this.db('products').insert({
      id: generateId(),
      name: data.name,
      price: data.price,
      created_at: new Date(),
      updated_at: new Date()
    })

    return this.findById(id) as Promise<Product>
  }

  async update(id: string, data: UpdateProductInput): Promise<Product> {
    await this.db('products')
      .where('id', id)
      .update({
        ...data,
        updated_at: new Date()
      })

    return this.findById(id) as Promise<Product>
  }

  async delete(id: string): Promise<void> {
    await this.db('products')
      .where('id', id)
      .delete()
  }

  private mapToDomain(row: any): Product {
    return new Product(row.id, {
      name: row.name,
      price: row.price,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    })
  }
}
```

### 5.2 高級 Repository 特性

```typescript
// 批量操作
async createBatch(items: CreateProductInput[]): Promise<Product[]> {
  const ids = await this.db('products').insert(
    items.map((item, index) => ({
      id: generateId(),
      ...item,
      created_at: new Date(),
      updated_at: new Date()
    }))
  )

  return Promise.all(ids.map(id => this.findById(id)))
}

// 軟刪除
async softDelete(id: string): Promise<void> {
  await this.db('products')
    .where('id', id)
    .update({
      deleted_at: new Date(),
      updated_at: new Date()
    })
}

// 恢復軟刪除
async restore(id: string): Promise<void> {
  await this.db('products')
    .where('id', id)
    .update({
      deleted_at: null,
      updated_at: new Date()
    })
}

// 分頁查詢
async paginate(page: number = 1, perPage: number = 20) {
  const total = await this.db('products').count('*', { as: 'count' }).first()
  const items = await this.db('products')
    .limit(perPage)
    .offset((page - 1) * perPage)

  return {
    data: items.map(row => this.mapToDomain(row)),
    pagination: {
      page,
      perPage,
      total: total.count,
      pages: Math.ceil(total.count / perPage)
    }
  }
}
```

---

## 6. 關聯管理 (Relationship Management)

### 6.1 一對多關聯

```typescript
// Product 有多個 Variant
export class ProductRepository {
  async findWithVariants(id: string): Promise<ProductWithVariants> {
    const product = await this.db('products')
      .where('id', id)
      .first()

    const variants = await this.db('variants')
      .where('product_id', id)

    return {
      ...product,
      variants: variants.map(v => new Variant(v))
    }
  }

  async findAllWithVariants(): Promise<ProductWithVariants[]> {
    const products = await this.db('products')
    const variants = await this.db('variants')

    // 在應用層組合（避免 N+1）
    const variantMap = new Map<string, any[]>()

    for (const variant of variants) {
      if (!variantMap.has(variant.product_id)) {
        variantMap.set(variant.product_id, [])
      }
      variantMap.get(variant.product_id)!.push(variant)
    }

    return products.map(p => ({
      ...p,
      variants: variantMap.get(p.id) || []
    }))
  }
}
```

### 6.2 多對多關聯

```typescript
// Product 有多個 Category，Category 有多個 Product
export class CategoryRepository {
  async findWithProducts(categoryId: string): Promise<CategoryWithProducts> {
    const category = await this.db('categories')
      .where('id', categoryId)
      .first()

    // 透過中間表查詢
    const products = await this.db('products')
      .innerJoin('category_product', 'products.id', '=', 'category_product.product_id')
      .where('category_product.category_id', categoryId)
      .select('products.*')

    return {
      ...category,
      products
    }
  }

  // 新增關聯
  async attachProduct(categoryId: string, productId: string): Promise<void> {
    await this.db('category_product').insert({
      category_id: categoryId,
      product_id: productId
    })
  }

  // 移除關聯
  async detachProduct(categoryId: string, productId: string): Promise<void> {
    await this.db('category_product')
      .where('category_id', categoryId)
      .where('product_id', productId)
      .delete()
  }
}
```

---

## 7. 事務 (Transactions)

### 7.1 基礎事務

```typescript
export class OrderRepository {
  async placeOrder(input: PlaceOrderInput): Promise<Order> {
    // 開始事務
    return this.db.transaction(async (trx) => {
      // 1. 建立訂單
      const [orderId] = await trx('orders').insert({
        id: generateId(),
        customer_id: input.customerId,
        total_amount: input.totalAmount,
        created_at: new Date()
      })

      // 2. 建立訂單項目
      await trx('order_items').insert(
        input.items.map((item) => ({
          order_id: orderId,
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price
        }))
      )

      // 3. 更新庫存
      for (const item of input.items) {
        await trx('products')
          .where('id', item.productId)
          .decrement('stock', item.quantity)
      }

      // 如果拋出錯誤，整個事務會 ROLLBACK
      return orderId
    })
  }
}
```

### 7.2 巢狀事務

```typescript
async transferInventory(
  fromProductId: string,
  toProductId: string,
  qty: number
): Promise<void> {
  return this.db.transaction(async (outerTrx) => {
    // 外層事務

    // 內層事務（獨立）
    await this.db.transaction(async (innerTrx) => {
      await innerTrx('products')
        .where('id', fromProductId)
        .decrement('stock', qty)
    })

    // 外層事務繼續
    await outerTrx('products')
      .where('id', toProductId)
      .increment('stock', qty)
  })
}
```

---

## 8. 原始 SQL 查詢 (Raw SQL)

### 8.1 執行原始 SQL

```typescript
// 當 ORM 無法表達複雜查詢時，使用原始 SQL
const topProducts = await this.db.raw(`
  SELECT
    p.id,
    p.name,
    COUNT(oi.id) as order_count,
    SUM(oi.quantity) as total_quantity
  FROM products p
  LEFT JOIN order_items oi ON p.id = oi.product_id
  GROUP BY p.id
  HAVING order_count > 10
  ORDER BY total_quantity DESC
`)

// 帶參數綁定（防止 SQL 注入）
const productsByPrice = await this.db.raw(
  'SELECT * FROM products WHERE price > ? AND stock < ?',
  [100, 50]
)
```

### 8.2 複雜查詢範例

```typescript
// 子查詢
const highValueCustomers = await this.db.raw(`
  SELECT c.id, c.name, total_spent
  FROM customers c
  INNER JOIN (
    SELECT customer_id, SUM(total_amount) as total_spent
    FROM orders
    GROUP BY customer_id
  ) orders ON c.id = orders.customer_id
  WHERE orders.total_spent > 10000
`)

// CTE（公用表表達式）
const customerMetrics = await this.db.raw(`
  WITH monthly_sales AS (
    SELECT
      DATE_TRUNC('month', created_at) as month,
      customer_id,
      SUM(total_amount) as monthly_total
    FROM orders
    GROUP BY month, customer_id
  )
  SELECT * FROM monthly_sales
  WHERE monthly_total > 1000
`)
```

---

## 9. 衛星中的 Atlas 使用 (Atlas Usage in Satellites)

### 9.1 衛星中的資料庫初始化

```typescript
// File: satellites/catalog/src/index.ts
export class CatalogServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // 註冊 Repository
    container.singleton('catalog.repository.product', () => {
      const db = container.get('database')  // 從 core 獲取 DB 連接
      return new AtlasProductRepository(db)
    })
  }

  override boot(): void {
    const core = this.core!

    // 執行衛星特有的遷移
    core.hooks.addAction('app:ready', async () => {
      await runMigrations('./satellites/catalog/migrations')
    })
  }
}
```

### 9.2 衛星間的資料庫隔離

```typescript
// 最佳實踐：每個衛星有自己的表
Catalog 衛星：
  - products
  - categories
  - product_variants

Commerce 衛星：
  - orders
  - order_items
  - carts

Payment 衛星：
  - transactions
  - refunds
  - payment_intents

// 外鍵約束僅在同衛星內部
// 跨衛星參考透過事件系統
```

---

## 10. 性能最佳實踐 (Performance Best Practices)

### 10.1 查詢優化

```typescript
// ❌ 低效：SELECT * + JOIN
const products = await db('products')
  .leftJoin('variants', 'products.id', '=', 'variants.product_id')
  .get()

// ✅ 高效：選擇必要的列
const products = await db('products')
  .leftJoin('variants', 'products.id', '=', 'variants.product_id')
  .select('products.id', 'products.name', 'variants.sku', 'variants.price')
  .get()
```

### 10.2 索引設計

```typescript
// 遷移中定義索引
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('products', (table) => {
    table.string('id').primary()
    table.string('name').notNullable()
    table.string('category_id')
    table.integer('stock')
    table.timestamps()

    // 單列索引
    table.index('category_id')
    table.index('created_at')

    // 複合索引（用於多列 WHERE）
    table.index(['category_id', 'stock'])
  })
}
```

### 10.3 連接池調整

```typescript
// 開發環境（低並發）
const devPool = { min: 1, max: 5 }

// 測試環境（中並發）
const testPool = { min: 2, max: 10 }

// 生產環境（高並發）
const prodPool = { min: 5, max: 20 }

const poolConfig = process.env.NODE_ENV === 'production' ? prodPool : devPool
```

---

## 11. 相關文檔與資源

- **[packages/atlas/](../../packages/atlas/)** - Atlas ORM 源代碼
- **[packages/atlas/src/schema/](../../packages/atlas/src/schema/)** - Schema 管理
- **[Knex.js 官方文檔](https://knexjs.org)** - 完整參考
- **[ORM 查詢優化](./orm-query-optimization.md)** - 性能優化指南

---

**撰寫日期**：2026-02-23
**版本**：1.1 (Updated driver management)
