---
title: 安全性 (Security)
---

# 安全性 (Security)

Gravito 非常重視安全性，並提供了多種工具來協助您保護應用程式。

## 預設安全強化（模板與腳手架）

所有官方建站模板與腳手架已預設啟用：

- 安全標頭（CSP、X-Frame-Options、Referrer-Policy 等）
- Request body 大小限制

可透過環境變數覆蓋：

```env
# CSP 字串，或設為 "false" 以關閉
APP_CSP=default-src 'self'; script-src 'self' 'unsafe-inline'
# HSTS max-age（秒，僅 production 生效）
APP_HSTS_MAX_AGE=15552000
# Body size 上限（bytes）。設為 0 或負值視為關閉。
APP_BODY_LIMIT=1048576
# 強制要求 Content-Length（"true" 啟用）
APP_BODY_REQUIRE_LENGTH=false
```

## 設定

在使用安全性功能之前，請確保您已在 `.env` 檔案或設定中設定 `APP_KEY`。此金鑰用於加密與加密 Cookie。

```env
APP_KEY=base64:YOUR_GENERATED_KEY
```

您可以使用 `Encrypter` 類別產生金鑰：

```ts
import { Encrypter } from '@gravito/core'

console.log(Encrypter.generateKey())
```

## 加密 (Encryption)

Gravito 提供 `Encrypter` 服務，使用 OpenSSL (透過 Node 的 `crypto` 模組) 提供 AES-256-CBC 加密。

### 使用方法

如果 `APP_KEY` 存在，`PlanetCore` 會自動初始化 encrypter。

```typescript
const encrypted = core.encrypter.encrypt('secret message');
const decrypted = core.encrypter.decrypt(encrypted);
```

## Cookie

Gravito 提供安全的 `CookieJar` 來管理 Cookie，並支援自動加密。

### 設定 Cookie

`cookieJar` 可在請求 context 變數中取得。

```typescript
core.router.get('/', (c) => {
    const cookies = c.get('cookieJar');

    // 設定 Cookie (預設 60 分鐘)
    cookies.queue('name', 'value');

    // 設定加密 Cookie
    cookies.queue('secret', 'value', 60, { encrypt: true });

    // 設定永久 Cookie (5 年)
    cookies.forever('remember_token', 'token');

    return c.text('Hello');
});
```

加入 jar 中的 Cookie 會由核心 middleware 自動附加到回應中。

### 讀取 Cookie

要讀取 Cookie，請使用引擎標準提供的 cookie 輔助方法。如果 Cookie 已加密，您需要使用 encrypter 手動解密。

```typescript
core.router.get('/read', (c) => {
    // 必要時可透過 c.native 存取引擎原生請求
    const secret = c.native.req.cookie('secret');
    if (secret) {
        try {
            const value = core.encrypter.decrypt(secret);
            // ...
        } catch (e) {
            // 無效的 payload
        }
    }
});
```

## CSRF 保護

可透過 `@gravito/core` 的 `csrfProtection` 啟用 CSRF 保護，Fortify 的驗證路由已預設啟用。

```ts
import { csrfProtection } from '@gravito/core'

core.router
  .middleware(csrfProtection())
  .group((r) => {
    r.post('/profile', (c) => c.text('ok'))
  })
```

## 安全標頭

使用 `securityHeaders` 套用 CSP 與相關標頭。

```ts
import { securityHeaders } from '@gravito/core'

core.adapter.use(
  '*',
  securityHeaders({
    contentSecurityPolicy: "default-src 'self'; object-src 'none'; frame-ancestors 'none'",
    hsts: process.env.NODE_ENV === 'production' ? { maxAge: 15552000 } : false,
  })
)
```

也可提供函式以便依請求產生 CSP（例如 nonce）：

```ts
core.adapter.use(
  '*',
  securityHeaders({
    contentSecurityPolicy: (c) => {
      const nonce = crypto.randomUUID()
      c.set('cspNonce', nonce)
      return `default-src 'self'; script-src 'self' 'nonce-${nonce}'`
    },
  })
)
```

## Request Body 限制

使用 `bodySizeLimit` 及早拒絕過大的請求。

```ts
import { bodySizeLimit } from '@gravito/core'

core.adapter.use('*', bodySizeLimit(1_048_576))
```

若要強制要求 `Content-Length`，可啟用 strict 模式：

```ts
core.adapter.use('*', bodySizeLimit(1_048_576, { requireContentLength: true }))
```

## CORS

使用內建 middleware 啟用 CORS，並在 production 明確限制允許的來源。

```ts
import { cors } from '@gravito/core'

core.adapter.use(
  '*',
  cors({
    origin: ['https://example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
)
```

## Production Gate（Debug/Dev 工具）

部分開發工具不應在 production 直接公開：

- OrbitSignal Dev UI 在 production 預設關閉，需明確允許或提供 gate。
- Spectrum dashboard 在 production 需要 gate，否則會被拒絕。

```ts
import { OrbitSignal } from '@gravito/signal'
import { SpectrumOrbit } from '@gravito/spectrum'
import { createHeaderGate } from '@gravito/core'

const adminGate = createHeaderGate({
  headerName: 'x-admin-token',
  token: process.env.ADMIN_TOKEN,
})

new OrbitSignal({ devMode: true, devUiGate: adminGate })

new SpectrumOrbit({ gate: adminGate })
```
