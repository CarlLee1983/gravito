# @gravito/sentinel

Authentication and authorization orbit for Gravito Galaxy. Inspired by Laravel's auth system and designed for TypeScript.

## Features

- **Multiple guards**: Session, JWT, and token-based authentication
- **Flexible user providers**: Callback-based provider for custom user lookup
- **Authorization gates**: Define and check abilities
- **Password management**: HashManager with bcrypt and argon2id
- **Password resets**: PasswordBroker workflow support
- **Email verification**: Optional verification service

## Installation

```bash
bun add @gravito/sentinel
```

Peer dependencies:

- `gravito-core`
- `@gravito/photon` (^4.0.0)

If you use the Session guard, install `@gravito/pulsar`:

```bash
bun add @gravito/pulsar
```

## Quick Start

### 1. Configure OrbitSentinel

```typescript
import { PlanetCore } from 'gravito-core'
import { OrbitSentinel, type AuthConfig, CallbackUserProvider } from '@gravito/sentinel'
import { OrbitPulsar } from '@gravito/pulsar'

const core = new PlanetCore()

const session = new OrbitPulsar({
  driver: 'memory',
})
session.install(core)

const authConfig: AuthConfig = {
  defaults: {
    guard: 'web',
    passwords: 'users',
  },
  guards: {
    web: {
      driver: 'session',
      provider: 'users',
      sessionKey: 'auth_session'
    }
  },
  providers: {
    users: {
      driver: 'callback'
    }
  }
}

const auth = new OrbitSentinel({
  ...authConfig,
  bindings: {
    providers: {
      users: () => new CallbackUserProvider(
        async (id) => {
          return null
        },
        async (user, credentials) => {
          return false
        },
        async (identifier, token) => null,
        async (credentials) => {
          return null
        }
      )
    }
  }
})

auth.install(core)
```

### 2. Authenticate in routes

```typescript
import { auth } from '@gravito/sentinel'

app.post('/login', async (c) => {
  const authManager = c.get('auth')

  const success = await authManager.attempt({
    email: c.req.query('email'),
    password: c.req.query('password')
  })

  if (success) {
    return c.json({ message: 'Logged in' })
  }

  return c.json({ message: 'Invalid credentials' }, 401)
})

app.get('/dashboard', auth(), async (c) => {
  const authManager = c.get('auth')
  const user = await authManager.user()

  return c.json({ user })
})
```

## License

MIT
