---
title: Project Structure
description: Understanding the directory layout and the Galaxy Architecture of a Gravito system.
---

# 📁 Project Structure

Gravito follows a predictable, clean directory structure. In v1.6+, we've evolved the layout to support the **Galaxy Architecture**, allowing your application to scale from a simple site to a multi-satellite system seamlessly.

---

## 🛰️ Galaxy Host Layout (v1.6+ Standard)

By default, a new Gravito project is a **Galaxy Host**. It orchestrates multiple **Satellites** (domain modules) and provides the global infrastructure (**Orbits**).

```text
my-galaxy/
├── src/
│   ├── satellites/      # Domain-specific modules (Satellites)
│   │   ├── catalog/     # e.g., Product Catalog domain
│   │   │   ├── manifest.json
│   │   │   ├── Controllers/
│   │   │   └── Models/
│   │   └── auth/        # e.g., Identity & Access domain
│   ├── orbits/          # Host-level custom Orbits
│   ├── config/          # Global configuration
│   ├── bootstrap.ts     # Galaxy Host initializer (Xenon)
│   └── index.ts         # Entry point
├── static/              # Public assets (Favicon, manifest)
├── tests/               # Global integration tests
├── gravito.config.ts    # Project root metadata
├── package.json
└── tsconfig.json
```

---

## 🧩 Satellite Structure (Clean Architecture)

Each Satellite inside `src/satellites/` is a self-contained business unit. We recommend using **Clean Architecture** patterns within satellites:

```text
satellites/catalog/
├── manifest.json        # Declarative satellite metadata
├── Application/         # UseCases & Business logic
├── Domain/              # Entities, Value Objects, Aggregates
├── Infrastructure/      # Repositories & External adapters
└── Interface/           # Controllers & HTTP Middleware
```

---

## 🏗️ Core Components

### `src/satellites/`
This is where your business value lives. Each folder represents a **Domain Satellite**. Satellites are decoupled; they don't import from each other but communicate via the event bus or shared kernels.

### `manifest.json`
Every satellite must have a `manifest.json`. This file tells the **Xenon Host** how to load the satellite, defining its routes, dependencies, and registered hooks.

### `src/bootstrap.ts`
The "Command Center" of your galaxy. This file initializes `PlanetCore`, registers global Orbits (like Resilience or Cache), and uses the **XenonHost** to discover and boot satellites.

### `gravito.config.ts`
The high-level configuration for the entire ecosystem. Here you define the project name, port, environment, and global feature toggles.

---

## 🌌 Galaxy Architecture Philosophy

Gravito utilizes a "Host + Satellite" design pattern:

1.  **PlanetCore (Micro-kernel)**: Intentionally tiny, handling only the application lifecycle and IoC container.
2.  **Orbits (Pluggable Modules)**: Infrastructure features added at the host level (e.g., `@gravito/atlas` for DB, `@gravito/resilience` for safety).
3.  **Xenon (Parallel Runtime)**: The engine that runs satellites in parallel, providing high resource density and isolation.

---

## 🔄 The Lifecycle

When you run `bun dev` or start the server:

1.  **Host Ignition**: `PlanetCore` boots up and loads the core configuration.
2.  **Orbit Installation**: Infrastructure modules (Orbits) register their services to the container.
3.  **Satellite Discovery**: The **Xenon Host** scans `manifest.json` files in the satellites directory.
4.  **Parallel Boot**: Satellites are initialized in parallel. Routes are mounted, and providers are registered.
5.  **Liftoff**: The HTTP hub (Photon) starts receiving traffic and directing it to the appropriate satellite.

---

## 🔗 Next Steps
- 📜 [MDD: Manifest-Driven Development](../architecture/config-contract.md)
- 📡 [Xenon Parallel Runtime](../architecture/xenon-architecture-deep-dive.md)
- 🚦 [Routing Basics](../basics/routing.md)
