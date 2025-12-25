# 查詢建構器 (Query Builder)

Atlas 提供了一個流暢、與驅動程式無關的查詢建構器，讓您能輕鬆構建複雜的資料庫查詢。它透過統一的介面同時支援 SQL (PostgreSQL, MySQL, SQLite) 與 NoSQL (MongoDB)。

## 獲取結果

### `get()`
`get` 方法會返回一個結果陣列。當用於模型時，它返回模型實例陣列。
```typescript
const users = await User
  .where('active', true)
  .get();
```

### `first()`
如果您只需要單一資料列，請使用 `first`。
```typescript
const user = await User
  .where('email', 'alice@example.com')
  .first();
```

### `pluck()`
如果您想獲取包含單一欄位值的陣列：
```typescript
const titles = await Post.pluck('title'); // ['Hello World', 'Atlas Guide', ...]
```

### `count()` / `max()` / `min()` / `avg()` / `sum()`
```typescript
const count = await User.count();
const maxPrice = await Product.max('price');
```

## Select 子句

### `select()`
指定要獲取的欄位：
```typescript
const users = await User
  .select('name', 'email as user_email')
  .get();
```

### `distinct()`
```typescript
const roles = await User.distinct().pluck('role');
```

## 關聯查詢 (Joins - 僅限 SQL 驅動)

Atlas 支援 SQL 資料庫的各種連接類型。

### 內連接 (Inner Join)
```typescript
const users = await User.query()
  .join('contacts', 'users.id', '=', 'contacts.user_id')
  .select('users.*', 'contacts.phone')
  .get();
```

### 左/右連接 (Left / Right Join)
```typescript
const users = await User
  .leftJoin('posts', 'users.id', '=', 'posts.author_id')
  .get();
```

## 進階 Where 子句

### 基礎查詢
```typescript
// 隱含 '='
const users = await User.where('votes', 100).get();

// 顯式運算子
const users = await User.where('votes', '>=', 100).get();
```

### 邏輯分組 (Or 語句)
```typescript
const users = await User
  .where('votes', '>', 100)
  .orWhere('name', 'John')
  .get();
```

### JSON 查詢子句
如果您的資料庫支援 JSON (PostgreSQL, MySQL, MongoDB)，您可以查詢巢狀屬性：
```typescript
const users = await User.where('options.language', 'en').get();
```

### `whereIn` / `whereNull` / `whereBetween`
```typescript
const users = await User.whereIn('id', [1, 2, 3]).get();
const pending = await Task.whereNull('completed_at').get();
const range = await User
  .whereBetween('votes', [1, 100])
  .get();
```

## 排序、分組、限制與偏移

### `orderBy()`
```typescript
const users = await User
  .orderBy('name', 'desc')
  .get();
```

### `latest()` / `oldest()`
`orderBy('created_at', 'desc')` 的便捷方法：
```typescript
const user = await User.latest().first();
```

### `groupBy()` / `having()`
```typescript
const stats = await User
  .groupBy('account_id')
  .having('count', '>', 5)
  .get();
```

### `skip()` / `take()`
```typescript
const users = await User
  .skip(10)
  .take(5)
  .get();
```

## 聚合函數 (Aggregates)

查詢建構器還提供了一系列獲取聚合值的方法：

```typescript
const count = await User.where('active', true).count();
const price = await DB.table('orders').max('price');
const average = await DB.table('users').avg('age');
```

## 原始表達式 (Raw Expressions)

有時您可能需要在查詢中使用原始表達式。這些表達式將作為字串直接注入查詢中，因此請務必小心，避免造成 SQL 注入漏洞：

```typescript
const users = await User
    .select(DB.raw('count(*) as user_count, status'))
    .where('status', '<>', 1)
    .groupBy('status')
    .get();
```

## 分塊結果 (Chunking Results)

如果您需要處理數千條資料庫記錄，請考慮使用 `chunk` 方法。該方法一次檢索一小塊結果，並將每個區塊傳入閉包 (closure) 進行處理：

```typescript
await User.query().chunk(100, async (users) => {
    for (const user of users) {
        // 處理使用者...
    }
});
```

您可以從閉包中返回 `false` 來停止後續區塊的處理：

```typescript
await User.query().chunk(100, async (users) => {
  // 處理記錄...
  return false; // 停止處理
});
```

## 寫入、更新與刪除

### `insert()`
```typescript
await DB.table('users').insert([
  { email: 'kayla@example.com', votes: 0 },
  { email: 'taylor@example.com', votes: 0 }
]);
```

### `update()`
```typescript
await User.where('id', 1).update({ votes: 1 });
```

### `increment` 與 `decrement`
```typescript
await User.where('id', 1).increment('votes');
await User.where('id', 1).decrement('votes', 5);
```

### `delete()`
```typescript
await User.where('votes', '<', 50).delete();
```
