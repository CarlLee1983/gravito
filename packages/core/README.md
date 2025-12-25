# gravito-core

> The Micro-kernel for Galaxy Architecture. Lightweight, extensible, and built on Photon & Bun.

[![npm version](https://img.shields.io/npm/v/gravito-core.svg)](https://www.npmjs.com/package/gravito-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)

**gravito-core** is the foundation for building modular backend applications using the **Galaxy Architecture**. It provides a robust Hook system (Filters & Actions) and an Orbit mounting mechanism, allowing you to build loosely coupled, highly extensible systems.

## ✨ Features

- 🪐 **PlanetCore** - A centralized Photon-based kernel to manage your application lifecycle.
- 📦 **IoC Container** - A lightweight dependency injection container with binding and singleton support.
- 🧩 **Service Providers** - Modular service registration and booting lifecycle.
- 🪝 **Hook System** - WordPress-style async **Filters** and **Actions** for powerful extensibility.
- 🛰️ **Orbit Mounting** - Easily mount external Photon applications (Orbits) to specific paths.
- 📝 **Logger System** - PSR-3 style logger interface with default standard output implementation.
- ⚙️ **Config Manager** - Unified configuration management supporting environment variables (`Bun.env`) and runtime injection.
- 🛡️ **Error Handling** - Built-in standardized JSON error responses and 404 handling.
- 🚀 **Modern** - Built for **Bun** runtime with native TypeScript support.
- 🪶 **Lightweight** - Zero external dependencies (except `@gravito/photon`).

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

### 2. Dependency Injection

Use the IoC Container to manage your application services:

```typescript
import { ServiceProvider, Container } from 'gravito-core';

class CacheServiceProvider extends ServiceProvider {
  register(container: Container) {
    // Bind a singleton service
    container.singleton('cache', (c) => {
      return new RedisCache(process.env.REDIS_URL);
    });
  }

  async boot(core: PlanetCore) {
    // Perform boot logic
    core.logger.info('Cache provider booted');
  }
}

// Register the provider
core.register(new CacheServiceProvider());

// Bootstrap the application (runs register() and boot())
await core.bootstrap();

// Resolve services
const cache = core.container.make('cache');
```

### 3. Register Hooks

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

### 4. Mount an Orbit

Orbits are just standard Photon applications that plug into the core.

```typescript
import { Photon } from '@gravito/photon';

const blogOrbit = new Photon();
blogOrbit.get('/posts', (c) => c.json({ posts: [] }));

// Mount the orbit to /api/blog
core.mountOrbit('/api/blog', blogOrbit);
```

### 5. Liftoff! 🚀

```typescript
// Export for Bun.serve
export default core.liftoff(); // Automatically uses PORT from config/env
```

### 6. Process-level Error Handling (Recommended)

Request-level errors are handled by `PlanetCore` automatically, but background jobs and startup code can still fail outside the request lifecycle.

```ts
// Register `unhandledRejection` / `uncaughtException`
const unregister = core.registerGlobalErrorHandlers()

// Optional: report to Sentry / custom reporter
core.hooks.addAction('processError:report', async (ctx) => {
  // ctx.kind: 'unhandledRejection' | 'uncaughtException'
  // ctx.error: unknown
})
```

## 📖 API Reference

### `PlanetCore`

- **`constructor(options?)`**: Initialize the core with optional Logger and Config.
- **`register(provider: ServiceProvider)`**: Register a service provider.
- **`bootstrap()`**: Boot all registered providers.
- **`mountOrbit(path: string, app: Photon)`**: Mount a Photon app to a sub-path.
- **`liftoff(port?: number)`**: Returns the configuration object for `Bun.serve`.
- **`container`**: Access the IoC Container.
- **`app`**: Access the internal Photon instance.
- **`hooks`**: Access the HookManager.
- **`logger`**: Access the Logger instance.
- **`config`**: Access the ConfigManager.

### `Container`

- **`bind(key, factory)`**: Register a transient binding.
- **`singleton(key, factory)`**: Register a shared binding.
- **`make<T>(key)`**: Resolve a service instance.
- **`instance(key, instance)`**: Register an existing object instance.
- **`has(key)`**: Check if a service is bound.

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
Feel free to check the [issues page](https://github.com/gravito-framework/gravito/issues).

## 📝 License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
