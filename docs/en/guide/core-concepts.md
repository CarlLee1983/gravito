---
title: Gravito Core Concepts
---

# Gravito Core Concepts

> **"The High-Performance Framework for Artisans."**
> 為工匠打造的高效能框架

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

Welcome to Gravito Core. This guide covers the fundamental concepts and architecture of the framework.

<div class="my-8 not-prose rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
  <picture>
    <source media="(min-width: 1280px)" srcset="/static/image/hero-2560.webp">
    <source media="(min-width: 768px)" srcset="/static/image/hero-1280.webp">
    <img src="/static/image/hero-768.webp" alt="Gravito Core Architecture" class="w-full h-auto object-cover">
  </picture>
</div>

---

## Design Principles

Gravito is built around four non-negotiable pillars:

- **High performance**: fast startup and efficient request handling.
- **Low overhead**: minimize runtime work and reduce hidden costs.
- **Lightweight**: opt-in components and a small operational footprint.
- **AI-friendly**: strict types and consistent conventions for reliable code generation.

---

## Product Positioning

### Key Differentiators

| vs. | Gravito Advantage |
|-----|-------------------|
| **Laravel** | Bun + Hono powered, millisecond startup time |
| **Next.js** | Binary-first distribution, deploy as a single executable without shipping `node_modules` |
| **Express/Koa** | Enforced MVC layering, no scattered backend logic |

---

## Technology Stack

<div class="not-prose my-10 font-sans grid gap-4 text-left">
  <div class="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900 p-6 text-center shadow-lg">
    <div class="absolute left-0 top-0 h-1 w-full bg-blue-500"></div>
    <h3 class="mb-2 text-xl font-bold text-gray-100">TypeScript (Strict)</h3>
    <p class="text-sm text-gray-400">Strict typing with AI-friendly hints</p>
  </div>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
    <div class="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div class="absolute left-0 top-0 h-1 w-full bg-purple-500"></div>
      <h4 class="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">Inertia.js</h4>
      <p class="mb-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Frontend Bridge</p>
      <p class="text-sm text-gray-500 dark:text-gray-400">Backend MVC patterns with SPA user experience</p>
    </div>
    <div class="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div class="absolute left-0 top-0 h-1 w-full bg-yellow-400"></div>
      <h4 class="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">Vite</h4>
      <p class="mb-2 text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">Build Tool</p>
      <p class="text-sm text-gray-500 dark:text-gray-400">React/Vue HMR and modern bundling</p>
    </div>
  </div>
  <div class="rounded-xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-center text-white shadow-lg">
    <h3 class="mb-1 text-xl font-bold">Hono</h3>
    <p class="mb-1 text-sm text-orange-50">A fast JavaScript web framework</p>
    <p class="text-xs text-orange-100/80">(Router + Request Parser)</p>
  </div>
  <div class="rounded-xl border border-gray-800 bg-black p-6 text-center shadow-lg">
    <h3 class="mb-1 text-xl font-bold text-white">Bun</h3>
    <p class="text-sm text-gray-400">Ultra-fast JavaScript runtime + bundler</p>
  </div>
</div>

---

## Galaxy Architecture

Gravito follows a unique design pattern inspired by celestial mechanics:

### 1. PlanetCore (Micro-kernel)

The gravitational center. A minimal, high-performance foundation responsible for:

- Lifecycle management (Liftoff)
- Hook system (Filters & Actions)
- Error handling
- Config & Logger management

It knows **nothing** about databases, authentication, or business logic.

```typescript
const core = await PlanetCore.boot({
  orbits: [OrbitDB, OrbitAuth, OrbitInertia], // Opt-in extensions
})

export default core.liftoff()
```

### 2. Orbits (Infrastructure Modules)

Standard extension modules orbiting the core:

- `@gravito/orbit-db`: Database integration (Drizzle ORM)
- `@gravito/orbit-auth`: Authentication (JWT)
- `@gravito/orbit-session`: Session + CSRF protection
- `@gravito/orbit-storage`: File storage
- `@gravito/orbit-cache`: Caching
- `@gravito/orbit-inertia`: Inertia.js integration

### 3. Satellites (Business Logic Plugins)

This is where **your** code lives. Small, focused modules (e.g., `Users`, `Products`, `Payment`) that mount onto Orbits.

---

## Core Engine Features

### A. Micro-Kernel Design

- **Zero Dependency Core**: Only handles I/O and plugin orchestration
- **Boot-time Resolution**: Routes and dependencies resolved at startup, keeping runtime lean and read-only where possible

### B. Smart Context

#### `ctx.view(template, props)` - Content Negotiation

**Content Negotiation**: Automatically detects request origin

| Request Type | Response | Use Case |
|--------------|----------|----------|
| **Inertia Request** | JSON | React/Vue frontend takes over |
| **HTML Request** | Server-Side Rendered HTML (App Shell) | Crawlers, initial page load |

```typescript
export class HomeController {
  index(ctx: Context) {
    return ctx.view('Home', {
      title: 'Welcome to Gravito',
      features: ['Fast', 'Light', 'Clean']
    })
  }
}
```

### C. Plugin System

- **Opt-in**: No DB, Auth by default - add what you need
- **Interface-based**: Wrapped via Hono Middleware mechanism

#### `GravitoOrbit` (Extension Contract)

Gravito extends the core via Orbits. An Orbit implements the `GravitoOrbit` interface and registers hooks and middleware during `install()`.

```typescript
export interface GravitoOrbit {
  install(core: PlanetCore): void | Promise<void>
}
```

---

## Installation

```bash
bun add gravito-core
```

## Quick Start

### 1. Structure

Gravito promotes a flat, clean structure:

```
src/
  controllers/
  models/
  views/
  index.ts
```

### 2. Bootstrapping (IoC)

Gravito v0.3+ introduces **IoC (Inversion of Control)** via `PlanetCore.boot()`.

```typescript
// index.ts
import { PlanetCore } from 'gravito-core'
import { OrbitInertia } from '@gravito/orbit-inertia'
import { OrbitView } from '@gravito/orbit-view'

// Initialize Core with Orbits
const core = await PlanetCore.boot({
  orbits: [
      OrbitInertia,
      OrbitView
  ],
  config: {
      app: { name: 'My Gravito App' }
  }
});

// Register Routes
core.router.group(root => {
  root.get('/', ctx => ctx.text('Hello Galaxy!'));
});

// Liftoff
export default core.liftoff();
```

### 3. Real World Example

Check out the [Gravito Official Site](https://github.com/CarlLee1983/gravito/tree/main/examples/official-site) in the `examples/` directory for a full-featured application showcasing:
- **Inertia.js + React** frontend
- **i18n** Internationalization
- **Tailwind CSS v4** integration
- **Markdown Documentation Engine**

---

## API Reference

### `PlanetCore`

| Method/Property | Description |
|-----------------|-------------|
| `boot(options)` | Static method to bootstrap core with IoC |
| `liftoff(port?)` | Returns config object for `Bun.serve` |
| `router` | Access the Gravito Router |
| `hooks` | Access HookManager |
| `logger` | Access Logger instance |

### `HookManager`

| Method | Description |
|--------|-------------|
| `addFilter(hook, callback)` | Register a filter |
| `applyFilters(hook, initialValue, ...args)` | Execute filters sequentially |
| `addAction(hook, callback)` | Register an action |
| `doAction(hook, ...args)` | Execute actions |

---

## Contributing

Contributions, issues and feature requests are welcome!
Feel free to check the [issues page](https://github.com/CarlLee1983/gravito/issues).

## License

MIT © [Carl Lee](https://github.com/CarlLee1983)
