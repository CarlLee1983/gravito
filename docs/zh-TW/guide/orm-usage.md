---
title: ORM 使用指南
---

# ORM 使用指南

> 完整的 Atlas ORM 使用說明，涵蓋所有功能和使用場景。

## 目錄

1. [基本設定](#基本設定)
2. [定義 Schema 和 Relations](#定義-schema-和-relations)
3. [使用 Model 類別（優雅方式）](#使用-model-類別優雅方式)
4. [CRUD 操作](#crud-操作)
5. [關聯查詢](#關聯查詢)
6. [事務操作](#事務操作)
7. [批量操作](#批量操作)
8. [遷移和 Seeder](#遷移和-seeder)
9. [部署](#部署)
10. [最佳實踐](#最佳實踐)

## 基本設定

### 1. 安裝依賴

```bash
bun add @gravito/atlas drizzle-orm postgres
```

### 2. 初始化資料庫連接

```typescript
import { PlanetCore } from 'gravito-core';
import orbitDB from '@gravito/atlas';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const core = new PlanetCore();
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

// 註冊 Atlas 模組
orbitDB(core, {
  db,
  databaseType: 'postgresql', // 明確指定 PostgreSQL 以獲得最佳效能
  exposeAs: 'db',
  enableQueryLogging: true,   // 開發環境可啟用查詢日誌
  queryLogLevel: 'debug'
});
```

### 3. 在路由中使用

```typescript
core.app.get('/users', async (c) => {
  const db = c.get('db'); // DBService 實例
  const users = await db.findAll(users);
  return c.json({ users });
});
```

## 定義 Schema 和 Relations

### 定義表結構

```typescript
import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

// 使用者表
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 文章表
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 評論表
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => posts.id),
  userId: integer('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 定義 Relations

```typescript
import { relations } from 'drizzle-orm';

// 使用者的關聯
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),        // 一個使用者有多篇文章
  comments: many(comments),  // 一個使用者有多個評論
}));

// 文章的關聯
export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {        // 一篇文章屬於一個使用者
    fields: [posts.userId],
    references: [users.id],
  }),
  comments: many(comments), // 一篇文章有多個評論
}));

// 評論的關聯
export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));
```

### 建立 Drizzle 實例（包含 Relations）

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL);

// 包含 schema 和 relations
const db = drizzle(client, {
  schema: {
    users,
    posts,
    comments,
    usersRelations,
    postsRelations,
    commentsRelations,
  },
});

// 然後註冊到 Atlas
orbitDB(core, { db, databaseType: 'postgresql' });
```

## 使用 Model 類別（優雅方式）

> **參考 Laravel Eloquent 設計**：提供優雅的 Model API，但底層仍使用 Drizzle 查詢建構器，保持最佳效能。

### 定義 Model

```typescript
import { Model } from '@gravito/atlas';
import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

// 定義表（仍使用 Drizzle，保持效能）
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 定義 User Model（類似 Laravel Eloquent）
export class User extends Model {
  // 設定表資訊
  static table = usersTable;
  static tableName = 'users';
  static primaryKey = 'id'; // 可選，預設為 'id'

  // 型別定義
  declare attributes: {
    id?: number;
    name: string;
    email: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
}
```

### 自動註冊 Model

當 `Atlas` 初始化時，會自動初始化所有已註冊的 Model：

```typescript
import { ModelRegistry } from '@gravito/atlas';

// 註冊 Model（在應用啟動時）
ModelRegistry.register(User, usersTable, 'users');
ModelRegistry.register(Post, postsTable, 'posts');

// Atlas 會在 db:connected hook 時自動初始化所有 Model
orbitDB(core, { db, databaseType: 'postgresql' });
```

### 使用 Model（類似 Laravel）

