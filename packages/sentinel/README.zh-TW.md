# @gravito/sentinel

> Gravito 的認證與授權模組，提供 Guard 與使用者提供者等機制。

## 安裝

```bash
bun add @gravito/sentinel
```

若使用 Session Guard，請加裝：

```bash
bun add @gravito/pulsar
```

## 快速開始

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitSentinel, type AuthConfig, CallbackUserProvider } from '@gravito/sentinel'
import { OrbitPulsar } from '@gravito/pulsar'

const core = new PlanetCore()

const session = new OrbitPulsar({ driver: 'memory' })
session.install(core)

const authConfig: AuthConfig = {
  defaults: { guard: 'web', passwords: 'users' },
  guards: {
    web: {
      driver: 'session',
      provider: 'users',
      sessionKey: 'auth_session'
    }
  },
  providers: {
    users: { driver: 'callback' }
  }
}

const auth = new OrbitSentinel({
  ...authConfig,
  bindings: {
    providers: {
      users: () => new CallbackUserProvider(
        async (id) => null,
        async (user, credentials) => false,
        async (identifier, token) => null,
        async (credentials) => null
      )
    }
  }
})

auth.install(core)
```
