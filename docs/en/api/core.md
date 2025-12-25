---
title: Core Kernel
description: The micro-kernel architecture of the Gravito framework.
---

# ☄ Core Kernel (PlanetCore)

The `@gravito/core` package is the heart of the Gravito ecosystem. It implements a micro-kernel architecture where functionalities are added via **Kinetic Modules** (Infrastructure) and **Satellites** (Features).

## PlanetCore

`PlanetCore` is the main class that orchestrates the application lifecycle.

```typescript
import { PlanetCore } from '@gravito/core'

const core = new PlanetCore()
```

### Lifecycle Methods

- **`boot()`**: Initializes all registered modules and prepares the service container.
- **`liftoff(options)`**: Starts the underlying HTTP engine (Adapter).
- **`orbit(ModuleClass)`**: Programmatically registers an infrastructure module.
- **`use(SatelliteClass)`**: Programmatically registers a feature module.

## Adapters

Gravito's high-performance engine is powered by the **Gravito Core Engine**, providing native support for modern runtimes like Bun and Deno.

```typescript
import { GravitoAdapter } from 'gravito-core'

core.liftoff({
  adapter: new GravitoAdapter(),
  port: 3000
})
```

## Building Kinetic Modules

A Kinetic Module is a class that integrates a specific infrastructure service into the core.

```typescript
export class MyKineticModule {
  async register(core: PlanetCore) {
    // Register services to the container
    core.container.singleton('myService', () => new MyService())
  }

  async boot(core: PlanetCore) {
    // Run initialization logic
  }
}
```

## Building Satellites

Satellites are lightweight feature modules that consume services provided by Kinetic Modules.

```typescript
export default function MyExtension(core: PlanetCore) {
  const router = core.container.make('router')
  
  router.get('/hello', (c) => c.text('Hello from Satellite!'))
}
```