```typescript
// 查詢單筆記錄
const user = await User.find(1);

// 根據條件查詢
const user = await User.where('email', 'john@example.com');

// 使用多個條件查詢
const user = await User.whereMany({
  email: 'john@example.com',
  name: 'John'
});

// 查詢所有記錄
const users = await User.all();

// 帶條件的查詢
const users = await User.findAll({ name: 'John' });

// 分頁查詢
const result = await User.paginate({ page: 1, limit: 10 });
// result.data: User[]
// result.pagination: { page, limit, total, totalPages, hasNext, hasPrev }

// 計數
const count = await User.count();
const count = await User.count({ name: 'John' });

// 檢查是否存在
const exists = await User.exists({ email: 'john@example.com' });

// 建立記錄
const user = await User.create({
  name: 'John',
  email: 'john@example.com'
});

// 注意：create() 會立即寫入資料庫。若只需要記憶體中的實例，請使用 make()。
const draft = User.make({ name: 'Draft User' });

// 使用實例方法
const user = new User();
user.set('name', 'John');
user.set('email', 'john@example.com');
await user.save(); // 自動判斷是建立還是更新

// 更新記錄
const user = await User.find(1);
user.set('name', 'Updated Name');
await user.save();

// 或使用 update 方法
await user.update({ name: 'Updated Name' });

// 刪除記錄
await user.delete();

// 轉換為 JSON
const json = user.toJSON();
```

### 定義關聯（Relations）

類似 Laravel Eloquent，可以在 Model 中定義關聯：

```typescript
import { Model } from '@gravito/atlas';

export class User extends Model {
  static table = usersTable;
  static tableName = 'users';
  declare attributes: {
    id?: number;
    name: string;
    email: string;
  };
}

export class Post extends Model {
  static table = postsTable;
  static tableName = 'posts';
  declare attributes: {
    id?: number;
    userId?: number;
    title: string;
    content?: string;
  };
}

// 定義關聯
User.hasMany(Post, 'userId', 'id');        // 一個使用者有多篇文章
Post.belongsTo(User, 'userId', 'id');      // 一篇文章屬於一個使用者

// 使用關聯（懶加載）
const user = await User.find(1);
const posts = await user.getRelation('posts');

// 或使用預加載（推薦，避免 N+1 問題）
await user.load('posts');
const posts = await user.getRelation('posts');
```

支援的關聯類型：
- `hasMany()` - 一對多
- `belongsTo()` - 多對一
- `hasOne()` - 一對一
- `belongsToMany()` - 多對多（需要中間表）
- `morphTo()` - 多態多對一（例如：Comment belongs to Post or Video）
- `morphMany()` - 一對多多態（例如：Post has many Comments）
- `morphOne()` - 一對一多態（例如：Post has one Image）

### 多態關聯（Polymorphic Relations）

多態關聯允許一個模型屬於多個其他模型。例如，一個 Comment 可以屬於 Post 或 Video。

#### morphTo - 多態多對一

```typescript
export class Comment extends Model {
  static table = commentsTable;
  static tableName = 'comments';
  declare attributes: {
    id?: number;
    commentableType?: string;  // 'Post' 或 'Video'
    commentableId?: number;     // Post 或 Video 的 ID
    content: string;
  };
}

export class Post extends Model {
  static table = postsTable;
  static tableName = 'posts';
  declare attributes: {
    id?: number;
    title: string;
  };
}

export class Video extends Model {
  static table = videosTable;
  static tableName = 'videos';
  declare attributes: {
    id?: number;
    title: string;
  };
}

// 定義多態關聯
Comment.morphTo('commentable', 'commentable_type', 'commentable_id');

// 使用 morphMap 對應類型名稱到模型類別（可選）
const morphMap = new Map();
morphMap.set('Post', Post);
morphMap.set('Video', Video);
Comment.morphTo('commentable', 'commentable_type', 'commentable_id', morphMap);

// 使用
const comment = await Comment.find(1);
const commentable = await comment.getRelation('commentable'); // 根據 commentable_type 返回 Post 或 Video
```

#### morphMany - 一對多多態

```typescript
// Post 有多個 Comments
Post.morphMany(Comment, 'comments', 'commentable_type', 'commentable_id');

// 使用
const post = await Post.find(1);
const comments = await post.getRelation('comments'); // ModelCollection<Comment>
```

#### morphOne - 一對一多態

```typescript
// Post 有一個 Image
Post.morphOne(Image, 'image', 'imageable_type', 'imageable_id');

// 使用
const post = await Post.find(1);
const image = await post.getRelation('image'); // Image | null
```

### 查詢建構器（Query Builder）

使用鏈式查詢建構器可以更靈活地建構複雜查詢：

