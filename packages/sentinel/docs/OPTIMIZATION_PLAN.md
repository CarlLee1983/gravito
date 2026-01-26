# @gravito/sentinel 優化改進計劃

> 版本：v3.0.1 → v4.0.0
> 日期：2026-01-25
> 狀態：規劃中

## 目錄

1. [現況分析](#現況分析)
2. [優化目標](#優化目標)
3. [Phase 1：程式碼品質與安全性](#phase-1程式碼品質與安全性)
4. [Phase 2：效能優化](#phase-2效能優化)
5. [Phase 3：功能增強](#phase-3功能增強)
6. [Phase 4：測試與文件](#phase-4測試與文件)
7. [遷移指南](#遷移指南)
8. [時程規劃](#時程規劃)

---

## 現況分析

### 套件概覽

`@gravito/sentinel` 是 Gravito 框架的認證與授權模組，靈感來自 Laravel 的認證系統，專為 TypeScript 設計。

**核心功能**：
- 多種 Guard 支援：Session、JWT、Token
- 彈性的 User Provider：Callback-based 自定義查詢
- 授權 Gate：定義與檢查權限
- 密碼管理：HashManager (bcrypt/argon2id)
- 密碼重設：PasswordBroker 工作流程
- Email 驗證：EmailVerificationService

### 現有架構

```
src/
├── index.ts                    # 主入口，OrbitSentinel 類
├── AuthManager.ts              # 認證管理器
├── Gate.ts                     # 授權閘門
├── HashManager.ts              # 密碼雜湊
├── PasswordBroker.ts           # 密碼重設
├── EmailVerification.ts        # Email 驗證
├── contracts/                  # 介面定義
│   ├── Authenticatable.ts
│   ├── Guard.ts
│   └── UserProvider.ts
├── guards/                     # Guard 實作
│   ├── SessionGuard.ts
│   ├── JwtGuard.ts
│   └── TokenGuard.ts
├── middleware/                 # 中介層
│   ├── auth.ts
│   ├── can.ts
│   └── guest.ts
└── providers/                  # Provider 實作
    └── CallbackUserProvider.ts
```

### 當前測試覆蓋率

| 模組 | 函數覆蓋率 | 行覆蓋率 |
|------|-----------|---------|
| EmailVerification.ts | 100% | 100% |
| HashManager.ts | 85.71% | 100% |
| PasswordBroker.ts | 84.62% | 91.11% |
| JwtGuard.ts | 100% | 100% |
| SessionGuard.ts | 73.68% | 84.27% |
| TokenGuard.ts | 71.43% | 85.96% |
| CallbackUserProvider.ts | 100% | 100% |

**整體覆蓋率**：~32% (包含依賴套件)

### 發現的問題

#### 1. 程式碼品質問題

**CallbackUserProvider.ts:68-84** - 存在 `console.log` 與全域變數存取：
```typescript
// 問題：不應在生產程式碼中使用 console.log
console.log('[CallbackUserProvider] retrieveByCredentials', credentials)
// 問題：不應存取全域變數
const users = (global as any).MOCK_USERS || []
```

**middleware/auth.ts:10-11** - 使用 `any` 類型：
```typescript
// 問題：應使用正確的 Gravito 類型
return async (c: any, next: any) => {
```

#### 2. 安全性疑慮

- **TokenGuard**：`hash` 選項未實際使用，應支援 token 雜湊儲存
- **JwtGuard**：缺少 token 黑名單/撤銷機制
- **SessionGuard**：`remember` 參數未實作記住我功能

#### 3. 功能缺失

- 缺少 Refresh Token 機制
- 缺少多因素認證 (MFA) 支援
- 缺少 Rate Limiting 整合
- 缺少 OAuth2/Social Login Provider

#### 4. 效能問題

- 每次請求都重新建立 `AuthManager` 實例
- Guard 快取僅在單一請求範圍內有效
- UserProvider 查詢無快取機制

---

## 優化目標

### 主要目標

1. **測試覆蓋率提升至 80%+**
2. **消除所有 `any` 類型使用**
3. **移除生產程式碼中的 console.log**
4. **實作 Remember Me 功能**
5. **支援 JWT Refresh Token**
6. **增強 JSDoc 文件供 AI 理解**

### 次要目標

1. 效能優化：減少不必要的物件建立
2. 安全性強化：Token 雜湊、黑名單機制
3. 可擴展性：支援自定義 Guard 與 Provider
4. 開發體驗：更好的 TypeScript 類型推導

---

## Phase 1：程式碼品質與安全性

### 1.1 移除 console.log 與全域變數

**檔案**：`src/providers/CallbackUserProvider.ts`

```typescript
// 移除
console.log('[CallbackUserProvider] retrieveByCredentials', credentials)
console.log('[CallbackUserProvider] validateCredentials', credentials)
const users = (global as any).MOCK_USERS || []

// 改為
// 如果沒有提供 retrieveByCredentialsCallback，直接返回 null
async retrieveByCredentials(credentials: Record<string, unknown>): Promise<T | null> {
  if (this.retrieveByCredentialsCallback) {
    return this.retrieveByCredentialsCallback(credentials)
  }
  return null
}
```

### 1.2 修正 TypeScript 類型

**檔案**：`src/middleware/auth.ts`

```typescript
// 修正前
export function auth(guard?: string) {
  return async (c: any, next: any) => {

// 修正後
import type { GravitoContext, GravitoNext } from '@gravito/core'

export function auth(guard?: string) {
  return async (c: GravitoContext, next: GravitoNext) => {
```

**檔案**：`src/middleware/can.ts`

```typescript
// 修正前
export function can(ability: string, ...args: unknown[]) {
  return async (c: any, next: any) => {

// 修正後
import type { GravitoContext, GravitoNext } from '@gravito/core'

export function can(ability: string, ...args: unknown[]) {
  return async (c: GravitoContext, next: GravitoNext) => {
```

### 1.3 實作 Token 雜湊

**檔案**：`src/guards/TokenGuard.ts`

```typescript
export class TokenGuard<User extends Authenticatable = Authenticatable> implements Guard<User> {
  constructor(
    protected provider: UserProvider<User>,
    protected ctx: GravitoContext,
    protected inputKey = 'api_token',
    protected storageKey = 'api_token',
    protected hash = false,
    protected allowQueryToken = false,
    protected hashAlgorithm: 'sha256' | 'sha512' = 'sha256' // 新增
  ) {}

  async user(): Promise<User | null> {
    // ...
    let token = this.getTokenForRequest()

    // 如果啟用雜湊，對輸入的 token 進行雜湊
    if (this.hash && token) {
      token = await this.hashToken(token)
    }
    // ...
  }

  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest(this.hashAlgorithm.toUpperCase(), data)
    return Buffer.from(hashBuffer).toString('hex')
  }
}
```

### 1.4 SessionGuard 類型安全強化

**檔案**：`src/guards/SessionGuard.ts`

```typescript
// 移除 as any 強制轉型
public async login(user: User, _remember = false): Promise<void> {
  const id = user.getAuthIdentifier()

  // 修正前
  this.ctx.set('auth' as any, user as any)

  // 修正後：透過正確的 GravitoVariables 介面
  // 在 index.ts 的 module augmentation 中已定義 auth?: AuthManager
  // 這裡應該設置 user 而非 manager
  this.userInstance = user
  // 移除 this.ctx.set('auth'...) - 這會覆蓋 AuthManager
```

---

## Phase 2：效能優化

### 2.1 Guard 實例快取改進

**檔案**：`src/AuthManager.ts`

```typescript
export class AuthManager {
  // 新增：追蹤是否已解析過預設 guard
  private defaultGuardResolved = false

  public guard<T extends Guard = Guard>(name?: string): T {
    const guardName = name || this.config.defaults.guard

    // 預先載入預設 guard 以減少延遲
    if (!name && !this.defaultGuardResolved) {
      this.defaultGuardResolved = true
    }

    if (!this.guards.has(guardName)) {
      this.guards.set(guardName, this.resolve(guardName))
    }

    return this.guards.get(guardName) as T
  }
}
```

### 2.2 UserProvider 查詢快取

**新增檔案**：`src/providers/CachedUserProvider.ts`

```typescript
import type { Authenticatable } from '../contracts/Authenticatable'
import type { UserProvider } from '../contracts/UserProvider'

export interface CacheOptions {
  ttlSeconds?: number
  maxSize?: number
}

/**
 * 包裝任何 UserProvider 以提供快取功能
 */
export class CachedUserProvider<T extends Authenticatable = Authenticatable>
  implements UserProvider<T>
{
  private cache = new Map<string | number, { user: T; expires: number }>()

  constructor(
    private readonly provider: UserProvider<T>,
    private readonly options: CacheOptions = {}
  ) {}

  async retrieveById(identifier: string | number): Promise<T | null> {
    const cached = this.cache.get(identifier)
    if (cached && cached.expires > Date.now()) {
      return cached.user
    }

    const user = await this.provider.retrieveById(identifier)
    if (user) {
      this.cacheUser(identifier, user)
    }
    return user
  }

  // ... 其他方法

  private cacheUser(identifier: string | number, user: T): void {
    const ttl = (this.options.ttlSeconds ?? 60) * 1000

    // LRU eviction
    if (this.cache.size >= (this.options.maxSize ?? 100)) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(identifier, {
      user,
      expires: Date.now() + ttl
    })
  }

  invalidate(identifier?: string | number): void {
    if (identifier) {
      this.cache.delete(identifier)
    } else {
      this.cache.clear()
    }
  }
}
```

---

## Phase 3：功能增強

### 3.1 Remember Me 功能

**檔案**：`src/guards/SessionGuard.ts`

```typescript
export class SessionGuard<User extends Authenticatable = Authenticatable>
  implements StatefulGuard<User>
{
  protected rememberCookieName = 'remember_token'
  protected rememberDuration = 60 * 60 * 24 * 30 // 30 天

  public async login(user: User, remember = false): Promise<void> {
    const id = user.getAuthIdentifier()
    this.userInstance = user

    const session = this.getSession()
    if (session) {
      if (typeof session.regenerate === 'function') {
        await session.regenerate()
      }
      session.put(this.getName(), id)
    }

    // 實作 Remember Me
    if (remember && user.setRememberToken) {
      const token = this.generateRememberToken()
      user.setRememberToken(token)
      await this.provider.updateRememberToken?.(user, token)
      this.setRememberCookie(id, token)
    }

    this.loggedOut = false
  }

  public async user(): Promise<User | null> {
    if (this.loggedOut) return null
    if (this.userInstance) return this.userInstance

    // 先嘗試從 session 取得
    const session = this.getSession()
    const id = session?.get(this.getName())

    if (id) {
      this.userInstance = await this.provider.retrieveById(id) as User | null
      return this.userInstance
    }

    // 嘗試從 remember cookie 取得
    this.userInstance = await this.retrieveFromRememberCookie()
    return this.userInstance
  }

  private generateRememberToken(): string {
    return crypto.randomUUID() + crypto.randomUUID()
  }

  private async retrieveFromRememberCookie(): Promise<User | null> {
    const cookie = this.ctx.req.header('Cookie')
    // 解析 remember cookie 並驗證
    // ...
    return null
  }
}
```

### 3.2 JWT Refresh Token

**新增檔案**：`src/guards/JwtRefreshGuard.ts`

```typescript
import type { GravitoContext } from '@gravito/core'
import { sign, verify } from '@gravito/photon/jwt'
import type { Authenticatable } from '../contracts/Authenticatable'
import type { Guard } from '../contracts/Guard'
import type { UserProvider } from '../contracts/UserProvider'

export interface JwtTokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface JwtRefreshConfig {
  accessTokenTtl?: number  // 預設 15 分鐘
  refreshTokenTtl?: number // 預設 7 天
  secret: string
  refreshSecret?: string
  algo?: 'HS256' | 'RS256'
}

/**
 * 支援 Refresh Token 的 JWT Guard
 */
export class JwtRefreshGuard<User extends Authenticatable = Authenticatable>
  implements Guard<User>
{
  protected userInstance: User | null = null
  private readonly accessTokenTtl: number
  private readonly refreshTokenTtl: number

  constructor(
    protected provider: UserProvider<User>,
    protected ctx: GravitoContext,
    protected config: JwtRefreshConfig
  ) {
    this.accessTokenTtl = config.accessTokenTtl ?? 900 // 15 分鐘
    this.refreshTokenTtl = config.refreshTokenTtl ?? 604800 // 7 天
  }

  /**
   * 為使用者產生 token pair
   */
  async createTokenPair(user: User): Promise<JwtTokenPair> {
    const now = Math.floor(Date.now() / 1000)
    const sub = String(user.getAuthIdentifier())

    const accessToken = await sign(
      { sub, iat: now, exp: now + this.accessTokenTtl, type: 'access' },
      this.config.secret,
      this.config.algo ?? 'HS256'
    )

    const refreshToken = await sign(
      { sub, iat: now, exp: now + this.refreshTokenTtl, type: 'refresh' },
      this.config.refreshSecret ?? this.config.secret,
      this.config.algo ?? 'HS256'
    )

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenTtl
    }
  }

  /**
   * 使用 refresh token 取得新的 token pair
   */
  async refreshTokens(refreshToken: string): Promise<JwtTokenPair | null> {
    try {
      const payload = await verify(
        refreshToken,
        this.config.refreshSecret ?? this.config.secret,
        this.config.algo ?? 'HS256'
      )

      if (payload?.type !== 'refresh' || !payload.sub) {
        return null
      }

      const user = await this.provider.retrieveById(payload.sub as string)
      if (!user) return null

      return this.createTokenPair(user)
    } catch {
      return null
    }
  }

  // ... 實作 Guard 介面其他方法
}
```

### 3.3 Token 黑名單機制

**新增檔案**：`src/TokenBlacklist.ts`

```typescript
/**
 * Token 黑名單介面
 */
export interface TokenBlacklist {
  /**
   * 將 token 加入黑名單
   */
  add(jti: string, expiresAt: Date): Promise<void>

  /**
   * 檢查 token 是否在黑名單中
   */
  has(jti: string): Promise<boolean>

  /**
   * 清除過期的黑名單項目
   */
  prune(): Promise<void>
}

/**
 * 記憶體實作（適用於單一實例）
 */
export class InMemoryTokenBlacklist implements TokenBlacklist {
  private blacklist = new Map<string, number>()

  async add(jti: string, expiresAt: Date): Promise<void> {
    this.blacklist.set(jti, expiresAt.getTime())
  }

  async has(jti: string): Promise<boolean> {
    const expires = this.blacklist.get(jti)
    if (!expires) return false
    if (Date.now() > expires) {
      this.blacklist.delete(jti)
      return false
    }
    return true
  }

  async prune(): Promise<void> {
    const now = Date.now()
    for (const [jti, expires] of this.blacklist) {
      if (now > expires) {
        this.blacklist.delete(jti)
      }
    }
  }
}
```

### 3.4 Rate Limiting 整合

**新增檔案**：`src/middleware/throttleAuth.ts`

```typescript
import type { GravitoContext, GravitoNext } from '@gravito/core'

export interface AuthThrottleOptions {
  maxAttempts?: number
  decayMinutes?: number
  keyGenerator?: (ctx: GravitoContext) => string
}

/**
 * 認證嘗試限流中介層
 * 防止暴力破解攻擊
 */
export function throttleAuth(options: AuthThrottleOptions = {}) {
  const {
    maxAttempts = 5,
    decayMinutes = 1,
    keyGenerator = (ctx) => ctx.req.header('x-forwarded-for') || 'unknown'
  } = options

  const attempts = new Map<string, { count: number; resetAt: number }>()

  return async (c: GravitoContext, next: GravitoNext) => {
    const key = `auth_throttle:${keyGenerator(c)}`
    const now = Date.now()
    const decayMs = decayMinutes * 60 * 1000

    let record = attempts.get(key)

    // 清除過期記錄
    if (record && now > record.resetAt) {
      attempts.delete(key)
      record = undefined
    }

    if (record && record.count >= maxAttempts) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000)
      c.header('Retry-After', String(retryAfter))
      return c.json(
        { error: 'Too many login attempts. Please try again later.' },
        429
      )
    }

    await next()

    // 如果認證失敗，增加計數
    if (c.res.status === 401) {
      if (!record) {
        record = { count: 0, resetAt: now + decayMs }
        attempts.set(key, record)
      }
      record.count++
    }
  }
}
```

---

## Phase 4：測試與文件

### 4.1 測試覆蓋率目標

| 模組 | 當前覆蓋率 | 目標覆蓋率 |
|------|-----------|-----------|
| SessionGuard.ts | 84.27% | 95%+ |
| TokenGuard.ts | 85.96% | 95%+ |
| PasswordBroker.ts | 91.11% | 95%+ |
| AuthManager.ts | N/A | 90%+ |
| Gate.ts | N/A | 90%+ |
| 新增模組 | N/A | 90%+ |

### 4.2 需要新增的測試案例

```typescript
// tests/session-guard-remember.test.ts
describe('SessionGuard Remember Me', () => {
  test('should set remember cookie when remember=true')
  test('should retrieve user from remember cookie')
  test('should invalidate remember token on logout')
  test('should regenerate remember token on each login')
})

// tests/jwt-refresh.test.ts
describe('JwtRefreshGuard', () => {
  test('should create token pair')
  test('should refresh tokens with valid refresh token')
  test('should reject expired refresh token')
  test('should reject invalid refresh token')
})

// tests/token-blacklist.test.ts
describe('TokenBlacklist', () => {
  test('should add token to blacklist')
  test('should detect blacklisted token')
  test('should prune expired entries')
})

// tests/throttle-auth.test.ts
describe('throttleAuth middleware', () => {
  test('should allow requests under limit')
  test('should block after max attempts')
  test('should reset after decay period')
})
```

### 4.3 JSDoc 增強

為所有公開 API 添加完整的 JSDoc 註解，包含：

- `@description` - 詳細描述
- `@param` - 參數說明
- `@returns` - 返回值說明
- `@throws` - 可能拋出的例外
- `@example` - 使用範例
- `@since` - 版本資訊
- `@see` - 相關參考

範例：

```typescript
/**
 * 認證管理器 - 處理 Guard 解析、User Provider 及認證狀態
 *
 * @description
 * AuthManager 是認證系統的核心，負責：
 * - 管理多個 Guard 實例的生命週期
 * - 解析並快取 UserProvider
 * - 提供便捷的認證檢查 API
 *
 * @example
 * ```typescript
 * // 在路由處理器中使用
 * app.get('/profile', async (c) => {
 *   const auth = c.get('auth')
 *
 *   // 檢查是否已認證
 *   if (await auth.check()) {
 *     const user = await auth.user()
 *     return c.json({ user })
 *   }
 *
 *   return c.json({ error: 'Unauthenticated' }, 401)
 * })
 * ```
 *
 * @since 1.0.0
 * @public
 */
export class AuthManager {
  // ...
}
```

---

## 遷移指南

### 從 v3.x 升級到 v4.0

#### Breaking Changes

1. **CallbackUserProvider 行為變更**
   - 移除了 fallback 到 `global.MOCK_USERS` 的行為
   - 必須提供 `retrieveByCredentialsCallback`

2. **Middleware 類型變更**
   - `auth()` 和 `can()` middleware 現在有正確的類型

#### 遷移步驟

```typescript
// v3.x
const provider = new CallbackUserProvider(
  async (id) => findUser(id),
  async (user, creds) => validatePassword(user, creds)
)

// v4.0 - 必須提供所有 callback
const provider = new CallbackUserProvider(
  async (id) => findUser(id),
  async (user, creds) => validatePassword(user, creds),
  async (id, token) => findByRememberToken(id, token), // 新增
  async (creds) => findByCredentials(creds) // 新增
)
```

---

## 時程規劃

| Phase | 內容 | 預估工作量 |
|-------|------|-----------|
| Phase 1 | 程式碼品質與安全性 | 2-3 天 |
| Phase 2 | 效能優化 | 1-2 天 |
| Phase 3 | 功能增強 | 3-5 天 |
| Phase 4 | 測試與文件 | 2-3 天 |
| **總計** | | **8-13 天** |

---

## 附錄

### A. 相關檔案清單

需要修改的檔案：
- `src/providers/CallbackUserProvider.ts`
- `src/middleware/auth.ts`
- `src/middleware/can.ts`
- `src/guards/SessionGuard.ts`
- `src/guards/TokenGuard.ts`
- `src/AuthManager.ts`

需要新增的檔案：
- `src/providers/CachedUserProvider.ts`
- `src/guards/JwtRefreshGuard.ts`
- `src/TokenBlacklist.ts`
- `src/middleware/throttleAuth.ts`

### B. 參考資料

- Laravel Auth 文件：https://laravel.com/docs/authentication
- JWT Best Practices：https://datatracker.ietf.org/doc/html/rfc8725
- OWASP Authentication Cheat Sheet：https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
