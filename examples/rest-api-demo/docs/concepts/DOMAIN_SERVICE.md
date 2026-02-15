# Domain Service（領域服務）

## 1. 定義

領域服務封裝不適合放在單個實體或值對象中的業務邏輯。這些服務是無狀態的 (Stateless)，僅負責執行特定的領域操作。

## 2. 核心特徵

```typescript
// ✅ UserDomainService：不變的領域驗證規則
export class UserDomainService {
  // 驗證電子郵件格式（業務規則，不依賴資料庫）
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // 驗證密碼強度（業務規則）
  static isStrongPassword(password: string): boolean {
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    const isLongEnough = password.length >= 8

    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && isLongEnough
  }

  // 檢查用戶狀態（業務規則）
  static isActive(user: User): boolean {
    return user.status === 'active'
  }
}

// ✅ 使用領域服務
if (!UserDomainService.isValidEmail(email)) {
  throw new Error('Invalid email format')
}

if (!UserDomainService.isStrongPassword(password)) {
  throw new Error('Password too weak')
}
```

## 3. 進階設計

### Domain Service vs Application Service

這兩者經常混淆，區別在於：

| 服務類型 | 職責 | 是否依賴領域知識 | 依賴 |
|----------|------|-----------------|------|
| **Domain Service** | 執行純粹的業務邏輯，例如計算折扣、轉帳規則、複雜驗證 | 是 | Entity, Value Object, Repository 介面 |
| **Application Service** | 協調 Use Case 流程 (Orchestration)，負責事務與 I/O | 否 (僅調用) | Domain Service, Repository, External System |

**簡單判斷法**：如果該邏輯涉及「多個聚合根的協作」或「無法歸屬於單一實體的業務規則」，通常就是 Domain Service。

### 無狀態設計 (Stateless)

領域服務本身不應持有狀態。它的所有輸入都應該來自參數，所有輸出都應該是返回值或副作用（如修改傳入的實體）。這使得它非常容易測試和並發安全。

```typescript
class TransferService {
  // ✅ 無狀態方法
  static transfer(fromAccount: Account, toAccount: Account, amount: Money) {
    if (!fromAccount.canWithdraw(amount)) {
      throw new Error("Insufficient funds");
    }
    fromAccount.withdraw(amount);
    toAccount.deposit(amount);
  }
}
```
