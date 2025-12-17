---
title: Plugin Development Guide
---

# Plugin Development Guide

> How to develop Satellites and Orbits for the Gravito Galaxy Architecture

Gravito is a micro-kernel framework, and its power comes from the ecosystem. This guide will help you develop your own extensions.

---

## Terminology

| Term | Concept | Purpose | Example |
|------|---------|---------|---------|
| **PlanetCore** | Micro-kernel | Lifecycle, Hooks, Config | `gravito-core` |
| **Orbit** | Infrastructure Module | Database, Auth, Storage | `@gravito/orbit-db` |
| **Satellite** | Business Logic Plugin | Uses Orbit features | `user-plugin`, `blog-plugin` |

---

## Developing Satellites (Logic Plugins)

Satellites interact with the core primarily through the `HookManager`.

### Basic Structure

A Satellite is typically a function that receives the `core` instance:

```typescript
// my-satellite.ts
import { PlanetCore } from 'gravito-core'

export default function mySatellite(core: PlanetCore) {
  // 1. Read config (optional)
  const apiKey = core.config.get('MY_API_KEY')

  // 2. Register Hooks
  core.hooks.addAction('app:ready', () => {
    core.logger.info('Satellite is online')
  })

  // 3. Register routes
  core.app.get('/satellite/hello', (c) => {
    return c.json({ message: 'Signal from satellite' })
  })
}
```

### Interacting with Orbits

Satellites often need access to database or authentication. These are provided by Orbits and injected into the Request Context:

```typescript
// user-satellite.ts
import { PlanetCore } from 'gravito-core'

export default function userSatellite(core: PlanetCore) {
  core.app.post('/users', async (c) => {
    // Get Orbit services from Context
    const db = c.get('db')     // Provided by @gravito/orbit-db
    const auth = c.get('auth') // Provided by @gravito/orbit-auth

    // Use services
    await auth.verify(c.req.header('Authorization'))
    const newUser = await db.insert('users', { ... })

    return c.json(newUser)
  })
}
```

---

## Developing Orbits (Infrastructure Modules)

Orbits are lower-level extensions that provide infrastructure services. In v0.3+, Orbits should implement the `GravitoOrbit` interface for IoC support.

### Design Principles

- **Encapsulation**: Hide complex implementation details (e.g., `drizzle-orm` initialization)
- **Injection**: Inject services into Hono Context (`c.set('service', ...)`)
- **Extensibility**: Trigger Hooks at key operations (e.g., `verify`, `upload`)

### The GravitoOrbit Interface

```typescript
import type { GravitoOrbit, PlanetCore } from 'gravito-core'

export interface GravitoOrbit {
  install(core: PlanetCore): void | Promise<void>
}
```

### Class-Based Orbit Example

```typescript
// orbit-custom.ts
import { PlanetCore, GravitoOrbit } from 'gravito-core'
import type { Context, Next } from 'hono'

export interface CustomOrbitConfig {
  apiKey: string
  timeout?: number
}

export class OrbitCustom implements GravitoOrbit {
  constructor(private options?: CustomOrbitConfig) {}

  install(core: PlanetCore): void {
    const config = this.options ?? core.config.get<CustomOrbitConfig>('custom')
    const service = new CustomService(config)

    core.hooks.doAction('custom:init', service)

    core.app.use('*', async (c: Context, next: Next) => {
      c.set('custom', service)
      await next()
    })

    core.logger.info('OrbitCustom installed')
  }
}

// Export for functional API compatibility
export function orbitCustom(core: PlanetCore, config: CustomOrbitConfig) {
  const orbit = new OrbitCustom(config)
  orbit.install(core)
}
```

### Lifecycle Hooks

`install()` is called during bootstrap. For request-level behavior, register Hono middleware inside `install()`.

### Using with IoC

```typescript
// gravito.config.ts
import { PlanetCore, defineConfig } from 'gravito-core'
import { OrbitCustom } from './orbit-custom'

const config = defineConfig({
  config: {
    custom: {
      apiKey: process.env.CUSTOM_API_KEY,
      timeout: 5000
    }
  },
  orbits: [OrbitCustom] // Will auto-resolve config
})

const core = await PlanetCore.boot(config)
export default core.liftoff()
```

---

## Best Practices

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Hook names** | Use `:` separator | `auth:login`, `db:connect` |
| **Context keys** | camelCase | `db`, `auth`, `storage` |
| **Orbit classes** | `Orbit` prefix | `OrbitDB`, `OrbitAuth` |

### Type Safety

Always provide TypeScript definitions. Extend Hono's `Variables` interface for autocomplete:

```typescript
// types.ts
import { CustomService } from './custom-service'

declare module 'hono' {
  interface ContextVariableMap {
    custom: CustomService
  }
}
```

### Testing

```typescript
// orbit-custom.test.ts
import { describe, it, expect } from 'bun:test'
import { PlanetCore } from 'gravito-core'
import { OrbitCustom } from './orbit-custom'

describe('OrbitCustom', () => {
  it('should initialize with config', async () => {
    const core = await PlanetCore.boot({
      config: { custom: { apiKey: 'test-key' } },
      orbits: [OrbitCustom],
    })

    // Verify service is available
    expect(core.config.get('custom').apiKey).toBe('test-key')
  })
})
```

---

## Publishing an Orbit

1. **Repository structure:**
   ```
   orbit-custom/
   ├── src/
   │   ├── index.ts      # Export OrbitCustom class
   │   └── types.ts      # TypeScript declarations
   ├── package.json
   ├── tsconfig.json
   └── README.md
   ```

2. **package.json:**
   ```json
   {
     "name": "@gravito/orbit-custom",
     "version": "0.1.0",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "peerDependencies": {
       "gravito-core": "^0.3.0",
       "hono": "^4.0.0"
     }
   }
   ```

3. **Document your Hooks:**
   - List all hooks your Orbit triggers
   - Explain arguments and expected return values

---

*For the complete framework architecture, see [GRAVITO_AI_GUIDE.md](../../../GRAVITO_AI_GUIDE.md).*
