# 部落格應用示例 - SafeQueryBuilder 最佳實踐

此示例應用展示如何使用 `@gravito/atlas` 的 `SafeQueryBuilder` 建立安全、高效的資料庫應用。

## 📋 概覽

一個簡單但完整的部落格系統，包括：
- **使用者管理** - 建立、搜尋、停用帳戶
- **文章發佈** - CRUD 操作、狀態管理
- **留言系統** - 建立、審核、刪除留言
- **標籤分類** - 文章分類與搜尋

## 🎯 核心模式展示

### 1. 安全的參數綁定

**❌ 不安全的方式**：
```typescript
const email = req.body.email
const user = await db.raw(`SELECT * FROM users WHERE email = '${email}'`)
// 易受 SQL Injection 攻擊
```

**✅ 安全的方式**：
```typescript
const email = req.body.email
const user = await db.sql`SELECT * FROM users WHERE email = ${email}`.first()
// 參數自動綁定，無 SQL Injection 風險
```

### 2. 動態查詢構造

**複雜的搜尋條件**：
```typescript
async searchPosts(filters: PostSearchFilters): Promise<Post[]> {
  let query = this.connection.table('posts').select('*')

  // 文本搜尋
  if (filters.query) {
    const searchTerm = `%${filters.query}%`
    query = query.where((q) => {
      q.where('title', 'like', searchTerm)
        .orWhere('content', 'like', searchTerm)
    })
  }

  // 其他篩選條件...
  if (filters.status) {
    query = query.where('status', filters.status)
  }

  return await query.orderBy('createdAt', 'desc').get()
}
```

### 3. 進階 SQL 查詢

**聚合查詢與 JOIN**：
```typescript
const stats = await this.connection.sql<any>`
  SELECT
    CASE WHEN isActive = true THEN 'active' ELSE 'inactive' END as status,
    COUNT(DISTINCT u.id) as userCount,
    COUNT(DISTINCT p.id) as totalPosts
  FROM users u
  LEFT JOIN posts p ON p.authorId = u.id
  GROUP BY isActive
`.all()
```

### 4. 事務處理

**原子操作**：
```typescript
await this.connection.transaction(async (trx) => {
  // 建立使用者
  const userResult = await trx.sql`
    INSERT INTO users (name, email, password, ...)
    VALUES (${name}, ${email}, ${password}, ...)
  `.execute()

  const userId = userResult.insertId!

  // 建立初始文章
  await trx.sql`
    INSERT INTO posts (title, slug, content, authorId, ...)
    VALUES (${title}, ${slug}, ${content}, ${userId}, ...)
  `.execute()
})
```

### 5. 安全的動態欄位選擇

**使用 identifier() 驗證欄位名稱**：
```typescript
import { identifier } from '@gravito/atlas'

// 允許的欄位
const allowedFields = ['id', 'title', 'excerpt', 'status']
const selectedFields = allowedFields
  .map((f) => identifier(f))
  .join(', ')

const posts = await this.connection.sql<any>`
  SELECT ${selectedFields}
  FROM posts
  WHERE status = 'published'
`.all()
```

## 📁 檔案結構

```
examples/blog-app/
├── src/
│   ├── models/
│   │   ├── User.ts          # 使用者模型
│   │   ├── Post.ts          # 文章模型
│   │   ├── Comment.ts       # 留言模型
│   │   └── Tag.ts           # 標籤模型
│   └── repositories/
│       ├── UserRepository.ts        # 使用者 Repository
│       ├── PostRepository.ts        # 文章 Repository
│       └── CommentRepository.ts     # 留言 Repository
├── tests/
│   ├── repositories/
│   │   └── UserRepository.test.ts
│   └── api/
│       └── endpoints.test.ts
└── README.md                # 此檔案
```

## 🔐 安全最佳實踐

### 1. 始終使用參數綁定

```typescript
// ✅ 好的做法
const user = await db.sql`SELECT * FROM users WHERE id = ${userId}`.first()

// ❌ 避免
const user = await db.raw(`SELECT * FROM users WHERE id = ${userId}`)
```

### 2. 使用 identifier() 驗證識別符

```typescript
import { identifier } from '@gravito/atlas'

// ✅ 安全 - 識別符被驗證
const table = identifier('users')
const column = identifier('email')

// ❌ 不安全 - 無驗證
const query = `SELECT * FROM ${table} WHERE ${column} = ?`
```

### 3. 驗證排序方向

```typescript
// ✅ 使用白名單
const sortMap = {
  'recent': ['createdAt', 'desc'],
  'popular': ['viewCount', 'desc'],
}
const [column, direction] = sortMap[userSort] || ['createdAt', 'desc']

// ❌ 避免直接使用使用者輸入
const direction = req.query.direction // "DESC" 可能來自惡意使用者
```

### 4. 限制查詢結果

