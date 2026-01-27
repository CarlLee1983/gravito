---
title: 遷移與 Seed
---

# 遷移與 Seed

> 提供流暢的資料表結構定義 (Blueprint) 與資料填充 (Seeding/Factories) 工具。

## 資料庫遷移 (Migrations)

Atlas 提供了 `Schema` 與 `Blueprint` API，讓你能以程式碼定義資料表結構。

### 建立資料表

```ts
import { Blueprint, Schema } from '@gravito/atlas'

await Schema.create('users', (table: Blueprint) => {
  table.id() // 自動遞增 ID
  table.string('name')
  table.string('email').unique()
  table.string('password').nullable()
  table.boolean('active').default(true)
  table.timestamps() // 自動建立 created_at 與 updated_at
})
```

### 修改資料表

```ts
await Schema.table('users', (table: Blueprint) => {
  table.string('avatar').after('email')
  table.index(['name', 'email'], 'idx_name_email')
})
```

### 支援的欄位類型

- `id()`, `bigIncrements()`
- `string(name, length?)`, `text(name)`
- `integer(name)`, `bigInteger(name)`, `decimal(name, precision?, scale?)`
- `boolean(name)`
- `date(name)`, `dateTime(name)`, `timestamp(name)`
- `json(name)`, `jsonb(name)`
- `uuid(name)`

## 數據填充 (Seeding)

### 使用 Seeder

Seeder 用於向資料庫填充初始數據。

```ts
import { DB, Seeder } from '@gravito/atlas'

export default class UserSeeder extends Seeder {
  async run() {
    await DB.table('users').insert([
      { name: 'Admin', email: 'admin@example.com' }
    ])
  }
}
```

### 使用 Factory

Factory 可以幫助你快速產生測試資料。

```ts
import { Factory } from '@gravito/atlas'

// 定義 Factory
const UserFactory = Factory.define(User, ({ faker }) => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
  active: true
}))

// 使用 Factory 建立資料
await UserFactory.create() // 建立一筆並存入資料庫
await UserFactory.count(10).create() // 建立 10 筆
```

## 執行遷移與填充

你可以透過 CLI 或程式碼執行：

### 透過 CLI

```bash
# 執行所有未執行的遷移
bun orbit migrate

# 執行所有 Seeders
bun orbit seed

# 回滾遷移
bun orbit migrate:rollback

# 重新執行遷移（刪除所有資料表並重新執行）
bun orbit migrate:fresh
```

### 透過程式碼

```ts
import { Migrator, SeederRunner } from '@gravito/atlas'
import path from 'node:path'

// 執行所有未執行的遷移
const migrator = new Migrator({
  path: path.join(__dirname, 'database/migrations')
})
await migrator.run()

// 執行所有 Seeders
const seederRunner = new SeederRunner({
  path: path.join(__dirname, 'database/seeders')
})
await seederRunner.run()

// 執行指定的 Seeder（依名稱）
await seederRunner.call('UserSeeder')
```

