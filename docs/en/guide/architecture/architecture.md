---
title: Architecture Overview
description: Understand Gravito's core architecture, including the IoC container, service providers, and request lifecycle.
---

# Architecture Overview

> Gravito employs a "Micro-kernel + Orbit + Satellite" Galaxy Architecture, providing ultimate extensibility and decoupling.

## Galaxy Architecture

Inspired by celestial mechanics, Gravito organizes the system into three layers:

1. **PlanetCore (Micro-kernel)**:
   The gravitational center. Responsible for the IoC container, lifecycle management (Hook system), and basic Request/Response flow. The core remains zero-dependency and extremely lightweight.

2. **Orbits (Infrastructure)**:
   Infrastructure modules orbiting the core.
   - `OrbitAtlas`: Powerful ORM system.
   - `OrbitSignal`: Event bus and mail system.
   - `OrbitIon`: Inertia.js monolith bridge.
   - `OrbitStream`: High-performance job queues.

3. **Satellites (Domain Modules)**:
   Business logic mounted on the system. Each Satellite is a self-contained domain (e.g., Catalog, Order) following DDD and Clean Architecture specifications.

## Manifest-Driven Development (MDD)

In Gravito 1.0, we introduced the MDD paradigm. You assemble your application by simply declaring the required modules in `gravito.config.ts`, and the framework handles all the wiring automatically.

```typescript
// gravito.config.ts
export default {
  name: 'Flagship Store',
  modules: [
    'catalog',    // Auto-mounts the Catalog Satellite
    'membership', // Auto-mounts the Membership Satellite
  ]
}
```

## Request Lifecycle

The lifecycle of a request entering a Gravito application involves several stages:

1.  **Liftoff**: Bun starts the server and hands the request to `PlanetCore`.
2.  **Global Middleware**: Handles global tasks like CSRF, Session, and Logging.
3.  **Routing**: Finds the corresponding controller or handler.
4.  **Route Middleware**: Executes specific validation or authorization checks.
5.  **Execution (Controller/Handler)**: Performs logic and generates a response.
6.  **Response**: The core sends the data back to the client.

## IoC Container (Service Container)

The IoC (Inversion of Control) container is a powerful tool for managing class dependencies and performing dependency injection.

### Binding Services

You can bind services within a service provider:

```typescript
// Transient binding (re-created on every resolution)
container.bind('sms', () => new TwilioSms());

// Singleton binding (created once per application lifecycle)
container.singleton('cache', () => new RedisCache());
```

### Resolving Services

```typescript
const cache = container.make('cache');
```

## Service Providers

Service providers are the central place for bootstrapping a Gravito application. Your application, as well as all of Gravito's core services, are bootstrapped through service providers.

### Defining a Provider

```typescript
import { ServiceProvider, Container } from '@gravito/core';

export class AppServiceProvider extends ServiceProvider {
  /**
   * Register service bindings
   */
  register(container: Container) {
    container.singleton('stats', () => new AnalyticsService());
  }

  /**
   * Executed after all services are registered
   */
  async boot() {
    console.log('Application ready');
  }
}
```

### Registering a Provider

Register your provider during `PlanetCore` initialization:

```typescript
const core = new PlanetCore();
core.register(new AppServiceProvider());
```

---

## Next Steps
Learn how to accelerate your development with the [Pulse CLI](./pulse-cli.md).
