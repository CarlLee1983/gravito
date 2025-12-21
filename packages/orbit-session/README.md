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

## Drivers

Orbit Session supports multiple drivers:

- `memory`: Default. Good for development, lost on restart.
- `cache`: Uses `orbit-cache` (requires `OrbitCache` in `orbits` list).
- `redis`: Direct Redis connection (requires `@gravito/plasma` dependency, but not necessarily the orbit).
- `file`: Stores sessions as JSON files on disk.
- `sqlite`: Stores sessions in a SQLite database file (uses `bun:sqlite`).

### File Driver

```ts
// config
session: {
  driver: 'file',
  file: { path: './storage/sessions' },
}
```

### SQLite Driver

```ts
// config
session: {
  driver: 'sqlite',
  sqlite: {
    path: './storage/database.sqlite',
    tableName: 'sessions', // optional, default: 'sessions'
  },
}
```

## CSRF

- Default: enabled
- Verification: header-based (`X-CSRF-Token`)
- Token source: session key `_csrf`
- Also sets a readable cookie (default `XSRF-TOKEN`) for frontend usage

## License

MIT
