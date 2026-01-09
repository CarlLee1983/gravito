---
title: Photon Core
description: Gravito 的高效能 HTTP 引擎（路由、Middleware、Request/Response）。
---

# Photon Core

Photon（`@gravito/photon`）是 Gravito 的 HTTP 核心引擎，提供路由、中介層與請求/回應處理。

## 特色

- 高效能路由與中介層
- TypeScript 型別推導
- 與 @gravito/core 深度整合
- Beam RPC、Inertia 的底層基礎

## 安裝

```bash
bun add @gravito/photon
```

> 通常不需要手動安裝，`@gravito/core` 已內建。

## 基本路由

```ts
import { Photon } from '@gravito/photon'

const app = new Photon()

app.get('/', (c) => c.text('Hello Photon'))
app.get('/json', (c) => c.json({ ok: true }))
app.post('/users', async (c) => {
  const body = await c.req.json()
  return c.json({ id: 1, ...body }, 201)
})
```

## 中介層（Middleware）

```ts
app.use(async (c, next) => {
  const started = Date.now()
  await next()
  console.log('ms:', Date.now() - started)
})
```

## Request / Response

```ts
app.get('/users/:id', async (c) => {
  const id = c.req.param('id')
  const query = c.req.query('filter')
  const header = c.req.header('Authorization')
  return c.json({ id, query, header })
})
```

## 路由組合

```ts
import { apiRoutes } from './routes/api'

app.route('/api', apiRoutes)
```

## JWT

```ts
import { jwt } from '@gravito/photon/jwt'

app.use('/protected/*', jwt({ secret: 'secret' }))
```

## 下一步

- 路由細節：[路由](./routing.md)
- 請求與回應：[請求](./requests.md) / [回應](./responses.md)
