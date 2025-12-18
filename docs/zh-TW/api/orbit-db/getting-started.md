---
title: 快速上手
---

# 快速上手

> 安裝 Orbit DB、建立 Drizzle 實例，並在請求 Context 中注入 `DBService`。

## 安裝

```bash
bun add @gravito/orbit-db drizzle-orm
```

## PostgreSQL 範例

```ts
import { PlanetCore } from 'gravito-core'
import orbitDB from '@gravito/orbit-db'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const core = new PlanetCore()
const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client)

orbitDB(core, {
  db,
  databaseType: 'postgresql',
  exposeAs: 'db',
  enableQueryLogging: false,
})
```

## SQLite 範例

```ts
import { PlanetCore } from 'gravito-core'
import orbitDB from '@gravito/orbit-db'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'

const core = new PlanetCore()
const sqlite = new Database('sqlite.db')
const db = drizzle(sqlite)

orbitDB(core, { db, databaseType: 'sqlite', exposeAs: 'db' })
```

## 在路由中使用 `DBService`

```ts
core.app.get('/health/db', async (c) => {
  const db = c.get('db')
  const result = await db.healthCheck()
  return c.json(result)
})
```

## 選項（`OrbitDBOptions`）

- `db`：Drizzle 實例（必填）
- `exposeAs`：注入到 Context 的 key（默認：`db`）
- `databaseType`：`postgresql | sqlite | mysql | auto`
- `enableQueryLogging`：啟用後會透過 hooks 觸發 `db:query`
- `queryLogLevel`：`debug | info | warn | error`
- `enableHealthCheck`：啟用/停用 `DBService.healthCheck()`
- `healthCheckQuery`：自訂健康檢查查詢字串

## Hooks

- `db:connected`
- `db:query`（當啟用查詢日誌時）

> **Note**：`DBService` 也會觸發交易、遷移、Seed 與部署相關 hooks，請見 [DBService](./dbservice.md)。
