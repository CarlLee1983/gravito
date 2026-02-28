# DCI 架構設計文檔

本文檔說明 @gravito/satellite-membership 中實現的 DCI（Data-Context-Interaction）模式。

---

## DCI 模式概述

DCI 是一種軟體架構模式，將程式邏輯分解為三個核心元素：

### Data（資料）

純粹的業務實體，包含狀態但最小化行為。

**例**：`Member` Entity

```typescript
export class Member {
  id: string
  name: string
  email: string
  passwordHash: string
  emailVerified: boolean
  status: MemberStatus
  verificationToken?: string
  currentSessionId?: string
  metadata: Record<string, unknown>

  // 最小化行為，僅用於狀態管理
  verifyEmail(): void
  updateMetadata(data: Record<string, unknown>): void
}
```

**設計原則**：
- 不包含業務流程邏輯
- 不依賴外部服務（Repository、Hasher 等）
- 純粹的狀態容器

---

### Context（上下文）

業務流程的協調器，負責：
1. 決定哪些 Role 應該被注入
2. 協調不同 Role 的互動
3. 管理事務和副作用

**例**：`AuthenticationContext`

```typescript
export class AuthenticationContext {
  constructor(
    private repository: IMemberRepository,
    private core: PlanetCore
  ) {}

  async execute(input: LoginMemberInput): Promise<{ member: Member; sessionId?: string }> {
    // 1. 查找會員（Data）
    const member = await this.repository.findByEmail(input.email)
    if (!member) {
      throw new MembershipError('INVALID_CREDENTIALS', 'Invalid email')
    }

    // 2. 注入 Authenticatable Role
    const role = injectAuthenticatableRole(member, this.repository, this.core)

    // 3. 協調 Role 互動
    await role.verifyCredentials(input.password)  // 驗證密碼
    role.isActive()                               // 檢查狀態
    await role.recordLogin(this.repository)       // 記錄登入

    // 4. 觸發鉤子
    await this.core.hooks.doAction('membership:login', { member })

    return { member, sessionId: member.currentSessionId }
  }
}
```

**責任**：
- 協調特定業務場景的流程
- 向 Data 注入必要的 Role
- 管理上下文相關的副作用

---

### Interaction（互動）

使用函數工廠將行為動態注入 Data 物件，而不修改其原始結構。

**例**：`injectAuthenticatableRole`

```typescript
export interface AuthenticatableRole {
  verifyCredentials(passwordPlain: string): Promise<void>
  isActive(): void
  recordLogin(repo: IMemberRepository, sessionId?: string): Promise<void>
}

export function injectAuthenticatableRole(
  member: Member,
  repository: IMemberRepository,
  core: PlanetCore
): AuthenticatableRole {
  return {
    // 行為 1：驗證密碼
    async verifyCredentials(passwordPlain: string) {
      const isValid = await core.hasher.check(passwordPlain, member.passwordHash)
      if (!isValid) {
        throw new MembershipError('INVALID_CREDENTIALS', 'Invalid password')
      }
    },

    // 行為 2：檢查狀態
    isActive() {
      if (member.status !== MemberStatus.ACTIVE) {
        throw new MembershipError('MEMBER_INACTIVE', 'Member is not active')
      }
    },

    // 行為 3：記錄登入
    async recordLogin(repo: IMemberRepository, sessionId?: string) {
      member.lastLogin = new Date()
      if (sessionId) {
        member.currentSessionId = sessionId
      }
      await repo.save(member)
    }
  }
}
```

**特性**：
- 純函數，無副作用（除了返回的閉包）
- 捕獲外部依賴（repository、core）
- 不修改 Member Entity 結構

---

## DCI 架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│                    HTTP Controllers                             │
│  ┌──────────────────┬──────────────────┬──────────────────┐     │
│  │ MemberAuthCtrl   │ MemberProfileCtrl│ (future endpoints)    │
│  └────────┬─────────┴────────┬─────────┴──────────────────┘     │
└───────────┼──────────────────┼────────────────────────────────────┘
            │                  │
┌───────────▼──────────────────▼────────────────────────────────────┐
│                    DCI Contexts                                  │
│  ┌──────────────────┬──────────────────┬──────────────────┐     │
│  │ Registration     │ Authentication   │ Profile          │     │
│  │ Context          │ Context          │ Context          │     │
│  └────────┬─────────┴────────┬─────────┴────────┬─────────┘     │
└───────────┼──────────────────┼──────────────────┼─────────────────┘
            │                  │                  │