```typescript
// 開始查詢建構器
const users = await User.query()
  .where('status', 'active')
  .whereIn('role', ['admin', 'user'])
  .whereNotNull('email')
  .orderBy('created_at', 'desc')
  .limit(10)
  .get(); // ModelCollection<User>

// 獲取第一筆記錄
const user = await User.query()
  .where('email', 'john@example.com')
  .first(); // User | null

// 複雜條件
const posts = await Post.query()
  .where('published', true)
  .whereBetween('created_at', startDate, endDate)
  .whereLike('title', '%tutorial%')
  .orderByDesc('views')
  .limit(20)
  .get();

// 分頁
const result = await User.query()
  .where('active', true)
  .paginate(1, 20); // { data: ModelCollection<User>, pagination: {...} }

// 計數和存在檢查
const count = await User.query()
  .where('status', 'active')
  .count();

const exists = await User.query()
  .where('email', 'john@example.com')
  .exists();
```

**查詢建構器方法：**
- `where(column, value)` / `where(whereObject)` - WHERE 條件
- `whereIn(column, values)` - WHERE IN
- `whereNotIn(column, values)` - WHERE NOT IN
- `whereNull(column)` - WHERE IS NULL
- `whereNotNull(column)` - WHERE IS NOT NULL
- `whereBetween(column, min, max)` - WHERE BETWEEN
- `whereLike(column, pattern)` - WHERE LIKE
- `orderBy(column, direction)` - 排序
- `orderByDesc(column)` - 降序排序
- `limit(count)` - 限制結果數量
- `offset(count)` - 跳過記錄數
- `groupBy(...columns)` - 分組
- `first()` - 獲取第一筆記錄
- `get()` - 獲取所有記錄
- `count()` - 計數
- `exists()` - 檢查是否存在
- `paginate(page, limit)` - 分頁

### 軟刪除（Soft Deletes）

啟用軟刪除後，刪除操作不會真正刪除記錄，而是標記 `deleted_at` 欄位：

```typescript
export class User extends Model {
  static table = usersTable;
  static tableName = 'users';
  static usesSoftDeletes = true;
  static deletedAtColumn = 'deleted_at';
  declare attributes: {
    id?: number;
    name: string;
    deletedAt?: Date | null;
  };
}

// 使用
const user = await User.find(1);
await user.delete(); // 軟刪除，設定 deleted_at

// 檢查是否被軟刪除
if (user.trashed()) {
  // 恢復
  await user.restore();
}

// 強制刪除（真正刪除）
await user.forceDelete();

// 查詢包括軟刪除的記錄
const allUsers = await User.withTrashed().get();

// 只查詢軟刪除的記錄
const deletedUsers = await User.onlyTrashed().get();
```

### 填充保護（Fillable/Guarded）

控制哪些屬性可以批量賦值：

```typescript
export class User extends Model {
  static table = usersTable;
  static tableName = 'users';

  // 白名單模式：只允許這些欄位
  static fillable = ['name', 'email'];

  // 或黑名單模式：排除這些欄位
  // static guarded = ['id', 'created_at', 'updated_at'];

  declare attributes: {
    id?: number;
    name: string;
    email: string;
    isAdmin?: boolean;
  };
}

// 只有 fillable 中的欄位會被保存
const user = await User.create({
  name: 'John',
  email: 'john@example.com',
  isAdmin: true // 這個欄位會被忽略（如果不在 fillable 中）
});
```

### 自動時間戳記（Timestamps）

自動管理 `created_at` 和 `updated_at`：

```typescript
export class User extends Model {
  static table = usersTable;
  static tableName = 'users';
  static timestamps = true; // 預設為 true
  static createdAtColumn = 'created_at'; // 預設
  static updatedAtColumn = 'updated_at'; // 預設

  declare attributes: {
    id?: number;
    name: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
}

// 建立時自動設定 created_at 和 updated_at
const user = await User.create({ name: 'John' });

// 更新時自動更新 updated_at
await user.update({ name: 'Jane' });
```

### 查詢作用域（Scopes）

定義可重用的查詢約束：

```typescript
export class User extends Model {
  static table = usersTable;
  static tableName = 'users';

  // 定義本地作用域
  static addScope('active', (query) => {
    return { ...query, status: 'active' };
  });

  static addScope('recent', (query) => {
    return { ...query, created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
  });

  // 定義全域作用域（自動應用到所有查詢）
  static addGlobalScope((query) => {
    // 例如：自動過濾已刪除的記錄
    return { ...query, deleted_at: null };
  });
}

// 使用本地作用域（需要通過查詢建構器）
const activeUsers = await User.query()
  .where('status', 'active')
  .get();

// 不使用全域作用域
const allUsers = await User.withoutGlobalScopes().get();
```

