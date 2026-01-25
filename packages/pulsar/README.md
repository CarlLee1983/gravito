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
bun add @gravito/pulsar
```

## Usage

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
    },
  },
  orbits: [OrbitCache, new OrbitPulsar()],
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

## Flash Data

Flash data is only available for the next request. Perfect for success messages or validation errors.

```typescript
// In your handler
const session = c.get('session')
session.flash('success', 'Profile updated!')

// In the next request handler
const message = session.getFlash('success')
```

## Performance Tuning

- `touchIntervalSeconds`: Defaults to 60. This prevents writing to the session store on every request if only the `lastActivityAt` changed.
- Driver selection: `redis` is recommended for production multi-instance setups. `sqlite` is great for persistent single-instance setups.

## Security Best Practices

- **HTTPS**: Always use `cookie: { secure: true }` in production.
- **SameSite**: The default `Lax` is usually appropriate, but `Strict` offers more protection if your site doesn't rely on cross-site sub-requests.
- **Session ID**: Pulsar uses cryptographically secure tokens for session IDs.
- **Cleanup**: If using `sqlite`, remember to occasionally call `store.cleanup()` (exposed via the `SqliteSessionStore` class) to purge expired records.

## API Quick Reference

### Session Methods

| Method | Description | Example |
|--------|-------------|---------|
| `session.id()` | Get current session ID | `const sid = session.id()` |
| `session.isStarted()` | Check if session loaded from store | `if (session.isStarted()) {...}` |
| `session.get(key, default?)` | Retrieve session value | `const user = session.get('user')` |
| `session.put(key, value)` | Store session value | `session.put('user.name', 'Alice')` |
| `session.pull(key, default?)` | Get and remove value | `const temp = session.pull('temp')` |
| `session.flash(key, value)` | Store value for next request only | `session.flash('success', 'Saved!')` |
| `session.getFlash(key, default?)` | Retrieve flashed value | `const msg = session.getFlash('success')` |
| `session.reflash()` | Keep all flash data for one more cycle | `session.reflash()` |
| `session.regenerate()` | Change session ID (security) | `session.regenerate()` |

## Troubleshooting

### Sessions Not Persisting
- Verify your driver configuration matches your environment.
- Check that cookies are being set (inspect browser DevTools).
- Ensure `touchIntervalSeconds` isn't too high for your use case.

### CSRF Errors in Development
- Make sure to include the CSRF token in non-GET requests.
- Check that the `XSRF-TOKEN` cookie is accessible to your frontend.
- For API endpoints, you can disable CSRF: `csrf: { ignore: (ctx) => ctx.req.path.startsWith('/api') }`.

### File/SQLite Drivers Not Working
- Check directory/file permissions.
- For SQLite, ensure the database file is writable.
- Run `cleanup()` periodically if using SQLite in production.

## License

MIT
