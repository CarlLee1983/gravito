---
title: Beam Client
description: Type-safe HTTP client wrapper for Photon applications.
---

# Beam Client

Beam is a lightweight, type-safe HTTP client wrapper for Gravito Photon apps. It provides tRPC-like DX while staying on standard HTTP and Photon route types.

## When to use Beam

Use Beam when you want a typed frontend client without generating SDKs or adding runtime overhead.

## Installation

```bash
bun add @gravito/beam
```

## Quick Start

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

## Key Features

- Zero runtime overhead (type-only inference)
- Full IntelliSense for routes and payloads
- Works with standard Photon routing

## Next Steps

- Learn how to model routes in [Routing](./routing.md)
- Validate payloads with [Requests](./requests.md)
