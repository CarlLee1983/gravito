# Domain Event（領域事件）

## 1. 定義

領域事件記錄業務領域中發生的重要事實 (Fact)。它通常是過去式命名（例如 `UserCreated`、`OrderShipped`），並且是不可變的。

## 2. 核心特徵

```typescript
// ✅ Domain Event：記錄發生的事實
export interface UserCreatedPayload {
  userId: string
  email: string
  name: string
  role: string
  createdAt: Date
}

export class UserCreated extends Event {
  readonly eventName = 'user:created'

  constructor(public readonly payload: UserCreatedPayload) {
    super()
  }
}
```

### 發送與監聽

```typescript
// ✅ 在領域模型中發送事件
export class RegisterUserUseCase {
  async execute(request: RegisterUserRequest): Promise<RegisterUserResponse> {
    // ... 業務邏輯 ...

    // 發送事件（解耦其他業務流程）
    await this.eventManager.dispatch(
      new UserCreated({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      })
    )
  }
}

// ✅ 事件監聽器（異步處理業務流程）
eventManager.listen('user:created', async (event: UserCreated) => {
  // 發送歡迎郵件
  await sendWelcomeEmail(event.payload.email)

  // 初始化用戶配置
  await initializeUserSettings(event.payload.userId)

  // 記錄審計日誌
  await auditLog.record('user_registration', event.payload)
})
```

## 3. 進階設計

### 最終一致性 (Eventual Consistency)

領域事件是實現最終一致性的關鍵機制。與其在單一的大型事務中完成所有操作（這可能導致鎖競爭和性能問題），不如將非核心的副作用非同步化。

例如：註冊用戶 -> 事務 A (寫入 User 表) -> 事務提交 -> 發送事件 -> 事務 B (寫入 Audit Log) -> 事務 C (發送 Email)。

如果事務 B 或 C 失敗，可以通過重試機制恢復，或者接受短暫的不一致。

### 事件結構

一個良好的領域事件應該包含所有接收方需要的資訊，但不要包含過多的實體內部細節。

```typescript
// ❌ 壞設計：直接傳遞實體，導致接收方依賴實體結構
class UserCreated {
  constructor(public readonly user: User) {}
}

// ✅ 好設計：傳遞 DTO (Data Transfer Object)，解耦依賴
class UserCreated {
  constructor(
    public readonly userId: string,
    public readonly email: string, 
    // ...其他必要的欄位
  ) {}
}
```

### 同步 vs 非同步

*   **同步處理 (In-Process)**：事件監聽器在同一個進程、甚至同一個事務中執行。優點是簡單，缺點是影響主流程效能。
*   **非同步處理 (Out-of-Process)**：事件被發送到消息隊列 (RabbitMQ, Kafka, SQS)，由其他 Worker 處理。這是微服務架構的基礎。

在單體應用中，通常從同步處理開始，隨著負載增加再遷移到非同步處理。
