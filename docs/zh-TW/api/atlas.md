---
title: Atlas
---

# Atlas

> 為 Gravito 打造的標準化資料庫 Orbit —— 具備 Laravel 風格的查詢構造器與 ORM。

套件：`@gravito/atlas`

此模組提供了標準化的資料庫連線管理、Fluent 查詢介面、交易支援、模型關聯、遷移與數據填充 (Seed)。

## 閱讀導覽

本頁為概覽，細節按主題分頁：

| 主題 | 頁面 |
|------|------|
| 快速上手 | [快速上手](./atlas/getting-started.md) |
| 查詢構造器 | [Query Builder](./atlas/query-builder.md) |
| 模型 (ORM) | [Models](./atlas/models.md) |
| 模型關聯 | [Relations](./atlas/relations.md) |
| 序列化 | [Serialization](./atlas/serialization.md) |
| 分頁 | [Pagination](./atlas/pagination.md) |
| 遷移與 Seed | [遷移與 Seed](./atlas/migrations-seeding.md) |

## 功能概覽

- **多驅動支援**：完整支援 PostgreSQL, MySQL, SQLite, MongoDB 與 Redis。
  - **SQL 資料庫**（PostgreSQL, MySQL, SQLite）：完整的 ORM 支援，包括 Models、Relationships、Migrations 和所有 Query Builder 功能。
  - **MongoDB**：支援 Query Builder 與文件型操作。ORM 功能有限（Models 和 Relationships 可能有限制）。
  - **Redis**：透過 Query Builder 進行鍵值操作。主要設計用於快取和簡單資料儲存。
- **流暢查詢**：與 Laravel 相似的查詢構築介面，支援複雜的 `where`、`join` 與 JSON 查詢。
- **資料庫連接管理**：輕鬆切換與管理多個資料庫連接。
- **Eloquent 風格 Models**：定義 Model 類別並使用關聯（HasMany, BelongsTo 等）——**僅 SQL 資料庫完整支援**。
- **完整維護工具**：內建遷移 (Migrations) 與數據填充 (Factories/Seeders)——**僅 SQL 資料庫支援**。
- **性能優化 (v2.0)**：Model hydration ↑300-500% 更快，查詢編譯 ↑50-100% 更快。
- **增強的開發者體驗 (v2.0)**：更好的錯誤訊息、調試工具、環境變數支援。

## 安裝

```bash
bun add @gravito/atlas
```

## 快速開始

完整示例請見：[快速上手](./atlas/getting-started.md)。

**方式 1：程式化配置**
```ts
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
```ts
import { DB } from '@gravito/atlas'

// 使用 DATABASE_URL
// DATABASE_URL=postgres://user:password@localhost:5432/myapp
DB.configureFromEnv()

// 或使用個別變數
// DB_DRIVER=postgres
// DB_HOST=localhost
// DB_DATABASE=myapp
DB.configureFromEnv()
```

**方式 3：配置檔案（v2.0 新增）**
```ts
// config/database.ts
import { defineConfig } from '@gravito/atlas'

export default defineConfig({
  default: 'postgres',
  connections: {
    postgres: {
      driver: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      // ...
    }
  }
})

// 然後在應用程式中
import { DB } from '@gravito/atlas'
await DB.configureFromFile()
```

**使用資料庫**
```ts
// 在應用中存取
const users = await DB.table('users').get()
```

## 使用指南

- [ORM 使用指南（繁體中文）](../guide/orm-usage.md)
- [ORM Usage Guide（English）](../../../en/guide/orm-usage.md)
