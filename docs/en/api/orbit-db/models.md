---
title: Models
---

# Models

> An Eloquent-like `Model` API built on top of Orbit DB + Drizzle.

## Defining a Model

```ts
import { Model } from '@gravito/orbit-db'

export class User extends Model {
  static table = { _: { name: 'users' } }
  static tableName = 'users'

  declare attributes: {
    id?: number
    name: string
    email: string
  }
}
```

## Bootstrapping Models

Orbit DB initializes models registered in `ModelRegistry` during installation.

```ts
import { ModelRegistry } from '@gravito/orbit-db'
import { users } from './schema'

ModelRegistry.register(User, users, 'users')
```

## Common Static APIs

- `find(id)`
- `where(column, value)` / `whereMany(where)`
- `all(options?)` / `findAll(where?, options?)`
- `paginate({ page, limit, orderBy?, orderDirection? })`
- `create(data)` / `upsert(data, options?)`
- `firstOrCreate(where, data)` / `firstOrNew(where, data)` / `updateOrCreate(where, data)`
- `count(where?)` / `exists(where)`

## Instance APIs

- `get(key)` / `set(key, value)`
- `save()` / `update(data)`
- `delete()` / `forceDelete()` / `restore()` / `trashed()`
- Relations: `await model.relation('posts')`, `await model.load(['posts'])`

## Mass Assignment, Casts, and Timestamps

- `static fillable` / `static guarded`
- `static casts`
- `static timestamps`, `static createdAtColumn`, `static updatedAtColumn`
- Soft deletes: `static usesSoftDeletes`, `static deletedAtColumn`

## Serialization

- `static hidden` / `static visible`
- `static appends`
- `toJSON()` includes loaded relations and appended attributes

## Hooks

- `model:creating` / `model:created`
- `model:updating` / `model:updated`
- `model:saved`
- `model:deleting` / `model:deleted`
