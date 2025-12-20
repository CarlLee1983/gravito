---
title: Orbit Auth
---

# Orbit Auth

> Gravito 的身份驗證 Orbit。

套件名稱：`@gravito/orbit-auth`

提供彈性的身份驗證系統，支援多種 Guard（Session、JWT、Token）與 User Provider。

## 安裝

```bash
bun add @gravito/orbit-auth
```

## 設定

Orbit Auth 透過 `PlanetCore` 中的 `auth` 設定物件進行設定。

```typescript
import { PlanetCore } from 'gravito-core';
import { OrbitAuth } from '@gravito/orbit-auth';
import { OrbitSession } from '@gravito/orbit-session';

const core = await PlanetCore.boot({
  config: {
    auth: {
      defaults: {
        guard: 'web',
        passwords: 'users',
      },
      guards: {
        web: {
          driver: 'session',
          provider: 'users',
          sessionKey: 'login_web_59ba36addc2b2f9401580f014c7f58ea4e30989d',
        },
        api: {
          driver: 'jwt',
          provider: 'users',
          secret: process.env.JWT_SECRET || 'secret',
          algo: 'HS256',
        },
      },
      providers: {
        users: {
          driver: 'drizzle', // 或 'callback'
          model: 'User', // 您的 User model
        },
      },
    },
  },
  orbits: [OrbitSession, OrbitAuth],
});
```

## 基本用法

### 存取 Auth Manager

您可以透過 context 存取 `AuthManager`。

```typescript
core.app.get('/user', async (c) => {
  const auth = c.get('auth');

  if (await auth.check()) {
    const user = await auth.user();
    return c.json({ user });
  }

  return c.json({ message: 'Unauthenticated' }, 401);
});
```

### 驗證操作

```typescript
// 登入 (Session Guard)
await auth.login(user);

// 登出
await auth.logout();

// 嘗試使用憑證登入
if (await auth.attempt({ email, password })) {
    // 成功
}
```

### 使用特定 Guard

```typescript
// 明確存取 'api' guard
const apiAuth = auth.guard('api');
const user = await apiAuth.user();
```

## 密碼雜湊 (Hashing)

Orbit Auth 會在 request context 中以 `hash` 暴露 `HashManager`：

```ts
core.app.post('/register', async (c) => {
  const hash = c.get('hash')
  const passwordHash = await hash.make('plain-password')
  return c.json({ passwordHash })
})
```

## 密碼重設 / 信箱驗證（Primitives）

Orbit Auth 可選擇性提供用來組裝 Laravel 風格流程的 primitives：

- `PasswordBroker`（context key: `passwords`）
- `EmailVerificationService`（context key: `emailVerification`）

在 options 中啟用：

```ts
new OrbitAuth({
  // ...auth config
  passwordReset: { enabled: true, ttlSeconds: 3600 },
  emailVerification: { enabled: true },
})
```

使用方式：

```ts
core.app.post('/password/forgot', async (c) => {
  const broker = c.get('passwords')
  if (!broker) return c.text('未啟用', 500)
  const token = await broker.createToken('user@example.com')
  return c.json({ token })
})

core.app.get('/email/verify', (c) => {
  const verifier = c.get('emailVerification')
  if (!verifier) return c.text('未啟用', 500)
  const token = c.req.query('token') ?? ''
  const payload = verifier.verifyToken(token)
  return payload ? c.json(payload) : c.text('無效 token', 400)
})
```

## 授權 (Gates)

Orbit Auth 包含用於授權檢查的 Gate 系統。

### 定義 Gate

在您的 `AppServiceProvider` 或啟動程式碼中定義 gate。

```typescript
core.app.use('*', async (c, next) => {
  const gate = c.get('gate')

  gate.define('update-post', (user, post) => {
    return user?.id === post.user_id
  })

  await next()
})
```

### 檢查授權

```typescript
const gate = c.get('gate')

if (await gate.allows('update-post', post)) {
  // 已授權
}

// 若未授權則拋出 403
await gate.authorize('update-post', post);
```

### 透過 Context

```typescript
core.app.get('/posts/:id', async (c) => {
  // ... 取得 post

  const gate = c.get('gate')
  await gate.authorize('update-post', post)
});
```

## Hooks

- `auth:init` - 當 Auth orbit 初始化時觸發。
- `auth:login` - 登入成功後觸發。
- `auth:logout` - 登出後觸發。
- `auth:failed` - 驗證失敗後觸發。
