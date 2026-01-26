# Phase 2: 安全強化計劃

> 優先級: P0 | 預估影響: 高

## 現況分析

### 已實現的安全措施

| 功能 | 狀態 | 說明 |
|------|------|------|
| CSRF 保護 | ✅ | 透過 `@gravito/core` 的中介軟體 |
| 密碼雜湊 | ✅ | 透過 `HashManager` 鹽化雜湊 |
| HTML 轉義 | ✅ | 郵件內容防 XSS |
| 簽署 URL | ✅ | 郵件驗證連結簽署 |

### 缺失的安全功能

| 功能 | 風險等級 | 說明 |
|------|----------|------|
| 登入速率限制 | 高 | 無法防止暴力破解 |
| 帳戶鎖定 | 高 | 多次失敗無懲罰 |
| 密碼複雜度驗證 | 中 | 無強制密碼規則 |
| 安全標頭 | 中 | 缺少 CSP、HSTS 等 |
| 敏感操作日誌 | 中 | 認證事件無紀錄 |
| 會話固定防護 | 低 | 登入後未重新生成會話 |

## 優化方案

### 2.1 登入速率限制

**目標**: 防止暴力破解攻擊

#### 配置介面

```typescript
interface RateLimitConfig {
  // 登入嘗試限制
  login: {
    maxAttempts: number       // 最大嘗試次數 (預設: 5)
    decayMinutes: number      // 冷卻時間 (預設: 15)
    lockoutMinutes: number    // 鎖定時間 (預設: 30)
  }

  // 密碼重設限制
  passwordReset: {
    maxAttempts: number       // 最大請求次數 (預設: 3)
    decayMinutes: number      // 冷卻時間 (預設: 60)
  }

  // 郵件驗證限制
  emailVerification: {
    maxAttempts: number       // 最大重發次數 (預設: 5)
    decayMinutes: number      // 冷卻時間 (預設: 60)
  }
}
```

#### 實作方式

```typescript
// src/services/RateLimiter.ts
interface RateLimiterStorage {
  get(key: string): Promise<RateLimitEntry | null>
  set(key: string, entry: RateLimitEntry, ttl: number): Promise<void>
  increment(key: string): Promise<number>
  reset(key: string): Promise<void>
}

interface RateLimitEntry {
  attempts: number
  lastAttempt: Date
  lockedUntil?: Date
}

class RateLimiter {
  constructor(
    private storage: RateLimiterStorage,
    private config: RateLimitConfig
  ) {}

  async checkLoginAttempt(identifier: string): Promise<RateLimitResult> {
    const key = `login:${identifier}`
    const entry = await this.storage.get(key)

    if (entry?.lockedUntil && new Date() < entry.lockedUntil) {
      return {
        allowed: false,
        retryAfter: Math.ceil((entry.lockedUntil.getTime() - Date.now()) / 1000),
        reason: 'account_locked'
      }
    }

    const attempts = await this.storage.increment(key)

    if (attempts > this.config.login.maxAttempts) {
      await this.lockAccount(key)
      return {
        allowed: false,
        retryAfter: this.config.login.lockoutMinutes * 60,
        reason: 'too_many_attempts'
      }
    }

    return { allowed: true, remainingAttempts: this.config.login.maxAttempts - attempts }
  }

  async recordSuccessfulLogin(identifier: string): Promise<void> {
    await this.storage.reset(`login:${identifier}`)
  }
}
```

#### 控制器整合

```typescript
// src/controllers/LoginController.ts
class LoginController {
  async store(c: Context) {
    const { email, password } = await c.req.parseBody()

    // 速率限制檢查
    const rateLimitResult = await this.rateLimiter.checkLoginAttempt(email)

    if (!rateLimitResult.allowed) {
      if (this.config.jsonMode) {
        return c.json({
          error: rateLimitResult.reason,
          retryAfter: rateLimitResult.retryAfter
        }, 429)
      }
      return c.redirect('/login?error=too_many_attempts')
    }

    // 原有登入邏輯...
    const success = await this.auth.attempt(email, password)

    if (success) {
      await this.rateLimiter.recordSuccessfulLogin(email)
      // ...
    }

    return // ...
  }
}
```

### 2.2 帳戶鎖定機制

**目標**: 在多次失敗後暫時鎖定帳戶

```typescript
interface LockoutConfig {
  enabled: boolean
  threshold: number           // 觸發鎖定的失敗次數
  duration: number           // 鎖定持續時間 (分鐘)
  permanent: {
    enabled: boolean
    threshold: number        // 永久鎖定的失敗次數
  }
}

// 資料庫遷移
// migrations/add_lockout_columns_to_users.ts
export default {
  up: (knex) => knex.schema.alterTable('users', (table) => {
    table.integer('failed_login_attempts').defaultTo(0)
    table.timestamp('locked_until').nullable()
    table.boolean('is_permanently_locked').defaultTo(false)
  }),

  down: (knex) => knex.schema.alterTable('users', (table) => {
    table.dropColumn('failed_login_attempts')
    table.dropColumn('locked_until')
    table.dropColumn('is_permanently_locked')
  })
}
```

