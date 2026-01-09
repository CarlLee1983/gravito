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
- **流暢查詢**：與 Laravel 相似的查詢構築介面，支援複雜的 `where`、`join` 與 JSON 查詢。
- **資料庫連接管理**：輕鬆切換與管理多個資料庫連接。
- **Eloquent 風格 Models**：定義 Model 類別並使用關聯（HasMany, BelongsTo 等）。
- **完整維護工具**：內建遷移 (Migrations) 與數據填充 (Factories/Seeders)。

## 安裝

```bash
bun add @gravito/atlas
```

## 快速開始

完整示例請見：[快速上手](./atlas/getting-started.md)。

```ts
import { PlanetCore } from '@gravito/core'
import { DB } from '@gravito/atlas'

// 配置資料庫
DB.configure({
  connections: {
    default: {
      driver: 'postgres',
      host: 'localhost',
      database: 'myapp'
    }
  }
})

// 在應用中存取
const users = await DB.table('users').get()
```

## 使用指南

- [ORM 使用指南（繁體中文）](../guide/orm-usage.md)
- [ORM Usage Guide（English）](../../../en/guide/orm-usage.md)
