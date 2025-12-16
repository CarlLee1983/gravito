# gravito-core

> The Micro-kernel for Galaxy Architecture. Lightweight, extensible, and built on Hono & Bun.

[![npm version](https://img.shields.io/npm/v/gravito-core.svg)](https://www.npmjs.com/package/gravito-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)

**gravito-core** is the foundation for building modular backend applications using the **Galaxy Architecture**. It provides a robust Hook system (Filters & Actions) and an Orbit mounting mechanism, allowing you to build loosely coupled, highly extensible systems.

## ✨ Features

- 🪐 **PlanetCore** - A centralized Hono-based kernel to manage your application lifecycle.
- 🪝 **Hook System** - WordPress-style async **Filters** and **Actions** for powerful extensibility.
- 🛰️ **Orbit Mounting** - Easily mount external Hono applications (Orbits) to specific paths.
- 📝 **Logger System** - PSR-3 style logger interface with default standard output implementation.
- ⚙️ **Config Manager** - Unified configuration management supporting environment variables (`Bun.env`) and runtime injection.
- 🛡️ **Error Handling** - Built-in standardized JSON error responses and 404 handling.
- 🚀 **Modern** - Built for **Bun** runtime with native TypeScript support.
- 🪶 **Lightweight** - Zero external dependencies (except `hono`).

## 📦 Installation

```bash
bun add gravito-core
```

## 🚀 Quick Start

### 1. Initialize the Core

```typescript
import { PlanetCore } from 'gravito-core';

// Initialize with options (v0.2.0+)
const core = new PlanetCore({
  config: {
    PORT: 4000,
    DEBUG: true
  }
});
```

### 2. Register Hooks

Use **Filters** to modify data:

```typescript
core.hooks.addFilter('modify_content', async (content: string) => {
  return content.toUpperCase();
});

const result = await core.hooks.applyFilters('modify_content', 'hello galaxy');
// result: "HELLO GALAXY"
```

Use **Actions** to trigger side-effects:

```typescript
core.hooks.addAction('user_registered', async (userId: string) => {
  core.logger.info(`Sending welcome email to ${userId}`);
});

await core.hooks.doAction('user_registered', 'user_123');
```

### 3. Mount an Orbit

Orbits are just standard Hono applications that plug into the core.

```typescript
import { Hono } from 'hono';

const blogOrbit = new Hono();
blogOrbit.get('/posts', (c) => c.json({ posts: [] }));

// Mount the orbit to /api/blog
core.mountOrbit('/api/blog', blogOrbit);
```

### 4. Liftoff! 🚀
### 4. Bootstrapping (IoC)

Gravito v0.3 introduces an **IoC (Inversion of Control)** system to simplify plugin integration. instead of manually instantiating orbits, you define a `gravito.config.ts` and let the core auto-discover dependencies.

**Old Way (Manual):**
```typescript
const core = new PlanetCore();
orbitDB(core, { db });
orbitAuth(core, { secret });
```

**New Way (Auto-Discovery):**
```typescript
// gravito.config.ts
import { defineConfig } from 'gravito-core';
import { OrbitAuth } from '@gravito/orbit-auth';
import { OrbitDB } from '@gravito/orbit-db';

export default defineConfig({
  config: {
    auth: { secret: process.env.JWT_SECRET },
    db: { db: drizzle(...) }
  },
  orbits: [OrbitAuth, OrbitDB]
});

// index.ts
import { PlanetCore } from 'gravito-core';
import config from './gravito.config';

PlanetCore.boot(config).then(core => core.liftoff());
```

This promotes structure and consistency across your galaxy.

```typescript
// Export for Bun.serve
export default core.liftoff(); // Automatically uses PORT from config/env
```

## 📖 API Reference

### `PlanetCore`

- **`constructor(options?)`**: Initialize the core with optional Logger and Config.
- **`mountOrbit(path: string, app: Hono)`**: Mount a Hono app to a sub-path.
- **`liftoff(port?: number)`**: Returns the configuration object for `Bun.serve`.
- **`app`**: Access the internal Hono instance.
- **`hooks`**: Access the HookManager.
- **`logger`**: Access the Logger instance.
- **`config`**: Access the ConfigManager.

### `HookManager`

- **`addFilter(hook, callback)`**: Register a filter.
- **`applyFilters(hook, initialValue, ...args)`**: Execute filters sequentially.
- **`addAction(hook, callback)`**: Register an action.
- **`doAction(hook, ...args)`**: Execute actions.

### `ConfigManager`

- **`get(key, default?)`**: Retrieve a config value.
- **`set(key, value)`**: Set a config value.
- **`has(key)`**: Check if a config key exists.

## 🤝 Contributing

Contributions, issues and feature requests are welcome!
Feel free to check the [issues page](https://github.com/CarlLee1983/gravito-core/issues).

## 📝 License

MIT © [Carl Lee](https://github.com/CarlLee1983)
