# Gravito Galaxy Architecture

Gravito is a micro-kernel framework for building scalable, modular backend systems in TypeScript. 
It leverages the **Galaxy Architecture**—a unique approach inspired by celestial mechanics to manage lifecycle, extensions (Orbits), and lightweight plugins (Satellites).

## 🌟 Key Features

- **Micro-Kernel (PlanetCore)**: A tiny, high-performance core (Self-developed) that only handles lifecycle and hooks.
- **Orbits (Modules)**: Feature-rich extensions (Database, Auth, Storage) that "orbit" the core completely decoupled.
- **Satellites (Plugins)**: Lightweight business logic that hooks into Core or Orbits.
- **Performance**: Optimized for Bun runtime, offering blazing fast startup and request handling.
- **Developer Experience**: Heavy focus on TypeScript, intelligent defaults, and standardization.

## 🚀 Quick Start

### Installation

```bash
bun add gravito-core
```

### Basic Usage

```typescript
import { PlanetCore } from 'gravito-core';

const core = new PlanetCore();

// Add a simple hook
core.hooks.addAction('app:ready', () => {
  console.log('We have liftoff! 🚀');
});

// Start the server
core.liftoff();
```

## 📚 Documentation

Detailed documentation is available in the [docs](./docs) directory.

- [Core Concepts & Usage](./docs/en/guide/core-concepts.md)
- [Plugin Development Guide](./docs/en/guide/plugin-development.md)
- [中文文檔](./README.zh-TW.md)

## 📦 Ecosystem (Orbits)
Gravito provides a rich set of official Orbit modules, all designed to be completely pluggable:

| Package | Name | Description | Status |
|---|---|---|---|
| `gravito-core` | **PlanetCore** | Ultra-lightweight micro-kernel with Hooks & Lifecycle management. | ✅ Stable |
| `@gravito/orbit-db` | **Orbit** | Database layer based on Drizzle ORM with Migration/Seeding. | ✅ Stable |
| `@gravito/sentinel` | **Sentinel** | Modern Authentication Orbit (JWT/Session). | ✅ Alpha |
| `@gravito/nebula` | **Nebula** | File Storage & CDN Integration (Local/S3/R2). | ✅ Beta |
| `@gravito/stasis` | **Stasis** | Multi-layer Cache System (Memory/Redis). | ✅ Stable |
| `@gravito/prism` | **Prism** | View Engine with Image Optimization & Edge Templates. | ✅ Stable |
| `@gravito/luminosity` | **Luminosity** | Enterprise SEO Engine (Sitemaps/Meta/Robots). | ✅ Stable |
| `@gravito/flare` | **Flare** | Notification & Mail Queue System (SMTP/Resend). | ✅ Alpha |
| `@gravito/ion` | **Ion** | Inertia.js Protocol Adapter for React/Vue. | ✅ Stable |
| `@gravito/constellation` | **Constellation** | High-performance Radix Tree Router. | ✅ Stable |

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

## 📄 License

MIT © Carl Lee
