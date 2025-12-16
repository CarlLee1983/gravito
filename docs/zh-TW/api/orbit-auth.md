# @gravito/orbit-auth

> Gravito Galaxy 架構的標準身份驗證軌道。

提供簡單的 JWT 工具與 Hooks，用於擴充驗證邏輯。

## 📦 安裝

```bash
bun add @gravito/orbit-auth
```

## 🚀 用法

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

## 🪝 Hooks

- `auth:init` - 當 Auth Orbit 初始化時觸發。
- `auth:payload` - (Filter) 在簽署前修改 JWT payload。
