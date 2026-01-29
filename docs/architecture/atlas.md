---
title: Atlas ORM 架構技術規格書
version: 1.5.1
status: Stable
tier: A
last_updated: 2026-01-29
dependencies:
  bun: ">=1.3.0"
  core: "^1.5.0"
related_orbits:
  - photon
  - core
---

# Atlas ORM 架構技術規格書 (v1.5.0)

## 📖 目錄

1. [快速開始](#快速開始)
2. [模組概覽](#模組概覽)
3. [技術規格與架構設計](#技術規格與架構設計)
4. [核心 API 參考](#核心-api-參考)
5. [完整使用範例](#完整使用範例)
6. [測試指南](#測試指南)
7. [效能優化](#效能優化)
8. [部署指南](#部署指南)
9. [故障排除](#故障排除)
10. [API 速查表](#api-速查表)

---

## 快速開始

```typescript
import { Atlas } from '@gravito/atlas'
import { Model } from '@gravito/atlas/orm'

// 配置資料庫連線
const atlas = new Atlas({
  driver: 'postgres',
  host: 'localhost',
  database: 'myapp',
  username: 'user',
  password: 'password'
})

// 定義模型
class User extends Model {
  static table = 'users'
}

// 查詢資料
const users = await User.query().where('active', true).get()
console.log(users)
```

---

## 模組概覽

**Atlas** 是 Gravito 框架中的核心資料庫層（Orbit），提供高效能的 Query Builder 與 Active Record ORM 實作。其設計目標是在保持開發者體驗（DX）的同時，最大化執行效能與記憶體安全性。

### 核心職責
- **Fluent Query Builder**：提供類型安全的鏈式 SQL 建構介面，支援複雜查詢（如巢狀 Where、JSON 操作）。採用組合模式重構，支持模組化子句。
- **Active Record ORM**：基於 Proxy 的模型層，支援髒檢查（Dirty Checking）、生命週期鉤子、關聯管理與**樂觀鎖（Optimistic Locking）**。
- **Connection Management**：支援多資料庫連線池、斷線重連與懶加載（Lazy Initialization）。
- **Migration & Schema**：資料庫版本控制與結構定義（支援 `Schema.create`, `table.softDeletes` 等）。

---

## 技術規格與架構設計

### 分層架構

Atlas 採用經典的四層架構設計，確保關注點分離：

1. **Model Layer (Facade)** (`packages/atlas/src/orm/model/Model.ts`)
   - 使用 ES6 Proxy 攔截屬性存取。
   - 負責業務邏輯封裝、資料驗證與關聯定義。
   - 提供 `find`, `save`, `delete` 等 Active Record 方法。
   - **併發控制**：透過 `@version` 裝飾器實現樂觀鎖，自動處理版本檢查。

2. **Query Layer (Builder)** (`packages/atlas/src/query/QueryBuilder.ts`)
   - 負責 SQL 語法樹的建構。
   - 實現 Fluent Interface（`where`, `select`, `join`, `orderBy`）。
   - **關鍵重構**：使用組合模式（Composition Pattern）將 `SelectClause`, `WhereClause`, `JoinClause`, `LimitClause` 拆分為獨立組件，提升代碼可維護性。
   - **關鍵優化**：Copy-on-Write (CoW) 機制，減少 clone 成本。

3. **Connection Layer** (`packages/atlas/src/connection/ConnectionManager.ts`)
   - 管理連線生命週期。
   - 提供連線池與自動閒置清理（Idle Cleanup）。
   - 支援 Proxy 模式，實現連線的懶加載。

4. **Driver Layer** (`packages/atlas/src/drivers/*`)
   - 適配不同資料庫驅動（pg, mysql2, bun:sqlite, bun.sql）。
   - 標準化執行結果介面（`QueryResult`）。

### 關鍵資料流向

#### 查詢流程 (Read Path)
```mermaid
graph LR
    User -->|User.find(1)| Model
    Model -->|Model.query()| QueryBuilder
    QueryBuilder -->|connection.raw()| Connection
    Connection -->|driver.query()| Driver
    Driver -->|Rows| Connection
    Connection -->|Raw Data| QueryBuilder
    QueryBuilder -->|Model.hydrate()| Model
    Model -->|Proxy Instance| User
```

#### 寫入流程 (Write Path)
```mermaid
graph LR
    User -->|user.save()| ModelProxy
    ModelProxy -->|set property| DirtyTracker
    User -->|await save()| Model
    Model -->|getDirty()| DirtyTracker
    Model -->|performUpdate/Insert| QueryBuilder
    QueryBuilder -->|execute()| Database
```

---

## 核心 API 參考

### 1. 模型定義

```typescript
import { Model } from '@gravito/atlas/orm'

class User extends Model {
  // 資料表名稱
  static table = 'users'

  // 主鍵欄位（預設為 'id'）
  static primaryKey = 'id'

  // 時間戳欄位
  static timestamps = true // created_at, updated_at

  // 軟刪除
  static softDeletes = true // deleted_at

  // 可填充欄位（白名單）
  static fillable = ['name', 'email', 'password']

  // 隱藏欄位（如序列化為 JSON 時不顯示）
  static hidden = ['password']

  // 型別轉換
  static casts = {
    email_verified_at: 'datetime',
    is_active: 'boolean'
  }
}
```

### 2. Query Builder API

```typescript
// 基本查詢
const users = await User.query()
  .where('active', true)
  .where('age', '>=', 18)
  .orderBy('created_at', 'desc')
  .limit(10)
  .get()

// 複雜 WHERE 條件
const result = await User.query()
  .where('status', 'active')
  .where((query) => {
    query
      .where('role', 'admin')
      .orWhere('role', 'moderator')
  })
  .get()

// JOIN 查詢
const orders = await Order.query()
  .join('users', 'orders.user_id', '=', 'users.id')
  .select('orders.*', 'users.name as user_name')
  .get()

// 聚合函數
const count = await User.query().where('active', true).count()
const avgAge = await User.query().avg('age')
const total = await Order.query().sum('amount')
```

### 3. Active Record 操作

```typescript
// 建立新記錄
const user = new User()
user.name = 'John Doe'
user.email = 'john@example.com'
await user.save()

// 或使用 create
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com'
})

// 查詢記錄
const user = await User.find(1)
const user = await User.findBy('email', 'john@example.com')

// 更新記錄
user.name = 'Jane Doe'
await user.save()

// 刪除記錄
await user.delete()

// 軟刪除
await user.softDelete()

// 恢復軟刪除
await user.restore()
```

### 4. 關聯關係

```typescript
class User extends Model {
  static table = 'users'

  // 一對多關係
  posts() {
    return this.hasMany(Post, 'user_id')
  }

  // 屬於關係
  profile() {
    return this.belongsTo(Profile, 'profile_id')
  }

  // 多對多關係
  roles() {
    return this.belongsToMany(Role, 'user_roles', 'user_id', 'role_id')
  }
}

// 使用關聯
const user = await User.find(1)
const posts = await user.posts().get()

// 預加載（解決 N+1 問題）
const users = await User.query()
  .with('posts', 'profile')
  .get()
```

---

## 完整使用範例

### 範例 1：基本 CRUD 操作

```typescript
import { Atlas } from '@gravito/atlas'
import { Model } from '@gravito/atlas/orm'

// 初始化 Atlas
const atlas = new Atlas({
  driver: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'myapp',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
})

// 定義 User 模型
class User extends Model {
  static table = 'users'
  static fillable = ['name', 'email', 'password']
  static hidden = ['password']
}

// CREATE
const newUser = await User.create({
  name: 'Alice',
  email: 'alice@example.com',
  password: await hashPassword('secret')
})
console.log('Created user:', newUser.id)

// READ
const user = await User.find(newUser.id)
console.log('Found user:', user.name)

// UPDATE
user.name = 'Alice Smith'
await user.save()
console.log('Updated user:', user.name)

// DELETE
await user.delete()
console.log('Deleted user')
```

### 範例 2：複雜查詢與關聯

```typescript
class Post extends Model {
  static table = 'posts'
  static fillable = ['title', 'content', 'user_id']

  author() {
    return this.belongsTo(User, 'user_id')
  }

  comments() {
    return this.hasMany(Comment, 'post_id')
  }
}

class Comment extends Model {
  static table = 'comments'
  static fillable = ['content', 'post_id', 'user_id']
}

// 複雜查詢：找出最近 7 天內發布、有超過 10 條評論的文章
const popularPosts = await Post.query()
  .where('created_at', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  .whereHas('comments', (query) => {
    query.groupBy('post_id').havingRaw('COUNT(*) > ?', [10])
  })
  .with('author', 'comments')
  .orderBy('created_at', 'desc')
  .limit(20)
  .get()

for (const post of popularPosts) {
  console.log(`${post.title} by ${post.author.name}`)
  console.log(`Comments: ${post.comments.length}`)
}
```

### 範例 3：事務處理

```typescript
import { transaction } from '@gravito/atlas'

try {
  await transaction(async (trx) => {
    // 建立訂單
    const order = await Order.create({
      user_id: userId,
      total_amount: 100.00,
      status: 'pending'
    }, { transaction: trx })

    // 建立訂單項目
    for (const item of cartItems) {
      await OrderItem.create({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      }, { transaction: trx })

      // 減少庫存
      const product = await Product.find(item.product_id, { transaction: trx })
      product.stock -= item.quantity
      await product.save({ transaction: trx })
    }

    // 清空購物車
    await CartItem.query()
      .where('user_id', userId)
      .delete({ transaction: trx })
  })

  console.log('Order created successfully')
} catch (error) {
  console.error('Transaction failed:', error)
  throw error
}
```

### 範例 4：樂觀鎖（並發控制）

```typescript
class Product extends Model {
  static table = 'products'
  static fillable = ['name', 'price', 'stock']

  // 啟用樂觀鎖
  static useVersioning = true
  static versionColumn = 'version'
}

// 並發更新庫存
async function updateStock(productId: number, quantity: number) {
  try {
    const product = await Product.find(productId)

    if (product.stock < quantity) {
      throw new Error('Insufficient stock')
    }

    product.stock -= quantity
    await product.save() // 自動檢查版本號

    return product
  } catch (error) {
    if (error.name === 'StaleModelError') {
      // 版本衝突，重試
      console.log('Version conflict, retrying...')
      return updateStock(productId, quantity)
    }
    throw error
  }
}
```

### 範例 5：大數據處理（分塊查詢與串流）

```typescript
// 避免記憶體溢位，使用 chunk 分批處理
await User.query()
  .where('email_verified', false)
  .chunk(1000, async (users) => {
    // 處理每批 1000 筆資料
    for (const user of users) {
      await sendVerificationEmail(user)
    }

    console.log(`Processed ${users.length} users`)
  })

// 🆕 使用串流處理超大資料集（記憶體友善）
// 支援 Bun.sql Native Driver 的高效能串流查詢
for await (const user of User.query().where('created_at', '<', oldDate).stream()) {
  await archiveUser(user)
}

// 串流支援複雜查詢
for await (const post of Post.query()
  .join('users', 'posts.user_id', '=', 'users.id')
  .where('posts.status', 'published')
  .orderBy('posts.created_at', 'desc')
  .stream()) {
  await processPost(post)
}
```

### 範例 6：原生 SQL 與子查詢

```typescript
// 原生 SQL 查詢
const results = await atlas.raw(`
  SELECT u.*, COUNT(p.id) as post_count
  FROM users u
  LEFT JOIN posts p ON u.id = p.user_id
  GROUP BY u.id
  HAVING COUNT(p.id) > ?
`, [10])

// 子查詢
const activeUsers = await User.query()
  .whereIn('id', (query) => {
    query
      .select('user_id')
      .from('orders')
      .where('created_at', '>=', lastMonth)
      .groupBy('user_id')
  })
  .get()
```

### 範例 7：生命週期鉤子

```typescript
class User extends Model {
  static table = 'users'

  // 建立前
  static async beforeCreate(user: User) {
    // 自動生成 UUID
    if (!user.uuid) {
      user.uuid = generateUUID()
    }
  }

  // 儲存前
  static async beforeSave(user: User) {
    // 加密密碼
    if (user.isDirty('password')) {
      user.password = await hashPassword(user.password)
    }
  }

  // 刪除後
  static async afterDelete(user: User) {
    // 刪除關聯資料
    await Post.query().where('user_id', user.id).delete()
    await Comment.query().where('user_id', user.id).delete()
  }
}
```

### 範例 8：JSON 欄位操作

```typescript
class User extends Model {
  static table = 'users'

  static casts = {
    preferences: 'json',
    metadata: 'json'
  }
}

// 查詢 JSON 欄位
const users = await User.query()
  .whereJsonContains('preferences->theme', 'dark')
  .get()

// 更新 JSON 欄位
const user = await User.find(1)
user.preferences = {
  ...user.preferences,
  notifications: true
}
await user.save()
```

### 範例 9：多資料庫連線

```typescript
import { Atlas } from '@gravito/atlas'

// 主資料庫
const primaryDb = new Atlas({
  connection: 'primary',
  driver: 'postgres',
  host: 'primary.db.example.com'
})

// 只讀副本
const replicaDb = new Atlas({
  connection: 'replica',
  driver: 'postgres',
  host: 'replica.db.example.com'
})

// 使用特定連線
class User extends Model {
  static connection = 'primary'
}

class Analytics extends Model {
  static connection = 'replica' // 讀取副本
}

// 動態切換連線
const users = await User.query()
  .connection('replica')
  .get()
```

### 範例 10：索引提示與查詢優化

```typescript
// 使用索引提示（MySQL）
const users = await User.query()
  .useIndex('idx_email')
  .where('email', 'LIKE', '%@example.com')
  .get()

// 強制使用索引（PostgreSQL）
const orders = await Order.query()
  .forceIndex('idx_user_created')
  .where('user_id', userId)
  .where('created_at', '>=', startDate)
  .get()

// 查詢計畫分析
const explainResult = await User.query()
  .where('age', '>', 18)
  .explain()
console.log(explainResult)
```

### 範例 11：Bun.sql Native Driver 進階功能 🆕

```typescript
import { Atlas } from '@gravito/atlas'

// 啟用 Native Driver（自動偵測 Bun.sql）
const atlas = new Atlas({
  driver: 'postgres',
  host: 'localhost',
  database: 'myapp',
  // useNativeDriver 預設為 true（當 Bun.sql 可用時）
  useNativeDriver: true,
  pool: {
    max: 20,
    idleTimeout: 60000,
  },
})

// 1. Prepared Statement（查詢效能優化）
const driver = atlas.connection().getDriver()

// 準備語句
const stmtId = await driver.prepare!('SELECT * FROM users WHERE id = ?')

// 重複執行（利用快取優化）
const user1 = await driver.executePrepared!(stmtId, [1])
const user2 = await driver.executePrepared!(stmtId, [2])
const user3 = await driver.executePrepared!(stmtId, [3])

// 清除快取
await driver.clearPreparedStatements!()

// 2. 串流查詢（記憶體友善的大數據處理）
// Connection 層級串流
const conn = atlas.connection()
for await (const row of conn.stream('SELECT * FROM large_table')) {
  await processRow(row)
}

// QueryBuilder 層級串流
for await (const user of User.query().where('active', true).stream()) {
  await sendEmail(user.email)
}

// 3. 連線池統計
const poolStats = driver.getPoolStats!()
console.log('Pool Statistics:', {
  idle: poolStats.idle,       // 閒置連線數
  active: poolStats.active,   // 活躍連線數
  total: poolStats.total,     // 總連線數
  max: poolStats.max,         // 最大連線數
})

// 4. SSL 與連線池配置
const secureAtlas = new Atlas({
  driver: 'postgres',
  host: 'prod-db.example.com',
  database: 'production',
  ssl: {
    rejectUnauthorized: true,
    ca: process.env.DB_SSL_CA,
  },
  pool: {
    max: 50,
    idleTimeout: 30000,
  },
})
```

---

## 測試指南

### 單元測試

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Atlas } from '@gravito/atlas'
import { User } from './models/User'

describe('User Model', () => {
  let atlas: Atlas

  beforeEach(async () => {
    // 使用測試資料庫
    atlas = new Atlas({
      driver: 'sqlite',
      database: ':memory:'
    })

    // 建立測試資料表
    await atlas.schema.create('users', (table) => {
      table.increments('id')
      table.string('name')
      table.string('email').unique()
      table.timestamps()
    })
  })

  afterEach(async () => {
    await atlas.disconnect()
  })

  it('should create a user', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com'
    })

    expect(user.id).toBeDefined()
    expect(user.name).toBe('Test User')
  })

  it('should find user by email', async () => {
    await User.create({
      name: 'John',
      email: 'john@example.com'
    })

    const user = await User.findBy('email', 'john@example.com')
    expect(user).toBeDefined()
    expect(user.name).toBe('John')
  })

  it('should update user', async () => {
    const user = await User.create({
      name: 'Old Name',
      email: 'user@example.com'
    })

    user.name = 'New Name'
    await user.save()

    const updated = await User.find(user.id)
    expect(updated.name).toBe('New Name')
  })

  it('should delete user', async () => {
    const user = await User.create({
      name: 'Delete Me',
      email: 'delete@example.com'
    })

    await user.delete()

    const deleted = await User.find(user.id)
    expect(deleted).toBeNull()
  })
})
```

### 整合測試

```typescript
import { describe, it, expect } from 'bun:test'
import { Atlas, transaction } from '@gravito/atlas'

describe('Order Transaction', () => {
  it('should create order with items in transaction', async () => {
    await transaction(async (trx) => {
      // 建立訂單
      const order = await Order.create({
        user_id: 1,
        total_amount: 150.00,
        status: 'pending'
      }, { transaction: trx })

      // 建立訂單項目
      await OrderItem.create({
        order_id: order.id,
        product_id: 1,
        quantity: 2,
        price: 75.00
      }, { transaction: trx })

      // 驗證
      const items = await OrderItem.query()
        .where('order_id', order.id)
        .get({ transaction: trx })

      expect(items).toHaveLength(1)
    })
  })

  it('should rollback on error', async () => {
    try {
      await transaction(async (trx) => {
        await User.create({
          name: 'Test',
          email: 'test@example.com'
        }, { transaction: trx })

        // 故意觸發錯誤
        throw new Error('Rollback test')
      })
    } catch (error) {
      // 驗證資料已回滾
      const users = await User.query().where('email', 'test@example.com').get()
      expect(users).toHaveLength(0)
    }
  })
})
```

### 效能測試

```typescript
import { describe, it } from 'bun:test'

describe('Query Performance', () => {
  it('should handle 10,000 inserts efficiently', async () => {
    const startTime = Date.now()

    // 批次插入
    const users = []
    for (let i = 0; i < 10000; i++) {
      users.push({
        name: `User ${i}`,
        email: `user${i}@example.com`
      })
    }

    await User.insertMany(users)

    const duration = Date.now() - startTime
    console.log(`Inserted 10,000 records in ${duration}ms`)

    // 應該在 1 秒內完成
    expect(duration).toBeLessThan(1000)
  })

  it('should use eager loading to avoid N+1', async () => {
    // 準備測試資料
    const user = await User.create({ name: 'Test', email: 'test@example.com' })
    for (let i = 0; i < 100; i++) {
      await Post.create({ title: `Post ${i}`, user_id: user.id })
    }

    // 測試預加載
    const startTime = Date.now()
    const users = await User.query().with('posts').get()
    const duration = Date.now() - startTime

    console.log(`Loaded ${users.length} users with posts in ${duration}ms`)
    expect(duration).toBeLessThan(100) // 應該很快
  })
})
```

---

## 效能優化

### 基準數據

| 操作 | 平均時間 | P95 | P99 | QPS |
|------|---------|-----|-----|-----|
| Simple SELECT | 0.5ms | 1ms | 2ms | 20,000 |
| INSERT (single) | 1.2ms | 2ms | 5ms | 8,000 |
| UPDATE (single) | 1.5ms | 3ms | 6ms | 6,000 |
| Complex JOIN | 5ms | 10ms | 20ms | 2,000 |
| Bulk INSERT (1000 rows) | 50ms | 80ms | 150ms | 200 batches/s |

### 優化建議

1. **使用預加載避免 N+1 查詢**

```typescript
// ❌ N+1 查詢
const users = await User.all()
for (const user of users) {
  const posts = await user.posts().get() // N 次查詢
}

// ✅ 預加載
const users = await User.query().with('posts').get() // 2 次查詢
```

2. **批次操作減少資料庫往返**

```typescript
// ❌ 逐筆插入
for (const item of items) {
  await Item.create(item) // N 次往返
}

// ✅ 批次插入
await Item.insertMany(items) // 1 次往返
```

3. **使用索引加速查詢**

```typescript
// 建立索引
await atlas.schema.table('users', (table) => {
  table.index('email') // 單一欄位索引
  table.index(['status', 'created_at']) // 複合索引
})

// 使用 EXPLAIN 分析查詢計畫
const plan = await User.query()
  .where('email', 'test@example.com')
  .explain()
```

4. **連線池配置**

```typescript
const atlas = new Atlas({
  driver: 'postgres',
  host: 'localhost',
  // 連線池配置
  pool: {
    min: 2, // 最小連線數
    max: 10, // 最大連線數
    idleTimeoutMillis: 30000, // 閒置逾時
    connectionTimeoutMillis: 2000 // 連線逾時
  }
})
```

5. **查詢快取**

```typescript
// 啟用查詢快取
const users = await User.query()
  .where('active', true)
  .cache(300) // 快取 5 分鐘
  .get()
```

---

## 部署指南

### Docker 部署

```dockerfile
# Dockerfile
FROM oven/bun:1.0

WORKDIR /app

# 複製依賴檔案
COPY package.json bun.lockb ./
RUN bun install --production

# 複製應用程式
COPY . .

# 執行 Migration
RUN bun run migrate

# 啟動應用
CMD ["bun", "run", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: myapp
      DB_USER: postgres
      DB_PASSWORD: password
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Migration 管理

```typescript
// migrations/001_create_users_table.ts
import { Migration } from '@gravito/atlas'

export default class CreateUsersTable extends Migration {
  async up() {
    await this.schema.create('users', (table) => {
      table.increments('id')
      table.string('name', 100)
      table.string('email', 255).unique()
      table.string('password', 255)
      table.boolean('email_verified').default(false)
      table.timestamps()
      table.softDeletes()

      // 索引
      table.index('email')
      table.index('created_at')
    })
  }

  async down() {
    await this.schema.dropIfExists('users')
  }
}
```

```bash
# 執行 Migration
bun run migrate

# 回滾 Migration
bun run migrate:rollback

# 重新執行所有 Migration
bun run migrate:refresh

# 查看 Migration 狀態
bun run migrate:status
```

### 生產環境配置

```typescript
// config/database.ts
import { Atlas } from '@gravito/atlas'

export const atlas = new Atlas({
  driver: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // 連線池
  pool: {
    min: 5,
    max: 20,
    idleTimeoutMillis: 30000
  },

  // SSL 配置（生產環境）
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: process.env.DB_SSL_CA
  } : false,

  // 查詢日誌
  logging: process.env.NODE_ENV !== 'production',

  // 自動重連
  reconnect: true,
  reconnectTries: 3,
  reconnectInterval: 1000
})
```

### 健康檢查

```typescript
import { Photon } from '@gravito/photon'

const app = new Photon()

app.get('/health', async (c) => {
  try {
    // 檢查資料庫連線
    await atlas.raw('SELECT 1')

    return c.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return c.json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    }, 503)
  }
})
```

---

## 故障排除

### 常見問題

| 問題 | 症狀 | 根本原因 | 解決方案 |
|------|------|---------|---------|
| N+1 查詢 | 大量相同查詢 | 關聯未預加載 | 使用 `.with()` 預加載 |
| 連線洩漏 | 連線數持續增長 | 未正確關閉連線 | 檢查事務、使用連線池 |
| 查詢超時 | 查詢執行過慢 | 缺少索引 | 使用 `EXPLAIN` 分析並建立索引 |
| 記憶體溢位 | OOM 錯誤 | 載入過多資料 | 使用 `.chunk()` 分批處理 |
| 樂觀鎖衝突 | StaleModelError | 並發更新 | 重試機制或使用悲觀鎖 |
| 事務死鎖 | Deadlock detected | 鎖定順序不一致 | 統一資源存取順序 |

### 除錯技巧

```typescript
// 啟用查詢日誌
const atlas = new Atlas({
  logging: true,
  logLevel: 'debug'
})

// 監聽查詢事件
atlas.on('query', (query) => {
  console.log('SQL:', query.sql)
  console.log('Bindings:', query.bindings)
  console.log('Duration:', query.duration, 'ms')
})

// 查詢計畫分析
const plan = await User.query()
  .where('email', 'test@example.com')
  .explain()
console.log(plan)

// 顯示最後執行的查詢
console.log(User.lastQuery())
```

---

## API 速查表

### 查詢方法

```typescript
// 基本查詢
Model.query().select('column1', 'column2')
Model.query().where('column', 'value')
Model.query().where('column', '>', value)
Model.query().orWhere('column', 'value')
Model.query().whereIn('column', [values])
Model.query().whereNotIn('column', [values])
Model.query().whereBetween('column', [min, max])
Model.query().whereNull('column')
Model.query().whereNotNull('column')

// 排序與分頁
Model.query().orderBy('column', 'asc' | 'desc')
Model.query().groupBy('column')
Model.query().having('column', '>', value)
Model.query().limit(10)
Model.query().offset(20)

// JOIN
Model.query().join('table', 'column1', '=', 'column2')
Model.query().leftJoin('table', 'column1', '=', 'column2')
Model.query().rightJoin('table', 'column1', '=', 'column2')

// 聚合
Model.query().count()
Model.query().sum('column')
Model.query().avg('column')
Model.query().min('column')
Model.query().max('column')

// 執行
Model.query().get() // 取得所有結果
Model.query().first() // 取得第一筆
Model.find(id) // 依 ID 查詢
Model.findBy('column', value) // 依欄位查詢
Model.query().pluck('column') // 取得單一欄位陣列
```

### 模型方法

```typescript
// 建立
Model.create(data)
Model.insertMany([data1, data2])

// 查詢
Model.find(id)
Model.findBy('column', value)
Model.all()
Model.query().where('column', 'value').get()

// 更新
model.save()
Model.query().where('column', 'value').update(data)

// 刪除
model.delete()
model.softDelete()
model.restore()
Model.query().where('column', 'value').delete()

// 關聯
model.relation().get()
Model.query().with('relation').get()
```

### 事務

```typescript
await transaction(async (trx) => {
  await Model.create(data, { transaction: trx })
})
```

---

## 關鍵設計決策

### Proxy-based Smart Guard
**決策**：使用 `Proxy` 來包裝所有模型實例。
**原因**：
- 實現「屬性存取攔截」，支援魔術方法（如關聯屬性存取 `user.posts` 自動轉為 Promise）。
- 自動追蹤屬性變更（Dirty Tracking），無需顯式呼叫 `set()` 方法。
**代價**：Proxy 存取比直接屬性存取慢。
**優化對策**：
- 使用 `WeakMap` 快取 metadata，減少重複計算。

### Query Builder 的 Copy-on-Write (CoW)
**決策**：在 `clone()` 時不立即複製陣列（columns, wheres 等），而是共享參考。
**原因**：ORM 操作中頻繁發生 `clone`（例如 `User.query()` 會產生新實例），深拷貝成本高。
**實作**：
- 設定 `_isClone = true`。
- 在任何修改狀態的方法（如 `where()`）呼叫時，觸發 `ensureOwnState()` 才真正複製陣列。
**效益**：在唯讀場景下，物件建立成本大幅降低。

### 記憶體安全的分頁與串流
**決策**：提供 `chunk()` 方法與游標式串流。
**原因**：避免處理大量數據（如匯出報表）時 Node.js/Bun Heap OOM（Out of Memory）。
**實作**：
- `chunk` 方法內部自動分頁，回調函數處理完一批數據後釋放記憶體。

### 樂觀鎖 (Optimistic Locking)
**決策**：在 `Model` 層級實作基於版本的並發控制。
**原因**：防止多個請求同時更新同一筆資料導致的「遺失更新」問題。
**實作**：
- 使用 `@version` 裝飾器標記版本欄位。
- `Model.save()` 時自動將版本號加入 `WHERE` 子句並在成功後遞增。
- 若受影響行數為 0，拋出 `StaleModelError`。

---

## 風險分析與潛在問題

### 併發更新風險 (Race Condition)
- **現況**：✅ 已實作樂觀鎖（Optimistic Locking）。
- **機制**：開發者只需在 Model 中定義 `@version` 欄位，系統即自動處理衝突檢測。

### N+1 查詢問題
- **現況**：
  - ✅ `eagerLoad` (`with()`) 已實作 `whereIn` 批次查詢，解決了標準的 N+1 問題。
  - ⚠️ 透過屬性存取懶加載關聯（如迴圈中 `await user.posts`）時，仍會產生 N+1。
- **建議**：在開發文檔中強調優先使用 `with()` 進行預加載。

### Upsert 實作限制
- **問題**：`QueryBuilder` 中的 `upsert` 方法標註為 "simplified implementation"。
- **風險**：目前的實作僅執行 `insert`，若遇主鍵衝突會拋出錯誤，而非執行更新。
- **建議**：需針對不同 Driver (PG `ON CONFLICT`, MySQL `ON DUPLICATE KEY UPDATE`) 實作真正的 Upsert 語法。

---

## 後續優化建議

1. ✅ **完善 Native Driver 支援** (Priority: High) - **已完成 v1.5.0**
   - 加強對 `Bun.sql` 原生驅動的整合，利用其高效能特性。
   - **已實作功能：**
     - Prepared Statement 快取與重用
     - 串流查詢支援（QueryBuilder, Connection, Driver 層）
     - 連線池統計
     - 改進的連線 URL 建構（支援 SSL、Pool 配置）
     - 自動偵測並優先使用 Native Driver

2. ✅ **增加子查詢物件支援** (Priority: Medium) - **已完成 v1.5.1**
   - 增強 `where` 方法對 `SubQuery` 物件的支援，使複雜查詢更直觀。
   - **已實作功能：**
     - 支持在 `where`, `whereIn` 等方法中直接傳入 `QueryBuilder` 物件。
     - 自動編譯巢狀 SQL 與處理 Bindings。

3. **Observability** (Priority: High)
   - 整合 OpenTelemetry，提供更詳細的資料庫追蹤指標。

4. ✅ **查詢結果快取** (Priority: Medium) - **已完成 v1.5.1**
   - 實作查詢級別的快取機制，支援 Redis/Memory 後端。
   - **已實作功能：**
     - `QueryBuilder.cache(ttl, key)` 方法。
     - `DB.setCache()` 全域快取提供者管理。
     - 支援 `ioredis` 與 `lru-cache` 驅動。

---

*最後更新：2026-01-29*
*版本：v1.5.0*

## 版本歷史

### v1.5.1 (2026-01-29)
- ✨ **新功能：子查詢與快取機制完善**
  - 顯式支援 SubQuery 物件作為查詢條件
  - 完善查詢結果快取（Query-level Caching）架構
- 📝 **文檔：更新優化狀態與版本資訊**

### v1.5.0 (2026-01-29)
- ✨ **新功能：完善 Native Driver 支援**
  - Prepared Statement 快取與重用機制
  - 串流查詢支援（QueryBuilder, Connection, Driver 層）
  - 連線池統計 API
  - 改進的連線 URL 建構（支援 SSL、Pool 配置）
  - 自動偵測並優先使用 Bun.sql Native Driver
- 🔧 **優化：查詢執行效能**
  - 優先使用 `unsafe()` API 進行動態 SQL 執行
  - Prepared Statement 的 LRU 快取與閒置超時清理
- 📝 **文檔：新增完整使用範例**
  - Native Driver 進階功能範例
  - 串流查詢最佳實踐

### v1.4.0 (2026-01-28)
- 🔧 核心 ORM 重構與架構優化
- 📝 完善技術規格文檔
