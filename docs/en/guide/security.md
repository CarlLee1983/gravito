---
title: Security
---

# Security

Gravito takes security seriously and provides several tools to help you secure your application.

## Configuration

Before using security features, ensure you have set the `APP_KEY` in your `.env` file or configuration. This key is used for encryption and encrypted cookies.

```env
APP_KEY=base64:YOUR_GENERATED_KEY
```

You can generate a key using the `Encrypter` class:

```ts
import { Encrypter } from 'gravito-core'

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
core.app.get('/', (c) => {
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

To read cookies, use Hono's standard cookie helpers. If the cookie was encrypted, you need to decrypt it manually using the encrypter.

```typescript
import { getCookie } from 'hono/cookie';

core.app.get('/read', (c) => {
    const secret = getCookie(c, 'secret');
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

CSRF protection is provided by `@gravito/orbit`. See the [Session Documentation](../api/orbit-session.md) for details.