### 模型事件（Events）

監聽模型生命週期事件：

```typescript
// 在應用啟動時註冊事件監聽器
core.hooks.addAction('model:creating', async ({ model, attributes }) => {
  console.log('Creating model:', model.constructor.name);
});

core.hooks.addAction('model:created', async ({ model }) => {
  console.log('Model created:', model.getKey());
});

core.hooks.addAction('model:updating', async ({ model, attributes }) => {
  console.log('Updating model:', model.getKey());
});

core.hooks.addAction('model:updated', async ({ model }) => {
  console.log('Model updated:', model.getKey());
});

core.hooks.addAction('model:saving', async ({ model, wasRecentlyCreated }) => {
  console.log('Saving model:', model.getKey());
});

core.hooks.addAction('model:saved', async ({ model, wasRecentlyCreated }) => {
  console.log('Model saved:', model.getKey());
});

core.hooks.addAction('model:deleting', async ({ model }) => {
  console.log('Deleting model:', model.getKey());
});

core.hooks.addAction('model:deleted', async ({ model, soft }) => {
  console.log('Model deleted:', model.getKey(), soft ? '(soft)' : '(hard)');
});
```

### 關聯計數（With Count）

預加載關聯的數量：

```typescript
// 為每個使用者載入其文章數量
const users = await User.withCount('posts');

users.forEach(user => {
  console.log(user.get('posts_count')); // 文章數量
});
```

### 批次處理（Chunk & Cursor）

高效處理大量資料：

```typescript
// 分批處理（每批 100 筆）
await User.chunk(100, async (users) => {
  for (const user of users) {
    // 處理每批資料
    await processUser(user);
  }
});

// 游標處理（逐筆處理）
await User.cursor(async (user) => {
  await processUser(user);
});
```

### 型別轉換（Casting）

類似 Laravel 的 `$casts`，可以定義屬性的型別轉換：

```typescript
export class User extends Model {
  static table = usersTable;
  static tableName = 'users';
  static casts = {
    age: 'number',           // 字串轉數字
    isActive: 'boolean',     // 字串轉布林值
    metadata: 'json',        // JSON 字串轉物件
    tags: 'array',          // 轉陣列
    createdAt: 'date',      // 轉 Date 物件
  };
  declare attributes: {
    id?: number;
    name: string;
    age?: string | number;
    isActive?: string | boolean;
    metadata?: string | object;
    tags?: string | string[];
    createdAt?: string | Date;
  };
}

// 使用
const user = await User.find(1);
console.log(typeof user.get('age'));        // 'number'
console.log(typeof user.get('isActive'));   // 'boolean'
console.log(user.get('metadata'));          // object (已解析 JSON)
```

支援的轉換類型：
- `'string'` - 轉字串
- `'number'` - 轉數字
- `'boolean'` - 轉布林值
- `'date'` - 轉 Date 物件
- `'json'` - JSON 字串轉物件
- `'array'` - 轉陣列
- 自訂函式 - `(value: unknown) => unknown`

### 存取器和修改器（Accessors & Mutators）

類似 Laravel，可以定義存取器和修改器：

```typescript
export class User extends Model {
  static table = usersTable;
  static tableName = 'users';
  declare attributes: {
    id?: number;
    firstName?: string;
    lastName?: string;
    email?: string;
  };

  // 存取器（Accessor）- 獲取時自動處理
  getFullNameAttribute(value: unknown): string {
    const attrs = this.attributes as any;
    return `${attrs.firstName || ''} ${attrs.lastName || ''}`.trim();
  }

  // 修改器（Mutator）- 設定時自動處理
  setEmailAttribute(value: unknown): string {
    return String(value).toLowerCase().trim();
  }
}

// 使用
const user = new User();
user.set('firstName', 'John');
user.set('lastName', 'Doe');
user.set('email', '  JOHN@EXAMPLE.COM  ');

console.log(user.get('fullName'));  // 'John Doe' (存取器自動處理)
console.log(user.attributes.email); // 'john@example.com' (修改器自動處理)
```

存取器命名規則：`get{AttributeName}Attribute`
修改器命名規則：`set{AttributeName}Attribute`

