---
title: Sentinel Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# 🌌 Sentinel Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/sentinel` 的內部架構、多重 Guard 系統設計以及與核心安全機制的整合。

---

## 1. 核心哲學：Multi-Guard Security

Sentinel 受到 Laravel Auth 的啟發，旨在提供一個靈活、可擴展的身份驗證系統。
- **Guard Pattern**：將「如何驗證」封裝在 Guard 中，支援多種並存的驗證方式 (Session, JWT, Token)。
- **Provider Pattern**：將「如何獲取用戶」封裝在 UserProvider 中，解耦驗證邏輯與資料來源。
- **Policy/Gate**：提供細粒度的授權控制，支援基於角色的存取控制 (RBAC) 與基於屬性的存取控制 (ABAC)。

---

## 2. 模組組件分析

### 2.1 OrbitSentinel (主入口)
- **職責**：整合並初始化整個認證系統，注入到 PlanetCore。
- **位置**：`src/index.ts`
- **實現**：
  - 實現 `GravitoOrbit` 接口，支援 Gravito 框架的插件化部署。
  - 初始化 AuthManager、Gate、HashManager、PasswordBroker、EmailVerificationService。
  - 透過中間件將服務注入到每個請求的 Context。
  - 可配置的 expose 別名 (`exposeAs`, `exposeGateAs`, `exposeHashAs` 等)。

### 2.2 AuthManager (Facade)
- **職責**：管理所有的 Guards 與 UserProviders，作為應用程式與認證系統的交互界面。
- **位置**：`src/AuthManager.ts`
- **核心 API**：
  - `guard(name?)`: 懶加載並緩存 Guard 實例。
  - `createUserProvider(name?)`: 根據配置創建 Provider。
  - `user<T>()`: 獲取當前登入用戶。
  - `check()`: 檢查是否已認證。
  - `attempt(credentials, remember?)`: 嘗試登入。
  - `login(user, remember?)`: 強制登入特定用戶。
  - `logout()`: 登出當前用戶。
  - `authenticate()`: 要求用戶已登入，否則拋出 `AuthenticationException`。
  - `extend(driver, callback)`: 註冊自定義 Guard 驅動程式。
  - `provider(name, callback)`: 註冊自定義 User Provider。

### 2.3 Guards (Authentication Strategies)
- **職責**：執行具體的驗證邏輯。
- **位置**：`src/guards/`
- **內建 Guards**：
  - **`SessionGuard`**: 基於 Session ID 與 `OrbitPulsar` 整合，支援 "Remember Me" (長期 Cookie)。
    - 方法：`attempt(credentials, remember)`, `login(user, remember)`, `logout()`, `user()`, `check()`, `guest()`
  - **`JwtGuard`**: 驗證 `Authorization: Bearer` 標頭中的 JWT，支援 `HS256`/`RS256`。
    - 可選的查詢參數令牌支援 (`allowQueryToken`)。
  - **`JwtRefreshGuard` (NEW)**：支援訪問令牌和刷新令牌對的 JWT 驗證。
    - `createTokenPair(user)`: 生成 `{ accessToken, refreshToken, expiresIn }`。
    - `refreshTokens(refreshToken)`: 使用刷新令牌生成新的訪問令牌。
    - 可配置的 TTL：`accessTokenTtl` (預設 900 秒), `refreshTokenTtl` (預設 604800 秒)。
  - **`TokenGuard`**: 驗證 API Token (如 Personal Access Token)，支援 SHA-256/SHA-512 雜湊存儲。

### 2.4 User Providers (Data Source)
- **職責**：從資料庫或其他來源獲取用戶實體。
- **位置**：`src/providers/`
- **核心實作**：
  - **`CallbackUserProvider`**: 最通用的 Provider，透過回調函數 (`retrieveById`, `retrieveByCredentials`) 橋接任意 ORM (Atlas, Prisma, TypeORM)。
  - **`CachedUserProvider`**: 裝飾器模式，包裝其他 Provider，利用內存快取減少資料庫查詢。
    - 支援 TTL 快取（預設 60 秒）。
    - LRU 驅逐策略（預設最多快取 100 個用戶）。
    - 方法：`invalidate(identifier?)` 清除特定用戶或全部快取。

