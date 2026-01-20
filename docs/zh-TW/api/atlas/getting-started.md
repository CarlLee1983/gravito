---
title: 快速上手
---

# 快速上手

> 安裝 Atlas 並配置資料庫連接。Atlas 提供了一個與 Laravel 相似且流暢的查詢構造器（Query Builder）。

## 安裝

```bash
bun add @gravito/atlas
```

## 配置與初始化

您可以使用多種方式來初始化資料庫連接。通常在應用程式啟動時（例如 `bootstrap.ts`）進行配置。Atlas v2.0 支援三種配置方式：

### 方式 1：程式化配置

```ts
import { DB } from '@gravito/atlas'

DB.configure({
  default: 'postgres',
  connections: {
    postgres: {
      driver: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'gravito_app',
      username: 'postgres',
      password: 'password',
    }
  }
})
```

### 方式 2：環境變數（v2.0 新增）

```ts
import { DB } from '@gravito/atlas'

// 使用 DATABASE_URL
// DATABASE_URL=postgres://user:password@localhost:5432/gravito_app
DB.configureFromEnv()

// 或使用個別變數
// DB_DRIVER=postgres
// DB_HOST=localhost
// DB_DATABASE=gravito_app
// DB_USERNAME=postgres
// DB_PASSWORD=password
DB.configureFromEnv()
```

### 方式 3：配置檔案（v2.0 新增）

```ts
// config/database.ts
import { defineConfig } from '@gravito/atlas'

export default defineConfig({
  default: 'postgres',
  connections: {
    postgres: {
      driver: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_DATABASE || 'gravito_app',
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    }
  }
})

// 然後在 bootstrap.ts 中
import { DB } from '@gravito/atlas'
await DB.configureFromFile()
```

**注意：** `configureFromFile()` 會自動依序搜尋以下配置檔案：
- `config/database.ts`
- `config/database.js`
- `config/database.mjs`
- `database.config.ts`
- `database.config.js`

您也可以指定自訂路徑：
```ts
await DB.configureFromFile('./my-custom-path/database.ts')
```

### 資料庫類型支援

Atlas 目前支援以下驅動程式：
- `postgres` (基於 `pg`)
- `mysql` (基於 `mysql2`)
- `sqlite` (基於 `better-sqlite3`)
- `mongodb` (基於 `mongodb`)
- `redis` (基於 `ioredis`)

## 多資料庫連接 (Multi-database)

Atlas 支援同時管理多個資料庫連接，甚至是不同類型的資料庫。

```ts
DB.configure({
  default: 'main',
  connections: {
    main: {
      driver: 'postgres',
      host: 'localhost',
      database: 'main_db'
    },
    analytics: {
      driver: 'mysql',
      host: 'remote-host',
      database: 'logs'
    },
    local_cache: {
      driver: 'sqlite',
      database: 'cache.sqlite'
    }
  }
})

// 使用預設連接 (main)
const users = await DB.table('users').get()

// 指定使用 analytics 連接
const logs = await DB.connection('analytics').table('logs').get()
```

## 原生 Bun.sql 驅動程式（可選）

對於 PostgreSQL、MySQL 和 SQLite，Atlas 支援 Bun 的原生統一 SQL API (`Bun.sql`)，以獲得更好的效能。透過設定 `useNativeDriver: true` 來啟用：

```ts
DB.configure({
  default: 'postgres',
  connections: {
    postgres: {
      driver: 'postgres',
      useNativeDriver: true, // 啟用 Bun.sql 原生驅動程式
      host: 'localhost',
      database: 'myapp',
      username: 'postgres',
      password: 'password'
    }
  }
})
```

**注意：** 此功能需要 Bun 1.3+，如果 `Bun.sql` 不可用，會自動回退到標準驅動程式。

## 基本使用

配置完成後，即可在應用的任何地方透過 `DB` 門面存取資料庫。

```ts
import { DB } from '@gravito/atlas'

// 查詢
const activeUsers = await DB.table('users')
  .where('status', 'active')
  .get()

// 插入
await DB.table('users').insert({
  name: 'John Doe',
  email: 'john@example.com'
})

// 交易
await DB.transaction(async (trx) => {
  await trx.table('accounts').where('id', 1).decrement('balance', 100)
  await trx.table('accounts').where('id', 2).increment('balance', 100)
})
```

## v2.0 新功能

Atlas v2.0 包含顯著的性能改進和開發者體驗增強：

- **性能優化**：Model hydration ↑300-500% 更快，查詢編譯 ↑50-100% 更快
- **更好的錯誤訊息**：提供 "Did you mean?" 拼寫建議
- **調試工具**：`DB.debug()`、`DB.getQueryLog()`、`DB.getLastQuery()`
- **環境變數支援**：透過 `DATABASE_URL` 或個別 `DB_*` 變數配置
- **配置檔案支援**：使用 `defineConfig()` 和 `DB.configureFromFile()`
- **查詢快取**：編譯 SQL 的 LRU 快取（80%+ 命中率）

詳見[升級指南](../../../../packages/atlas/IMPLEMENTATION_PLAN/10-upgrade-guide.md)以獲取遷移詳情。

## 下一步

- 探索[查詢構造器](./query-builder.md)以獲取更複雜的查詢功能
- 學習[模型](./models.md)以體驗 Active Record
- 設置[遷移與 Seed](./migrations-seeding.md)以進行資料庫維護