```typescript
// ✅ 限制最大結果數
const limit = Math.min(filters.limit || 20, 100)

// ❌ 允許任意大的結果
const limit = filters.limit || 1000000
```

### 5. 驗證所有權

```typescript
// ✅ 確保使用者只能編輯自己的文章
async publishPost(postId: number, userId: number) {
  const post = await this.connection.sql`
    SELECT authorId FROM posts WHERE id = ${postId}
  `.first()

  if (post.authorId !== userId) {
    throw new Error('Unauthorized')
  }

  // 執行操作...
}
```

## 🧪 測試模式

### 單元測試 - Repository 層

```typescript
import { describe, it, expect, beforeEach } from 'bun:test'
import { UserRepository } from '../src/repositories/UserRepository'
import { DB } from '@gravito/atlas'

describe('UserRepository', () => {
  let repository: UserRepository

  beforeEach(() => {
    repository = new UserRepository(DB.connection())
  })

  it('should find user by email safely', async () => {
    const user = await repository.findByEmail('test@example.com')
    expect(user).toBeDefined()
  })

  it('should prevent SQL injection in search', async () => {
    const results = await repository.searchUsers({
      query: "'; DROP TABLE users; --",
    })
    // 應該返回空結果，不會執行 DROP TABLE
    expect(results.length).toBe(0)
  })
})
```

### SQL Injection 測試

```typescript
it('should prevent SQL injection with union-based attack', async () => {
  const maliciousQuery = "' UNION SELECT password FROM users WHERE '1'='1"
  const results = await repository.searchUsers({ query: maliciousQuery })

  // 攻擊應被防止，查詢返回安全結果
  expect(results).toBeTruthy()
})
```

## 📊 常見查詢模式

### 分頁查詢

```typescript
const page = Math.max(filters.page || 1, 1)
const limit = Math.min(filters.limit || 20, 100)
const offset = (page - 1) * limit

const items = await db.sql`
  SELECT * FROM items
  LIMIT ${limit} OFFSET ${offset}
`.all()
```

### 搜尋與篩選

```typescript
const items = await db.sql`
  SELECT * FROM items
  WHERE 1=1
    ${name ? `AND name LIKE ${`%${name}%`}` : ''}
    ${status ? `AND status = ${status}` : ''}
  ORDER BY createdAt DESC
`.all()
```

### 計數查詢

```typescript
const result = await db.sql<{ count: number }>`
  SELECT COUNT(*) as count FROM items
  WHERE status = ${status}
`.first()

const total = result?.count || 0
```

### 批量操作

```typescript
// 批量更新
const result = await db.sql`
  UPDATE posts
  SET status = ${newStatus}
  WHERE id IN (${postIds.join(',')})
    AND authorId = ${userId}
`.execute()

// 批量刪除
await db.sql`
  DELETE FROM comments
  WHERE postId = ${postId}
`.execute()
```

## 🚀 快速開始

### 1. 設定資料庫

```typescript
import { DB } from '@gravito/atlas'

DB.addConnection('default', {
  driver: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'blog_app',
  username: 'postgres',
  password: 'password'
})
```

### 2. 使用 Repository

```typescript
import { UserRepository } from './repositories/UserRepository'

const userRepo = new UserRepository()

// 搜尋使用者
const results = await userRepo.searchUsersWithSQL({
  query: 'john',
  isActive: true,
  page: 1,
  limit: 20
})
```

### 3. 事務處理

```typescript
import { PostRepository } from './repositories/PostRepository'

const postRepo = new PostRepository()

// 在事務中建立使用者與文章
const { userId, postId } = await userRepo.createUserWithFirstPost(
  { name: 'John', email: 'john@example.com', password: 'hashed' },
  { title: 'First Post', content: 'Content...' }
)
```

## 📚 進階主題

### 批量插入的效能最佳化

```typescript
const values = users.map(u =>
  `(${u.name}, ${u.email}, ${u.password})`
).join(',')

await db.raw(`
  INSERT INTO users (name, email, password)
  VALUES ${values}
`)
```

### 子查詢與 CTE

```typescript
const recentUsers = await db.sql`
  SELECT * FROM users
  WHERE id IN (
    SELECT DISTINCT authorId FROM posts
    WHERE createdAt > ${sevenDaysAgo}
  )
`.all()
```

### 窗口函數

```typescript
const ranked = await db.sql`
  SELECT
    *,
    ROW_NUMBER() OVER (PARTITION BY authorId ORDER BY createdAt DESC) as rn
  FROM posts
  WHERE rn <= 3
`.all()
```

## 🔗 相關文件

- [SafeQueryBuilder 完整文檔](../docs/safe-queries.md)
- [ESLint 規則文檔](../docs/eslint-rules.md)
- [CONTRIBUTING.md - 安全最佳實踐](../CONTRIBUTING.md#security-best-practices)

## 📝 授權

MIT

---

**提示**：此示例應用的程式碼可直接複製到你的專案中。