### 2.3 密碼複雜度驗證

**目標**: 強制使用強密碼

```typescript
interface PasswordRulesConfig {
  minLength: number           // 最小長度 (預設: 8)
  maxLength: number           // 最大長度 (預設: 128)
  requireUppercase: boolean   // 需要大寫 (預設: true)
  requireLowercase: boolean   // 需要小寫 (預設: true)
  requireNumbers: boolean     // 需要數字 (預設: true)
  requireSymbols: boolean     // 需要符號 (預設: false)
  preventCommon: boolean      // 防止常見密碼 (預設: true)
  preventReuse: number        // 防止重複使用的歷史密碼數 (預設: 5)
}

// src/services/PasswordValidator.ts
class PasswordValidator {
  private commonPasswords = new Set([
    'password', '123456', 'qwerty', 'admin', // ... 更多
  ])

  validate(password: string): ValidationResult {
    const errors: string[] = []

    if (password.length < this.config.minLength) {
      errors.push(`密碼至少需要 ${this.config.minLength} 個字元`)
    }

    if (password.length > this.config.maxLength) {
      errors.push(`密碼不能超過 ${this.config.maxLength} 個字元`)
    }

    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('密碼需要包含大寫字母')
    }

    if (this.config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('密碼需要包含小寫字母')
    }

    if (this.config.requireNumbers && !/\d/.test(password)) {
      errors.push('密碼需要包含數字')
    }

    if (this.config.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('密碼需要包含特殊符號')
    }

    if (this.config.preventCommon && this.commonPasswords.has(password.toLowerCase())) {
      errors.push('此密碼過於常見，請選擇更安全的密碼')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}
```

### 2.4 安全標頭

**目標**: 加入安全相關的 HTTP 標頭

```typescript
// src/middleware/security-headers.ts
interface SecurityHeadersConfig {
  hsts: {
    enabled: boolean
    maxAge: number
    includeSubDomains: boolean
  }
  csp: {
    enabled: boolean
    directives: Record<string, string[]>
  }
  noSniff: boolean
  frameOptions: 'DENY' | 'SAMEORIGIN' | false
  xssFilter: boolean
}

function securityHeaders(config: SecurityHeadersConfig): MiddlewareHandler {
  return async (c, next) => {
    await next()

    // HSTS
    if (config.hsts.enabled) {
      let value = `max-age=${config.hsts.maxAge}`
      if (config.hsts.includeSubDomains) value += '; includeSubDomains'
      c.header('Strict-Transport-Security', value)
    }

    // Content-Type Options
    if (config.noSniff) {
      c.header('X-Content-Type-Options', 'nosniff')
    }

    // Frame Options
    if (config.frameOptions) {
      c.header('X-Frame-Options', config.frameOptions)
    }

    // XSS Filter
    if (config.xssFilter) {
      c.header('X-XSS-Protection', '1; mode=block')
    }

    // CSP
    if (config.csp.enabled) {
      const directives = Object.entries(config.csp.directives)
        .map(([key, values]) => `${key} ${values.join(' ')}`)
        .join('; ')
      c.header('Content-Security-Policy', directives)
    }
  }
}
```

### 2.5 敏感操作日誌

**目標**: 記錄所有認證相關事件

```typescript
interface AuthEvent {
  type: AuthEventType
  userId?: number
  email?: string
  ip: string
  userAgent: string
  timestamp: Date
  success: boolean
  metadata?: Record<string, unknown>
}

type AuthEventType =
  | 'login_attempt'
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'register'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'email_verification_sent'
  | 'email_verified'
  | 'account_locked'
  | 'account_unlocked'

// src/services/AuthLogger.ts
interface AuthLogger {
  log(event: AuthEvent): Promise<void>
  getRecentEvents(userId: number, limit?: number): Promise<AuthEvent[]>
  getFailedAttempts(email: string, since: Date): Promise<AuthEvent[]>
}

class DatabaseAuthLogger implements AuthLogger {
  async log(event: AuthEvent): Promise<void> {
    await this.db.table('auth_events').insert({
      type: event.type,
      user_id: event.userId,
      email: event.email,
      ip_address: event.ip,
      user_agent: event.userAgent,
      success: event.success,
      metadata: JSON.stringify(event.metadata),
      created_at: event.timestamp
    })
  }
}

// 資料庫遷移
// migrations/create_auth_events_table.ts
export default {
  up: (knex) => knex.schema.createTable('auth_events', (table) => {
    table.bigIncrements('id')
    table.string('type', 50).notNullable()
    table.bigInteger('user_id').nullable().references('id').inTable('users')
    table.string('email').nullable()
    table.string('ip_address', 45).notNullable()
    table.text('user_agent').nullable()
    table.boolean('success').defaultTo(true)
    table.json('metadata').nullable()
    table.timestamp('created_at').defaultTo(knex.fn.now())

    table.index(['user_id', 'created_at'])
    table.index(['email', 'type', 'created_at'])
    table.index('type')
  }),

  down: (knex) => knex.schema.dropTable('auth_events')
}
```

