---
title: Orbit DB
---

# Orbit DB

> 以 Gravito Orbit 形式提供資料庫整合，**完整支援 PostgreSQL 並針對效能進行優化**。

套件：`@gravito/orbit-db`

此 Orbit 整合 **Drizzle ORM**，提供標準化的資料庫連線、Context 注入、交易支援、查詢輔助方法、健康檢查、遷移/Seed 與 Hooks。

## 閱讀導覽

本頁為概覽，細節按主題分頁：

| 主題 | 頁面 |
|------|------|
| 快速上手 | [快速上手](./orbit-db/getting-started.md) |
| DBService（查詢輔助） | [DBService](./orbit-db/dbservice.md) |
| Models（類 Eloquent API） | [Models](./orbit-db/models.md) |
| 關聯查詢 | [Relations](./orbit-db/relations.md) |
| 遷移與 Seed | [遷移與 Seed](./orbit-db/migrations-seeding.md) |

## 功能概覽

- 在每個請求的 Hono `Context` 注入 `DBService`
- 透過 `db.raw` 存取底層 Drizzle 實例
- 交易、CRUD 輔助、分頁、批量操作、聚合函數
- 基於 Drizzle `db.raw.query.*` 的關聯查詢
- 可選的查詢日誌與 Hooks（`db:query`、`db:transaction:*`、`db:migrate:*` 等）

## 安裝

```bash
bun add @gravito/orbit-db drizzle-orm
```

## 快速開始

完整示例請見：[快速上手](./orbit-db/getting-started.md)。

```ts
import { PlanetCore } from 'gravito-core'
import orbitDB from '@gravito/orbit-db'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const core = new PlanetCore()
const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client)

orbitDB(core, { db, databaseType: 'postgresql', exposeAs: 'db' })
```

## ORM 使用指南

- [ORM 使用指南（繁體中文）](../guide/orm-usage.md)
- [ORM Usage Guide（English）](../../en/guide/orm-usage.md)
