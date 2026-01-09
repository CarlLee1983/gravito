# Passkeys (WebAuthn) Integration

This document shows how to integrate **Passkeys** (WebAuthn) with the [Membership Satellite](../../README.md) using the APIs that were added under `/api/membership/passkeys`.

## Dependencies
- Install `@simplewebauthn/browser` on the client.
- Make sure your site is served over HTTPS (or `localhost` during development).

```bash
bun add @simplewebauthn/browser
```

## Registration flow

```ts
import { startRegistration } from '@simplewebauthn/browser'

const baseUrl = '/api/membership/passkeys'

async function beginPasskeyRegistration() {
  const opts = await fetch(`${baseUrl}/register/options`, {
    method: 'POST',
    credentials: 'include',
  }).then((res) => res.json())

  const credential = await startRegistration(opts)

  await fetch(`${baseUrl}/register/verify`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      credential,
      displayName: 'My iPhone',
    }),
  })
}
```

1. POST to `/register/options` after the user is authenticated (call `auth()` route guard from the backend) to receive the registration challenge.
2. Call `startRegistration` from `@simplewebauthn/browser` and send the resulting credential to `/register/verify`.
3. The server will verify the attestation, store the credential, and keep the session logged in.

## Authentication flow

```ts
import { startAuthentication } from '@simplewebauthn/browser'

async function beginPasskeyLogin(email: string) {
  const opts = await fetch(`${baseUrl}/login/options`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }).then((res) => res.json())

  const assertion = await startAuthentication(opts)

  await fetch(`${baseUrl}/login/verify`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      assertion,
    }),
  })
}
```

1. Send the member's email to `/login/options` to receive challenge data; this endpoint does not require authentication but expects a valid email.
2. Run `startAuthentication` and POST the assertion to `/login/verify`.
3. On success the backend logs the member in via the existing `AuthManager`.

## Notes
- These endpoints rely on session storage (`core.adapter` session provider). Ensure your client includes `credentials: 'include'`.
- You can show UI feedback when registration/authentication fails by catching the thrown errors.
- Store `credential.id` locally if you want to list registered devices; the backend already saves `displayName` and `transports`.
