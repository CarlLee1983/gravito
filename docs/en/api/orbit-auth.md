---
title: Orbit Auth
---

# Orbit Auth

> Authentication utilities as a Gravito Orbit.

Package: `@gravito/orbit-auth`

Provides simple JWT utilities and hooks for extending authentication logic.

## Installation

```bash
bun add @gravito/orbit-auth
```

## Usage (JWT)

```typescript
import { PlanetCore } from 'gravito-core';
import orbitAuth from '@gravito/orbit-auth';

const core = new PlanetCore();

// Initialize Auth Orbit
const auth = orbitAuth(core, {
  secret: 'SUPER_SECRET_KEY',
  exposeAs: 'auth' // Access via c.get('auth')
});

// Use in routes
core.app.post('/login', async (c) => {
  const token = await auth.sign({ sub: '123', role: 'admin' });
  return c.json({ token });
});
```

## Usage (Session Guard)

For Laravel-style login state, pair Orbit Auth with `@gravito/orbit-session` and enable the session guard:

```ts
import { PlanetCore } from 'gravito-core'
import { OrbitSession } from '@gravito/orbit-session'
import { OrbitAuth } from '@gravito/orbit-auth'

const core = await PlanetCore.boot({
  config: {
    auth: {
      secret: 'SUPER_SECRET_KEY',
      guard: 'session',
    },
  },
  orbits: [OrbitSession, OrbitAuth],
})

core.app.post('/login', async (c) => {
  const auth = c.get('auth') as any
  auth.login('user_123')
  return c.json({ ok: true })
})
```

## Hooks

- `auth:init` - Fired when the Auth orbit initializes.
- `auth:payload` - (Filter) Modify the JWT payload before signing.
