---
title: Beam Client
description: Type-safe HTTP client wrapper for Photon applications.
---

# Beam Client

Beam is a lightweight, type-safe HTTP client wrapper for Gravito Photon apps. It provides a tRPC-like DX while keeping a standard HTTP flow.

## When to use Beam

Use Beam when you want a typed frontend client without adding runtime overhead or generating SDKs.

## Highlights

- Zero runtime overhead (type-only wrapper, delegates to Photon client)
- Full route and response inference
- Works with monolithic and modular routing
- Minimal dependencies

## Installation

```bash
bun add @gravito/beam
```

## Quick Start

Beam offers two typing modes: `AppType` (simple) and `AppRoutes` (recommended).

### 1. Export your app type on the server

```ts
// src/server/app.ts
import { Photon } from '@gravito/photon'

const app = new Photon()
  .get('/hello', (c) => c.json({ message: 'Hello' }))

export type AppType = typeof app
export default app
```

### 2. Create a typed client in the frontend

```ts
// src/client/api.ts
import { createBeam } from '@gravito/beam'
import type { AppType } from '../server/app'

const api = createBeam<AppType>('https://example.com')

const res = await api.hello.$get()
const data = await res.json()
```

## AppRoutes Mode (Recommended for modular routing)

Use this when you compose routes with `app.route()`.

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

## Type Modes Comparison

| Mode | Use case | Type source | Best for |
| --- | --- | --- | --- |
| AppType | Small / monolith | `typeof app` | Direct routes |
| AppRoutes | Modular | `ReturnType<typeof _createTypeOnlyApp>` | `app.route()` composition |

## API Reference

### createBeam

```ts
const client = createBeam<AppType>('https://api.example.com', {
  headers: { Authorization: 'Bearer ...' },
  credentials: 'include',
})
```

`createBeam<T>(baseUrl, options?)` accepts a base URL and `RequestInit`-style options.

## Next Steps

- Learn route modeling in [Routing](./routing.md)
- Validate payloads with [Requests](./requests.md)
