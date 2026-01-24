# Phase 1: 測試強化計劃

> 優先級: P0 | 預估影響: 高

## 現況分析

### 當前覆蓋率

| 指標 | 當前值 | 目標值 |
|------|--------|--------|
| 行覆蓋率 | 62.45% | 80%+ |
| 函數覆蓋率 | 55.39% | 80%+ |
| 分支覆蓋率 | - | 75%+ |

### 按檔案覆蓋狀況

#### 完全覆蓋 (100%)
| 檔案 | 說明 |
|------|------|
| `src/config.ts` | 設定預設值 |
| `src/controllers/LoginController.ts` | 登入控制器 |
| `src/controllers/RegisterController.ts` | 註冊控制器 |
| `src/controllers/LogoutController.ts` | 登出控制器 |
| `src/controllers/ForgotPasswordController.ts` | 忘記密碼 |
| `src/controllers/ResetPasswordController.ts` | 重設密碼 |
| `src/controllers/VerifyEmailController.ts` | 郵件驗證 |
| `src/routes/auth.ts` | 路由定義 |
| `src/mail/index.ts` | 郵件模板導出 |

#### 部分覆蓋 (需改進)
| 檔案 | 行數% | 缺失說明 |
|------|-------|----------|
| `src/csrf.ts` | 80% | 18-19 行未測試 |
| `src/middleware/verified.ts` | 88.89% | 24 行未測試 |
| `src/FortifyOrbit.ts` | 100% 行 / 75% 函數 | 部分方法未觸發 |
| `src/mail/ResetPasswordMail.ts` | 100% 行 / 75% 函數 | 部分方法未觸發 |
| `src/mail/VerifyEmailMail.ts` | 100% 行 / 75% 函數 | 部分方法未觸發 |

### 測試結構現況

```
tests/
├── fortify.test.ts              # 474 行 - 核心測試
├── controllers-extra.test.ts    # 384 行 - 控制器詳細測試
├── routes.test.ts               # 149 行 - 路由測試
└── mail.test.ts                 # 60 行 - 郵件模板測試

總計: 1,067 行測試代碼
```

## 優化方案

### 1.1 補齊 CSRF 模組測試

**目標**: `src/csrf.ts` 達到 100% 覆蓋

```typescript
// 缺失的測試場景 (18-19 行)
describe('csrf.ts edge cases', () => {
  it('should handle missing CSRF token gracefully', async () => {
    const context = createMockContext({
      headers: {}, // 無 CSRF 標頭
      body: {}     // 無 CSRF 欄位
    })

    const result = await validateCsrf(context)
    expect(result.valid).toBe(false)
  })

  it('should validate CSRF from custom header', async () => {
    const context = createMockContext({
      headers: { 'X-XSRF-TOKEN': 'valid-token' }
    })

    const result = await validateCsrf(context)
    expect(result.valid).toBe(true)
  })
})
```

### 1.2 補齊 Verified 中介軟體測試

**目標**: `src/middleware/verified.ts` 達到 100% 覆蓋

```typescript
// 缺失的測試場景 (24 行)
describe('verified middleware edge cases', () => {
  it('should redirect to verify-email when user not verified', async () => {
    const user = createMockUser({ email_verified_at: null })
    const context = createMockContext({ user })

    const middleware = verified()
    const response = await middleware(context, next)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/verify-email')
  })

  it('should return JSON error when jsonMode enabled', async () => {
    const user = createMockUser({ email_verified_at: null })
    const context = createMockContext({ user, jsonMode: true })

    const middleware = verified()
    const response = await middleware(context, next)

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('email_not_verified')
  })
})
```

### 1.3 補齊郵件類方法測試

**目標**: 郵件類的所有方法達到 100% 覆蓋

```typescript
// ResetPasswordMail 測試
describe('ResetPasswordMail', () => {
  it('should build email with correct subject', () => {
    const mail = new ResetPasswordMail('user@example.com', 'token123')
    const built = mail.build()

    expect(built.subject).toBe('重設密碼')
  })

  it('should include reset URL in content', () => {
    const mail = new ResetPasswordMail('user@example.com', 'token123')
    const content = mail.content()

    expect(content).toContain('/reset-password/token123')
  })

  it('should escape HTML in email content', () => {
    const maliciousEmail = '<script>alert("xss")</script>@example.com'
    const mail = new ResetPasswordMail(maliciousEmail, 'token')
    const content = mail.content()

    expect(content).not.toContain('<script>')
  })
})

// VerifyEmailMail 測試
describe('VerifyEmailMail', () => {
  it('should generate signed verification URL', () => {
    const mail = new VerifyEmailMail(
      { id: 1, email: 'user@example.com' },
      'https://example.com/verify-email/1/hash'
    )
    const content = mail.content()

    expect(content).toContain('/verify-email/1/')
  })
})
```

### 1.4 新增邊界案例測試

**目標**: 覆蓋所有錯誤處理路徑

