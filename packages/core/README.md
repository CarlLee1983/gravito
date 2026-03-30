# @gravito/core

> The Micro-kernel for Galaxy Architecture. Lightweight, extensible, and built on Photon & Bun.

[![npm version](https://img.shields.io/npm/v/@gravito/core.svg)](https://www.npmjs.com/package/@gravito/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)

**@gravito/core** is the foundation for building modular backend applications using the **Galaxy Architecture**. It provides a robust Hook system (Filters & Actions) and an Orbit mounting mechanism, allowing you to build loosely coupled, highly extensible systems.

## ✨ Features

- 🪐 **PlanetCore** - A centralized Photon-based kernel to manage your application lifecycle.
- 🏢 **Application Container** - Enterprise-grade container with auto-discovery of providers and convention-over-configuration patterns.
- 📦 **IoC Container** - A lightweight dependency injection container with binding and singleton support.
- 🧩 **Service Providers** - Modular service registration and booting lifecycle.
- 🪝 **Hook System** - WordPress-style async **Filters** and **Actions** for powerful extensibility.
- 📡 **Event System** - Centralized EventManager for cross-module communication and event-driven architecture.
- 🛰️ **Orbit Mounting** - Easily mount external Photon applications (Orbits) to specific paths.
- 📝 **Logger System** - PSR-3 style logger interface with default standard output implementation.
- ⚙️ **Config Manager** - Unified configuration management supporting environment variables, runtime injection, and file-based config loading.
- 🛡️ **Security Middleware** - Built-in protection (deprecated in v1.7.0, moved to `@gravito/photon`).
- 🔌 **Runtime Adapters** - Abstraction layer for underlying runtimes (Bun, Node.js) and HTTP engines.
- 🛡️ **Error Handling** - Built-in standardized JSON error responses, 404 handling, and process-level error management.
- 🧠 **Request Context** - Global access to request data via `AsyncLocalStorage` (requestId, userId, etc.).
- 🛠️ **CLI Commands** - CommandKernel for building artisan-style CLI tools.
- 🏥 **Health Probes** - Cloud-native Liveness and Readiness probes.
- ⚡ **Native Accelerators** - FFI-powered CBOR and hashing for peak performance.
- 🚀 **Modern** - Built for **Bun** runtime with native TypeScript support.
- 🪶 **Lightweight** - Zero external dependencies (except `@gravito/photon`).
- 📈 **Performance Audited** - Full [2026 Performance & Debt Audit](../../docs/optimization/CORE_AUDIT_2026.md) completed.

## 📦 Installation

```bash
bun add @gravito/core
```

## 🚀 Quick Start

### 1. Initialize the Application

For enterprise applications, use the `Application` class which provides auto-discovery and conventions:

```typescript
import { Application } from '@gravito/core';

const app = new Application({
  basePath: import.meta.dir,
  env: process.env.NODE_ENV as 'development' | 'production',
});

await app.boot();

export default app.core.liftoff();
```

Or use the lightweight `PlanetCore` directly:

```typescript
import { PlanetCore } from '@gravito/core';

const core = new PlanetCore({
  config: {
    PORT: 4000,
    DEBUG: true
  }
});
```

### 2. Request Context (AsyncLocalStorage)

Access request-scoped data anywhere in your application without parameter drilling:

```typescript
import { RequestContext } from '@gravito/core';

// In a deep service layer
const userId = RequestContext.get()?.userId;
const requestId = RequestContext.get()?.requestId;
```

### 3. Dependency Injection

Use the IoC Container to manage your application services:

```typescript
import { ServiceProvider, Container } from '@gravito/core';

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

### 4. Register Hooks

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

### 5. Mount an Orbit

Orbits are just standard Photon applications that plug into the core.

```typescript
import { Photon } from '@gravito/photon';

const blogOrbit = new Photon();
blogOrbit.get('/posts', (c) => c.json({ posts: [] }));

// Mount the orbit to /api/blog
core.mountOrbit('/api/blog', blogOrbit);
```

### 6. Liftoff! 🚀

```typescript
// Export for Bun.serve
export default core.liftoff(); // Automatically uses PORT from config/env
```

### 7. Process-level Error Handling (Recommended)

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

## 📊 Observability & Metrics

### Route Pattern Support

To prevent high cardinality in Prometheus metrics caused by dynamic paths (e.g., `/users/123`, `/users/456`), Gravito automatically detects the `routePattern`:

- **Path**: `/users/123`
- **Pattern**: `/users/:id`

The `routePattern` is available on the request object and used by the monitoring system.

## 🩺 Health Probes

Built-in support for cloud-native health checks:

```typescript
import { HealthProvider } from '@gravito/core';

app.register(new HealthProvider());

// Check: http://localhost:3000/health/liveness
// Check: http://localhost:3000/health/readiness
```

## 🛠️ CLI Commands

Easily build artisan-style CLI tools:

```typescript
import { CommandKernel } from '@gravito/core';

const kernel = new CommandKernel(container);
kernel.register('greet', async (args) => {
  console.log('Hello', args[0]);
});

await kernel.handle(process.argv.slice(2));
```

## ⚡ Native Accelerators (FFI)

Gravito Core leverages FFI to use high-performance C implementations for critical tasks:

- **CBOR**: Efficient binary serialization.
- **Hashing**: SIMD-accelerated SHA-256 and HMAC via Bun primitives.

## 🛡️ Security Middleware Migration

As of v1.7.0, all HTTP security middleware has been migrated to `@gravito/photon` for better engine alignment. Existing exports in `@gravito/core` are marked as `@deprecated` and will be removed in v2.0.0.

**Migration:**
```typescript
// Before
import { cors } from '@gravito/core';

// After
import { cors } from '@gravito/photon/middleware/security';
```

## 📖 API Reference

### `Application` (Enterprise Container)

- **`constructor(options: ApplicationConfig)`**: Create an application instance.
- **`boot()`**: Orchestrate the boot sequence (config loading, provider discovery).
- **`make<T>(key)`**: Resolve a service from the shared container.
- **`getConfig(key, default?)`**: Retrieve configuration.
- **`path(...segments)`**: Path helper relative to base path.

### `PlanetCore` (Micro-kernel)

- **`constructor(options?)`**: Initialize the core with optional Logger and Config.
- **`register(provider: ServiceProvider)`**: Register a service provider.
- **`bootstrap()`**: Boot all registered providers.
- **`mountOrbit(path: string, app: Photon)`**: Mount a Photon app to a sub-path.
- **`liftoff(port?: number)`**: Returns the configuration object for `Bun.serve`.
- **`container`**: Access the IoC Container.
- **`app`**: Access the internal Photon instance.
- **`hooks`**: Access the HookManager.
- **`events`**: Access the EventManager.
- **`logger`**: Access the Logger instance.
- **`config`**: Access the ConfigManager.

### `Container`

- **`bind(key, factory)`**: Register a transient binding.
- **`singleton(key, factory)`**: Register a shared binding.
- **`make(key)`**: Resolve a service instance. Supports automatic type inference via `ServiceMap` augmentation.
- **`instance(key, instance)`**: Register an existing object instance.
- **`has(key)`**: Check if a service is bound.

The container includes built-in **circular dependency detection** to help identify architectural issues during development.

#### Type Safety (ServiceMap)

You can extend the `ServiceMap` interface to get automatic type inference for `container.make()`:

```typescript
// types.d.ts
import { Logger } from './Logger';

declare module '@gravito/core' {
  interface ServiceMap {
    logger: Logger;
  }
}

// usage.ts
const logger = container.make('logger'); // inferred as Logger
```

### `HookManager`

- **`addFilter(hook, callback)`**: Register a filter.
- **`applyFilters(hook, initialValue, ...args)`**: Apply all registered filters sequentially.
- **`addAction(hook, callback, options?)`**: Register an action hook.
- **`doAction(hook, args, options?)`**: Execute action hooks asynchronously.
- **`doActionSync(hook, args)`**: Execute action hooks synchronously.
- **`doActionAsync(hook, args, options)`**: Execute action hooks via priority queue.

### `EventManager`

- **`dispatch(event)`**: Dispatch an event asynchronously.
- **`listen(event, listener, options?)`**: Register an event listener.
- **`unlisten(event, listener)`**: Remove an event listener.
- **`clear()`**: Remove all event listeners.
- **`getListeners(event?)`**: Get registered listeners.

### `ConfigManager`

- **`get(key, default?)`**: Retrieve a config value.
- **`set(key, value)`**: Set a config value.
- **`has(key)`**: Check if a config key exists.

## When to use orbit() vs register() vs use()

### `orbit(orbitInstance)` — Infrastructure Plugins

Use when integrating a **GravitoOrbit** that implements `install()`.
Orbits are infrastructure-level plugins that extend core capabilities.

```typescript
import { OrbitDatabase } from '@gravito/atlas'
import { OrbitAuth } from '@gravito/sentinel'

const app = await PlanetCore.boot()
await app.orbit(new OrbitDatabase({ connection: 'sqlite' }))
await app.orbit(new OrbitAuth({ driver: 'session' }))
```

### `register(provider)` — Service Providers

Use when adding a **ServiceProvider** to the IoC container.
Providers register bindings and boot services synchronously.

```typescript
import { CacheServiceProvider } from './providers/CacheServiceProvider'

const app = await PlanetCore.boot()
app.register(new CacheServiceProvider())
```

### `use(satelliteOrFn)` — Satellites & Setup Functions

Use when adding a **satellite module** or a **one-off setup function**.
Accepts either a ServiceProvider (delegates to register()) or an async function.

```typescript
// Satellite module
import { CartSatellite } from '@gravito/satellite-cart'
await app.use(new CartSatellite())

// Setup function
await app.use(async (core) => {
  core.register(new MyProvider())
  await core.orbit(new MyOrbit())
})
```

### Decision Tree

1. Does it implement `GravitoOrbit.install()`? → Use `orbit()`
2. Does it implement `ServiceProvider.register()`? → Use `register()`
3. Is it a function or satellite module? → Use `use()`

## 🤝 Contributing

Contributions, issues and feature requests are welcome!
Feel free to check the [issues page](https://github.com/gravito-framework/gravito/issues).

## 📝 License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
