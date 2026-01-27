# @gravito/fortify 🛡️

Gravito 框架的端到端認證工作流解決方案。

`@gravito/fortify` 是 Gravito 的無頭（Headless）認證後端，提供強大、安全且高度可配置的認證功能。受 Laravel Fortify 與 Breeze 啟發，它處理了認證邏輯中所有繁重的工作，同時讓您對使用者介面保持完全控制。

## 🚀 核心功能

Fortify 具備現代應用程式所需的所有認證功能：

- **使用者註冊**：可自定義的註冊流程，包含密碼強度驗證與電子郵件驗證。
- **身分認證**：安全的登入/登出管理，支援會話（Session）與「記住我（Remember Me）」。
- **雙因素認證 (2FA)**：基於 TOTP 的 2FA，包含恢復碼（Recovery Codes）支援。
- **OAuth / 社群登入**：內建 Google 與 GitHub 支援，並可輕鬆擴展至其他供應商。
- **API 權限令牌**：Sanctum 風格的個人存取令牌（Personal Access Tokens），用於無狀態 API 認證。
- **魔術連結登入 (Magic Link)**：透過安全的電子郵件連結進行無密碼認證。
- **安全特性**：
  - **速率限制 (Rate Limiting)**：針對登入、密碼重設與驗證請求的滑動視窗速率限制器。
  - **帳戶鎖定 (Account Lockout)**：在多次嘗試失敗後自動進行臨時或永久鎖定。
  - **安全標頭 (Security Headers)**：自動注入 CSP、HSTS、XSS-Protection 與 Frame Options。
  - **密碼強度**：基於規則的密碼驗證（長度、字符類型、防止常用弱密碼）。
  - **事件日誌**：詳細記錄認證事件（登入、登入失敗、啟用 2FA 等）的審計日誌。

## 📦 安裝

```bash
bun add @gravito/fortify @gravito/sentinel
```

## 🛠️ 快速開始

### 1. 配置 Fortify Orbit

將 `FortifyOrbit` 新增至您的 Gravito 配置中。

```typescript
// gravito.config.ts
import { FortifyOrbit } from '@gravito/fortify'
import { User } from './models/User'

export default {
  orbits: [
    new FortifyOrbit({
      userModel: () => User,
      features: {
        registration: true,
        resetPasswords: true,
        emailVerification: true,
        twoFactorAuthentication: true,
        apiTokens: true,
      },
      redirects: {
        login: '/dashboard',
        logout: '/',
      },
    })
  ]
}
```

### 2. 執行遷移

Fortify 需要多個資料表來管理令牌、OAuth 身份與 2FA 數據。

```bash
bun gravito migrate
```

## 🗺️ 路由定義

啟用後，Fortify 會自動註冊以下路由：

### 標準認證
| 方法 | URI | 描述 |
|--------|-----|-------------|
| GET | `/login` | 顯示登入表單 |
| POST | `/login` | 處理登入請求 |
| POST | `/logout` | 處理登出請求 |
| GET | `/register` | 顯示註冊表單 |
| POST | `/register` | 處理註冊請求 |

### 密碼與驗證
| 方法 | URI | 描述 |
|--------|-----|-------------|
| GET | `/forgot-password` | 顯示忘記密碼表單 |
| POST | `/forgot-password` | 發送重設連結 |
| GET | `/reset-password/:token` | 顯示密碼重設表單 |
| POST | `/reset-password` | 處理密碼重設 |
| GET | `/verify-email` | 顯示郵件驗證提示 |
| GET | `/verify-email/:id/:hash` | 驗證電子郵件 |
| POST | `/email/verification-notification` | 重新發送驗證郵件 |

### 進階功能
| 方法 | URI | 描述 |
|--------|-----|-------------|
| POST | `/two-factor-authentication` | 啟用 2FA |
| DELETE | `/two-factor-authentication` | 停用 2FA |
| GET | `/two-factor-qr-code` | 獲取 2FA QR Code |
| GET | `/two-factor-recovery-codes` | 獲取恢復碼 |
| GET | `/oauth/:provider` | 重導向至 OAuth 供應商 |
| GET | `/oauth/:provider/callback` | 處理 OAuth 回呼 |
| POST | `/magic-link` | 發送魔術連結郵件 |
| GET | `/magic-link/:token` | 魔術連結驗證與登入 |

## ⚙️ 配置選項

Fortify 高度可配置。您可以自定義功能開關、安全規則與重導向路徑。

```typescript
interface FortifyConfig {
  features: {
    registration?: boolean
    resetPasswords?: boolean
    emailVerification?: boolean
    twoFactorAuthentication?: boolean
    apiTokens?: boolean
    oauth?: boolean
    magicLink?: boolean
  }
  security?: {
    rateLimit?: RateLimitConfig      // 自定義速率限制
    lockout?: LockoutConfig          // 失敗嘗試閾值
    passwordRules?: PasswordRules    // 長度、符號等規則
    securityHeaders?: HeadersConfig  // CSP, HSTS 設定
  }
  jsonMode?: boolean                 // 為 SPA 開啟 JSON 模式（不重導向）
  prefix?: string                    // 路由前綴（例如 '/auth'）
}
```

## 📱 SPA / API 模式

對於單頁應用程式（SPA），請開啟 `jsonMode`。所有端點將返回包含狀態與數據的 JSON 物件，而不是執行重導向或渲染 HTML。

```typescript
new FortifyOrbit({
  userModel: () => User,
  jsonMode: true,
})
```

## 🔒 中介軟體 (Middleware)

Fortify 提供多個中介軟體來保護您的路由：

- `verified`：確保使用者的電子郵件已通過驗證。
- `bearerTokenAuth`：使用個人存取令牌認證請求。

```typescript
import { verified } from '@gravito/fortify'

router.middleware(verified).group((r) => {
  r.get('/dashboard', (c) => c.text('歡迎回來！'))
})
```

## 🏗️ 架構設計

Fortify 基於 **Galaxy Architecture** 構建，作為 **Orbit** 擴展與 Gravito 核心整合。

- **Controllers**：認證邏輯處理器，繼承自 `BaseController` 以實現統一的錯誤與回應處理。
- **Services**：處理 OAuth、2FA、魔術連結與令牌的領域邏輯。
- **Events**：發送如 `auth:login` 與 `auth:register` 等事件，供應用程式其他部分監聽。

## 📄 授權協議

MIT © Carl Lee
