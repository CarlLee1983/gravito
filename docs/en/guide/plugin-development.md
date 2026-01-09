---
title: Plugin Development Guide
---

# Plugin Development Guide

> How to develop Satellites and Kinetic Modules for the Gravito Galaxy Architecture

Gravito is a micro-kernel framework, and its power comes from the ecosystem. This guide will help you develop your own extensions.

---

## Terminology

| Term | Concept | Purpose | Example |
|------|---------|---------|---------|
| **PlanetCore** | Micro-kernel | Lifecycle, Hooks, Config | `@gravito/core` |
| **Gravito** | Infrastructure Module | Database, Auth, Storage | `@gravito/atlas` |
| **Satellite** | Business Logic Plugin | Uses Gravito features | `user-plugin`, `blog-plugin` |

---

## Developing Satellites (Logic Plugins)

Satellites interact with the core primarily through the `HookManager`.

### Basic Structure

A Satellite is typically a function that receives the `core` instance:

```typescript
// my-satellite.ts
import { PlanetCore } from '@gravito/core'

export default function mySatellite(core: PlanetCore) {
  // 1. Read config (optional)
  const apiKey = core.config.get('MY_API_KEY')

  // 2. Register Hooks
  core.hooks.addAction('app:ready', () => {
    core.logger.info('Satellite is online')
  })

  // 3. Register routes
  router.get('/satellite/hello', (c) => {
    return c.json({ message: 'Signal from satellite' })
  })
}
```

### Interacting with Kinetic Modules

Satellites often need access to database or authentication. These are provided by Kinetic Modules and injected into the Request Context:

```typescript
// user-satellite.ts
import { PlanetCore } from '@gravito/core'

export default function userSatellite(core: PlanetCore) {
  router.post('/users', async (ctx) => {
    // Get Gravito services from Context
    const db = ctx.get('db')     // Provided by @gravito/atlas
    const auth = ctx.get('auth') // Provided by @gravito/sentinel

    // Use services
    await auth.verify(ctx.req.header('Authorization'))
    const newUser = await db.insert('users', { ... })

    return ctx.json(newUser)
  })
}
```

---

## Developing Kinetic Modules (Infrastructure Modules)

Kinetic Modules are lower-level extensions that provide infrastructure services. In v0.3+, Kinetic Modules should implement the `GravitoOrbit` interface for IoC support.

### Design Principles

- **Encapsulation**: Hide complex implementation details (e.g., `drizzle-orm` initialization)
- **Injection**: Inject services into Gravito Context (`c.set('service', ...)`)
- **Extensibility**: Trigger Hooks at key operations (e.g., `verify`, `upload`)

### The GravitoOrbit Interface

```typescript
import type { GravitoOrbit, PlanetCore } from '@gravito/core'

export interface GravitoOrbit {
  install(core: PlanetCore): void | Promise<void>
}
```

### Class-Based Gravito Example

```typescript
// orbit-custom.ts
import { PlanetCore, GravitoOrbit } from '@gravito/core'
import type { GravitoContext as Context, Next } from '@gravito/core'

export interface CustomGravitoConfig {
  apiKey: string
  timeout?: number
}

export class GravitoCustom implements GravitoOrbit {
  constructor(private options?: CustomGravitoConfig) {}

  install(core: PlanetCore): void {
    const config = this.options ?? core.config.get<CustomGravitoConfig>('custom')
    const service = new CustomService(config)

    core.hooks.doAction('custom:init', service)

    router.use('*', async (c: Context, next: Next) => {
      c.set('custom', service)
      await next()
    })

    core.logger.info('GravitoCustom installed')
  }
}

// Export for functional API compatibility
export function orbitCustom(core: PlanetCore, config: CustomGravitoConfig) {
  const orbit = new GravitoCustom(config)
  orbit.install(core)
}
```

### Lifecycle Hooks

`install()` is called during bootstrap. For request-level behavior, register HTTP middleware inside `install()`.

### Using with IoC

```typescript
// gravito.config.ts
import { PlanetCore, defineConfig } from '@gravito/core'
import { GravitoCustom } from './orbit-custom'

const config = defineConfig({
  config: {
    custom: {
      apiKey: process.env.CUSTOM_API_KEY,
      timeout: 5000
    }
  },
  orbits: [GravitoCustom] // Will auto-resolve config
})

const core = await PlanetCore.boot(config)
export default core.liftoff()
```

### Database Integration

If your Gravito requires database tables:

1. **Do not run migrations automatically** in `install()`.
2. Provide standard Drizzle migration files in your package.
3. Instruct users to import your migrations or use `gravito migrate` with a custom config path if necessary.

---

## Best Practices

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Hook names** | Use `:` separator | `auth:login`, `db:connect` |
| **Context keys** | camelCase | `db`, `auth`, `storage` |
| **Gravito classes** | `Gravito` prefix | `GravitoDB`, `GravitoAuth` |

### Type Safety

Always provide TypeScript definitions. Extend Gravito's `Variables` interface for autocomplete:

```typescript
// types.ts
import { CustomService } from './custom-service'

declare module '@gravito/core' {
  interface GravitoVariables {
    custom: CustomService
  }
}
```

### Testing

```typescript
// orbit-custom.test.ts
import { describe, it, expect } from 'bun:test'
import { PlanetCore } from '@gravito/core'
import { GravitoCustom } from './orbit-custom'

describe('GravitoCustom', () => {
  it('should initialize with config', async () => {
    const core = await PlanetCore.boot({
      config: { custom: { apiKey: 'test-key' } },
      orbits: [GravitoCustom],
    })

    // Verify service is available
    expect(core.config.get('custom').apiKey).toBe('test-key')
  })
})
```

---

## Publishing an Gravito

1. **Repository structure:**
   ```
   orbit-custom/
   ├── src/
   │   ├── index.ts      # Export GravitoCustom class
   │   └── types.ts      # TypeScript declarations
   ├── package.json
   ├── tsconfig.json
   └── README.md
   ```

2. **package.json:**
   ```json
   {
     "name": "@gravito/custom",
     "version": "0.1.0",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "peerDependencies": {
       "@gravito/core": "^1.0.0"
     }
   }
   ```

3. **Document your Hooks:**
   - List all hooks your Gravito triggers
   - Explain arguments and expected return values

---

*For the complete framework architecture, see [GRAVITO_AI_GUIDE.md](../../../GRAVITO_AI_GUIDE.md).*
