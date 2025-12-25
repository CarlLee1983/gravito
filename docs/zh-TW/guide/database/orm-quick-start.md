# Atlas ORM 快速上手

Atlas ORM 是一個基於 ActiveRecord 模式的物件關聯對映系統，它讓資料庫互動變得直觀且優雅。每個資料庫表都有一個對應的「模型 (Model)」，用於與該表進行互動。

## 定義模型 (Defining Models)

所有模型都繼承自 `Model` 類別。您可以使用裝飾器 (Decorators) 來定義欄位與關聯。

```typescript
import { Model, column } from '@gravito/atlas';

export class User extends Model {
  // 對應的資料表 (預設為類別名稱的複數蛇形命名，例如 users)
  static table = 'users';

  // 主鍵 (預設為 id)
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare name: string;

  @column()
  declare email: string;
}
```

### 模型慣例 (Model Conventions)

Atlas 遵循「慣例優於配置」的原則：

*   **資料表名稱**：預設情況下，模型會對應到類別名稱的「蛇形複數」形式 (Snake Case Plural)。例如 `BlogPost` 對應 `blog_posts`。您可透過 `static table` 屬性覆寫。
*   **主鍵**：預設假設每個資料表都有一個名為 `id` 的主鍵。您可定義 `static primaryKey` 來修改。
*   **時間戳記**：預設會自動管理 `created_at` 與 `updated_at`。若不需此功能，設為 `static timestamps = false`。
*   **資料庫連線**：預設使用 `default` 連線。若需指定，請設定 `static connection`。

```typescript
class Flight extends Model {
  // 指定資料表
  static table = 'my_flights';
  
  // 指定主鍵
  static primaryKey = 'flight_id';
  
  // 指定連線
  static connection = 'mysql';

  // 關閉時間戳記
  static timestamps = false;
}
```

### 預設屬性值

您可以在模型類別中直接定義屬性的預設值，或者使用 `@column` 的 `autoCreate` 選項。

```typescript
class Post extends Model {
  @column()
  declare status: string = 'draft'; // 預設值

  @column({ autoCreate: true })
  declare publishedAt: Date; // 建立時自動設為當前時間
}
```

## 檢索模型 (Retrieving Models)

建立好模型後，即可開始從資料庫檢索資料。您可以將模型視為強大的查詢建構器。

### 獲取所有模型

`all` 方法會回傳該資料表的所有記錄：

```typescript
const flights = await Flight.all();

for (const flight of flights) {
  console.log(flight.name);
}
```

### 建立查詢

您可以使用 `where`、`orderBy`、`limit` 等方法來建構查詢：

```typescript
const flights = await Flight.where('active', 1)
  .orderBy('name', 'desc')
  .limit(10)
  .get();
```

> **注意**：Atlas 的查詢方法 (如 `where`) 會回傳一個查詢建構器實例，直到呼叫 `get()` 或 `first()` 才會執行 SQL。

### 檢索單一模型

使用 `find` 透過主鍵查找，或 `first` 獲取查詢的第一筆結果：

```typescript
// 透過主鍵檢索
const flight = await Flight.find(1);

// 透過條件檢索第一筆
const flight = await Flight.where('number', 'FR 900').first();
```

### 找不到時拋出異常 (Not Found Exceptions)

若希望在找不到模型時拋出異常 (通常用於 HTTP 404 回應)，可使用 `findOrFail`：

```typescript
try {
  const flight = await Flight.findOrFail(1);
} catch (e) {
  // 拋出 ModelNotFoundError
}
```

### 游標與分塊 (Cursors & Chunking)

處理大量數據時，使用 `all()` 可能會耗盡記憶體。Atlas 提供了 `cursor()` 與 `lazyAll()` 方法來流式處理數據：

```typescript
// 使用非同步迭代器，一次處理一個分塊 (預設 1000 筆)
for await (const users of User.cursor()) {
  for (const user of users) {
    await user.process();
  }
}
```

## 新增與更新 (Inserts & Updates)

### 新增模型

要建立新記錄，請實例化模型，設定屬性，然後呼叫 `save`：

```typescript
const flight = new Flight();
flight.name = 'Taipei to Tokyo';
flight.number = 'JL 999';

await flight.save();
```

或者使用 `create` 方法一行完成：

```typescript
const flight = await Flight.create({
  name: 'Taipei to Tokyo',
  number: 'JL 999'
});
```

注意：`Model.create()` 是非同步且會立即寫入資料庫。若只需要記憶體中的實例，請使用 `Model.make()`，再自行呼叫 `save()`。

### 更新模型

獲取模型後，修改屬性並再次呼叫 `save`：

```typescript
const flight = await Flight.find(1);

if (flight) {
  flight.name = 'Updated Name';
  await flight.save();
}
```

### 批量更新 (Mass Updates)

針對符合條件的多筆資料進行更新。注意：**批量更新不會觸發模型事件 (Events)**。

```typescript
await Flight.where('active', 1)
  .where('destination', 'San Diego')
  .update({ delayed: true });
```

## 刪除模型 (Deleting Models)

### 刪除單一模型

可以在實例上呼叫 `delete`：

```typescript
const flight = await Flight.find(1);
await flight.delete();
```

### 透過查詢刪除

```typescript
await Flight.where('active', 0).delete();
```

### 軟刪除 (Soft Deletes)

除了物理刪除，Atlas 也支援「軟刪除」。軟刪除的模型不會從資料庫移除，而是設定 `deleted_at` 屬性。

啟用軟刪除需使用 `@SoftDeletes` 裝飾器：

```typescript
import { Model, SoftDeletes } from '@gravito/atlas';

@SoftDeletes()
class Flight extends Model {
  // ...
}
```

現在當您呼叫 `delete` 時，`deleted_at` 欄位會被設為當前時間。查詢時，已軟刪除的模型會自動被排除。

#### 強制查詢已刪除模型

*(目前版本尚未實作 `withTrashed`，您可以手動查詢 `deleted_at`)*

#### 恢復被刪除的模型

```typescript
if (flight.trashed()) {
  await flight.restore();
}
```

#### 永久刪除

```typescript
await flight.forceDelete();
```

## 查詢作用域 (Scopes)

作用域允許您將常用的查詢邏輯封裝在模型中。

### 本地作用域 (Local Scopes)

在模型中定義以 `scope` 開頭的方法：

```typescript
class User extends Model {
  // 定義 scope
  scopePopular(query) {
    return query.where('votes', '>', 100);
  }

  scopeActive(query) {
    return query.where('active', true);
  }
}

// 使用 scope (呼叫時省略 scope 前綴，首字母小寫)
const popularUsers = await User.query().popular().active().get();
```

## 模型事件 (Events)

Atlas 模型會觸發多種生命週期事件：`creating`, `created`, `updating`, `updated`, `saving`, `saved`, `deleting`, `deleted`。

您可以定義 `on[Event]` 方法來監聽：

```typescript
class User extends Model {
  async onCreating() {
    if (!this.uuid) {
      this.uuid = crypto.randomUUID();
    }
  }
}
```
