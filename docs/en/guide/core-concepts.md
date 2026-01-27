---
title: Gravito Core Concepts
---

# Gravito Core Concepts

> **"The High-Performance Framework for Builders."**  


<div class="not-prose my-5 flex flex-wrap items-center gap-2">
  <a href="https://www.npmjs.com/package/@gravito/core" target="_blank" rel="noreferrer">
    <img alt="npm version" src="https://img.shields.io/npm/v/@gravito/core.svg" class="h-5" loading="lazy" />
  </a>
  <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noreferrer">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" class="h-5" loading="lazy" />
  </a>
  <a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.0+-blue.svg" class="h-5" loading="lazy" />
  </a>
  <a href="https://bun.sh/" target="_blank" rel="noreferrer">
    <img alt="Bun" src="https://img.shields.io/badge/Bun-1.0+-black.svg" class="h-5" loading="lazy" />
  </a>
</div>

Welcome to Gravito Core. A backend framework built for extreme performance and architectural elegance, designed to let developers rediscover the joy of true "craftsmanship" in the Bun era.

---

## Philosophy: Singularity & Gravity

In the Gravito worldview, a system is treated as a micro-galaxy:

- **PlanetCore (Micro-kernel)**: The Kernel maintains system health and coordination without interfering with specific business logic.
- **Orbits**: Infrastructure modules (e.g., Atlas, Signal) that orbit the core, providing essential resources.
- **Satellites**: Business logic hubs that encapsulate domain logic using DDD patterns.

### Four Pillars of Excellence

- **High Performance**: Built on Bun for microsecond routing and low-overhead request handling.
- **MDD (Manifest-Driven)**: Rapidly assemble systems via declarative configuration.
- **Micro-kernel**: A core of just a few KBs; functionalities are strictly opt-in.
- **AI-First**: Use the UseCase pattern and strict typing to ensure high-quality AI code generation.

---

## Galaxy Architecture

### 1. PlanetCore (The Micro-kernel)

The gravitational center. A minimal, high-efficiency foundation responsible for:

- **Lifecycle Management**: From initial Boot to final Liftoff.
- **Hook System**: Non-intrusive extension via Filters and Actions.
- **Dependency Injection**: A lightweight, high-performance IoC container.

### 2. Orbits (Infrastructure)

These modules extend core functionalities in a plug-in manner. The core contains no business logic; all foundation services (such as the `Atlas` database or `Signal` event bus) are provided by Orbits.

### 3. Satellites (Business Logic)

This is your territory. All UseCases, Controllers, and domain logic are encapsulated in Satellites.

---

## Core Features

### Manifest-Driven Development (MDD)

Enable features with a single entry in `gravito.config.ts`. The framework handles provider discovery and route mounting automatically.

Gravito features built-in smart negotiation, allowing a single Controller to automatically switch response types:

```typescript
import type { GravitoContext } from '@gravito/core'

export class UserController {
  index(ctx: GravitoContext) {
    return ctx.view('Users/Index', { users: [] })
    // Inertia Request -> returns JSON
    // Landing/Crawler -> returns SSR HTML (App Shell)
  }
}
```

### Binary-First Distribution

We advocate for "Single File" deployment. Leveraging Bun's compilation, you can bundle your entire app (including runtime) into a single binary, completely eliminating `node_modules` from your production environment.

---

## Quick Start

### Installation
```bash
bun add @gravito/core
```

### Your First App
```typescript
import { PlanetCore } from '@gravito/core'
import type { GravitoContext } from '@gravito/core'

const app = new PlanetCore()

app.router.get('/', (ctx: GravitoContext) => ctx.text('Hello Singularity!'))

export default app.liftoff()
```

---

## Further Reading

- [HTTP Abstraction Migration](./migration-http-abstraction.md)
- [Deployment Guide](./deployment.md)
- [Routing System](./routing.md)
- [ORM Practice (Atlas)](./orm-usage.md)


---

## License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
