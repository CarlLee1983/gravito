---
title: Session Management
description: Manage user state and data with Gravito sessions.
---

# Session Management

> **Pulsar** is Gravito's official session module. It provides a Laravel-like experience with multiple drivers and flash data support.

## Install & Configure

```bash
bun add @gravito/pulsar
```

Enable Pulsar in `src/bootstrap.ts`:

```typescript
import { defineConfig } from '@gravito/core';
import { OrbitPulsar } from '@gravito/pulsar';

export default defineConfig({
  config: {
    session: {
      driver: 'memory',
      cookie: {
        name: 'gravito_session',
        secure: true,
        httpOnly: true
      },
      idleTimeoutSeconds: 1800,
    }
  },
  orbits: [new OrbitPulsar()]
});
```

## Basic Usage

### Get the Session

```typescript
export class UserController {
  index(c: Context) {
    const session = c.get('session');
    // ...
  }
}
```

### Read & Write

```typescript
session.put('key', 'value');

const value = session.get('key', 'default');

if (session.has('key')) {
  // ...
}

session.forget('key');
session.flush();
```

## Flash Data

```typescript
session.flash('status', 'Settings updated!');
const status = session.get('status');
```

Keep flash data for another request:

```typescript
session.reflash();
session.keep(['status']);
```

## Regenerate Session ID

```typescript
session.regenerate();
```

## Session Drivers

Pulsar supports:
- **memory**: in-memory (dev only).
- **file**: local filesystem.
- **cache**: uses `@gravito/stasis` (recommended with Redis).
- **redis**: direct Redis connection.

---

## Next Steps
Read [CSRF Protection](./csrf-protection.md) to secure session-based requests.
