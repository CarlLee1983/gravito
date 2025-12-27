---
title: Beam 客戶端
description: 針對 Photon 應用的型別安全 HTTP 客戶端封裝。
---

# Beam 客戶端

Beam 是針對 Gravito Photon 應用的輕量型別安全 HTTP 客戶端封裝，提供近似 tRPC 的開發體驗，同時維持標準 HTTP 呼叫流程。

## 適用情境

當你希望前端有完整型別提示，又不想導入額外執行期依賴時，建議使用 Beam。

## 特色

- 零執行期負擔（純型別包裝，直接委派給 Photon client）
- 完整路由與回應型別推導
- 支援單體與模組化路由結構
- 輕量體積、最少依賴

## 安裝

```bash
bun add @gravito/beam
```

## 快速開始

Beam 提供兩種型別模式：`AppType`（簡單）與 `AppRoutes`（推薦）。

### 1. 於伺服器端匯出應用型別

```ts
// src/server/app.ts
import { Photon } from '@gravito/photon'

const app = new Photon()
  .get('/hello', (c) => c.json({ message: 'Hello' }))

export type AppType = typeof app
export default app
```

### 2. 於前端建立型別安全的 client

```ts
// src/client/api.ts
import { createBeam } from '@gravito/beam'
import type { AppType } from '../server/app'

const api = createBeam<AppType>('https://example.com')

const res = await api.hello.$get()
const data = await res.json()
```

## AppRoutes 模式（推薦，適合模組化路由）

若你的專案使用 `app.route()` 組合路由，建議用 `AppRoutes`。

```ts
// src/server/app.ts
import { Photon } from '@gravito/photon'
import { userRoute } from './routes/user'
import { apiRoute } from './routes/api'

export function createApp() {
  const app = new Photon()
  const routes = app.route('/api/users', userRoute).route('/api', apiRoute)
  return { app, routes }
}

function _createTypeOnlyApp() {
  const app = new Photon()
  const routes = app.route('/api/users', userRoute).route('/api', apiRoute)
  return routes
}

export type AppRoutes = ReturnType<typeof _createTypeOnlyApp>
```

```ts
// src/server/routes/user.ts
import { Photon } from '@gravito/photon'
import { validate, Schema } from '@gravito/mass'

export const userRoute = new Photon().post(
  '/login',
  validate(
    'json',
    Schema.Object({
      username: Schema.String(),
      password: Schema.String(),
    })
  ),
  (c) => {
    const { username, password } = c.req.valid('json')
    const user = db.users.findByUsername(username)
    if (!user || !auth.verify(password, user.passwordHash)) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }
    return c.json({ token: auth.issueToken(user.id) })
  }
)
```

```ts
// src/client/api.ts
import { createBeam } from '@gravito/beam'
import type { AppRoutes } from '../server/app'

const client = createBeam<AppRoutes>('https://example.com')
const res = await client.api.users.login.$post({
  json: { username: 'user', password: 'pass' },
})
```

## 型別模式比較

| 模式 | 適用 | 型別來源 | 建議場景 |
| --- | --- | --- | --- |
| AppType | 小型/單體 | `typeof app` | 直接定義路由 |
| AppRoutes | 模組化 | `ReturnType<typeof _createTypeOnlyApp>` | 使用 `app.route()` 組合 |

## API 參考

### createBeam

```ts
const client = createBeam<AppType>('https://api.example.com', {
  headers: { Authorization: 'Bearer ...' },
  credentials: 'include',
})
```

`createBeam<T>(baseUrl, options?)` 接收 base URL 與 `RequestInit` 風格的設定。

## 下一步

- 了解路由設計：[路由](./routing.md)
- 設定驗證流程：[請求驗證](./requests.md)
