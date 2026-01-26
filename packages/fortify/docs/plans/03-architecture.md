# Phase 3: 架構改進計劃

> 優先級: P1 | 預估影響: 中高

## 現況分析

### 當前架構

```
FortifyOrbit
    │
    ├── Controllers (6 個獨立控制器)
    │   ├── LoginController
    │   ├── RegisterController
    │   ├── LogoutController
    │   ├── ForgotPasswordController
    │   ├── ResetPasswordController
    │   └── VerifyEmailController
    │
    ├── Middleware
    │   └── verified
    │
    ├── Mail
    │   ├── ResetPasswordMail
    │   └── VerifyEmailMail
    │
    └── Routes
        └── auth.ts (路由定義)
```

### 識別問題

1. **控制器缺乏統一基類**
   - 重複的錯誤處理邏輯
   - 重複的 JSON/HTML 回應判斷
   - 重複的驗證邏輯

2. **錯誤處理不一致**
   - 各控制器自行處理錯誤
   - 錯誤訊息格式不統一
   - 缺少標準化的錯誤代碼

3. **缺少事件系統**
   - 認證事件無法被外部訂閱
   - 難以擴展自訂邏輯

4. **配置散落各處**
   - 預設值分散在多個檔案
   - 缺少集中式配置驗證

5. **依賴注入不夠清晰**
   - 服務通過全域取得
   - 難以測試和替換

## 優化方案

### 3.1 控制器基類抽象

**目標**: 統一控制器行為，減少重複代碼

```typescript
// src/controllers/BaseController.ts
abstract class BaseController {
  constructor(
    protected config: FortifyConfig,
    protected services: FortifyServices
  ) {}

  /**
   * 回應成功結果
   */
  protected success(c: Context, data?: unknown, redirectTo?: string) {
    if (this.config.jsonMode) {
      return c.json({ success: true, data }, 200)
    }
    return c.redirect(redirectTo ?? this.config.redirects.login)
  }

  /**
   * 回應錯誤結果
   */
  protected error(
    c: Context,
    code: ErrorCode,
    status: number = 422,
    redirectTo?: string
  ) {
    const message = this.getErrorMessage(code)

    if (this.config.jsonMode) {
      return c.json({ success: false, error: { code, message } }, status)
    }

    const url = new URL(redirectTo ?? c.req.url)
    url.searchParams.set('error', code)
    return c.redirect(url.pathname + url.search)
  }

  /**
   * 回應驗證錯誤
   */
  protected validationError(c: Context, errors: ValidationErrors) {
    if (this.config.jsonMode) {
      return c.json({
        success: false,
        error: { code: 'validation_failed', errors }
      }, 422)
    }
    return this.renderWithErrors(c, errors)
  }

  /**
   * 渲染視圖 (支援 HTML/Inertia)
   */
  protected render(c: Context, view: string, props?: Record<string, unknown>) {
    return this.services.view.render(c, view, props)
  }

  /**
   * 取得本地化錯誤訊息
   */
  protected getErrorMessage(code: ErrorCode): string {
    const messages: Record<ErrorCode, string> = {
      invalid_credentials: '帳號或密碼錯誤',
      email_taken: '此電子郵件已被註冊',
      password_mismatch: '密碼不一致',
      invalid_token: '令牌無效或已過期',
      email_not_verified: '請先驗證電子郵件',
      too_many_attempts: '嘗試次數過多，請稍後再試',
      account_locked: '帳戶已被鎖定',
      // ...
    }
    return messages[code] ?? '發生未知錯誤'
  }
}
```

### 3.2 統一錯誤代碼系統

**目標**: 標準化錯誤處理

