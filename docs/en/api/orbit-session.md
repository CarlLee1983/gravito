---
title: Orbit Session
---

# Orbit Session

Session management + CSRF protection for Gravito (Laravel-style).

Package: `@gravito/orbit-session`

## Why

Orbit Session provides:

- **Login state** via a server-side session id cookie (`gravito_session`)
- **CSRF protection** for state-changing requests
- **Idle timeout + absolute timeout** for predictable expiry
- **Low-overhead touch interval** to reduce writes (default `60s`)

## Installation

```bash
bun add @gravito/orbit-session
```

## Setup (multi-machine recommended)

For multi-machine deployments, store sessions in a shared cache (e.g. Redis) via `@gravito/orbit-cache`:

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

## CSRF

- Default verification is **header-based**: `X-CSRF-Token`
- The token is stored in the session key `_csrf`
- Orbit Session also sets a readable cookie (default `XSRF-TOKEN`) so your frontend can read it and send it back in the header

