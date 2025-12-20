---
title: Orbit Session
---

# Orbit Session

提供 Session 管理與 CSRF 防護（Laravel 風格）。

套件：`@gravito/orbit-session`

## 新手教學

- 第一次使用建議先閱讀 [Orbit Session 新手教學](../guide/orbit-session-starter.md)。

## 目的

Orbit Session 提供：

- **登入狀態**：透過伺服器端 session id cookie（`gravito_session`）
- **CSRF 防護**：保護具副作用的請求
- **閒置到期 + 絕對到期**：到期行為可預期
- **低耗 touch interval**：降低 store 寫入頻率（預設 `60s`）

## 安裝

```bash
bun add @gravito/orbit-session
```

## 設定（多機部署建議）

多機部署建議把 Session 存在共享快取（例如 Redis），並搭配 `@gravito/orbit-cache`：

```ts
import { PlanetCore, defineConfig } from 'gravito-core'
import { OrbitCache } from '@gravito/orbit-cache'
import { OrbitSession } from '@gravito/orbit-session'

const config = defineConfig({
  config: {
    session: {
      driver: 'cache',
      cookie: { name: 'gravito_session' },
      idleTimeoutSeconds: 60 * 30,
      absoluteTimeoutSeconds: 60 * 60 * 24 * 7,
      touchIntervalSeconds: 60,
      csrf: {
        enabled: true,
        headerName: 'X-CSRF-Token',
        ignore: (ctx) => false,
      },
    },
  },
  orbits: [OrbitCache, new OrbitSession()],
})

const core = await PlanetCore.boot(config)
export default core.liftoff()
```

## 用法

```ts
export class ExampleController {
  index(ctx: Context) {
    const session = ctx.get('session')
    session.put('foo', 'bar')
    session.flash('success', '儲存成功')
    return ctx.json({ ok: true })
  }
}
```

## Flash Data (快閃資料)

Orbit Session 支援 "flash" 資料，這類資料僅在下一次請求中可用。這通常用於狀態訊息（例如：「文章建立成功」）。

```typescript
// 儲存 flash 資料
session.flash('message', '任務成功！');

// 取得 flash 資料（在下一次請求中）
const message = session.get('message');
```

Inertia Orbit 會自動將常見的 flash key（如 `success`、`error`）分享給前端 props。

## CSRF

- 預設驗證方式是 **header**：`X-CSRF-Token`
- token 會儲存在 session key `_csrf`
- Orbit Session 也會設定一個可被前端讀取的 cookie（預設 `XSRF-TOKEN`），方便前端讀取後放進 header 送回來
