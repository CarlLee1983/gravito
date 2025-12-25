# 資料庫快速入門 (Database)

本指南將引領您完成資料庫連線設定以及使用查詢建構器執行基本的 CRUD 操作。

::: info 想使用 ORM？
如果您想使用物件導向的模型 (Models) 進行開發，請參考 [Atlas ORM 快速上手](./orm-quick-start)。
:::

## 1. 安裝

Atlas 運行在 `@gravito/atlas` 套件之上。

```bash
bun add @gravito/atlas
```

根據您使用的資料庫，您還需要安裝對應的驅動程式：

```bash
# PostgreSQL
bun add pg

# MySQL / MariaDB
bun add mysql2

# SQLite
bun add better-sqlite3 # 或使用內建的 bun:sqlite

# MongoDB
bun add mongodb

# Redis
bun add ioredis
```

## 2. 配置

配置您的資料庫連線。Atlas 支援同時開啟多個連線。

```typescript
import { DB } from '@gravito/atlas';

DB.configure({
  default: 'postgres',

  connections: {
    postgres: {
      driver: 'postgres',
      host: 'localhost',
      database: 'gravito_app',
      username: 'postgres',
      password: 'password',
    },
    
    sqlite: {
      driver: 'sqlite',
      database: 'database.sqlite',
    },

    mongodb: {
      driver: 'mongodb',
      url: 'mongodb://localhost:27017/gravito',
      database: 'gravito',
    }
  }
});
```

## 3. 基本用法 (查詢建構器)

配置完成後，您可以使用 `DB.table()` 進行流暢的資料庫操作。

### 插入資料 (Insert)

```typescript
// 插入單筆
await DB.table('users').insert({
  name: 'Alice',
  email: 'alice@example.com',
  created_at: new Date()
});

// 插入多筆
await DB.table('users').insert([
  { name: 'Bob', email: 'bob@example.com' },
  { name: 'Charlie', email: 'charlie@example.com' }
]);
```

### 查詢資料 (Select)

```typescript
// 獲取所有記錄
const users = await DB.table('users').get();

// 條件查詢
const admin = await DB.table('users')
  .where('role', 'admin')
  .first();

// 選擇特定欄位
const emails = await DB.table('users')
  .select('email')
  .where('active', true)
  .get();
```

### 更新資料 (Update)

```typescript
await DB.table('users')
  .where('id', 1)
  .update({ name: 'Alice Wonderland' });
```

### 刪除資料 (Delete)

```typescript
await DB.table('users')
  .where('active', false)
  .delete();
```

## 下一步

- 深入探索 [查詢建構器 (Query Builder)](./query-builder) 的強大功能。
- 學習如何使用 [Atlas ORM](./orm-quick-start) 進行物件導向開發。
- 了解 [資料庫遷移 (Migrations)](./migrations) 以管理資料庫結構。