---
title: Sentinel Auth
description: 認證與授權核心（Guards、Providers、Gates）。
---

# Sentinel Auth

Sentinel（`@gravito/sentinel`）是 Gravito 的認證與授權核心，支援多種 guard、provider 與 Gate 授權機制。

## 特色

- 多種 Guard（session / token / jwt）
- 可插拔 User Provider（callback）
- Gate 授權能力（`can` / `authorize`）
- 可與 Fortify UI 搭配

## 安裝

```bash
bun add @gravito/sentinel
```

若使用 Session Guard，請一併安裝：

```bash
bun add @gravito/pulsar
```

## 基本設定

```ts
import { PlanetCore } from '@gravito/core'
import { OrbitSentinel, CallbackUserProvider } from '@gravito/sentinel'
import { OrbitPulsar } from '@gravito/pulsar'

const core = new PlanetCore()

new OrbitPulsar({ driver: 'memory' }).install(core)

new OrbitSentinel({
  defaults: { guard: 'web', passwords: 'users' },
  guards: {
    web: { driver: 'session', provider: 'users', sessionKey: 'auth_session' },
  },
  providers: {
    users: { driver: 'callback' },
  },
  bindings: {
    providers: {
      users: () =>
        new CallbackUserProvider(
          async (id) => null,
          async (_user, _credentials) => false,
          async (_identifier, _token) => null,
          async (_credentials) => null
        ),
    },
  },
}).install(core)
```

## 認證流程

```ts
import { auth } from '@gravito/sentinel'

app.post('/login', async (c) => {
  const authManager = c.get('auth')
  const success = await authManager.attempt({
    email: c.req.query('email'),
    password: c.req.query('password'),
  })
  return success ? c.json({ ok: true }) : c.json({ ok: false }, 401)
})

app.get('/me', auth(), async (c) => {
  const user = await c.get('auth').user()
  return c.json({ user })
})
```

## Passkeys (WebAuthn) 支援

安裝 `@gravito/satellite-membership` 並掛載 `MembershipServiceProvider`，就會啟用 `/api/membership/passkeys` 相關 API（註冊/登入的註釋與範例請參考 `satellites/membership/docs/PASSKEYS.md`）。

```ts
import { MembershipServiceProvider } from '@gravito/satellite-membership'

new MembershipServiceProvider().install(core)
```

在 `membership.passkeys` 下填入 RP 描述，若沒設定 `origin`/`rp_id` 會自動取 `APP_URL`。

```ts
{
  membership: {
    passkeys: {
      origin: 'https://app.example.com',
      rp_id: 'app.example.com',
      name: 'App Membership',
      timeout: 90000,
      user_verification: 'preferred',
      attestation: 'none'
    }
  }
}
```

### 註冊與驗證端點

Satellite 暴露了四個 `/api/membership/passkeys` 的 JSON 端點：

- `POST /register/options` – 由 `auth()` 保護，必須先登入會員才能取得註冊挑戰。
- `POST /register/verify` – 驗證 attestation 回傳值，儲存 credential（含 `displayName`、`transports`、`id`）並維持登入狀態。
- `POST /login/options` – 接收會員 email 並產生認證挑戰。
- `POST /login/verify` – 驗證 assertion 之後透過現有的 `AuthManager` 重新登入會員。

Passkeys 依賴 session 儲存，因此請先註冊 `OrbitPulsar` 或其他提供 `core.adapter.session` 的 orbit，並在呼叫上述端點時帶 `credentials: 'include'`。後端會將每一次挑戰暫存在 session 中以便比對回傳資料。

### 客戶端整合提示

- 使用者登入後，先呼叫 `/register/options` 獲取挑戰，再透過 `@simplewebauthn/browser` 的 `startRegistration`，將回傳的 credential（可額外帶 `displayName`）送到 `/register/verify`。
- Passkey 登入時先將 member email POST 到 `/login/options`，用 `startAuthentication` 取得 assertion，之後送到 `/login/verify`。
- 前端應顯示 JSON 錯誤訊息，讓使用者知道 attestation 或 authentication 失敗的原因。
- 後端已儲存 credential 的 metadata，因此若要在 UI 提供「已註冊裝置」列表，可以在客戶端留存 `credential.id`、`displayName` 等資料。

如需完整示範與 roundtrip，可以參考 [`satellites/membership/docs/PASSKEYS.md`](../../satellites/membership/docs/PASSKEYS.md)。
## 授權 Gate

```ts
import { can } from '@gravito/sentinel'

app.get('/admin', can('manage-admin'), async (c) => {
  return c.text('ok')
})
```

## 與 Fortify 搭配

Fortify 提供 UI 與完整認證流程；Sentinel 提供底層守衛與授權邏輯：

- Fortify：UI/路由/表單
- Sentinel：guards / providers / gates

## 下一步

- Fortify 認證 UI：[認證 (Fortify)](./authentication.md)
- 授權能力：[授權 (Authorization)](./authorization.md)
