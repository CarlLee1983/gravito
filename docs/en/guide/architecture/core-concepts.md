---
title: Gravito Core Concepts
description: Deep dive into the Galaxy Architecture, PlanetCore, and the Manifest-Driven Development (MDD) philosophy of the Gravito Framework.
---

# 🌌 Gravito Core Concepts

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

## 🛰️ Philosophy: Galaxy Architecture

In the Gravito worldview, a system is treated as a micro-galaxy:

- **PlanetCore (Micro-kernel)**: The Kernel maintains system health and coordination without interfering with specific business logic.
- **Orbits (Infrastructure)**: Strategic extensions (e.g., Atlas ORM, Signal Event Bus) that orbit the core, providing essential system resources.
- **Satellites (Domain Plugins)**: Self-contained business logic hubs that encapsulate domain logic using DDD patterns.

### Four Pillars of Excellence

- **High Performance**: Built on Bun for microsecond routing and low-overhead request handling.
- **MDD (Manifest-Driven)**: Rapidly assemble systems via declarative configuration (`manifest.json`).
- **Micro-kernel**: A core of just a few KBs; functionalities are strictly opt-in.
- **AI-First**: Optimized for human-AI synergy through strict typing and predictable code patterns.

---

## 🏗️ Architectural Layers

### 1. PlanetCore (The Micro-kernel)

The gravitational center. A minimal, high-efficiency foundation responsible for:

- **Lifecycle Management**: From initial `Boot` to final `Liftoff`.
- **Hook System**: Non-intrusive extension via Filters and Actions.
- **Dependency Injection**: A lightweight, high-performance IoC container.

### 2. Orbits (Infrastructure)

These modules extend core functionalities in a plug-in manner. The core contains no business logic; all foundation services (such as the `Atlas` database or `Signal` event bus) are provided by Orbits.

### 3. Satellites (Business Logic)

This is your territory. All UseCases, Controllers, and domain logic are encapsulated in Satellites. Satellites are decoupled from each other, communicating via the event bus.

---

## 🌊 Request Lifecycle

Understanding how a request flows through Gravito is essential for mastering the framework:

1.  **Entry**: The request hits the Bun server and is received by the `HttpAdapter` (Photon or BunNative).
2.  **Context Initialization**: The `GravitoContext` is created, injecting `core`, `logger`, `config`, and other base objects.
3.  **Filter Phase (Before)**: Hooks like `request:before` are triggered for pre-processing or request modification.
4.  **Global Middleware**: All global middleware registered at the core level are executed.
5.  **Route Matching**: The `Router` matches the path and HTTP verb to the corresponding controller method.
6.  **Route Middleware**: Middleware specific to that route are executed.
7.  **Controller Execution**: Business logic is executed, returning a `Response` object.
8.  **Result Filtering**: The `response:before` hook is triggered, allowing content modification before returning.
9.  **Emission**: The final result is sent back to the client.

---

## 📥 Service Container (IoC)

Gravito includes a powerful yet lightweight **Inversion of Control (IoC) Container**. It is the central hub for managing class dependencies and implementing dependency injection.

### Binding

You can bind services to the container:

```typescript
// Simple binding (new instance created every time)
core.container.bind('Analytics', (container) => {
  return new AnalyticsService()
})

// Singleton binding (shared instance across the app)
core.container.singleton('Stripe', (container) => {
  return new StripeClient(container.make('config').get('stripe.key'))
})
```

### Resolving

Retrieve services from anywhere in your app:

```typescript
const analytics = core.container.make<AnalyticsService>('Analytics')
```

---

## 🚀 Service Providers

**Service Providers** are the central point of all Gravito application bootstrapping. All core Orbits or your custom business logic are registered into the system via providers.

A typical Service Provider consists of two phases:

1.  **`register()`**: **Used only for binding**. You should never attempt to use other services in this phase as they might not be loaded yet.
2.  **`boot()`**: All services are registered, and you are free to call resources across modules.

---

## 🔗 Further Reading

- 🚦 [Routing System](../basics/routing.md)
- 📦 [Atlas ORM](../database/orm-usage.md)
- 🚀 [Deployment Guide](../deployment/deployment.md)
- 📡 [Xenon Parallel Runtime](./xenon-architecture-deep-dive.md)

---

## License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