```typescript
// src/errors/codes.ts
export const ErrorCodes = {
  // 認證錯誤 (AUTH_XXX)
  AUTH_INVALID_CREDENTIALS: 'auth.invalid_credentials',
  AUTH_ACCOUNT_LOCKED: 'auth.account_locked',
  AUTH_EMAIL_NOT_VERIFIED: 'auth.email_not_verified',
  AUTH_SESSION_EXPIRED: 'auth.session_expired',

  // 註冊錯誤 (REG_XXX)
  REG_EMAIL_TAKEN: 'reg.email_taken',
  REG_WEAK_PASSWORD: 'reg.weak_password',
  REG_INVALID_EMAIL: 'reg.invalid_email',

  // 密碼錯誤 (PWD_XXX)
  PWD_TOKEN_INVALID: 'pwd.token_invalid',
  PWD_TOKEN_EXPIRED: 'pwd.token_expired',
  PWD_MISMATCH: 'pwd.mismatch',

  // 驗證錯誤 (VER_XXX)
  VER_ALREADY_VERIFIED: 'ver.already_verified',
  VER_INVALID_SIGNATURE: 'ver.invalid_signature',
  VER_LINK_EXPIRED: 'ver.link_expired',

  // 速率限制 (RATE_XXX)
  RATE_TOO_MANY_ATTEMPTS: 'rate.too_many_attempts',
  RATE_COOLDOWN: 'rate.cooldown'
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

// src/errors/FortifyError.ts
export class FortifyError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly httpStatus: number = 422,
    public readonly details?: unknown
  ) {
    super(code)
    this.name = 'FortifyError'
  }

  static invalidCredentials() {
    return new FortifyError(ErrorCodes.AUTH_INVALID_CREDENTIALS, 401)
  }

  static accountLocked(unlockAt?: Date) {
    return new FortifyError(ErrorCodes.AUTH_ACCOUNT_LOCKED, 423, { unlockAt })
  }

  static emailTaken() {
    return new FortifyError(ErrorCodes.REG_EMAIL_TAKEN, 422)
  }

  // ... 更多工廠方法
}
```

### 3.3 事件系統

**目標**: 支援認證事件訂閱

```typescript
// src/events/types.ts
export interface FortifyEvents {
  'auth:login': LoginEvent
  'auth:logout': LogoutEvent
  'auth:register': RegisterEvent
  'auth:password-reset-requested': PasswordResetRequestedEvent
  'auth:password-reset': PasswordResetEvent
  'auth:email-verified': EmailVerifiedEvent
  'auth:login-failed': LoginFailedEvent
  'auth:account-locked': AccountLockedEvent
}

interface LoginEvent {
  user: User
  ip: string
  userAgent: string
  remember: boolean
}

interface LoginFailedEvent {
  email: string
  ip: string
  userAgent: string
  reason: ErrorCode
}

// src/events/EventEmitter.ts
class FortifyEventEmitter {
  private listeners = new Map<string, Set<Function>>()

  on<K extends keyof FortifyEvents>(
    event: K,
    listener: (data: FortifyEvents[K]) => void | Promise<void>
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
    return () => this.off(event, listener)
  }

  off<K extends keyof FortifyEvents>(
    event: K,
    listener: (data: FortifyEvents[K]) => void | Promise<void>
  ) {
    this.listeners.get(event)?.delete(listener)
  }

  async emit<K extends keyof FortifyEvents>(
    event: K,
    data: FortifyEvents[K]
  ): Promise<void> {
    const eventListeners = this.listeners.get(event)
    if (!eventListeners) return

    await Promise.all(
      Array.from(eventListeners).map(listener => listener(data))
    )
  }
}

// 使用範例
const fortify = new FortifyOrbit(config)

fortify.events.on('auth:login', async (event) => {
  console.log(`User ${event.user.id} logged in from ${event.ip}`)
  await analytics.track('login', { userId: event.user.id })
})

fortify.events.on('auth:login-failed', async (event) => {
  await securityAlert.notify(`Failed login attempt for ${event.email}`)
})
```

### 3.4 服務容器

**目標**: 清晰的依賴注入

