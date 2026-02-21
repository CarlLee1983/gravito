# @gravito/photon

> The high-performance HTTP engine powering the Gravito Galaxy Architecture.

[![npm version](https://img.shields.io/npm/v/@gravito/photon.svg)](https://www.npmjs.com/package/@gravito/photon)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)

**@gravito/photon** is the core HTTP engine of the Gravito framework. It provides foundational routing, middleware, and request/response handling.

## 📊 Project Status

| Metric | Status | Coverage |
|--------|--------|----------|
| **Core Engine** | ✅ Stable | 99.21% |
| **JWT Module** | ✅ Type-Safe | 92.86% |
| **Binary (CBOR)** | ✅ Optimized | 100% |

> View the [Full Optimization History](./doc/HISTORY_OPTIMIZATIONS.md).

---

## ✨ Features

- 🚀 **Ultra-Fast Performance**: Built for maximum throughput on Bun runtime.
- 🎯 **Type-Safe Routing**: Full TypeScript support with intelligent type inference.
- 🔌 **Middleware System**: Composable middleware for authentication, validation, and more.
- 📡 **RPC Support**: Powers `@gravito/beam` for type-safe client-server communication.

## 🚀 Quick Start

```typescript
import { Photon } from '@gravito/photon'
const app = new Photon()

app.get('/', (c) => c.text('Hello from Photon!'))
export default app
```

---

## 📚 Documentation

Detailed guides and references:

- [📖 **API Guide**](./doc/GUIDE.md) — Routing, Context, and Application API.
- [🔌 **Middleware**](./doc/MIDDLEWARE.md) — Built-in middleware (HTMX, Binary, Logger) and custom MW.
- [🛡️ **Security & JWT**](./doc/SECURITY.md) — Authentication, tokens, and best practices.
- [🏗️ **Architecture**](./doc/ARCHITECTURE.md) — Internals and implementation details.

---

## 🤝 Contributing

Contributions are welcome! Please read the main [CONTRIBUTING.md](../../CONTRIBUTING.md) first.

## 📝 License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