┌───────────▼──────────────────▼──────────────────▼─────────────────┐
│                    Role Factory Functions                        │
│  ┌──────────────────┬──────────────────┬──────────────────┐     │
│  │ Registrant Role  │ Authenticatable  │ ProfileOwner     │     │
│  │ • validateUniq   │ Role             │ Role             │     │
│  │ • getVerifToken  │ • verifyCreds    │ • canUpdate      │     │
│  │                  │ • isActive       │ • sanitizeUpdate │     │
│  │                  │ • recordLogin    │                  │     │
│  └────────┬─────────┴────────┬─────────┴────────┬─────────┘     │
└───────────┼──────────────────┼──────────────────┼─────────────────┘
            │                  │                  │
┌───────────▼──────────────────▼──────────────────▼─────────────────┐
│                    Data (Member Entity)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ id | name | email | passwordHash | status | metadata    │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

---

## 核心 Role 定義

### 1. RegistrantRole

用於會員註冊場景。

**職責**：
- 驗證郵箱唯一性
- 提供驗證 token

**實現**：

```typescript
export interface RegistrantRole {
  validateUniqueness(): Promise<void>
  getVerificationToken(): string | undefined
}

export function injectRegistrantRole(
  member: Member,
  repository: IMemberRepository
): RegistrantRole {
  return {
    async validateUniqueness() {
      const existing = await repository.findByEmail(member.email)
      if (existing) {
        throw new MembershipError('MEMBER_EXISTS', 'Email already registered')
      }
    },

    getVerificationToken: () => member.verificationToken
  }
}
```

---

### 2. AuthenticatableRole

用於會員登入和認證場景。

**職責**：
- 驗證密碼
- 檢查帳戶是否啟用
- 記錄登入事件

**實現**：見上方 Interaction 示例

---

### 3. ProfileOwnerRole

用於會員個人資料管理場景。

**職責**：
- 檢查更新權限
- 消毒並驗證更新資料
- 防止權限提升攻擊

**實現**：

```typescript
export interface ProfileOwnerRole {
  canUpdateProfile(): boolean
  sanitizeProfileUpdate(data: UpdateProfileInput): UpdateProfileInput
}

export function injectProfileOwnerRole(member: Member): ProfileOwnerRole {
  return {
    canUpdateProfile: () => true,

    sanitizeProfileUpdate(data: UpdateProfileInput) {
      const sanitized: UpdateProfileInput = {}

      // 允許更新名稱
      if (data.name !== undefined) {
        sanitized.name = data.name.trim().slice(0, 255)
      }

      // 允許更新 metadata（排除敏感欄位）
      if (data.metadata) {
        sanitized.metadata = {
          ...member.metadata,
          ...data.metadata
        }

        // 防止權限提升
        delete sanitized.metadata.roles
        delete sanitized.metadata.status
      }

      return sanitized
    }
  }
}
```

---

## Context 實現模式

### RegistrationContext

處理會員註冊的完整流程。

```typescript
export class RegistrationContext {
  constructor(
    private repository: IMemberRepository,
    private core: PlanetCore
  ) {}

  async execute(input: RegisterMemberInput): Promise<MemberDTO> {
    // 1. 密碼雜湊
    const hashedPassword = await this.core.hasher.make(input.password)

    // 2. 創建 Member Entity（Data）
    const member = Member.create(
      randomUUID(),
      input.name,
      input.email,
      hashedPassword
    )

    // 3. 注入 RegistrantRole
    const role = injectRegistrantRole(member, this.repository)

    // 4. 驗證唯一性
    await role.validateUniqueness()

    // 5. 持久化
    await this.repository.save(member)

    // 6. 觸發鉤子（郵件發送、分析追蹤等）
    await this.core.hooks.doAction('membership:registered', { member })

    return MemberMapper.toDTO(member)
  }
}
```

### AuthenticationContext

處理會員登入的完整流程。

```typescript
export class AuthenticationContext {
  constructor(
    private repository: IMemberRepository,
    private core: PlanetCore
  ) {}

  async execute(input: LoginMemberInput): Promise<{ member: Member; sessionId?: string }> {
    // 1. 查找會員
    const member = await this.repository.findByEmail(input.email)
    if (!member) {
      throw new MembershipError('INVALID_CREDENTIALS', 'Invalid email or password')
    }

    // 2. 注入 AuthenticatableRole
    const role = injectAuthenticatableRole(member, this.repository, this.core)

    // 3. 驗證密碼
    await role.verifyCredentials(input.password)

    // 4. 檢查狀態
    role.isActive()

    // 5. 單設備模式：清除舊 session
    if (this.core.config.get('membership.auth.single_device')) {
      member.currentSessionId = undefined
    }

    // 6. 記錄登入
    const sessionId = randomUUID()
    await role.recordLogin(this.repository, sessionId)

    // 7. 觸發鉤子
    await this.core.hooks.doAction('membership:login', { member })

    return { member, sessionId }
  }
}
```

### ProfileContext

處理個人資料查看和更新。