```typescript
// src/services/Container.ts
interface FortifyServices {
  auth: AuthManager
  hash: HashManager
  password: PasswordBroker
  emailVerification: EmailVerificationService
  view: ViewService
  mail: MailService
  rateLimiter: RateLimiter
  logger: AuthLogger
  events: FortifyEventEmitter
}

class FortifyContainer {
  private services: Partial<FortifyServices> = {}
  private factories = new Map<keyof FortifyServices, () => unknown>()

  register<K extends keyof FortifyServices>(
    key: K,
    factory: () => FortifyServices[K]
  ) {
    this.factories.set(key, factory)
  }

  get<K extends keyof FortifyServices>(key: K): FortifyServices[K] {
    if (!this.services[key]) {
      const factory = this.factories.get(key)
      if (!factory) {
        throw new Error(`Service '${key}' not registered`)
      }
      this.services[key] = factory() as FortifyServices[K]
    }
    return this.services[key] as FortifyServices[K]
  }

  // 批量取得
  all(): FortifyServices {
    return {
      auth: this.get('auth'),
      hash: this.get('hash'),
      password: this.get('password'),
      emailVerification: this.get('emailVerification'),
      view: this.get('view'),
      mail: this.get('mail'),
      rateLimiter: this.get('rateLimiter'),
      logger: this.get('logger'),
      events: this.get('events')
    }
  }
}

// FortifyOrbit 中使用
class FortifyOrbit {
  private container: FortifyContainer

  constructor(config: FortifyConfig) {
    this.container = new FortifyContainer()
    this.registerDefaultServices()
  }

  private registerDefaultServices() {
    this.container.register('events', () => new FortifyEventEmitter())
    this.container.register('rateLimiter', () =>
      new RateLimiter(new MemoryStorage(), this.config.security.rateLimit)
    )
    // ...
  }

  // 允許替換服務
  service<K extends keyof FortifyServices>(
    key: K,
    factory: () => FortifyServices[K]
  ) {
    this.container.register(key, factory)
    return this
  }
}
```

### 3.5 配置驗證

**目標**: 啟動時驗證配置正確性

```typescript
// src/config/validator.ts
import { z } from 'zod'

const FortifyConfigSchema = z.object({
  features: z.object({
    registration: z.boolean().default(true),
    resetPasswords: z.boolean().default(true),
    emailVerification: z.boolean().default(false),
    twoFactorAuthentication: z.boolean().default(false)
  }),

  redirects: z.object({
    login: z.string().default('/dashboard'),
    logout: z.string().default('/'),
    register: z.string().default('/dashboard'),
    passwordReset: z.string().default('/login'),
    emailVerification: z.string().default('/dashboard')
  }),

  userModel: z.function().args().returns(z.any()),

  username: z.string().default('email'),
  password: z.string().default('password'),

  prefix: z.string().default(''),
  jsonMode: z.boolean().default(false),

  csrf: z.union([z.boolean(), z.object({})]).default(true),

  security: z.object({
    rateLimit: z.object({
      login: z.object({
        maxAttempts: z.number().min(1).default(5),
        decayMinutes: z.number().min(1).default(15),
        lockoutMinutes: z.number().min(1).default(30)
      })
    })
  }).optional()
})

export function validateConfig(config: unknown): FortifyConfig {
  const result = FortifyConfigSchema.safeParse(config)

  if (!result.success) {
    const errors = result.error.errors
      .map(e => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n')
    throw new Error(`Fortify configuration validation failed:\n${errors}`)
  }

  return result.data as FortifyConfig
}
```

### 3.6 中介軟體鏈

**目標**: 可組合的中介軟體架構

