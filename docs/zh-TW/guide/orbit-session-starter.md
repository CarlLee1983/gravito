---
title: Orbit Session 新手教學
---

# Orbit Session 新手教學

這是一份一步一步的入門教學，從安裝到實作登入狀態、Flash 訊息與 CSRF 防護，讓你可以立刻上手。

## 你會完成什麼

- 安裝並啟用 `@gravito/orbit-session`
- 在控制器中存取 Session
- 建立一次性 Flash 訊息
- 在前端送出帶有 CSRF Token 的請求

## 1. 安裝套件

1. 安裝套件：

```bash
bun add @gravito/orbit-session
```

2. 如果你要使用快取或 Redis 作為 Session 儲存來源，請一併安裝對應套件（新手可先跳過）。

## 2. 加入 Orbit Session 設定

1. 在 `src/bootstrap.ts` 內加入 Orbit Session 設定（新手建議先用 `memory`）：

```ts
import { defineConfig, PlanetCore } from 'gravito-core'
import { OrbitSession } from '@gravito/orbit-session'

const config = defineConfig({
  config: {
    session: {
      driver: 'memory',
      cookie: { name: 'gravito_session' },
      idleTimeoutSeconds: 60 * 30,
      absoluteTimeoutSeconds: 60 * 60 * 24 * 7,
      touchIntervalSeconds: 60,
      csrf: {
        enabled: true,
        headerName: 'X-CSRF-Token',
      },
    },
  },
  orbits: [new OrbitSession()],
})

const core = await PlanetCore.boot(config)
export default core.liftoff()
```

> **Tip**: 正式環境建議使用 `cache` 或 `redis` 作為 driver，避免重啟後 Session 消失。

## 3. 建立 Session 操作範例

1. 新增控制器 `src/controllers/SessionDemoController.ts`：

```ts
import type { Context } from 'hono'

export class SessionDemoController {
  index(c: Context) {
    const session = c.get('session')
    const userId = session.get<string | null>('userId', null)
    return c.json({ userId })
  }

  login(c: Context) {
    const session = c.get('session')
    session.regenerate()
    session.put('userId', 'user_123')
    session.flash('success', '登入成功')
    return c.json({ ok: true })
  }

  logout(c: Context) {
    const session = c.get('session')
    session.invalidate()
    return c.json({ ok: true })
  }
}
```

2. 註冊路由 `src/routes/index.ts`：

```ts
import type { Router } from 'gravito-core'
import { SessionDemoController } from '../controllers/SessionDemoController'

export default function(routes: Router) {
  routes.get('/me', [SessionDemoController, 'index'])
  routes.post('/login', [SessionDemoController, 'login'])
  routes.post('/logout', [SessionDemoController, 'logout'])
}
```

## 4. 讀取 Flash 訊息

1. 在下一個請求中讀取一次性訊息：

```ts
import type { Context } from 'hono'

export class FlashController {
  index(c: Context) {
    const session = c.get('session')
    const message = session.getFlash<string | null>('success', null)
    return c.json({ message })
  }
}
```

> **Note**: `flash()` 只會在下一次請求中可用，讀完就會自動清除。

## 5. CSRF Token 取得與送出

Orbit Session 會自動產生 CSRF token，並在回應時寫入 `XSRF-TOKEN` cookie。你不需要每次手動重新取得 token，通常只要在前端把 cookie 的值帶回 `X-CSRF-Token` header 即可。

1. 建立一個端點取得 CSRF Token（也會同時寫入 `XSRF-TOKEN` cookie）：

```ts
import type { Context } from 'hono'

export class CsrfController {
  token(c: Context) {
    const csrf = c.get('csrf')
    return c.json({ token: csrf.token() })
  }
}
```

2. 前端送出請求時帶上 `X-CSRF-Token`：

```ts
const res = await fetch('/login', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify({ email, password }),
})
```

> **Tip**: CSRF 檢查只會套用在 `POST`、`PUT`、`PATCH`、`DELETE` 等非安全方法。

### 前端什麼時候需要手動帶上 token

- 只要是 **非安全方法**（`POST`、`PUT`、`PATCH`、`DELETE`），都需要帶 `X-CSRF-Token`
- **跨站或不同網域** 時要確認 `credentials: 'include'`，讓 cookie 能被送出
- **Session 被重置** 時（例如 `session.regenerate()`、session 過期、清除 cookie），需要重新讀取 `XSRF-TOKEN` cookie 或重新取得 token

## 6. 常見設定建議

| 情境 | 建議設定 |
| --- | --- |
| 本機開發 | `driver: 'memory'` |
| 多機部署 | `driver: 'cache'` + `@gravito/orbit-cache` |
| 需要直接連 Redis | `driver: 'redis'` |
| 需要落地檔案 | `driver: 'file'` |

## 下一步

- 需要更完整的參數說明與進階用法？請看 [Orbit Session API 文件](../api/orbit-session.md)。
