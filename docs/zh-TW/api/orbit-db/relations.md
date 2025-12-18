---
title: Relations
---

# Relations

> Orbit DB 的關聯查詢基於 Drizzle relations 與 `db.raw.query.*`。

## Drizzle Relations（`find*With` 的必要條件）

要使用 `DBService.findByIdWith/findOneWith/findAllWith`，必須先在 Drizzle 中定義 relations，
並在 `drizzle(...)` 時把 schema 帶入。

```ts
import { relations } from 'drizzle-orm'
import { pgTable, integer, text } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
})

export const posts = pgTable('posts', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  title: text('title'),
})

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))
```

## 關聯查詢

```ts
const user = await db.findByIdWith('users', 1, { posts: true })
```

## Model 關聯

`Model.hasMany/belongsTo/...` 主要用於註冊關聯名稱，並提供：

- `await user.relation('posts')`
- `await user.load(['posts'])`

> **Note**：關聯載入的實際查詢仍依賴 Drizzle `query` relations，請確保 Drizzle schema 已定義。

## 多態關聯

Orbit DB 提供 `morphTo` / `morphMany` / `morphOne`。其中 `morphTo` 建議提供 `morphMap`，
用於將 type 值映射到對應的 `Model` 類別。
