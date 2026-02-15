# Repository（倉儲）

## 1. 定義

Repository 是資料訪問的抽象，使領域層不依賴具體的資料庫技術。它應該表現得像一個「記憶體中的集合 (Collection)」。

## 2. 核心特徵

```typescript
// ✅ Repository 是領域層的 Contract（介面）
export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(user: User): Promise<User>
  update(user: User): Promise<User>
  delete(id: string): Promise<boolean>
}

// ✅ 實現在基礎設施層（隱藏資料庫細節）
export class DatabaseUserRepository implements UserRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    )
    return row ? this.toDomain(row) : null
  }

  async create(user: User): Promise<User> {
    const result = await this.db.query(
      'INSERT INTO users (id, email, ...) VALUES (?, ?, ...)',
      [user.id, user.email, ...]
    )
    return user
  }

  // 將資料庫記錄轉換為領域對象
  private toDomain(row: any): User {
    return {
      id: row.id,
      email: row.email,
      // ...
    }
  }
}
```

Repository 可以有多個實現，例如加上快取：

```typescript
// ✅ Repository 可以有多個實現
export class CachedUserRepository implements UserRepository {
  constructor(
    private delegate: UserRepository,
    private cache: Cache
  ) {}

  async findById(id: string): Promise<User | null> {
    const cached = await this.cache.get(`user:${id}`)
    if (cached) return JSON.parse(cached)

    const user = await this.delegate.findById(id)
    if (user) {
      await this.cache.set(`user:${id}`, JSON.stringify(user), 3600)
    }
    return user
  }
}
```

## 3. 進階設計

### Collection Oriented vs Persistence Oriented

Repository 模式通常有兩種風格：

*   **Collection Oriented**：模擬記憶體集合（如 List, Map），方法名稱類似 `add`, `remove`, `get`。適合 ORM (Hibernate, JPA) 環境，強調對象狀態追蹤。
*   **Persistence Oriented**：明確的 CRUD 操作，如 `save`, `delete`, `update`。適合 SQL 直接操作或輕量級 ORM，更強調顯式的保存。

在現代 Web 開發中，Persistence Oriented 較為常見且易於理解，因為它明確表達了「保存」這一副作用。

### 查詢規格 (Specification Pattern)

當查詢條件變得複雜時，Repository 的方法可能會爆炸性增長 (`findByAge`, `findByName`, `findByRoleAndStatus`...)。這時可以使用 **Specification Pattern** 來封裝查詢邏輯。

雖然這常被放在領域層，但實際查詢執行是在基礎設施層。

```typescript
interface Specification<T> {
  toSqlFragment(): SqlFragment;
}

// 基礎設施層會將 Specification 轉譯為 SQL WHERE 子句
class ActiveUserSpec implements Specification<User> {
  toSqlFragment() {
    return "status = 'active'";
  }
}

// 使用
repo.findAll(new ActiveUserSpec());
```
