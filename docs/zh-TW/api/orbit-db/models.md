---
title: Models
---

# Models

> 基於 Orbit DB + Drizzle 的類 Eloquent `Model` API。

## 定義 Model

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

## Model 初始化方式

Orbit DB 會在安裝時初始化 `ModelRegistry` 中已註冊的 Models。

```ts
import { ModelRegistry } from '@gravito/orbit-db'
import { users } from './schema'

ModelRegistry.register(User, users, 'users')
```

## 常用靜態方法

- `find(id)`
- `where(column, value)` / `whereMany(where)`
- `all(options?)` / `findAll(where?, options?)`
- `paginate({ page, limit, orderBy?, orderDirection? })`
- `create(data)` / `upsert(data, options?)`
- `firstOrCreate(where, data)` / `firstOrNew(where, data)` / `updateOrCreate(where, data)`
- `count(where?)` / `exists(where)`

## 常用實例方法

- `get(key)` / `set(key, value)`
- `save()` / `update(data)`
- `delete()` / `forceDelete()` / `restore()` / `trashed()`
- 關聯：`await model.relation('posts')`、`await model.load(['posts'])`

## 填充保護、型別轉換與時間戳

- `static fillable` / `static guarded`
- `static casts`
- `static timestamps`、`static createdAtColumn`、`static updatedAtColumn`
- 軟刪除：`static usesSoftDeletes`、`static deletedAtColumn`

## 序列化

- `static hidden` / `static visible`
- `static appends`
- `toJSON()` 會包含已載入關聯與追加屬性

## Hooks

- `model:creating` / `model:created`
- `model:updating` / `model:updated`
- `model:saved`
- `model:deleting` / `model:deleted`
