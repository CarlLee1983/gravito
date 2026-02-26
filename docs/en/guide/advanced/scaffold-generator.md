---
title: Scaffold Blueprint Engine
description: Deep dive into Gravito Scaffold, the powerful engine for generating Domain Satellites and expanding the Galaxy Architecture.
---

# 🏗️ Scaffold Blueprint Engine

`@gravito/scaffold` is the **Blueprint Engine** of the Gravito ecosystem. It is responsible for not only initializing new projects (Galaxy Hosts) but also automating the creation of standardized **Domain Satellites**, ensuring they adhere to enterprise-grade development standards.

In Singularity v1.6+, Scaffold has transitioned to a **Manifest-Driven Development (MDD)** approach, automatically generating full structures including the mandatory `manifest.json`.

---

## ✨ Core Features

- 🛰️ **Satellite Specialization**: One-click generation of Satellites using Clean Architecture or DDD patterns.
- 📜 **MDD Integration**: Automatically generates and configures `manifest.json` for zero-config discovery.
- 🏢 **Enterprise Primitives**: Built-in templates for `AggregateRoot`, `DomainEvent`, `UseCase`, and more.
- 🛠️ **Dual Mode**: Support for both high-speed CLI operations and programmatic large-scale generation.

---

## 🚀 CLI Usage

### 1. Initialize a Galaxy Host
Create a new Gravito container environment:

```bash
bunx gravito create my-galaxy
```

### 2. Generate a Domain Satellite
Add a new business domain to your existing host project:

```bash
# Generate a 'catalog' satellite using the DDD blueprint
bun gravito make:satellite catalog --type ddd
```

### 3. Generate Domain Components
Rapidly add code units within a specific satellite:

```bash
# Generate a new controller for the 'catalog' satellite
bun gravito make:controller ProductController --satellite catalog

# Generate a UseCase
bun gravito make:usecase CreateProduct --satellite catalog
```

---

## 📐 Architecture Blueprints

Scaffold supports multiple standardized blueprints to suit different business complexities:

| Blueprint | Description | Use Case |
| :--- | :--- | :--- |
| `minimal` | Basic routes and a manifest file. | Small utilities, simple APIs. |
| `clean` | Strictly layered Clean Architecture. | Mid-sized services with clear logic. |
| `ddd` | Domain-Driven Design based on Bounded Contexts. | Complex business, large enterprise systems. |

---

## 📄 Output: Standard Satellite Structure

When you run `make:satellite`, Scaffold creates the following standard structure:

```text
src/satellites/catalog/
├── manifest.json        # Satellite ID, defining routes & dependencies
├── Application/         # Business Logic (UseCases)
├── Domain/              # Core Domain (Entities, Aggregates)
├── Infrastructure/      # External Adapters (Repositories, DB)
└── Interface/           # External Interface (Controllers, Middleware)
```

---

## 🛠️ Programmatic API

You can also use Scaffold within your own scripts for automation:

```ts
import { SatelliteGenerator } from '@gravito/scaffold';

const generator = new SatelliteGenerator({
  name: 'orders',
  type: 'ddd',
  targetDir: './src/satellites/orders'
});

await generator.generate();
console.log('🛰️ Satellite "orders" has entered the galaxy!');
```

---

## 🔗 Further Reading

- 🌌 [Galaxy Master Map](../../GALAXY_ARCHITECTURE_MAP.md)
- 🛰️ [Satellite Specification](../../spec/SATELLITE_SPEC.md)
- 📡 [Xenon Parallel Runtime](../architecture/xenon-architecture-deep-dive.md)
