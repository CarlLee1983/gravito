---
title: Orbit Auth
---

# Orbit Auth

> Authentication system as a Gravito Orbit.

Package: `@gravito/orbit-auth`

Provides a flexible authentication system with support for multiple guards (Session, JWT, Token) and user providers.

## Installation

```bash
bun add @gravito/orbit-auth
```

## Configuration

Orbit Auth is configured via the `auth` configuration object in `PlanetCore`.

```typescript
import { PlanetCore } from 'gravito-core';
import { OrbitAuth } from '@gravito/orbit-auth';
import { OrbitSession } from '@gravito/orbit';

const core = await PlanetCore.boot({
  config: {
    auth: {
      defaults: {
        guard: 'web',
        passwords: 'users',
      },
      guards: {
        web: {
          driver: 'session',
          provider: 'users',
          sessionKey: 'login_web_59ba36addc2b2f9401580f014c7f58ea4e30989d',
        },
        api: {
          driver: 'jwt',
          provider: 'users',
          secret: process.env.JWT_SECRET || 'secret',
          algo: 'HS256',
        },
      },
      providers: {
        users: {
          driver: 'drizzle', // or 'callback'
          model: 'User', // Your User model
        },
      },
    },
  },
  orbits: [OrbitSession, OrbitAuth],
});
```

## Basic Usage

### Accessing Auth Manager

You can access the `AuthManager` via the context.

```typescript
core.app.get('/user', async (c) => {
  const auth = c.get('auth');
  
  if (await auth.check()) {
    const user = await auth.user();
    return c.json({ user });
  }
  
  return c.json({ message: 'Unauthenticated' }, 401);
});
```

### Authentication Actions

```typescript
// Login (Session Guard)
await auth.login(user);

// Logout
await auth.logout();

// Attempt login with credentials
if (await auth.attempt({ email, password })) {
    // Success
}
```

### Using Specific Guards

```typescript
// Access 'api' guard explicitly
const apiAuth = auth.guard('api');
const user = await apiAuth.user();
```

## Hashing

Orbit Auth exposes a `HashManager` in request context as `hash`:

```ts
core.app.post('/register', async (c) => {
  const hash = c.get('hash')
  const passwordHash = await hash.make('plain-password')
  return c.json({ passwordHash })
})
```

## Password Reset / Email Verification (Primitives)

Orbit Auth can optionally expose primitives for building Laravel-like flows:

- `PasswordBroker` (context key: `passwords`)
- `EmailVerificationService` (context key: `emailVerification`)

Enable them in options:

```ts
new OrbitAuth({
  // ...auth config
  passwordReset: { enabled: true, ttlSeconds: 3600 },
  emailVerification: { enabled: true },
})
```

Usage:

```ts
core.app.post('/password/forgot', async (c) => {
  const broker = c.get('passwords')
  if (!broker) return c.text('Not enabled', 500)
  const token = await broker.createToken('user@example.com')
  return c.json({ token })
})

core.app.get('/email/verify', (c) => {
  const verifier = c.get('emailVerification')
  if (!verifier) return c.text('Not enabled', 500)
  const token = c.req.query('token') ?? ''
  const payload = verifier.verifyToken(token)
  return payload ? c.json(payload) : c.text('Invalid token', 400)
})
```

## Authorization (Gates)

Orbit Auth includes a Gate system for authorization checks.

### Defining Gates

Define gates in your `AppServiceProvider` or bootstrap code.

```typescript
core.app.use('*', async (c, next) => {
  const gate = c.get('gate')

  gate.define('update-post', (user, post) => {
    return user?.id === post.user_id
  })

  await next()
})
```

### Checking Authorization

```typescript
const gate = c.get('gate')

if (await gate.allows('update-post', post)) {
  // Authorized
}

// Or throw 403 if unauthorized
await gate.authorize('update-post', post);
```

### Via Context

```typescript
core.app.get('/posts/:id', async (c) => {
  // ... fetch post

  const gate = c.get('gate')
  await gate.authorize('update-post', post)
});
```

## Hooks

- `auth:init` - Fired when the Auth orbit initializes.
- `auth:login` - Fired after successful login.
- `auth:logout` - Fired after logout.
- `auth:failed` - Fired after failed authentication attempt.