### Model vs DBService

Atlas 提供兩種使用方式，效能相同：

**方式 1：Model 類別（優雅，類似 Laravel）**
```typescript
const user = await User.find(1);
```

**方式 2：DBService（直接，效能優先）**
```typescript
const db = c.get('db');
const user = await db.findById(usersTable, 1);
```

兩種方式底層都使用相同的 Drizzle 查詢建構器，選擇適合您專案風格的方式即可。

## CRUD 操作

Atlas 提供兩種方式進行 CRUD 操作：

### 方式 1：使用 Model 類別（優雅）

```typescript
// 建立
const user = await User.create({ name: 'John', email: 'john@example.com' });

// 讀取
const user = await User.find(1);
const users = await User.all();

// 更新
const user = await User.find(1);
await user.update({ name: 'Updated' });

// 刪除
const user = await User.find(1);
await user.delete();
```

### 方式 2：使用 DBService（直接）

```typescript
// 建立單筆記錄
const newUser = await db.create(users, {
  name: 'John Doe',
  email: 'john@example.com',
});

// 插入單筆或多筆
const user = await db.insert(users, {
  name: 'Jane Doe',
  email: 'jane@example.com',
});

// 批量插入
const users = await db.insert(users, [
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
]);
```

### 讀取（Read）

```typescript
// 根據 ID 查詢
const user = await db.findById(users, 1);

// 查詢單筆記錄
const user = await db.findOne(users, { email: 'john@example.com' });

// 查詢所有記錄
const allUsers = await db.findAll(users);

// 帶條件查詢
const activeUsers = await db.findAll(users, { status: 'active' });

// 帶排序和限制
const recentUsers = await db.findAll(users, undefined, {
  orderBy: users.createdAt,
  orderDirection: 'desc',
  limit: 10,
});

// 計算記錄數
const totalUsers = await db.count(users);
const activeCount = await db.count(users, { status: 'active' });

// 檢查記錄是否存在
const exists = await db.exists(users, { email: 'john@example.com' });

// 分頁查詢
const result = await db.paginate(users, {
  page: 1,
  limit: 10,
  orderBy: users.createdAt,
  orderDirection: 'desc',
});

// result.data - 資料陣列
// result.pagination - 分頁資訊
```

### 更新（Update）

```typescript
// 更新記錄
const updatedUsers = await db.update(
  users,
  { id: 1 },
  { name: 'John Updated' }
);
```

### 刪除（Delete）

```typescript
// 刪除記錄
await db.delete(users, { id: 1 });
```

## 關聯查詢

### 基本關聯查詢

```typescript
// 查詢使用者及其所有文章
const user = await db.findByIdWith('users', 1, {
  posts: true,
});

// 查詢使用者及其文章和評論
const user = await db.findByIdWith('users', 1, {
  posts: true,
  comments: true,
});

// 巢狀關聯（載入文章及其評論）
const user = await db.findByIdWith('users', 1, {
  posts: {
    comments: true,  // 載入每篇文章的評論
  },
});

// 查詢單筆記錄並載入關聯
const user = await db.findOneWith(
  'users',
  { email: 'john@example.com' },
  { posts: true }
);

// 查詢所有記錄並載入關聯
const users = await db.findAllWith('users', { posts: true }, {
  where: { status: 'active' },
  limit: 10,
});
```

### 使用原始 Drizzle Query API

如果關聯查詢方法無法滿足需求，可以直接使用 Drizzle 的 query API：

```typescript
import { eq } from 'drizzle-orm';

// 使用 Drizzle 的 query API
const user = await db.raw.query.users.findFirst({
  where: eq(users.id, 1),
  with: {
    posts: {
      comments: {
        user: true,  // 載入評論的作者
      },
    },
  },
});
```

## 事務操作

### 基本事務

```typescript
const result = await db.transaction(async (tx) => {
  // 在事務中執行多個操作
  const user = await tx.insert(users).values({
    name: 'John',
    email: 'john@example.com',
  }).returning();

  const profile = await tx.insert(profiles).values({
    userId: user[0].id,
    bio: 'Bio text',
  }).returning();

  return { user: user[0], profile: profile[0] };
});
```

### 事務中的錯誤處理

