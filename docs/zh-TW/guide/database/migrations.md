# 資料庫遷移 (Migrations)

遷移就像是資料庫的版本控制，允許您的團隊修改並共享應用程式的資料庫結構。

## 生成遷移

使用 `orbit` CLI 建立新的遷移：

```bash
bun orbit make:migration create_users_table
```

新的遷移文件將被放置在您的 `database/migrations` 目錄中。

## 遷移結構

一個遷移包含一個 `Blueprint`，用於定義資料表結構：

```typescript
import { Migration, Blueprint, Schema } from '@gravito/atlas';

export default class CreateUsersTable extends Migration {
  async up() {
    await Schema.create('users', (table: Blueprint) => {
      table.id();
      table.string('name');
      table.string('email').unique();
      table.timestamp('email_verified_at').nullable();
      table.string('password');
      table.timestamps();
    });
  }

  async down() {
    await Schema.dropIfExists('users');
  }
}
```

## 可用的欄位類型

資料庫藍圖提供了多種欄位類型：

| 方法 | 描述 |
| --- | --- |
| `table.id()` | `bigIncrements('id')` 的別名。 |
| `table.string('name', 255)` | 等同於 VARCHAR。 |
| `table.text('description')` | 等同於 TEXT。 |
| `table.integer('age')` | 等同於 INTEGER。 |
| `table.boolean('is_active')` | 等同於 BOOLEAN。 |
| `table.decimal('price', 8, 2)` | 具有精度和小數點位數的 DECIMAL。 |
| `table.json('options')` | JSON 欄位。 |
| `table.uuid('uid')` | UUID 欄位。 |
| `table.timestamps()` | 新增 `created_at` 與 `updated_at`。 |

## 欄位修飾符

您可以對欄位鏈接修飾符：

```typescript
table.string('email').nullable();
table.string('role').default('user');
table.string('username').unique();
```

## 索引與外鍵

### 建立索引
```typescript
table.index(['email', 'status']);
table.unique('slug');
```

### 外鍵約束
```typescript
table.bigInteger('user_id').unsigned();
table.foreign('user_id').references('id').on('users').onDelete('cascade');
```

## 執行遷移

要執行所有掛起的遷移，請使用 `migrate` 命令：

```bash
bun orbit migrate
```

要回滾最後一批遷移：

```bash
bun orbit migrate:rollback
```
