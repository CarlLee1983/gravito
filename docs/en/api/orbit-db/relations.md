---
title: Relations
---

# Relations

> Relation queries in Orbit DB are backed by Drizzle relations and `db.raw.query.*`.

## Drizzle Relations (Required for `find*With`)

To use `DBService.findByIdWith/findOneWith/findAllWith`, you must define relations in Drizzle and
include them in the schema passed to `drizzle(...)`.

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

## Querying with Relations

```ts
const user = await db.findByIdWith('users', 1, { posts: true })
```

## Model Relations

`Model.hasMany/belongsTo/...` register relation names and provide helpers like:

- `await user.relation('posts')`
- `await user.load(['posts'])`

> **Note**: the actual SQL for relation loading still relies on Drizzle `query` relations.
Ensure your Drizzle schema defines those relations for the table names you query.

## Polymorphic Relations

Orbit DB includes `morphTo`, `morphMany`, and `morphOne`. For `morphTo`, you should provide a
`morphMap` that maps type values to `Model` classes.
