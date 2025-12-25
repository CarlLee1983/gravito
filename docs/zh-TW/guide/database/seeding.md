# 數據填充與工廠 (Seeding & Factories)

Atlas 包含了使用 Seed 類別與模型工廠 (Model Factories) 為資料庫填充測試數據的功能。

## 撰寫 Seeders

Seeders 儲存在 `database/seeders` 目錄中。一個 Seeder 類別包含一個 `run` 方法，您可以在其中向資料庫插入數據。

```typescript
import { Seeder } from '@gravito/atlas';
import User from '../src/models/User';

export default class DatabaseSeeder extends Seeder {
  async run() {
    await User.query().insert({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'password'
    });
  }
}
```

## 模型工廠 (Model Factories)

在測試應用程式或填充資料庫時，您可能需要向資料庫插入幾條記錄。與其手動指定每個欄位的值，不如使用工廠為您的每個模型定義一組預設屬性。

### 定義工廠

工廠通常儲存在 `database/factories` 中。使用 `define` 方法來定義您的工廠。

```typescript
import { Factory } from '@gravito/atlas';
import User from '../src/models/User';

export default Factory.define(User, (faker) => {
  return {
    name: faker.name.fullName(),
    email: faker.internet.email(),
    password: 'password', // 在生產環境中會進行雜湊
  };
});
```

### 使用工廠進行填充

一旦定義了工廠，您就可以在 Seeders 或測試中使用它們：

```typescript
// 使用工廠建立 10 個使用者
await User.factory().count(10).create();
```

## 進階數據填充

### 調用其他 Seeders

在 Seeder 的 `run` 方法中，您可以使用 `call` 方法來執行其他的 Seed 類別。這讓您可以將資料庫填充拆分為多個檔案：

```typescript
export default class DatabaseSeeder extends Seeder {
  async run() {
    await this.call([
      UserSeeder,
      PostSeeder,
      CommentSeeder,
    ]);
  }
}
```

## 進階工廠用法

### 工廠狀態 (Factory States)

狀態允許您定義模型工廠的離散變體。例如，您的 `User` 模型可能有一個 `suspended`（停權）狀態，它會修改其中一個預設屬性值：

```typescript
// 應用狀態覆寫
await User.factory().count(5).state({ active: false }).create();
```

### 工廠序列 (Factory Sequences)

有時您可能希望為每個生成的模型交替遞增某個屬性的值。您可以使用 `sequence` 方法：

```typescript
const users = await User.factory()
  .count(10)
  .sequence('role', (index) => index % 2 === 0 ? 'admin' : 'user')
  .create();
```

### 工廠關聯 (Factory Relationships)

Atlas 允許您在工廠中定義關聯，確保相關聯的模型會自動建立：

```typescript
// 建立一篇文章並附帶 3 條關聯的評論
await Post.factory()
  .has(Comment.factory().count(3))
  .create();
```

## 執行 Seeders

要填充資料庫，請執行 `db:seed` Orbit 命令：

```bash
bun orbit db:seed
```

您也可以指定特定的 Seeder 類別執行：

```bash
bun orbit db:seed --class=UserSeeder
```

## 生產環境警告

預設情況下，如果您嘗試在 `production`（生產）環境中執行 Seeder，系統會發出警告，因為這可能會覆蓋真實數據：

```bash
bun orbit db:seed --force
```
