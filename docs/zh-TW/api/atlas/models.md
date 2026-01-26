---
title: Models
---

# Models

> 基於 Atlas 的 Active Record 模式實作，提供類似 Laravel Eloquent 的開發體驗。

## 定義 Model

定義模型時需繼承 `Model` 類別，並指定 `table` 名稱。

```ts
import { Model, column } from '@gravito/atlas'

export class User extends Model {
  // 設定資料表名稱
  static table = 'users'
  
  // 主鍵（預設為 'id'）
  static primaryKey = 'id'

  // 使用 @column 裝飾器定義資料庫欄位
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare active: boolean
}
```

## 基本操作

### 查詢紀錄

```ts
// 根據 ID 查詢
const user = await User.find(1)

// 使用查詢構造器
const users = await User.query()
  .where('active', true)
  .orderBy('created_at', 'desc')
  .get()

// 獲取符合條件的第一筆
const user = await User.where('email', 'john@example.com').first()
```

### 建立與更新

```ts
// 建立新實例
const user = new User()
user.name = 'John Doe'
await user.save()

// 使用靜態快捷方法
const user = await User.create({
  name: 'Jane Doe',
  email: 'jane@example.com'
})

// 更新屬性
user.name = 'Updated Name'
await user.save()

// 或是直接 update
await user.update({ name: 'New Name' })
```

### 刪除紀錄

```ts
const user = await User.find(1)
await user.delete()

// 如果啟用了軟刪除，可以使用 forceDelete 真正刪除
await user.forceDelete()
```

## 進階功能

### 型別轉換 (Casting)

自動將資料庫中的原始值轉換為指定的型別。

```ts
export class User extends Model {
  static casts = {
    age: 'number',
    is_active: 'boolean',
    metadata: 'json',
    tags: 'array',
    birthday: 'date'
  }
}
```

### 填充保護 (Fillable / Guarded)

防止惡意使用者透過批次賦值修改敏感屬性。

```ts
export class User extends Model {
  // 白名單：只允許批次賦值的欄位
  static fillable = ['name', 'email']

  // 或 黑名單：禁止批次賦值的欄位
  // static guarded = ['is_admin']
}
```

### 自動時間戳記

Atlas 預設會自動維護 `created_at` 與 `updated_at` 欄位。

```ts
export class User extends Model {
  static timestamps = true // 預設為 true
  static createdAtColumn = 'created_at'
  static updatedAtColumn = 'updated_at'
}
```

### 軟刪除 (Soft Deletes)

```ts
export class User extends Model {
  static usesSoftDeletes = true
  static deletedAtColumn = 'deleted_at'
}

// 查詢包含已刪除的紀錄
const users = await User.withTrashed().get()

// 只查詢已刪除的紀錄
const users = await User.onlyTrashed().get()

// 恢復已刪除的紀錄
await user.restore()
```

## 模型事件

你可以透過 Gravito 的 Hooks 系統監聽模型生命週期：

- `model:creating` / `model:created`
- `model:updating` / `model:updated`
- `model:saving` / `model:saved`
- `model:deleting` / `model:deleted`

詳情請參閱 [ORM 使用指南](../../guide/orm-usage.md#模型事件)。

