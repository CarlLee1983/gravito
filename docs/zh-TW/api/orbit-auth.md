---
title: Orbit Auth
---

# Orbit Auth

> 以 Gravito Orbit 形式提供身分驗證工具。

套件：`@gravito/orbit-auth`

提供簡單的 JWT 工具與 Hooks，用於擴充驗證邏輯。

## 安裝

```bash
bun add @gravito/orbit-auth
```

## 用法（JWT）

```typescript
import { PlanetCore } from 'gravito-core';
import orbitAuth from '@gravito/orbit-auth';

const core = new PlanetCore();

// 初始化 Auth Orbit
const auth = orbitAuth(core, {
  secret: 'SUPER_SECRET_KEY',
  exposeAs: 'auth' // 可透過 c.get('auth') 存取
});

// 在路由中使用
core.app.post('/login', async (c) => {
  const token = await auth.sign({ sub: '123', role: 'admin' });
  return c.json({ token });
});
```

## 用法（Session 登入狀態）

若要比照 Laravel 的登入狀態，請搭配 `@gravito/orbit-session`，並啟用 session guard：

```ts
import { PlanetCore } from 'gravito-core'
import { OrbitSession } from '@gravito/orbit-session'
import { OrbitAuth } from '@gravito/orbit-auth'

const core = await PlanetCore.boot({
  config: {
    auth: {
      secret: 'SUPER_SECRET_KEY',
      guard: 'session',
    },
  },
  orbits: [OrbitSession, OrbitAuth],
})

core.app.post('/login', async (c) => {
  const auth = c.get('auth') as any
  auth.login('user_123')
  return c.json({ ok: true })
})
```

## Hooks

- `auth:init` - 當 Auth Orbit 初始化時觸發。
- `auth:payload` - (Filter) 在簽署前修改 JWT payload。