```typescript
// 控制器錯誤處理測試
describe('Controller error handling', () => {
  describe('LoginController', () => {
    it('should handle database connection error', async () => {
      mockAuthManager.attempt.mockRejectedValue(new Error('DB Connection failed'))

      const response = await loginController.store(context)

      expect(response.status).toBe(500)
    })

    it('should handle invalid credentials format', async () => {
      const context = createMockContext({
        body: { email: 'not-an-email', password: '' }
      })

      const response = await loginController.store(context)

      expect(response.status).toBe(422)
    })
  })

  describe('RegisterController', () => {
    it('should reject duplicate email registration', async () => {
      mockUserModel.where.mockResolvedValue({ exists: true })

      const response = await registerController.store(context)

      expect(response.status).toBe(422)
    })

    it('should handle password hash failure', async () => {
      mockHashManager.make.mockRejectedValue(new Error('Hash failed'))

      const response = await registerController.store(context)

      expect(response.status).toBe(500)
    })
  })
})
```

### 1.5 新增整合測試

**目標**: 驗證完整的認證流程

```typescript
// tests/integration/auth-flow.test.ts
describe('Authentication Flow Integration', () => {
  it('should complete full registration flow', async () => {
    // 1. 註冊
    const registerRes = await app.request('/register', {
      method: 'POST',
      body: { email: 'new@example.com', password: 'password123' }
    })
    expect(registerRes.status).toBe(302)

    // 2. 登入
    const loginRes = await app.request('/login', {
      method: 'POST',
      body: { email: 'new@example.com', password: 'password123' }
    })
    expect(loginRes.status).toBe(302)

    // 3. 驗證已登入
    const dashboardRes = await app.request('/dashboard', {
      headers: { Cookie: loginRes.headers.get('Set-Cookie') }
    })
    expect(dashboardRes.status).toBe(200)
  })

  it('should complete password reset flow', async () => {
    // 1. 請求重設
    const forgotRes = await app.request('/forgot-password', {
      method: 'POST',
      body: { email: 'user@example.com' }
    })
    expect(forgotRes.status).toBe(302)

    // 2. 使用令牌重設
    const token = getLatestResetToken()
    const resetRes = await app.request('/reset-password', {
      method: 'POST',
      body: { token, password: 'newpassword123', password_confirmation: 'newpassword123' }
    })
    expect(resetRes.status).toBe(302)

    // 3. 使用新密碼登入
    const loginRes = await app.request('/login', {
      method: 'POST',
      body: { email: 'user@example.com', password: 'newpassword123' }
    })
    expect(loginRes.status).toBe(302)
  })
})
```

## 測試目錄重組

### 建議結構

```
tests/
├── unit/
│   ├── config.test.ts
│   ├── csrf.test.ts
│   ├── middleware/
│   │   └── verified.test.ts
│   ├── controllers/
│   │   ├── login.test.ts
│   │   ├── register.test.ts
│   │   ├── logout.test.ts
│   │   ├── forgot-password.test.ts
│   │   ├── reset-password.test.ts
│   │   └── verify-email.test.ts
│   └── mail/
│       ├── reset-password-mail.test.ts
│       └── verify-email-mail.test.ts
├── integration/
│   ├── auth-flow.test.ts
│   └── routes.test.ts
├── helpers/
│   ├── factory.ts
│   ├── mock-context.ts
│   └── mock-user.ts
└── fixtures/
    └── users.json
```

## 實施步驟

### Step 1: 測試基礎設施
- [ ] 建立 `tests/helpers/factory.ts` - 測試資料工廠
- [ ] 建立 `tests/helpers/mock-context.ts` - Context 模擬
- [ ] 重構現有測試使用共用工具

### Step 2: 補齊單元測試
- [ ] `csrf.ts` 邊界案例測試
- [ ] `verified.ts` 中介軟體完整測試
- [ ] 郵件類所有方法測試

### Step 3: 錯誤處理測試
- [ ] 資料庫連線錯誤
- [ ] 驗證失敗場景
- [ ] 外部服務錯誤（郵件發送失敗）

### Step 4: 整合測試
- [ ] 完整註冊流程
- [ ] 完整密碼重設流程
- [ ] 完整郵件驗證流程

### Step 5: 覆蓋率驗證
- [ ] 執行 `bun test:coverage`
- [ ] 確認達到 80%+ 覆蓋率
- [ ] 提升測試閾值設定

## 風險評估

| 風險 | 機率 | 影響 | 緩解措施 |
|------|------|------|----------|
| Mock 不完整導致假陽性 | 中 | 高 | 定期審查 mock 實作 |
| 整合測試環境依賴 | 中 | 中 | 使用記憶體資料庫 |
| 測試執行時間過長 | 低 | 低 | 並行執行測試 |

## 成功標準

- [ ] 行覆蓋率 ≥ 80%
- [ ] 函數覆蓋率 ≥ 80%
- [ ] 所有控制器 100% 覆蓋
- [ ] 所有中介軟體 100% 覆蓋
- [ ] 整合測試覆蓋主要流程
- [ ] CI 測試閾值提升至 80%
