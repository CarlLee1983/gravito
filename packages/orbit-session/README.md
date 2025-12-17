---
title: Orbit Session
---

# Orbit Session

Laravel-style session management + CSRF protection for Gravito.

## Design goals

- High performance: lazy-load and write-back only when needed.
- Low overhead: configurable touch interval to reduce store writes.
- Lightweight: opt-in Orbit, minimal surface area.
- AI-friendly: strict types and predictable APIs.

## Installation

```bash
bun add @gravito/orbit-session
```

## Usage

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
    },
  },
  orbits: [OrbitCache, new OrbitSession()],
})

const core = await PlanetCore.boot(config)
export default core.liftoff()
```

## CSRF

- Default: enabled
- Verification: header-based (`X-CSRF-Token`)
- Token source: session key `_csrf`
- Also sets a readable cookie (default `XSRF-TOKEN`) for frontend usage

## License

MIT