```typescript
export class ProfileContext {
  constructor(private repository: IMemberRepository) {}

  async getProfile(memberId: string): Promise<MemberDTO> {
    const member = await this.repository.findById(memberId)
    if (!member) {
      throw new MembershipError('MEMBER_NOT_FOUND', 'Member not found')
    }

    return MemberMapper.toDTO(member)
  }

  async updateProfile(memberId: string, data: UpdateProfileInput): Promise<MemberDTO> {
    const member = await this.repository.findById(memberId)
    if (!member) {
      throw new MembershipError('MEMBER_NOT_FOUND', 'Member not found')
    }

    // 注入 ProfileOwnerRole
    const role = injectProfileOwnerRole(member)

    // 檢查權限
    if (!role.canUpdateProfile()) {
      throw new MembershipError('UNAUTHORIZED', 'Cannot update profile')
    }

    // 消毒資料
    const sanitized = role.sanitizeProfileUpdate(data)

    // 應用更新
    if (sanitized.name !== undefined) {
      member.name = sanitized.name
    }
    if (sanitized.metadata) {
      member.updateMetadata(sanitized.metadata)
    }

    // 持久化
    await this.repository.save(member)

    return MemberMapper.toDTO(member)
  }
}
```

---

## DCI 的優勢

### 1. 分離關注點

- **Data**：純粹的狀態容器
- **Context**：業務流程協調
- **Interaction**：角色特定的行為

### 2. 易於測試

```typescript
// 無需模擬 Repository，直接注入 Role
const role = injectAuthenticatableRole(member, mockRepository, mockCore)
await expect(role.verifyCredentials('wrong')).rejects.toThrow()
```

### 3. 靈活的行為組合

同一個 Entity 可以根據不同場景注入不同的 Role：

```typescript
// 註冊場景
const registrantRole = injectRegistrantRole(member, repo)

// 認證場景
const authRole = injectAuthenticatableRole(member, repo, core)

// 個人資料管理
const profileRole = injectProfileOwnerRole(member)
```

### 4. 無侵入式擴展

添加新功能不需要修改 Entity 類：

```typescript
// 新增 Role 而非修改 Member
export function injectAdminRole(member: Member): AdminRole {
  return {
    canSuspendMember: () => member.status === MemberStatus.ACTIVE,
    suspendMember: (reason: string) => {
      member.updateMetadata({ suspended: true, reason })
    }
  }
}
```

---

## 與 UseCase 的區別

| 面向 | UseCase | Context |
|-----|---------|---------|
| **職責** | 應用邏輯（接近 API） | 業務流程（接近領域） |
| **依賴** | Service、Repository | Service、Repository、Role Factory |
| **測試** | Mock Repository/Service | Mock + Role Injection |
| **擴展** | 新增 UseCase | 新增 Context + Role |

**本設計中**：UseCase 薄殼委派 Context 實現。

```typescript
// RegisterMember UseCase（薄殼）
async execute(input: RegisterMemberInput): Promise<MemberDTO> {
  const ctx = new RegistrationContext(this.repository, this.core)
  return ctx.execute(input)
}
```

---

## 最佳實踐

### 1. Role 應是純函數工廠

✅ **正確**：
```typescript
export function injectMyRole(member: Member): MyRole {
  return { method: () => { /* 行為 */ } }
}
```

❌ **錯誤**：
```typescript
export class MyRole {
  constructor(private member: Member) {}
  method() { /* 行為 */ }
}
```

### 2. Role 方法應無副作用（除了返回的閉包）

✅ **正確**：Role 返回閉包，閉包在執行時產生副作用

❌ **錯誤**：Role 工廠本身修改 Entity

### 3. Entity 保持最小化行為

✅ **Entity**：只有狀態管理方法
```typescript
member.verifyEmail()
member.updateMetadata(data)
```

❌ 不應包含：業務邏輯、外部依賴查詢

### 4. 使用 TypeScript 嚴格類型

```typescript
// 清晰的介面契約
export interface RegistrantRole {
  validateUniqueness(): Promise<void>
  getVerificationToken(): string | undefined
}
```

---

## 擴展指南

### 添加新 Context

1. 定義 Context 類
2. 在 `execute()` 中實現業務流程
3. 使用既有或新增 Role

### 添加新 Role

1. 定義 Role 介面
2. 實現 Role Factory 函數
3. 在 Context 中注入使用
4. 編寫單元測試

### 更新 Entity

1. 添加狀態欄位
2. 添加狀態管理方法（如 `verifyEmail()`, `updateMetadata()`)
3. **不修改** Entity 的業務邏輯

---

## 參考資源

- [DCI 官方網站](http://www.artima.com/articles/dci_vision.html)
- [Roles at the Core of DCI](http://mikaels.net/2012/05/11/roles-at-the-core-of-dci/)
- [本專案測試範例](../tests/Domain/DCI/)
