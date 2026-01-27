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

[閱讀完整效能白皮書](../../docs/ATLAS_PERFORMANCE_WHITEPAPER.md)

## 📄 授權

MIT © Gravito Framework
