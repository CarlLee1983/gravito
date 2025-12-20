---
title: 安全性 (Security)
---

# 安全性 (Security)

Gravito 非常重視安全性，並提供了多種工具來協助您保護應用程式。

## 設定

在使用安全性功能之前，請確保您已在 `.env` 檔案或設定中設定 `APP_KEY`。此金鑰用於加密與加密 Cookie。

```env
APP_KEY=base64:YOUR_GENERATED_KEY
```

您可以使用 `Encrypter` 類別產生金鑰：

```ts
import { Encrypter } from 'gravito-core'

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
core.app.get('/', (c) => {
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

要讀取 Cookie，請使用 Hono 的標準 cookie helper。如果 Cookie 已加密，您需要使用 encrypter 手動解密。

```typescript
import { getCookie } from 'hono/cookie';

core.app.get('/read', (c) => {
    const secret = getCookie(c, 'secret');
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

CSRF 保護由 `@gravito/orbit-session` 提供。詳情請參閱 [Session 文件](../api/orbit-session.md)。