### 2.5 Gate & Policy (Authorization)
- **職責**：判斷已驗證的用戶是否有權執行特定操作。
- **位置**：`src/Gate.ts`
- **機制**：
  - `define(ability, callback)`: 定義全域規則。
  - `allows(ability, ...args)`: 檢查權限（返回 boolean）。
  - `denies(ability, ...args)`: 反向檢查權限。
  - `forUser(userResolver)`: 為特定用戶上下文創建 Gate 實例。
  - **Auto-Discovery** (Future): 未來將支援自動掃描 Policy 類別並綁定到 Model。

### 2.6 Email Verification (新增)
- **職責**：支援電子郵件地址驗證流程。
- **位置**：`src/EmailVerification.ts`
- **功能**：
  - 生成驗證令牌並將其編碼為 URL 安全的簽名。
  - 驗證令牌簽名的完整性。
  - 支援自定義驗證 URL 和電子郵件模板。

---

## 3. 技術規格與設計決策

### 3.1 Remember Me 機制
SessionGuard 實作了安全的 Remember Me 功能：
- **Token 生成**：`randomUUID() + randomUUID()` 生成高熵 Token。
- **Cookie 安全**：`HttpOnly`, `Secure` (Production), `Path=/`。
- **驗證流程**：
  1. 檢查 Session 是否存在。
  2. 若無，檢查 Remember Cookie。
  3. 若 Cookie 有效，自動登入並重建 Session (Session Fixation Protection)。

### 3.2 Token Hashing
`TokenGuard` 支援將 API Token 進行雜湊後存儲。
- **優點**：即使資料庫洩漏，攻擊者也無法還原原始 Token (類似密碼)。
- **代價**：無法在資料庫中明文顯示 Token，驗證時需對輸入進行雜湊比對。

### 3.3 密碼重設 (Password Broker)
Sentinel 內建了完整的密碼重設流程 (`PasswordBroker`)。
- **Repository**：負責存儲重設 Token (支援內存或數據庫)。
- **Token 生命週期**：預設 60 分鐘過期。
- **整合**：與 `OrbitMail` (未來) 整合發送重設郵件。

### 3.4 Email Verification (電子郵件驗證)
- **流程**：用戶註冊或更改電子郵件時發送驗證連結。
- **令牌生成**：使用 HMAC-SHA256 簽署，包含用戶 ID 和郵箱地址。
- **配置**：支援自定義驗證 URL 模板和過期時間。
- **整合**：與 OrbitMail (未來) 整合自動發送驗證郵件。

---

## 4. 潛在風險與效能評估

### 4.1 JWT 吊銷 (Revocation)
標準 JWT 是無狀態的，一旦發出在過期前皆有效。
- **風險**：若用戶權限被移除或帳號被盜，無法立即失效。
- **解法**：Sentinel 提供多層吊銷機制：
  - **`JwtRefreshGuard` 與 `TokenBlacklist`**：允許將特定 JWT 加入黑名單 (JTI Claim)，實現即時吊銷。
  - **目前實現**：`InMemoryTokenBlacklist` 適用於單一進程應用。
  - **未來增強**：支援 Redis 分佈式黑名單，用於多進程/多伺服器部署。

### 4.2 暴力破解 (Brute Force)
`throttleAuth` 中間件提供了登入頻率限制。
- **機制**：基於 IP + Username 進行計數 (Rate Limiting)。
- **配置**：預設 5 次失敗後鎖定 1 分鐘。
- **可自定義**：`throttleAuth({ maxAttempts: 10, lockoutDuration: 300 })`。

### 4.3 快取效能 (Caching Performance)
`CachedUserProvider` 改善了重複用戶查詢的效能。
- **機制**：內存 LRU 快取，預設 TTL 60 秒，最多 100 個用戶。
- **優點**：減少資料庫往返，降低延遲。
- **代價**：用戶數據更新延遲最多 60 秒。
- **清除策略**：透過 `invalidate(userId)` 立即清除過時數據。

### 4.4 Token 刷新機制 (Token Refresh)
`JwtRefreshGuard` 分離了訪問令牌和刷新令牌。
- **優點**：訪問令牌短生命週期 (900 秒)，降低洩露風險；刷新令牌可安全儲存。
- **流程**：當訪問令牌過期時，客戶端使用刷新令牌獲得新的訪問令牌，無需重新登入。
- **安全性**：刷新令牌應存儲在 HttpOnly Cookie 中，或安全的客戶端存儲。

---

## 5. 設定與部署

