# 模型工廠 (Model Factories)

在測試應用程式或填充資料庫時，您可能需要插入數筆測試記錄。與其手動指定每個屬性的值，Atlas 允許您定義一組預設屬性，並使用模型工廠來大量生成數據。

## 定義工廠 (Defining Factories)

工廠通常定義在您的專案設定檔或專屬的 `database/factories` 目錄中。使用 `Factory.define` 方法來定義工廠。

由於 Atlas 不內建 Faker，您需要自行安裝並導入 `@faker-js/faker`：

```bash
bun add -D @faker-js/faker
```

```typescript
import { Factory } from '@gravito/atlas';
import { faker } from '@faker-js/faker';
import { User } from './User';

// 為 User 模型定義工廠
Factory.define(User, () => {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: 'password', // 預設密碼
    is_active: true,
  };
});
```

## 建立模型 (Creating Models)

定義好工廠後，您可以使用 `User.factory()` (如果在模型中實作了該靜態方法) 或 `Factory.model(User)` 來使用它。

### 實例化模型 (Instantiating Models)

`make` 方法會建立模型實例但 **不儲存** 到資料庫：

```typescript
const user = Factory.model(User).makeOne();
```

若要建立多個實例的集合：

```typescript
const users = Factory.model(User).count(3).make();
```

### 持久化模型 (Persisting Models)

`create` 方法會建立模型實例並使用 `insert` 方法將其儲存到資料庫：

```typescript
// 建立並儲存單一使用者
const user = await Factory.model(User).create();

// 建立並儲存 3 個使用者
const users = await Factory.model(User).count(3).create();
```

您也可以在 `create` 時覆寫屬性：

```typescript
const user = await Factory.model(User).create({
  name: 'Carl',
  email: 'carl@example.com'
});
```

## 工廠狀態 (Factory States)

狀態方法允許您定義離散的屬性修改。例如，您可能想要建立一個處於「停權」狀態的使用者：

```typescript
const user = await Factory.model(User)
  .state({ is_active: false })
  .create();
```

您可以鏈式調用多個狀態：

```typescript
const user = await Factory.model(User)
  .state({ is_active: true })
  .state({ role: 'admin' })
  .create();
```

## 工廠序列 (Factory Sequences)

有時您希望為每個生成的模型交替變更某個屬性的值。例如，您希望交替建立管理員和普通使用者：

```typescript
const users = await Factory.model(User)
  .count(10)
  .sequence('role', (index) => (index % 2 === 0 ? 'admin' : 'user'))
  .create();
```

這將建立 10 個使用者，角色分別為：admin, user, admin, user...

## 工廠關聯 (Factory Relationships)

雖然 Atlas 工廠尚未內建自動關聯方法 (如 `has` 或 `for`)，但您可以輕鬆地手動建立關聯數據。

### 建立關聯模型

```typescript
// 1. 建立父模型
const user = (await Factory.model(User).create())[0];

// 2. 建立屬於該父模型的子模型
await Factory.model(Post)
  .count(3)
  .state({ user_id: user.id }) // 設定外鍵
  .create();
```

這是在 Seeder 中填充關聯數據的推薦方式。

---

**最後更新**: 2026-02-23
