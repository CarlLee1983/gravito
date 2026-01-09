---
title: Photon Core
description: Gravito's high-performance HTTP engine (routing, middleware, request/response).
---

# Photon Core

Photon (`@gravito/photon`) is Gravito's HTTP core engine. It provides routing, middleware, and request/response handling.

## Highlights

- High-performance routing and middleware
- TypeScript inference
- Deep integration with @gravito/core
- Foundation for Beam RPC and Inertia

## Installation

```bash
bun add @gravito/photon
```

> Usually you do not install it directly. `@gravito/core` ships with Photon built in.

## Basic Routing

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

## Middleware

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

## Route Groups

```ts
import { apiRoutes } from './routes/api'

app.route('/api', apiRoutes)
```

## JWT

```ts
import { jwt } from '@gravito/photon/jwt'

app.use('/protected/*', jwt({ secret: 'secret' }))
```

## Next Steps

- Routing details: [Routing](./routing.md)
- Request & response: [Requests](./requests.md) / [Responses](./responses.md)
