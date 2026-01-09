---
title: Security
---

# Security

Gravito takes security seriously and provides several tools to help you secure your application.

## Default Hardening (Templates & Scaffolds)

All official site templates and scaffolds now ship with security middleware enabled by default:

- Security headers (CSP, X-Frame-Options, Referrer-Policy, etc.)
- Request body size limiting

You can override these defaults with environment variables:

```env
# CSP string or "false" to disable
APP_CSP=default-src 'self'; script-src 'self' 'unsafe-inline'
# HSTS max-age (seconds, production only)
APP_HSTS_MAX_AGE=15552000
# Body size limit (bytes). Set 0 or negative to disable.
APP_BODY_LIMIT=1048576
# Require Content-Length header ("true" to enable)
APP_BODY_REQUIRE_LENGTH=false
```

## Configuration

Before using security features, ensure you have set the `APP_KEY` in your `.env` file or configuration. This key is used for encryption and encrypted cookies.

```env
APP_KEY=base64:YOUR_GENERATED_KEY
```

You can generate a key using the `Encrypter` class:

```ts
import { Encrypter } from '@gravito/core'

console.log(Encrypter.generateKey())
```

## Encryption

Gravito provides an `Encrypter` service that uses OpenSSL (via Node's `crypto` module) to provide AES-256-CBC encryption.

### Usage

The encrypter is automatically initialized by `PlanetCore` if `APP_KEY` is present.

```typescript
const encrypted = core.encrypter.encrypt('secret message');
const decrypted = core.encrypter.decrypt(encrypted);
```

## Cookies

Gravito provides a secure `CookieJar` to manage cookies with automatic encryption support.

### Setting Cookies

The `cookieJar` is available in the request context variables.

```typescript
core.router.get('/', (c) => {
    const cookies = c.get('cookieJar');
    
    // Set a cookie (default 60 minutes)
    cookies.queue('name', 'value');
    
    // Set an encrypted cookie
    cookies.queue('secret', 'value', 60, { encrypt: true });
    
    // Set a permanent cookie (5 years)
    cookies.forever('remember_token', 'token');
    
    return c.text('Hello');
});
```

Cookies queued in the jar are automatically attached to the response by the core middleware.

### Reading Cookies

To read cookies, use the standard helpers provided by the core engine. If the cookie was encrypted, you need to decrypt it manually using the encrypter.

```typescript
core.router.get('/read', (c) => {
    // Access native request if needed for engine-specific helpers
    const secret = c.native.req.cookie('secret');
    if (secret) {
        try {
            const value = core.encrypter.decrypt(secret);
            // ...
        } catch (e) {
            // Invalid payload
        }
    }
});
```

## CSRF Protection

CSRF protection is available via `csrfProtection` in `@gravito/core`. Fortify enables CSRF automatically for auth routes.

```ts
import { csrfProtection } from '@gravito/core'

core.router
  .middleware(csrfProtection())
  .group((r) => {
    r.post('/profile', (c) => c.text('ok'))
  })
```

## Security Headers

Use the built-in `securityHeaders` middleware to apply CSP and related headers.

```ts
import { securityHeaders } from '@gravito/core'

core.adapter.use(
  '*',
  securityHeaders({
    contentSecurityPolicy: "default-src 'self'; object-src 'none'; frame-ancestors 'none'",
    hsts: process.env.NODE_ENV === 'production' ? { maxAge: 15552000 } : false,
  })
)
```

You can also provide a function for per-request CSP (e.g., nonces):

```ts
core.adapter.use(
  '*',
  securityHeaders({
    contentSecurityPolicy: (c) => {
      const nonce = crypto.randomUUID()
      c.set('cspNonce', nonce)
      return `default-src 'self'; script-src 'self' 'nonce-${nonce}'`
    },
  })
)
```

## Request Body Limits

Use `bodySizeLimit` to reject oversized requests early.

```ts
import { bodySizeLimit } from '@gravito/core'

core.adapter.use('*', bodySizeLimit(1_048_576))
```

If you want to enforce `Content-Length`, enable strict mode:

```ts
core.adapter.use('*', bodySizeLimit(1_048_576, { requireContentLength: true }))
```

## CORS

Enable CORS with the built-in middleware and keep origins explicit in production.

```ts
import { cors } from '@gravito/core'

core.adapter.use(
  '*',
  cors({
    origin: ['https://example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
)
```

## Production Gates (Debug & Dev Tools)

Some developer tools should never be exposed publicly. In production:

- OrbitSignal Dev UI is disabled unless you explicitly allow it or provide a gate.
- Spectrum dashboard requires a gate; requests without a gate are blocked.

```ts
import { OrbitSignal } from '@gravito/signal'
import { SpectrumOrbit } from '@gravito/spectrum'
import { createHeaderGate } from '@gravito/core'

const adminGate = createHeaderGate({
  headerName: 'x-admin-token',
  token: process.env.ADMIN_TOKEN,
})

new OrbitSignal({ devMode: true, devUiGate: adminGate })

new SpectrumOrbit({ gate: adminGate })
```
