---
title: Sentinel Auth
description: Authentication and authorization core (Guards, Providers, Gates).
---

# Sentinel Auth

Sentinel (`@gravito/sentinel`) is Gravito's authentication and authorization core. It supports multiple guards, providers, and Gate policies.

## Highlights

- Multiple guards (session / token / jwt)
- Pluggable user providers (callback)
- Gate authorization (`can` / `authorize`)
- Works with Fortify UI

## Installation

```bash
bun add @gravito/sentinel
```

If you use session guard, also install:

```bash
bun add @gravito/pulsar
```

## Basic Setup

```ts
import { PlanetCore } from '@gravito/core'
import { OrbitSentinel, CallbackUserProvider } from '@gravito/sentinel'
import { OrbitPulsar } from '@gravito/pulsar'

const core = new PlanetCore()

new OrbitPulsar({ driver: 'memory' }).install(core)

new OrbitSentinel({
  defaults: { guard: 'web', passwords: 'users' },
  guards: {
    web: { driver: 'session', provider: 'users', sessionKey: 'auth_session' },
  },
  providers: {
    users: { driver: 'callback' },
  },
  bindings: {
    providers: {
      users: () =>
        new CallbackUserProvider(
          async (id) => null,
          async (_user, _credentials) => false,
          async (_identifier, _token) => null,
          async (_credentials) => null
        ),
    },
  },
}).install(core)
```

## Authentication Flow

```ts
import { auth } from '@gravito/sentinel'

app.post('/login', async (c) => {
  const authManager = c.get('auth')
  const success = await authManager.attempt({
    email: c.req.query('email'),
    password: c.req.query('password'),
  })
  return success ? c.json({ ok: true }) : c.json({ ok: false }, 401)
})

app.get('/me', auth(), async (c) => {
  const user = await c.get('auth').user()
  return c.json({ user })
})
```

## Passkeys (WebAuthn) support

Install `@gravito/satellite-membership` and include its service provider so you expose the `/api/membership/passkeys` endpoints that the membership guide documents.

```ts
import { MembershipServiceProvider } from '@gravito/satellite-membership'

new MembershipServiceProvider().install(core)
```

### Configure the relying party

`@gravito/satellite-membership` wires a `PasskeysService` built on `@simplewebauthn/server` and stores challenges in the session adapter. Configure the relying party metadata under `membership.passkeys`. The provider auto-fills `origin`/`rp_id` from `APP_URL` when you omit them.

```ts
{
  membership: {
    passkeys: {
      origin: 'https://app.example.com',
      rp_id: 'app.example.com',
      name: 'App Membership',
      timeout: 90000,
      user_verification: 'preferred',
      attestation: 'none'
    }
  }
}
```

### Registration and authentication endpoints

The satellite exposes four JSON endpoints under `/api/membership/passkeys`:

- `POST /register/options` – guarded by `auth()` so the member must already be signed in before receiving the registration challenge.
- `POST /register/verify` – validates the attestation response, persisting the credential (including `displayName`, `transports`, and `id`) while keeping the session active.
- `POST /login/options` – accepts a member email and returns an authentication challenge for that account.
- `POST /login/verify` – verifies the assertion and reuses the existing `AuthManager` to sign the member in.

Passkeys rely on session storage, so ensure you register `OrbitPulsar` (or any session adapter) and call the above endpoints with `credentials: 'include'`. The server keeps each challenge in the session so it can compare it with the response.

### Client integration tips

- After authenticating, call `/register/options`, run `startRegistration` from `@simplewebauthn/browser`, and POST the credential payload (optionally including `displayName`) to `/register/verify`.
- For passkey logins, POST the member’s email to `/login/options`, call `startAuthentication`, and submit the resulting assertion to `/login/verify`.
- Catch and render JSON errors on the frontend to inform the user when attestation/authentication fails.
- The backend already saves the credential metadata, so store `credential.id` or `displayName` client-side if you plan to expose a “registered devices” list later.

For client examples and a full roundtrip, see [`satellites/membership/docs/PASSKEYS.md`](../../satellites/membership/docs/PASSKEYS.md).

## Gate Authorization

```ts
import { can } from '@gravito/sentinel'

app.get('/admin', can('manage-admin'), async (c) => {
  return c.text('ok')
})
```

## With Fortify

Fortify provides UI and auth flow scaffolding. Sentinel provides guards and authorization logic.

- Fortify: UI / routes / forms
- Sentinel: guards / providers / gates

## Next Steps

- Fortify UI: [Authentication (Fortify)](./authentication.md)
- Authorization: [Authorization](./authorization.md)
