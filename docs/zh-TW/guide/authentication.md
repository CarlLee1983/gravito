# 認證 (Fortify)

Gravito Fortify 提供一套完整、開箱即用的認證系統，靈感來自 Laravel Breeze 和 Fortify。只需一個 CLI 指令，即可獲得登入、註冊、密碼重設和電子郵件驗證功能 — 全部都有精美的樣式且完整可用。

## 快速開始

### 安裝

```bash
# 安裝套件
bun add @gravito/fortify @gravito/sentinel

# 生成認證檔案
bun gravito fortify:install
```

### 選擇您的 Stack

Fortify 支援三種視圖 Stack：

```bash
# 預設：內建 HTML 模板
bun gravito fortify:install

# Inertia + React
bun gravito fortify:install --stack=react

# Inertia + Vue
bun gravito fortify:install --stack=vue
```

### 執行遷移

```bash
bun gravito migrate
```

### 配置您的應用程式

將 `FortifyOrbit` 加入到 `gravito.config.ts`：

```typescript
import { FortifyOrbit } from '@gravito/fortify'
import { User } from './src/models/User'

export default {
  orbits: [
    new FortifyOrbit({
      userModel: () => User,
      features: {
        registration: true,
        resetPasswords: true,
        emailVerification: false,
      },
      redirects: {
        login: '/dashboard',
        logout: '/',
      },
    })
  ]
}
```

完成！訪問 `/login` 即可看到您的認證頁面。

## 生成的檔案

`fortify:install` 指令會生成：

| 檔案 | 說明 |
|------|------|
| `config/fortify.ts` | 配置檔 |
| `src/models/User.ts` | 包含標準欄位的 User Model |
| `src/database/migrations/xxx_create_users_table.ts` | Users 資料表遷移 |
| `src/database/migrations/xxx_create_password_reset_tokens_table.ts` | 密碼重設 Token 資料表遷移 |
| `src/pages/auth/*.tsx` 或 `*.vue` | 視圖模板（僅 React/Vue） |

## 路由

| 方法 | URI | 說明 |
|------|-----|------|
| GET | `/login` | 顯示登入表單 |
| POST | `/login` | 處理登入請求 |
| POST | `/logout` | 處理登出 |
| GET | `/register` | 顯示註冊表單 |
| POST | `/register` | 處理註冊 |
| GET | `/forgot-password` | 顯示忘記密碼表單 |
| POST | `/forgot-password` | 發送密碼重設連結 |
| GET | `/reset-password/:token` | 顯示重設密碼表單 |
| POST | `/reset-password` | 處理密碼重設 |
| GET | `/verify-email` | 顯示驗證提示 |
| GET | `/verify-email/:id/:hash` | 驗證電子郵件地址 |
| POST | `/email/verification-notification` | 重新發送驗證郵件 |

## 配置

### 功能開關

```typescript
new FortifyOrbit({
  userModel: () => User,
  features: {
    registration: true,      // 啟用使用者註冊
    resetPasswords: true,    // 啟用密碼重設
    emailVerification: true, // 啟用電子郵件驗證
  },
})
```

### 自訂重定向

```typescript
new FortifyOrbit({
  userModel: () => User,
  redirects: {
    login: '/dashboard',         // 登入成功後
    logout: '/',                 // 登出後
    register: '/welcome',        // 註冊後
    passwordReset: '/login',     // 密碼重設後
    emailVerification: '/home',  // 電子郵件驗證後
  },
})
```

### 路由前綴

為所有認證路由添加前綴：

```typescript
new FortifyOrbit({
  userModel: () => User,
  prefix: '/auth', // 路由變為 /auth/login、/auth/register 等
})
```

### SPA / API 模式

適用於單頁應用程式或 API 優先開發：

```typescript
new FortifyOrbit({
  userModel: () => User,
  jsonMode: true, // 返回 JSON 而非重定向
})
```

**JSON 回應範例：**

```json
// POST /login (成功)
{
  "message": "Login successful",
  "user": { "id": 1, "name": "Alice", "email": "alice@example.com" },
  "redirect": "/dashboard"
}

// POST /login (失敗)
{
  "error": "Invalid credentials"
}
```

## 中間件

### 已驗證電子郵件

保護需要已驗證電子郵件的路由：

```typescript
import { verified } from '@gravito/fortify'

router.middleware(verified).group((r) => {
  r.get('/premium-content', premiumHandler)
  r.post('/create-team', createTeamHandler)
})
```

如果使用者的電子郵件未驗證：
- **伺服器渲染應用**：重定向到 `/verify-email`
- **API 模式**（`Accept: application/json`）：返回 `403 Forbidden`

## 自訂視圖

### HTML Stack

使用內建 HTML stack 時，Fortify 提供現代深色主題的登入頁面。如需自訂：

1. 建立您自己的視圖模板
2. 在 `fortify.ts` 中配置路徑：

```typescript
new FortifyOrbit({
  userModel: () => User,
  views: {
    login: 'auth/login',
    register: 'auth/register',
    forgotPassword: 'auth/forgot-password',
    resetPassword: 'auth/reset-password',
    verifyEmail: 'auth/verify-email',
  },
})
```

### Inertia React/Vue

對於 Inertia stack，視圖會生成在 `src/pages/auth/`。直接自訂它們：

- `src/pages/auth/Login.tsx`（或 `.vue`）
- `src/pages/auth/Register.tsx`
- `src/pages/auth/ForgotPassword.tsx`

## 事件

Fortify 會為關鍵認證動作發送事件：

```typescript
// 監聽認證事件
core.events.on('auth.login', (user) => {
  console.log('使用者已登入:', user.email)
})

core.events.on('auth.register', (user) => {
  // 發送歡迎郵件、追蹤分析等
})

core.events.on('auth.logout', (user) => {
  // 清理使用者 session 資料
})

core.events.on('auth.password-reset', (user) => {
  // 通知使用者密碼已變更
})
```

## 電子郵件整合

Fortify 設計為與 `@gravito/orbit-mail` 搭配使用：

```typescript
import { MailOrbit } from '@gravito/orbit-mail'

// 在您的應用程式中配置郵件
new MailOrbit({
  driver: 'smtp',
  host: process.env.MAIL_HOST,
  port: 587,
  username: process.env.MAIL_USERNAME,
  password: process.env.MAIL_PASSWORD,
})
```

> **注意：** 郵件發送功能將在未來版本中推出。目前，重設連結和驗證 URL 會輸出到控制台。

## 安全最佳實踐

1. **速率限制**：考慮為登入/註冊路由添加速率限制
2. **HTTPS**：在生產環境中始終使用 HTTPS
3. **強密碼**：實施密碼複雜度要求
4. **Session 安全**：配置安全的 session 設定

```typescript
// 範例：限制登入嘗試次數
import { rateLimiter } from '@gravito/sentinel'

router.post('/login', rateLimiter({ max: 5, window: '15m' }), loginHandler)
```

## 下一步

- 了解 [授權](/zh-TW/guide/authorization) 以控制使用者權限
- 設置 [Session 管理](/zh-TW/guide/sessions) 以持久化登入
- 配置 [電子郵件通知](/zh-TW/guide/mail) 以發送交易郵件