```typescript
try {
  const result = await db.transaction(async (tx) => {
    // 如果任何操作失敗，整個事務會自動回滾
    await tx.insert(users).values({ name: 'John' });
    await tx.insert(posts).values({ userId: 1, title: 'Post' });
  });
} catch (error) {
  // 處理錯誤，事務已自動回滾
  console.error('Transaction failed:', error);
}
```

### 原子性與一致性（為何需要事務）

事務可以確保多筆操作要嘛全部成功、要嘛全部回滾，避免資料出現不一致。適用情境例如：

- 訂單建立 + 付款狀態更新
- 庫存扣減 + 訂單明細建立
- 使用者 + 個人資料建立

### 隔離性與併發（現代 RDBMS 實務）

降低死結與競爭風險的做法：

- **事務越短越好**，避免在事務內做外部呼叫（HTTP、寄信）。
- **固定寫入順序**（多表寫入時順序一致）以降低鎖衝突。
- 針對高併發資料可用**樂觀鎖**（例如 version 欄位）。
- 重要扣庫存或餘額更新，可使用**列級鎖**（如 `FOR UPDATE`），視驅動支援度而定。

### 針對暫時性錯誤的重試策略

高隔離層級在高併發下可能出現死結或序列化衝突，建議對關鍵事務加入重試與退避。

### 關聯式完整性與約束

用資料庫約束在底層把關資料正確性：

- **外鍵**與 `onDelete`/`onUpdate` 規則
- **唯一約束**（例如訂單編號）
- **檢查約束**（限制欄位範圍）

範例（Schema 層約束）：

```typescript
import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  orderNo: text('order_no').notNull().unique(),
});
```

## 批量操作

### 批量插入

```typescript
const newUsers = await db.bulkInsert(users, [
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
  { name: 'User 3', email: 'user3@example.com' },
]);
```

### 批量更新

```typescript
// 批量更新（在事務中執行）
const updatedUsers = await db.bulkUpdate(users, [
  { where: { id: 1 }, data: { name: 'User 1 Updated' } },
  { where: { id: 2 }, data: { name: 'User 2 Updated' } },
]);
```

### 批量刪除

```typescript
// 批量刪除（在事務中執行）
await db.bulkDelete(users, [
  { id: 1 },
  { id: 2 },
  { id: 3 },
]);
```

## Migration 與 Seeder

### 執行 Migration

Gravito CLI 包裝了 `drizzle-kit` 以提供一致的 migration 工作流程。

```bash
# 執行待處理的 migrations
gravito migrate

# 刪除所有資料表並重新執行 migrations (Fresh)
gravito migrate --fresh

# 檢查 migration 狀態
gravito migrate:status
```

### 執行 Seeder

```bash
# 執行所有 seeder
gravito db:seed

# 執行特定 seeder 類別
gravito db:seed --class UsersSeeder
```

在程式碼中：

```typescript
// 定義 seed 函式
```

## 部署

### 自動部署

```typescript
// 部署資料庫（執行遷移和 seed）
const result = await db.deploy({
  runMigrations: true,      // 執行遷移（預設: true）
  runSeeds: false,          // 執行 seed（預設: false）
  skipHealthCheck: false,   // 跳過健康檢查（預設: false）
  validateBeforeDeploy: true, // 部署前驗證（預設: true）
});

if (result.success) {
  console.log('部署成功');
  console.log('遷移:', result.migrations);
  console.log('健康檢查:', result.healthCheck);
} else {
  console.error('部署失敗:', result.error);
}
```

### 生產環境部署範例

```typescript
// 在應用啟動時執行部署
core.hooks.addAction('app:ready', async () => {
  const db = core.app.get('db');

  if (process.env.NODE_ENV === 'production') {
    const result = await db.deploy({
      runMigrations: true,
      runSeeds: false,  // 生產環境通常不執行 seed
      validateBeforeDeploy: true,
    });

    if (!result.success) {
      throw new Error(`Database deployment failed: ${result.error}`);
    }
  }
});
```

## 最佳實踐

### 1. 使用型別安全

```typescript
// 定義型別
type User = typeof users.$inferSelect;
type NewUser = typeof users.$inferInsert;

// 使用型別
const user: User = await db.findById(users, 1);
const newUser: NewUser = { name: 'John', email: 'john@example.com' };
```

### 2. 錯誤處理

