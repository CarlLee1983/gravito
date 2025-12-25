---
title: Gravito Core Concepts
---

# Gravito Core Concepts

> **"The High-Performance Framework for Builders."**  


<div class="not-prose my-5 flex flex-wrap items-center gap-2">
  <a href="https://www.npmjs.com/package/gravito-core" target="_blank" rel="noreferrer">
    <img alt="npm version" src="https://img.shields.io/npm/v/gravito-core.svg" class="h-5" loading="lazy" />
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

- **The Singularity**: Every request is optimized into a single path jump, eliminating framework overhead.
- **The Core Gravity**: The Kernel maintains system health and coordination without interfering with specific business logic.
- **Kinetic Modules**: Specialized infrastructure modules that extend the core functionalities, completely decoupled.

### Four Pillars of Excellence

- **High Performance**: Built on Bun with adapter-agnostic HTTP layer for microsecond routing.
- **Zero Overhead**: Boot-time resolution of routes and dependencies avoids runtime scanning.
- **Micro-kernel**: A tiny core of just a few KBs; features are purely opt-in.
- **AI-First**: Clear interface contracts and type inference make tools like Copilot/Cursor significantly smarter.
- **Future-Proof**: HTTP abstraction layer enables swapping underlying engine without code changes.

---

## Singularity Architecture

### 1. PlanetCore (The Micro-kernel)

The gravitational center. A minimal, high-efficiency foundation responsible for:

- **Lifecycle Management**: From initial Boot to final Liftoff.
- **Hook System**: Non-intrusive extension via Filters and Actions.
- **Dependency Injection**: A lightweight, high-performance IoC container.

```typescript
import { PlanetCore } from 'gravito-core'

const core = await PlanetCore.boot({
  modules: [Ion, Luminosity], // Load only v1.0 stable modules
})

export default core.liftoff() // Ignition for liftoff
```

### 2. Kinetic Modules

These modules extend the core functionalities in a plug-in manner. For decoupling and performance, the core does not contain any business logic; all functionalities (such as database, authentication, full-stack bridging) are provided by kinetic modules.

> Learn more: [Kinetic Ecosystem](./ecosystem.md)

### 3. Satellites (Business Logic)

This is your territory. All Controllers, Services, and business logic are encapsulated in Satellites, mounting seamlessly onto the Core or specialized modules.

---

## Core Features

### Content Negotiation

Gravito features built-in smart negotiation, allowing a single Controller to automatically switch response types:

```typescript
import type { GravitoContext } from 'gravito-core'

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
bun add gravito-core
```

### Your First App
```typescript
import { PlanetCore } from 'gravito-core'
import type { GravitoContext } from 'gravito-core'

const app = new PlanetCore()

app.router.get('/', (ctx: GravitoContext) => ctx.text('Hello Singularity!'))

export default app.liftoff()
```

---

## Further Reading

- [HTTP Abstraction Migration](./migration-http-abstraction.md)
- [Deployment Guide](./deployment.md)
- [Routing System](./routing.md)
- [ORM Practice (Drizzle)](./orm-usage.md) 

---

## License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
