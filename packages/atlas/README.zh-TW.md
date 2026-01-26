# @gravito/atlas

> 標準資料庫軌道 (Standard Database Orbit) - 專為 Gravito 打造的流暢查詢生成器與 ORM

**@gravito/atlas** 是 Gravito 生態系中高效能、以開發者為中心的資料庫工具包。它提供了流暢的查詢生成器 (Query Builder)、強大的 Active Record ORM，以及受 Laravel 與 Drizzle 最佳模式啟發的資料庫版本控制工具。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Performance](https://img.shields.io/badge/performance-40k--models/sec-brightgreen)](../../docs/ATLAS_PERFORMANCE_WHITEPAPER.md)

## 📦 安裝

```bash
bun add @gravito/atlas

# ⚠️ 重要：您必須手動安裝對應的資料庫驅動程式
# Atlas 1.1+ 不再綑綁驅動程式以保持安裝體積輕量。

# PostgreSQL
bun add pg

# MySQL / MariaDB
bun add mysql2

# SQLite
# 若使用 Bun 執行環境則無需安裝！
# 若使用 Node.js:
bun add better-sqlite3

# MongoDB
bun add mongodb

# Redis
bun add ioredis
```

## 🚀 快速入門

### 1. 設定

**方式 1：程式化設定**
```typescript
import { DB } from '@gravito/atlas'

DB.configure({
  default: 'postgres',
  connections: {
    postgres: {
      driver: 'postgres',
      host: 'localhost',
      database: 'myapp',
      username: 'postgres',
      password: 'password'
    }
  }
})
```

**方式 2：環境變數 (v2.0 新功能)**
```typescript
import { DB } from '@gravito/atlas'

// 使用 DATABASE_URL
// DATABASE_URL=postgres://user:password@localhost:5432/myapp
DB.configureFromEnv()

// 或使用個別變數
// DB_DRIVER=postgres
// DB_HOST=localhost
// DB_DATABASE=myapp
// DB_USERNAME=postgres
// DB_PASSWORD=password
DB.configureFromEnv()
```

**方式 3：設定檔 (v2.0 新功能)**
```typescript
// config/database.ts
import { defineConfig } from '@gravito/atlas'

export default defineConfig({
  default: 'postgres',
  connections: {
    postgres: {
      driver: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_DATABASE || 'myapp',
      // ...
    }
  }
})

// 接著在您的應用程式中
import { DB } from '@gravito/atlas'
await DB.configureFromFile()
```

### 2. 使用查詢生成器 (Query Builder)

```typescript
const users = await DB.table('users')
  .where('status', 'active')
  .where('age', '>', 18)
  .orderBy('created_at', 'desc')
  .limit(10)
  .get()

// 原始表達式 (Raw expressions)
const stats = await DB.table('orders')
  .select(DB.raw('count(*) as total, sum(amount) as revenue'))
  .groupBy('status')
  .get()
```

### 3. 使用 Active Record ORM

```typescript
import { Model, column, HasMany, BelongsTo } from '@gravito/atlas'

class User extends Model {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  // 關聯模型 (Relationships)
  @HasMany(() => Post)
  declare posts: Post[]
}

class Post extends Model {
  @BelongsTo(() => User)
  declare user: User
}

// 尋找並更新
const user = await User.find(1)
user.email = 'new@example.com'
await user.save()

// 預載入 (Eager Loading)
const usersWithPosts = await User.with('posts').get()

// 分頁 (Pagination)
const { data, pagination } = await User.query()
  .where('status', 'active')
  .paginate(15, 1)

// 交易處理 (Transactions)
await DB.transaction(async (trx) => {
  await trx.table('accounts').where('id', 1).decrement('balance', 100)
  await trx.table('accounts').where('id', 2).increment('balance', 100)
})

// 軟刪除 (Soft Deletes，若已透過 trait 啟用)
await user.delete() // 軟刪除
await user.forceDelete() // 強制刪除
```

## ✨ 核心特性

### 🏢 銀河架構 (Galaxy Architecture) 整合
作為 Gravito 生態系中的核心 **Orbit (軌道)**，Atlas 與 PlanetCore 的生命週期鉤子 (Hooks) 和 IoC 容器完美整合。

### 🚀 高效能 ORM
- **模型填充 (Model Hydration)**：透過優化的 Proxy 快取實現極速填充。
- **異動追蹤 (Dirty Tracking)**：高效追蹤修改欄位，支援淺層與深層比較。
- **預載入 (Eager Loading)**：透過精細的關聯載入機制防止 N+1 查詢問題。
- **多型關聯 (Polymorphic Relationships)**：支援 `morphOne`、`morphMany` 與 `morphTo` 關聯。

### 🛡️ 型別安全與開發體驗
- **完整的 TypeScript 支援**：運用裝飾器與進階型別提供卓越的開發體驗。
- **詳細的錯誤訊息**：提供「您是指...？」建議與具描述性的錯誤型別。
- **偵錯工具**：內建查詢日誌、執行時間監控與快取統計資訊。

### 🔄 資料庫版本控制
- **流暢的架構生成器 (Schema Builder)**：用於建立與修改資料表的表現性語法。
- **強大的遷移器 (Migrator)**：管理不同環境間的資料庫變更。
- **資料種子與工廠 (Seeds & Factories)**：整合 faker 輕鬆產生測試資料。

### 🗄️ 多驅動程式支援
提供統一 API 原生支援主流資料庫：
- **PostgreSQL**：支援原生 `pg` 與 `Bun.sql`。
- **MySQL/MariaDB**：高效能 `mysql2` 驅動。
- **SQLite**：極速 `bun:sqlite` 與 `better-sqlite3`。
- **NoSQL 策略支援**：針對 MongoDB 與 Redis 的特殊支援層。

## 🧠 進階模組功能

### 📡 事件系統與觀察者 (Observers)
監聽模型生命週期事件以實作橫切關注點 (Cross-cutting concerns)。
```typescript
User.observe({
  creating: (user) => {
    user.api_token = Str.random(40)
  },
  saved: (user) => {
    Signal.emit('user.updated', user)
  }
})
```

### 🧬 動態屬性轉換 (Attribute Casting)
自動將資料庫數值轉換為 JavaScript 型別。
```typescript
class User extends Model {
  static casts = {
    settings: 'json',
    is_admin: 'boolean',
    last_login: 'datetime'
  }
}
```

### 🔍 進階查詢生成器
- **巢狀 Where 子句**：複雜的邏輯分組。
- **關聯管理**：流暢的 Inner、Left 與 Right Joins。
- **子查詢**：在查詢中將查詢生成器作為表達式使用。
- **原始表達式**：透過 `DB.raw()` 安全地使用原始 SQL。

### 🧠 記憶體安全串流 (Streams)
使用基於游標 (Cursor) 的串流 API 處理數百萬筆紀錄，避免堆疊溢位。
```typescript
for await (const users of User.cursor(500)) {
  for (const user of users) {
    await process(user)
  }
}
```

## 📊 效能基準測試

| 操作 | 效能 |
|-----------|-------------|
| 原始查詢讀取 | 每秒 110 萬列以上 |
| 模型填充 | 每秒 4.2 萬個模型以上 |
| 異動追蹤 | 提升 50 倍速 (v2.0) |
| 記憶體開銷 | 減少 40-60% (v2.0) |

## 📄 授權

MIT © Gravito Framework
