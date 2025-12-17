# Gravito Core Concepts

> **"The High-Performance Framework for Artisans."**
> 為工匠打造的高效能框架

[![npm version](https://img.shields.io/npm/v/gravito-core.svg)](https://www.npmjs.com/package/gravito-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)

Welcome to Gravito Core! 🚀 This guide covers the fundamental concepts and architecture of the framework.

---

## 🎯 Product Positioning

### Key Differentiators

| vs. | Gravito Advantage |
|-----|-------------------|
| **Laravel** | Bun + Hono powered, millisecond startup time |
| **Next.js** | Binary-First strategy, single executable, no `node_modules` hell |
| **Express/Koa** | Enforced MVC layering, no scattered backend logic |

---

## 📚 Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      TypeScript (Strict)                     │
│                    AI-friendly type hints                    │
├─────────────────────────────────────────────────────────────┤
│  Inertia.js              │            Vite                  │
│  (Frontend Bridge)       │       (Build Tool)               │
│  Backend MVC, SPA UX     │    React/Vue HMR                 │
├──────────────────────────┴──────────────────────────────────┤
│                         Hono                                 │
│              World's Fastest JS Web Framework                │
│            (Router + Request Parser)                         │
├─────────────────────────────────────────────────────────────┤
│                          Bun                                 │
│           Ultra-fast JS Runtime + Bundler                    │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Technology | Role |
|-------|------------|------|
| **Runtime** | Bun | Ultra-fast JS runtime + bundler |
| **HTTP Core** | Hono | World's fastest JS web framework |
| **Frontend Bridge** | Inertia.js | Backend MVC patterns, SPA user experience |
| **Build Tool** | Vite | React/Vue hot module replacement |
| **Language** | TypeScript | Strict mode, AI-friendly type hints |

---

## 🌌 Galaxy Architecture

Gravito follows a unique design pattern inspired by celestial mechanics:

### 1. PlanetCore (Micro-kernel)

The gravitational center. A minimal, high-performance foundation responsible for:

- Lifecycle management (Liftoff)
- Hook system (Filters & Actions)
- Error handling
- Config & Logger management

It knows **nothing** about databases, authentication, or business logic.

```typescript
const core = new PlanetCore({
  orbits: [OrbitDB, OrbitAuth, OrbitInertia], // Opt-in plugins
})

await core.boot()   // Boot-time Resolution
await core.ignite() // Start HTTP server
```

### 2. Orbits (Infrastructure Modules)

Standard extension modules orbiting the core:

- `@gravito/orbit-db`: Database integration (Drizzle ORM)
- `@gravito/orbit-auth`: Authentication (JWT)
- `@gravito/orbit-storage`: File storage
- `@gravito/orbit-cache`: Caching
- `@gravito/orbit-inertia`: Inertia.js integration

### 3. Satellites (Business Logic Plugins)

This is where **your** code lives. Small, focused modules (e.g., `Users`, `Products`, `Payment`) that mount onto Orbits.

---

## ⚡ Core Engine Features

### A. Micro-Kernel Design

- **Zero Dependency Core**: Only handles I/O and plugin orchestration
- **Boot-time Resolution**: Routes and dependencies compiled at startup, ensuring runtime is read-only and blazing fast

### B. Smart Context

#### `ctx.view(template, props)` - Core Black Magic

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

#### `ctx.meta(tags)` - SEO Integration

Unified SEO interface, automatically injects into HTML `<head>` or passes to Inertia `<Head>` component.

```typescript
ctx.meta({
  title: 'Gravito Framework',
  description: 'The High-Performance Framework for Artisans',
  og: {
    image: '/images/og-cover.png',
    type: 'website'
  }
})
```

### C. Plugin System

- **Opt-in**: No DB, Auth by default - add what you need
- **Interface-based**: Wrapped via Hono Middleware mechanism

#### Plugin Lifecycle Hooks

| Phase | Hook | Purpose |
|-------|------|---------|
| Boot | `onBoot()` | Initialize connections, load configs |
| Request | `onRequest()` | Inject context, validate |

```typescript
export class OrbitDB implements GravitoOrbit {
  async onBoot(core: PlanetCore) {
    // Establish database connection
  }
  
  async onRequest(ctx: Context, next: Next) {
    // Inject ctx.db
  }
}
```

---

## 🛠️ Installation

```bash
bun add gravito-core
```

## 🚀 Quick Start

### 1. Initialize the Core

```typescript
import { PlanetCore } from 'gravito-core'

const core = new PlanetCore({
  config: {
    PORT: 4000,
    DEBUG: true
  }
})
```

### 2. Register Hooks

Use **Filters** to modify data:

```typescript
core.hooks.addFilter('modify_content', async (content: string) => {
  return content.toUpperCase()
})

const result = await core.hooks.applyFilters('modify_content', 'hello galaxy')
// result: "HELLO GALAXY"
```

Use **Actions** to trigger side-effects:

```typescript
core.hooks.addAction('user_registered', async (userId: string) => {
  core.logger.info(`Sending welcome email to ${userId}`)
})

await core.hooks.doAction('user_registered', 'user_123')
```

### 3. Mount an Orbit

Orbits are standard Hono applications that plug into the core.

```typescript
import { Hono } from 'hono'

const blogOrbit = new Hono()
blogOrbit.get('/posts', (c) => c.json({ posts: [] }))

core.mountOrbit('/api/blog', blogOrbit)
```

### 4. Bootstrapping (IoC)

Gravito v0.3+ introduces **IoC (Inversion of Control)** for simplified plugin integration:

```typescript
// gravito.config.ts
import { defineConfig } from 'gravito-core'
import { OrbitAuth } from '@gravito/orbit-auth'
import { OrbitDB } from '@gravito/orbit-db'

export default defineConfig({
  config: {
    auth: { secret: process.env.JWT_SECRET },
    db: { db: drizzle(...) }
  },
  orbits: [OrbitAuth, OrbitDB]
})

// index.ts
import { PlanetCore } from 'gravito-core'
import config from './gravito.config'

PlanetCore.boot(config).then(core => core.liftoff())
```

### 5. Liftoff! 🚀

```typescript
export default core.liftoff() // Automatically uses PORT from config/env
```

---

## 📖 API Reference

### `PlanetCore`

| Method/Property | Description |
|-----------------|-------------|
| `constructor(options?)` | Initialize with optional Logger and Config |
| `mountOrbit(path, app)` | Mount a Hono app to a sub-path |
| `liftoff(port?)` | Returns config object for `Bun.serve` |
| `app` | Access internal Hono instance |
| `hooks` | Access HookManager |
| `logger` | Access Logger instance |
| `config` | Access ConfigManager |

### `HookManager`

| Method | Description |
|--------|-------------|
| `addFilter(hook, callback)` | Register a filter |
| `applyFilters(hook, initialValue, ...args)` | Execute filters sequentially |
| `addAction(hook, callback)` | Register an action |
| `doAction(hook, ...args)` | Execute actions |

### `ConfigManager`

| Method | Description |
|--------|-------------|
| `get(key, default?)` | Retrieve a config value |
| `set(key, value)` | Set a config value |
| `has(key)` | Check if a config key exists |

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!
Feel free to check the [issues page](https://github.com/CarlLee1983/gravito-core/issues).

## 📝 License

MIT © [Carl Lee](https://github.com/CarlLee1983)