### 2.6 會話固定防護

**目標**: 登入後重新生成會話 ID

```typescript
// src/controllers/LoginController.ts
class LoginController {
  async store(c: Context) {
    // 驗證憑證...
    const success = await this.auth.attempt(email, password)

    if (success) {
      // 重新生成會話 ID 防止會話固定攻擊
      await this.session.regenerate(c)

      // 設定安全的 cookie 選項
      const sessionId = await this.session.getId()
      c.cookie('session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: this.config.sessionLifetime
      })
    }

    // ...
  }
}
```

## 配置整合

### 完整安全配置

```typescript
interface FortifySecurityConfig {
  rateLimit: RateLimitConfig
  lockout: LockoutConfig
  passwordRules: PasswordRulesConfig
  securityHeaders: SecurityHeadersConfig
  logging: {
    enabled: boolean
    driver: 'database' | 'file' | 'custom'
  }
  session: {
    regenerateOnLogin: boolean
    lifetime: number
    secure: boolean
  }
}

// 預設配置
const defaultSecurityConfig: FortifySecurityConfig = {
  rateLimit: {
    login: { maxAttempts: 5, decayMinutes: 15, lockoutMinutes: 30 },
    passwordReset: { maxAttempts: 3, decayMinutes: 60 },
    emailVerification: { maxAttempts: 5, decayMinutes: 60 }
  },
  lockout: {
    enabled: true,
    threshold: 5,
    duration: 30,
    permanent: { enabled: false, threshold: 20 }
  },
  passwordRules: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: false,
    preventCommon: true,
    preventReuse: 5
  },
  securityHeaders: {
    hsts: { enabled: true, maxAge: 31536000, includeSubDomains: true },
    csp: { enabled: false, directives: {} },
    noSniff: true,
    frameOptions: 'SAMEORIGIN',
    xssFilter: true
  },
  logging: { enabled: true, driver: 'database' },
  session: { regenerateOnLogin: true, lifetime: 7200, secure: true }
}
```

## 實施步驟

### Step 1: 速率限制
- [ ] 實作 `RateLimiter` 服務
- [ ] 實作記憶體/Redis 儲存後端
- [ ] 整合至登入控制器
- [ ] 整合至密碼重設控制器
- [ ] 整合至郵件驗證控制器

### Step 2: 帳戶鎖定
- [ ] 新增使用者表欄位遷移
- [ ] 實作鎖定邏輯
- [ ] 實作解鎖邏輯
- [ ] 新增管理員解鎖 API

### Step 3: 密碼驗證
- [ ] 實作 `PasswordValidator` 服務
- [ ] 整合至註冊控制器
- [ ] 整合至密碼重設控制器
- [ ] 實作常見密碼清單

### Step 4: 安全標頭
- [ ] 實作安全標頭中介軟體
- [ ] 整合至 FortifyOrbit
- [ ] 文件說明配置方式

### Step 5: 日誌記錄
- [ ] 建立 `auth_events` 資料表
- [ ] 實作 `AuthLogger` 服務
- [ ] 整合至所有控制器
- [ ] 新增查詢 API

### Step 6: 會話安全
- [ ] 實作會話重新生成
- [ ] 驗證 cookie 安全選項
- [ ] 測試會話固定防護

## 風險評估

| 風險 | 機率 | 影響 | 緩解措施 |
|------|------|------|----------|
| 速率限制誤判正常用戶 | 中 | 中 | 提供 CAPTCHA 繞過選項 |
| 日誌記錄影響效能 | 低 | 低 | 使用非同步寫入 |
| 密碼規則過嚴影響 UX | 中 | 中 | 提供清晰的錯誤提示 |
| 安全標頭破壞功能 | 低 | 高 | 預設保守設定 |

## 成功標準

- [ ] 登入嘗試受到速率限制
- [ ] 多次失敗後帳戶自動鎖定
- [ ] 弱密碼被拒絕
- [ ] 安全標頭正確設定
- [ ] 所有認證事件被記錄
- [ ] 登入後會話 ID 重新生成
- [ ] 通過 OWASP 認證安全檢查清單
