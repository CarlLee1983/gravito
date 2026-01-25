# @gravito/sentinel

Authentication and authorization orbit for Gravito Galaxy. Inspired by Laravel's auth system and designed for TypeScript.

## Features

- **Multiple guards**: Session, JWT (with refresh tokens), and token-based authentication.
- **Remember Me**: Persistent session support via secure cookies.
- **Token Hashing**: Support for SHA-256/SHA-512 token storage.
- **Token Blacklist**: Revoke JWTs and API tokens instantly.
- **Rate Limiting**: Built-in `throttleAuth` middleware for brute-force protection.
- **User Caching**: Optimized query performance with `CachedUserProvider`.
- **Flexible user providers**: Callback-based provider for custom user lookup.
- **Authorization gates**: Define and check abilities and policies.
- **Password management**: HashManager with bcrypt and argon2id.
- **Password resets**: PasswordBroker workflow support.
- **Email verification**: Optional verification service.

## Installation

```bash
bun add @gravito/sentinel
```

## Migration from v3 to v4

### Breaking Changes

1. **CallbackUserProvider**: The fallback to `global.MOCK_USERS` has been removed. You must now provide a `retrieveByCredentialsCallback`.
2. **Middleware Types**: If you were using `any` in your middleware handlers, you should now use `GravitoContext` and `GravitoNext`.

```typescript
// v3
app.get('/admin', auth(), async (c: any, next: any) => { ... })

// v4
import type { GravitoContext, GravitoNext } from '@gravito/core'
app.get('/admin', auth(), async (c: GravitoContext, next: GravitoNext) => { ... })
```

### New Features

#### Remember Me
`SessionGuard` now supports a `remember` parameter in `login()` and `attempt()`.

```typescript
await auth.attempt(credentials, true) // Enable remember me
```

#### JWT Refresh Tokens
Use `JwtRefreshGuard` to generate and refresh token pairs.

```typescript
const tokens = await guard.createTokenPair(user)
// { accessToken, refreshToken, expiresIn }

const newTokens = await guard.refreshTokens(refreshToken)
```

#### Rate Limiting
Protect your login routes with `throttleAuth`.

```typescript
import { throttleAuth } from '@gravito/sentinel'

app.post('/login', throttleAuth({ maxAttempts: 5 }), async (c) => { ... })
```

## License

MIT
