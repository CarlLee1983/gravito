# @gravito/atlas

> 標準資料庫軌道 - 專為 Gravito 打造的查詢構建器與 ORM

**@gravito/atlas** 是一個高效能、以開發者體驗為中心的 Gravito 生態系資料庫工具包。它提供流暢的 Query Builder、強大的 Active Record ORM，以及深受 Laravel 與 Drizzle 啟發的資料庫版本控制工具。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Performance](https://img.shields.io/badge/performance-40k--models/sec-brightgreen)](../../docs/ATLAS_PERFORMANCE_WHITEPAPER.md)

## 📦 安裝

```bash
bun add @gravito/atlas

# 安裝對應的資料庫驅動
bun add pg              # PostgreSQL
bun add mysql2          # MySQL / MariaDB
bun add better-sqlite3  # SQLite (非 Bun 環境)
```

## 🚀 快速上手

### 1. 配置連線

**方式 1：程式化配置**
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

**方式 2：環境變數（v2.0 新增）**
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

**方式 3：配置檔案（v2.0 新增）**
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

// 然後在應用程式中
import { DB } from '@gravito/atlas'
await DB.configureFromFile()
```

### 2. 使用 Query Builder

```typescript
const users = await DB.table('users')
  .where('status', 'active')
  .where('age', '>', 18)
  .orderBy('created_at', 'desc')
  .limit(10)
  .get()
```

### 3. 使用 Active Record ORM

```typescript
import { Model, column, HasMany } from '@gravito/atlas'

class User extends Model {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @HasMany(() => Post)
  declare posts: Post[]
}

// 查詢並更新
const user = await User.find(1)
user.email = 'new@example.com'
await user.save()

// 預加載關聯 (Eager Loading)
const usersWithPosts = await User.with('posts').get()

// 分頁
const { data, pagination } = await User.query()
  .where('status', 'active')
  .paginate(15, 1)

// 事務
await DB.transaction(async (trx) => {
  await trx.table('accounts').where('id', 1).decrement('balance', 100)
  await trx.table('accounts').where('id', 2).increment('balance', 100)
})
```

## ✨ 核心特性

### 🚀 Bun.sql 原生支援 (New!)
Atlas 現在原生支援 Bun 1.3 的 `Bun.sql` 統一 API。透過使用原生驅動，您可以獲得更極致的效能表現與更低的通訊延遲。

只需在設定中開啟 `useNativeDriver`：
```typescript
DB.configure({
  connections: {
    postgres: {
      driver: 'postgres',
      useNativeDriver: true, // 啟用 Bun.sql 原生驅動
      // ...其他設定
    }
  }
})
```

### 🛡️ 預設安全
內建 **自動參數化 (Auto-Parameterization)** 機制，徹底防禦 SQL 注入。所有使用者輸入皆視為綁定參數，絕不直接拼接 SQL 字串。

### 🧠 記憶體安全資料流
使用基於游標 (Cursor) 的串流 API，輕鬆處理數百萬筆記錄而不會導致 Heap 溢出。
```typescript
for await (const users of User.cursor(500)) {
  for (const user of users) {
    await process(user)
  }
}
```

### 🛠️ Schema 與 遷移 (Migrations)
使用直觀且具備表達力的語法管理您的資料庫版本。
```typescript
import { Schema } from '@gravito/atlas'

await Schema.create('users', (table) => {
  table.id()
  table.string('email').unique()
  table.json('settings').nullable()
  table.timestamps()
})
```

### 💻 命令行工具 (Orbit CLI)
透過內建的腳手架加速開發。
```bash
# 生成模型 (Model)
bun orbit make:model User

# 生成遷移 (Migration)
bun orbit make:migration create_users_table

# 執行遷移
bun orbit migrate
```

## 🗄️ 支援的資料庫

| 資料庫 | 狀態 | 驅動程式 |
|----------|--------|--------|
| **PostgreSQL** | ✅ 已支援 | `pg` / `Bun.sql` (Native) |
| **MySQL** | ✅ 已支援 | `mysql2` / `Bun.sql` (Native) |
| **MariaDB** | ✅ 已支援 | `mysql2` / `Bun.sql` (Native) |
| **SQLite** | ✅ 已支援 | `bun:sqlite` / `Bun.sql` |

## 📊 效能表現

Atlas 專為邊緣運算 (Edge) 設計。在基準測試中，它達到了：
*   每秒 **110 萬+** 次原生讀取。
*   每秒 **42,000+** 次完整的 Active Record 模型水合 (Hydration)。
*   在巨量資料流處理中保持 **恆定的記憶體佔用**。

### 🚀 性能優化 (v2.0)

v2.0 版本包含顯著的性能改進：

- **Model Hydration**：↑300-500% 更快，透過優化的 Proxy 快取
- **DirtyTracker**：↑50x 更快，透過淺層比較優化
- **查詢編譯**：↑50-100% 更快，透過 LRU 快取（80%+ 命中率）
- **記憶體使用**：↓40-60% 減少（大型資料集）
- **QueryBuilder Clone**：優化的獨立查詢構建

[閱讀完整效能白皮書](../../docs/ATLAS_PERFORMANCE_WHITEPAPER.md)

## 🔄 從 v1.x 升級

詳見 [升級指南](./IMPLEMENTATION_PLAN/10-upgrade-guide.md) 以獲取詳細的遷移說明。

**主要變更：**
- DirtyTracker 現在預設使用淺層比較（使用 `setDeepComparison(true)` 進行深層比較）
- Grammar 快取現在預設為全局（多租戶應用設置 `Grammar.cacheScope = 'instance'`）
- Eager loading 預設啟用 chunking（使用 `setEagerLoadChunking(false)` 禁用）

## 📄 授權

MIT © Gravito Framework
