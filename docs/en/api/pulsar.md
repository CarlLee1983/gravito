---
title: Pulsar
---

# Pulsar

Session management + CSRF protection for Gravito (Laravel-style).

Package: `@gravito/pulsar`

## Starter Guide

- New to Pulsar? Start with the [Pulsar Starter Guide](../guide/orbit-session-starter.md).

## Why

Pulsar provides:

- **Login state** via a server-side session id cookie (`gravito_session`)
- **CSRF protection** for state-changing requests
- **Idle timeout + absolute timeout** for predictable expiry
- **Low-overhead touch interval** to reduce writes (default `60s`)

## Installation

```bash
bun add @gravito/pulsar
```

## Setup (multi-machine recommended)

For multi-machine deployments, store sessions in a shared cache (e.g. Redis) via `@gravito/stasis`:

```ts
import { PlanetCore, defineConfig } from '@gravito/core'
import { OrbitCache } from '@gravito/stasis'
import { OrbitPulsar } from '@gravito/pulsar'

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
  orbits: [OrbitCache, new OrbitPulsar()],
})

const core = await PlanetCore.boot(config)
export default core.liftoff()
```

## Usage

```ts
export class ExampleController {
  index(ctx: Context) {
    const session = ctx.get('session')
    session.put('foo', 'bar')
    session.flash('success', 'Saved')
    return ctx.json({ ok: true })
  }
}
```

## Flash Data

Session supports "flash" data, which is data that is only available for the next request. This is commonly used for status messages (e.g., "Post created successfully").

```typescript
// Store flash data
session.flash('message', 'Task was successful!');

// Retrieve flash data (in the next request)
const message = session.get('message');
```

The Inertia Gravito automatically shares common flash keys (like `success`, `error`) with the frontend props.

## CSRF

- Default verification is **header-based**: `X-CSRF-Token`
- The token is stored in the session key `_csrf`
- Session also sets a readable cookie (default `XSRF-TOKEN`) so your frontend can read it and send it back in the header
