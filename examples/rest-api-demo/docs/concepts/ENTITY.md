# Entity（實體）

## 1. 定義

實體是具有**唯一身份**的領域對象。兩個實體即使所有屬性相同，如果身份不同，它們也是不同的實體。實體具有生命週期，其狀態會隨時間改變，但其身份保持不變。

## 2. 核心特徵

```typescript
// Entity：
// - 有唯一標識符（ID）
// - 生命週期會改變（Mutable）
// - 身份而非屬性定義相等性

export interface User {
  id: string                    // ⭐ 唯一標識
  email: string
  name: string
  password: string              // ⭐ 雜湊值（敏感信息）
  role: UserRole
  status: UserStatus
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}
```

### 實例對比

```typescript
// ❌ 兩個 User 相等？- 否（身份不同）
const user1: User = { id: '1', email: 'user@example.com', ... }
const user2: User = { id: '2', email: 'user@example.com', ... }
console.log(user1.id === user2.id)  // false

// ✅ 同一用戶對比 - 是（身份相同）
const userA = await userRepository.findById('1')
const userB = await userRepository.findById('1')
console.log(userA.id === userB.id)  // true（同一用戶）
```

## 3. 進階設計

### ID 生成策略

在 DDD 中，實體的 ID 生成有多種策略，各有優劣：

| 策略 | 說明 | 優點 | 缺點 |
|------|------|------|------|
| **應用層生成 (UUID/ULID)** | 在建立實體時由程式碼生成 | - 可以在持久化前獲得 ID<br>- 適合分散式系統<br>- 支援並發寫入 | -  UUID 索引效能較略差 (視 DB 而定)<br>- URL 不夠簡潔 |
| **資料庫生成 (Auto Increment)** | 依賴資料庫的序列或自動增長 | - 數字 ID 對索引友好<br>- URL 簡潔 | - 必須先持久化才能獲得 ID<br>- 難以進行批量插入優化<br>- 容易暴露業務量 |
| **混合模式 (Hi/Lo)** | 應用層與資料庫配合生成 | - 兼具效能與預先獲取 ID | - 實作複雜 |

**推薦建議**：在現代 Web 應用中，推薦使用 **UUID (v4 或 v7)** 或 **ULID**。因為它們允許在領域層完全構建好實體（包含 ID）後再交給倉儲層，符合 DDD 的設計精神。

```typescript
// ✅ 應用層生成 ID 示例
class User {
  constructor(props: UserProps, id?: string) {
    this.id = id || crypto.randomUUID(); // 如果沒有傳入 ID，則自動生成
    // ...
  }
}
```

### 驗證時機

實體的驗證通常分為兩個階段：

1.  **建構時驗證 (Always Valid)**：確保實體在建立時就是合法的。不能建立一個「半成品」實體。
2.  **操作時驗證 (Invariant Enforcement)**：在執行業務方法時，檢查是否符合業務規則。

```typescript
class User {
  // 建構時驗證：確保 email 格式正確
  constructor(private props: UserProps) {
    if (!isValidEmail(props.email)) throw new Error("Invalid email");
  }

  // 操作時驗證：確保狀態轉換合法
  activate() {
    if (this.props.status === 'banned') {
      throw new Error("Cannot activate a banned user");
    }
    this.props.status = 'active';
  }
}
```
