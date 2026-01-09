# 🛰️ Gravito Membership Satellite

這是 Gravito 生態系中的標準會員管理衛星模組（Satellite）。基於 **DDD (領域驅動設計)** 與 **Galaxy Architecture** 構建，專為高效能、高擴展性與 Bun 原生環境優化。

## ✨ 核心功能

- **身分驗證 (Auth)**: 整合 Sentinel 模組，支援 Session 登入與 **持久化 (Remember Me)**。
- **註冊流程**: 包含自動生成驗證權杖與電子郵件發送 Hook。
- **安全防護**:
  - **多設備登入限制 (Single Device Login)**: 可開關功能，自動註冊並踢除舊裝置。
  - **密碼安全**: 使用 Bun 原生加密，支援自動 Rehash。
  - **Passkeys (WebAuthn)**: 內建 Passkeys 登錄 + 登入 API，可配合 `@simplewebauthn/browser` 與瀏覽器原生驗證器。
- **美化郵件 (Beautiful Emails)**:
  - 使用 Prism 模板引擎。
  - 支援現代化 HTML 佈局。
  - 完整多語系支持 (i18n)。
- **動態 Metadata**: 會員實體支援無 Schema 的元數據擴展，適合電商、訂閱制等場景。

## 🚀 快速開始

... (內容省略) ...

## 🛠️ 擴充與自定義 (DX Guide)

想要自定義品牌、覆寫郵件樣式或增加業務邏輯？請參考我們的：
👉 [**Membership 擴充與自定義指南 (EXTENDING.md)**](./docs/EXTENDING.md)

想要使用 Passkeys？請參考：
👉 [**Passkeys Integration Guide (PASSKEYS.md)**](./docs/PASSKEYS.md)

## ⚙️ 配置選項

在 `core` 配置中調整以下開關：

```typescript
{
  membership: {
    auth: {
      // 是否限制帳號只能在單一裝置登入
      single_device: true, 
      // 是否啟用持久化登入 (Remember Me)
      remember_me: true
    },
    branding: {
      name: 'Your Project Name',
      primary_color: '#3b82f6' // Tailwind Blue 500
    }
  },
  app: {
    url: 'https://yourapp.com'
  }
}
```

## 🎨 自定義模板

本模組提供預設的郵件模板。如果您想更換設計，只需在您的專案中建立以下檔案，Prism 會優先使用您的檔案：

- `views/emails/welcome.html`
- `views/emails/reset_password.html`
- `views/emails/level_changed.html`

模板中可以使用 `{{ branding.name }}` 和 `{{ branding.color }}` 來保持一致性。

本模組不強制綁定郵件驅動，而是透過 Hook 觸發動作。若您啟用了 `OrbitSignal`，本模組會自動處理以下 Hook：

- `membership:send-verification`: 發送註冊驗證郵件。
- `membership:send-reset-password`: 發送密碼重設郵件。
- `membership:level-changed`: 當會員等級提升時發送慶祝郵件。

## 📦 隊列整合 (Queue Integration)

為了獲得最佳效能，建議掛載 `OrbitStream` 來啟用非同步發信。本模組已預設呼叫 `mail.queue()`。

### 1. 安裝隊列軌道
```typescript
import { OrbitStream } from '@gravito/stream'

await core.orbit(new OrbitStream({
  default: 'redis',
  connections: {
    redis: { driver: 'redis', host: 'localhost' }
  }
}))
```

### 2. 運作原理
- **有隊列時**: 郵件動作會被推入 `default` 隊列，API 請求會立即回傳。
- **無隊列時**: 系統會自動降級為同步發送（Sync Send），確保功能不中斷。

## 🛠️ API 使用範例

### 會員註冊
```typescript
const register = container.make('membership.register')
await register.execute({
  name: 'Carl',
  email: 'carl@example.com',
  passwordPlain: 'secret123'
})
```

### 多設備登入檢查 (Middleware)
您可以將此中間件應用於敏感路由：
```typescript
import { verifySingleDevice } from '@gravito/satellite-membership/middleware'

router.get('/profile', verifySingleDevice, (c) => { ... })
```

## 📄 授權
MIT License