```typescript
try {
  const user = await db.findById(users, 1);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  return c.json({ user });
} catch (error) {
  console.error('Database error:', error);
  return c.json({ error: 'Internal server error' }, 500);
}
```

### 3. 使用事務處理複雜操作

```typescript
// 複雜操作應該在事務中執行
const result = await db.transaction(async (tx) => {
  const user = await tx.insert(users).values({ name: 'John' }).returning();
  const profile = await tx.insert(profiles).values({ userId: user[0].id }).returning();
  const posts = await tx.insert(posts).values([
    { userId: user[0].id, title: 'Post 1' },
    { userId: user[0].id, title: 'Post 2' },
  ]).returning();

  return { user: user[0], profile: profile[0], posts };
});
```

### 4. 使用關聯查詢避免 N+1 問題

```typescript
//  不好的做法（N+1 問題）
const users = await db.findAll(users);
for (const user of users) {
  const posts = await db.findAll(posts, { userId: user.id }); // 每次查詢
}

//  好的做法（使用關聯查詢）
const users = await db.findAllWith('users', { posts: true }); // 一次查詢
```

### 5. 使用分頁處理大量資料

```typescript
// 避免一次載入所有資料
const result = await db.paginate(users, {
  page: 1,
  limit: 20,
  orderBy: users.createdAt,
  orderDirection: 'desc',
});
```

### 6. 使用健康檢查監控資料庫

```typescript
// 定期檢查資料庫健康狀態
setInterval(async () => {
  const health = await db.healthCheck();
  if (health.status !== 'healthy') {
    console.error('Database health check failed:', health.error);
  }
}, 60000); // 每分鐘檢查一次
```

### 7. 使用 Hooks 監控操作

```typescript
// 監控查詢效能
core.hooks.addAction('db:query', ({ query, duration, timestamp }) => {
  if (duration > 1000) {
    console.warn(`Slow query detected: ${query} (${duration}ms)`);
  }
});

// 監控事務
core.hooks.addAction('db:transaction:start', ({ transactionId }) => {
  console.log(`Transaction started: ${transactionId}`);
});

core.hooks.addAction('db:transaction:complete', ({ transactionId, duration }) => {
  console.log(`Transaction completed: ${transactionId} (${duration}ms)`);
});
```

### 8. 直接使用 Drizzle API（進階）

當輔助方法無法滿足需求時，可以直接使用 Drizzle 的完整 API：

```typescript
// 複雜查詢
const result = await db.raw
  .select({
    user: users,
    postCount: sql<number>`count(${posts.id})`,
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.userId))
  .groupBy(users.id)
  .having(sql`count(${posts.id}) > 0`);

// 使用 SQL 函式
import { sql, count } from 'drizzle-orm';

const result = await db.raw
  .select({
    total: count(),
    avgAge: sql<number>`avg(${users.age})`,
  })
  .from(users);
```

## 完整範例

```typescript
import { PlanetCore } from 'gravito-core';
import orbitDB from '@gravito/atlas';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

// 定義表
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
});

const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
});

// 定義關聯
const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

const postsRelations = relations(posts, ({ one }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
}));

// 初始化
const core = new PlanetCore();
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client, {
  schema: { users, posts, usersRelations, postsRelations },
});

orbitDB(core, {
  db,
  databaseType: 'postgresql',
  exposeAs: 'db',
});

// 使用範例
core.app.get('/users/:id', async (c) => {
  const db = c.get('db');
  const userId = parseInt(c.req.param('id'));

  // 使用關聯查詢
  const user = await db.findByIdWith('users', userId, {
    posts: true,
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user });
});

core.app.post('/users', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  // 建立使用者
  const user = await db.create(users, {
    name: body.name,
    email: body.email,
  });

  return c.json({ user }, 201);
});

core.liftoff();
```

## 總結

Atlas 提供了完整的 ORM 功能：

-  **完整的 CRUD 操作** - 所有基本資料庫操作
-  **關聯查詢** - 支援巢狀關聯查詢
-  **事務支援** - 完整的事務處理
-  **批量操作** - 高效的批量處理
-  **遷移和 Seeder** - 資料庫版本管理
-  **部署支援** - 自動化部署流程
-  **PostgreSQL 優化** - 針對 PostgreSQL 的效能優化

透過 `db.raw` 可以存取 Drizzle ORM 的完整功能，確保靈活性和擴展性。
