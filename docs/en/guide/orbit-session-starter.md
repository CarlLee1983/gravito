---
title: Orbit Session Starter Guide
---

# Orbit Session Starter Guide

This is a step-by-step beginner tutorial that takes you from installation to login state, flash messages, and CSRF protection.

## What You Will Build

- Install and enable `@gravito/orbit-session`
- Read/write session data in controllers
- Create one-time flash messages
- Send CSRF-protected requests from the frontend

## 1. Install the Package

1. Install the package:

```bash
bun add @gravito/orbit-session
```

2. If you plan to use cache or Redis for storage, install the matching package (you can skip this for now).

## 2. Add Orbit Session Configuration

1. In `src/bootstrap.ts`, add the Orbit Session config (beginners can start with `memory`):

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

> **Tip**: In production, prefer `cache` or `redis` drivers so sessions survive restarts.

## 3. Build a Session Demo

1. Create `src/controllers/SessionDemoController.ts`:

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
    session.flash('success', 'Logged in')
    return c.json({ ok: true })
  }

  logout(c: Context) {
    const session = c.get('session')
    session.invalidate()
    return c.json({ ok: true })
  }
}
```

2. Register routes in `src/routes/index.ts`:

```ts
import type { Router } from 'gravito-core'
import { SessionDemoController } from '../controllers/SessionDemoController'

export default function(routes: Router) {
  routes.get('/me', [SessionDemoController, 'index'])
  routes.post('/login', [SessionDemoController, 'login'])
  routes.post('/logout', [SessionDemoController, 'logout'])
}
```

## 4. Read Flash Messages

1. Read one-time flash data on the next request:

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

> **Note**: `flash()` is only available on the next request and is cleared after you read it.

## 5. Get and Send CSRF Tokens

Orbit Session generates the CSRF token automatically and writes it to the `XSRF-TOKEN` cookie on the response. You do not need to fetch a new token for every request. In most cases, just read the cookie and send it back in the `X-CSRF-Token` header.

1. **This endpoint is optional.** As soon as a response starts a session, Orbit Session writes the `XSRF-TOKEN` cookie automatically. The endpoint below is only for debugging or if you want to fetch the token on demand:

```ts
import type { Context } from 'hono'

export class CsrfController {
  token(c: Context) {
    const csrf = c.get('csrf')
    return c.json({ token: csrf.token() })
  }
}
```

2. Send the `X-CSRF-Token` header from the frontend:

> **Note**: Many frontend clients (like Axios) automatically map the `XSRF-TOKEN` cookie to the `X-CSRF-Token` header, so you usually do not need to set it manually. If you use `fetch` or a custom HTTP client, add the header yourself.

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

> **Tip**: CSRF checks apply to non-safe methods like `POST`, `PUT`, `PATCH`, and `DELETE`.

### When the frontend must add the token manually

- For **non-safe methods** (`POST`, `PUT`, `PATCH`, `DELETE`), include `X-CSRF-Token`
- For **cross-site or different domains**, ensure `credentials: 'include'` so cookies are sent
- When the **session is reset** (e.g. `session.regenerate()`, session expiry, cleared cookies), re-read the `XSRF-TOKEN` cookie or fetch a new token

## 6. Common Configuration Tips

| Scenario | Recommendation |
| --- | --- |
| Local development | `driver: 'memory'` |
| Multi-machine | `driver: 'cache'` + `@gravito/orbit-cache` |
| Direct Redis | `driver: 'redis'` |
| File-based | `driver: 'file'` |

## Next Step

- For full options and advanced usage, see the [Orbit Session API Docs](../api/orbit-session.md).