```typescript
// src/middleware/chain.ts
type MiddlewareFunction = (c: Context, next: Next) => Promise<Response | void>

class MiddlewareChain {
  private middlewares: MiddlewareFunction[] = []

  add(middleware: MiddlewareFunction): this {
    this.middlewares.push(middleware)
    return this
  }

  addIf(condition: boolean, middleware: MiddlewareFunction): this {
    if (condition) {
      this.middlewares.push(middleware)
    }
    return this
  }

  build(): MiddlewareFunction {
    return async (c, next) => {
      let index = 0

      const dispatch = async (): Promise<Response | void> => {
        if (index >= this.middlewares.length) {
          return next()
        }
        const middleware = this.middlewares[index++]
        return middleware(c, dispatch)
      }

      return dispatch()
    }
  }
}

// 使用範例
const loginMiddleware = new MiddlewareChain()
  .addIf(config.csrf, csrfProtection())
  .addIf(config.security.rateLimit.enabled, rateLimitMiddleware('login'))
  .add(validateLoginInput())
  .build()

router.post('/login', loginMiddleware, loginController.store)
```

## 架構演進圖

```
現況:
┌─────────────────────────────────────┐
│           FortifyOrbit              │
│  (硬編碼服務獲取, 無事件系統)         │
└────────────────┬────────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐ ┌──────────┐ ┌──────────┐
│Login   │ │Register  │ │  其他... │
│Ctrl    │ │  Ctrl    │ │  Ctrl   │
│(獨立)  │ │  (獨立)  │ │ (獨立)  │
└────────┘ └──────────┘ └──────────┘

優化後:
┌─────────────────────────────────────┐
│           FortifyOrbit              │
│         (協調者 + 事件中心)          │
└────────────────┬────────────────────┘
                 │
         ┌───────┼───────┐
         ▼       ▼       ▼
    ┌────────┐ ┌───┐ ┌──────────┐
    │Service │ │Evt│ │  Config  │
    │Container│ │Emtr│ │Validator│
    └────┬───┘ └───┘ └──────────┘
         │
    ┌────┴────┬────────────┬────────┐
    ▼         ▼            ▼        ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│ Auth  │ │ Rate  │ │ View  │ │Logger │
│Service│ │Limiter│ │Service│ │Service│
└───────┘ └───────┘ └───────┘ └───────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌─────────────────────────────────┐
│         BaseController          │
│    (統一錯誤處理/回應格式)       │
└─────────────┬───────────────────┘
              │
    ┌─────────┼─────────┬─────────┐
    ▼         ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌───┐
│ Login  │ │Register│ │ Reset  │ │...│
│  Ctrl  │ │  Ctrl  │ │  Ctrl  │ │   │
└────────┘ └────────┘ └────────┘ └───┘
```

## 實施步驟

### Step 1: 基礎設施
- [ ] 實作 `FortifyContainer` 服務容器
- [ ] 實作 `FortifyEventEmitter` 事件系統
- [ ] 實作 `validateConfig` 配置驗證

### Step 2: 控制器重構
- [ ] 建立 `BaseController` 基類
- [ ] 定義 `ErrorCode` 錯誤代碼
- [ ] 實作 `FortifyError` 錯誤類
- [ ] 重構所有控制器繼承基類

### Step 3: 中介軟體重構
- [ ] 實作 `MiddlewareChain`
- [ ] 重構路由使用中介軟體鏈
- [ ] 驗證中介軟體可組合性

### Step 4: 事件整合
- [ ] 在控制器中發送事件
- [ ] 實作內建事件處理器
- [ ] 文件說明事件系統

### Step 5: 向後相容
- [ ] 確保現有 API 不變
- [ ] 提供遷移指南
- [ ] 更新文件

## 向後相容性

| 變更 | 相容性 | 遷移方式 |
|------|--------|----------|
| 控制器基類 | ✅ 完全相容 | 內部變更 |
| 錯誤代碼 | ✅ 完全相容 | 新增功能 |
| 事件系統 | ✅ 完全相容 | 選用功能 |
| 服務容器 | ✅ 完全相容 | 選用功能 |
| 配置驗證 | ⚠️ 可能破壞 | 提供警告 |

## 成功標準

- [ ] 控制器代碼減少 30%+
- [ ] 錯誤處理 100% 統一
- [ ] 事件系統可正常訂閱
- [ ] 服務可輕鬆替換
- [ ] 配置錯誤在啟動時被發現
- [ ] 所有現有測試通過
- [ ] 文件完整更新
