---
title: DBService
---

# DBService

> 注入到 Hono `Context` 的請求級資料庫服務。

## 取得方式

```ts
core.app.get('/example', async (c) => {
  const db = c.get('db') // DBService
  return c.json({ ok: true, hasRaw: !!db.raw })
})
```

## 交易

```ts
await db.transaction(async (tx) => {
  // 若驅動支援，可直接使用 tx 搭配 Drizzle。
})
```

## 查詢輔助

- `findById(table, id)`
- `findOne(table, where)`
- `findAll(table, where?, options?)`
- `paginate(table, { page, limit, orderBy?, orderDirection? })`
- `count(table, where?)`
- `exists(table, where)`

## CRUD 與批量操作

- `create(table, data)`
- `insert(table, data | data[])`
- `update(table, where, data)`
- `delete(table, where)`
- `bulkInsert(table, data[])`
- `bulkUpdate(table, [{ where, data }])`
- `bulkDelete(table, where[])`

## 關聯查詢

Orbit DB 的關聯查詢輔助方法基於 Drizzle `db.raw.query.*`：

- `findByIdWith(tableName, id, relations)`
- `findOneWith(tableName, where, relations)`
- `findAllWith(tableName, relations, options?)`

關聯定義方式請見：[Relations](./relations.md)。

## 運維 API

- 健康檢查：`healthCheck()`
- 遷移：`migrate()`、`migrateTo(target?)`
- Seed：`seed(fn, name?)`、`seedMany([{ name, seed }])`
- 部署：`deploy(options?)`

## Hooks

- `db:transaction:start | commit | rollback | error`
- `db:health-check`
- `db:migrate:start | complete | error`
- `db:seed:start | complete | error`
- `db:deploy:start | complete | error`
- `db:query`（當啟用查詢日誌時）
