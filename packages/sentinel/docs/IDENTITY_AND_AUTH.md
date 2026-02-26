# Identity & Authentication Guide

Sentinel provides the identity infrastructure for the Gravito Galaxy. This guide explains how to configure guards and providers to manage user authentication effectively.

## 1. Authentication Guards

Guards define how users are authenticated for each request. Sentinel supports several types of guards:

- **`SessionGuard`**: Best for stateful web applications using cookies.
- **`JwtGuard`**: Ideal for stateless APIs and SPAs.
- **`TokenGuard`**: Used for simple API key authentication.

### Configuring a Guard

```typescript
import { Sentinel, SessionGuard, UserProvider } from '@gravito/sentinel'

const auth = new Sentinel({
  default: 'web',
  guards: {
    web: (core) => new SessionGuard(new UserProvider(core)),
    api: (core) => new JwtGuard(new UserProvider(core), { secret: '...' })
  }
})
```

## 2. User Providers

Providers are responsible for retrieving user records from your persistent storage (usually `atlas`).

```typescript
const provider = new UserProvider({
  model: () => User,
  // Custom lookup logic if needed
  async retrieveByCredentials(credentials) {
    return User.where('email', credentials.email).first()
  }
})
```

## 3. JWT Refresh & Blacklisting

For secure stateless authentication, use the `JwtRefreshGuard`. It handles token pairs and provides a mechanism to revoke tokens.

```typescript
const tokens = await auth.guard('api').createTokenPair(user)

// Later, refresh using the refresh token
const newTokens = await auth.guard('api').refreshTokens(refreshToken)

// Revoke a token (e.g., on logout)
await auth.guard('api').blacklist(token)
```

## 4. Multi-Tenant Identities

In a complex Galaxy, you might have different types of users (e.g., Admins, Customers). You can define separate guards for each:

```typescript
guards: {
  admin: (core) => new SessionGuard(new AdminProvider(core)),
  customer: (core) => new JwtGuard(new CustomerProvider(core))
}
```

## 5. Security Best Practices

- **Always enable Hashing**: Use `HashManager` with `argon2id` for password storage.
- **Use Rate Limiting**: Apply `throttleAuth` to all login and password reset routes.
- **Secure Cookies**: In production, ensure `SessionGuard` uses `secure: true` and `httpOnly: true` cookies.