### 5.1 OrbitSentinel 配置示例
```typescript
import { OrbitSentinel } from '@gravito/sentinel'
import type { AuthConfig } from '@gravito/sentinel'

const authConfig: AuthConfig = {
  defaults: {
    guard: 'web',
    passwords: 'users'
  },
  guards: {
    web: {
      driver: 'session',
      provider: 'users'
    },
    api: {
      driver: 'jwt',
      provider: 'users',
      secret: process.env.JWT_SECRET,
      algo: 'HS256'
    },
    'api-token': {
      driver: 'token',
      provider: 'users',
      hash: true
    }
  },
  providers: {
    users: {
      driver: 'callback'
    }
  }
}

const sentinel = new OrbitSentinel({
  ...authConfig,
  hash: {
    default: 'bcrypt'
  },
  passwordReset: {
    enabled: true,
    ttlMinutes: 60
  },
  emailVerification: {
    enabled: true,
    secret: process.env.APP_KEY
  }
})

core.install(sentinel)
```

### 5.2 中間件使用
```typescript
import { auth, guest, can, throttleAuth } from '@gravito/sentinel'

// 驗證用戶
app.post('/profile', auth(), async (c) => {
  const user = await c.get('auth').user()
  return c.json({ user })
})

// 訪客路由
app.get('/login', guest(), async (c) => {
  return c.html(renderLogin())
})

// 權限檢查
app.delete('/post/:id', can('delete-post'), async (c) => {
  // 僅具有 'delete-post' 能力的用戶可訪問
})

// 速率限制登入
app.post('/login', throttleAuth({ maxAttempts: 5 }), async (c) => {
  // 登入邏輯
})
```

### 5.3 Authorization Gates 定義
```typescript
const gate = c.get('gate')

gate.define('view-post', (user, post) => {
  return user.id === post.author_id || user.role === 'admin'
})

gate.define('delete-post', (user, post) => {
  return user.id === post.author_id && user.role !== 'banned'
})

// 使用 Gate
if (await gate.allows('view-post', currentUser, post)) {
  // 用戶有權限
}
```

---

## 6. 版本變更與遷移指南

### v3 → v4 重大變更 (Breaking Changes)

#### 1. CallbackUserProvider 移除默認 Mock
**v3**:
```typescript
// 曾默認回退到 global.MOCK_USERS
```

**v4** (必須提供回調):
```typescript
const auth = new AuthManager(ctx, config, {
  users: (cfg) => new CallbackUserProvider({
    async retrieveById(id) { /* ... */ },
    async retrieveByCredentials(creds) { /* ... */ }
  })
})
```

#### 2. 中間件類型簽名
**v3**:
```typescript
app.get('/admin', auth(), async (c: any, next: any) => { ... })
```

**v4**:
```typescript
import type { GravitoContext, GravitoNext } from '@gravito/core'
app.get('/admin', auth(), async (c: GravitoContext, next: GravitoNext) => { ... })
```

### v4 新功能

#### 1. Remember Me 支援
```typescript
// SessionGuard 現已支援持久化會話
await auth.attempt(credentials, true) // 啟用 Remember Me
```

#### 2. JWT 刷新令牌
```typescript
// 使用 JwtRefreshGuard 實現訪問/刷新令牌對
const tokens = await guard.createTokenPair(user)
// { accessToken, refreshToken, expiresIn }

const newTokens = await guard.refreshTokens(refreshToken)
```

#### 3. 電子郵件驗證
```typescript
const emailVerification = c.get('emailVerification')
const token = await emailVerification.generate(user.id, user.email)
// 發送驗證連結，用戶點擊後呼叫 verify()
```

---

## 6. 後續優化建議

### 短期 (v1.1)
1. **OIDC / OAuth2 Support**：整合 Social Login (Google, GitHub)，提供統一的 `SocialUserProvider`。
2. **Multi-Tenancy**：增強 Guard 以支援多租戶架構 (自動過濾 Tenant ID)。
3. **Redis Token Blacklist**：支援分佈式 Redis 令牌黑名單實現。

### 中期 (v1.2)
1. **RBAC Middleware**：提供 `role:admin` 與 `permission:edit-post` 中間件，簡化路由權限控制。
2. **Policy Auto-Discovery**：自動掃描並註冊 Policy 類別。

### 長期 (v2.0)
1. **FIDO2 / WebAuthn**：原生支援 Passkeys 無密碼登入。
2. **Multi-Device Session Management**：支援多設備登入和遠程登出。

---
*Created by Gravito Architect.*
