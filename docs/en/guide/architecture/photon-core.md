---
title: Photon Core (HTTP Engine)
description: Deep dive into the high-performance HTTP hub of the Gravito Galaxy — the Photon engine. Optimized for Bun, providing O(1) routing and enterprise middleware architecture.
---

# 🚀 Photon Core

Photon (`@gravito/photon`) is the **high-performance HTTP core engine** of the Gravito ecosystem. More than just a router, it is the I/O hub responsible for "light-speed forwarding" within the Galaxy Architecture.

In Singularity v1.6+, Photon has been redesigned to perfectly adapt to the **Xenon Parallel Runtime**, achieving near-native performance in Bun environments.

---

## 🌌 Role in Galaxy Architecture

Photon acts as a critical **Orbit (Infrastructure Module)** revolving around `PlanetCore`:

- **I/O Coordinator**: Accurately routes external HTTP traffic to the corresponding **Domain Satellites**.
- **Communication Foundation**: The underlying protocol layer for **Beam RPC**, **Ion (Inertia)**, and **Prism (SSG)**.
- **Security Guard**: Deeply integrated with `Sentinel` and `Fortify` for native authentication and security filtering.

---

## ✨ Key Technical Features

### 1. Light-speed Radix Tree Routing
Photon uses an optimized **Radix Tree** algorithm. Unlike frameworks that perform linear regex matching, Photon's lookup time complexity is **O(L)** (where L is the URL length). This ensures consistent performance regardless of whether your app has 10 or 10,000 routes.

### 2. AOT (Ahead-of-Time) Precompilation
During the application's `boot` phase, Photon performs a **static scan and precompilation** of the routing tree and middleware chains. It generates optimized jump paths, eliminating redundant logical calculations during request handling.

### 3. Zero-Allocation Context Pooling
Photon implements **Request Context Pooling**. This reduces the GC (Garbage Collection) pressure caused by frequent allocation and destruction of JavaScript objects in high-concurrency scenarios, significantly improving long-term stability.

### 4. Native Bun Optimization
Unlike traditional Node.js adapters, Photon communicates directly with `Bun.serve()`, leveraging Bun's C++ level I/O capabilities for extreme efficiency.

---

## 🛠️ Basic Usage

### Quick Start

```ts
import { PlanetCore, defineConfig } from '@gravito/core'
import { GravitoEngineAdapter } from '@gravito/core'

const core = await PlanetCore.boot(defineConfig({
  adapter: new GravitoEngineAdapter() // Uses Photon driver by default
}))

const app = (core as any).app // Access the underlying Photon instance

app.get('/ping', (c) => c.text('PONG'))
```

### Controller Mode (Recommended)

In Gravito, we encourage using controllers to keep your code clean:

```ts
// UserController.ts
export class UserController {
  index = async (c) => {
    return c.json({ users: [] })
  }
}

// routes.ts
router.get('/users', [UserController, 'index'])
```

---

## 🛡️ Enterprise Features

### 1. Resilience (Guardian Layer) Integration
Easily integrate **Circuit Breakers** into your routes. When downstream services (databases or microservices) are unstable, Photon automatically enters fallback mode:

```ts
import { resilience } from '@gravito/resilience';

app.get('/api/data', resilience(), async (c) => {
  // Logic here is protected by circuit breakers and timeouts
})
```

### 2. Smart Rate Limiting
Supports memory-based or Redis-backed distributed rate limiting:

```ts
import { rateLimit } from '@gravito/photon';

app.use('/api/*', rateLimit({
  max: 100,
  window: '1m',
  keyGenerator: (c) => c.req.ip
}))
```

### 3. End-to-End Type Safety
Using `@gravito/photon/client`, you can share route types directly with frontends or between microservices, completely eliminating typo-related API bugs.

---

## 📦 Built-in Middleware

| Tag | Description |
| :--- | :--- |
| `jwt` | High-performance token authentication (HS256/RS256) |
| `cors` | Flexible Cross-Origin Resource Sharing configuration |
| `logger` | Structured logging with customizable output |
| `otel` | Native OpenTelemetry tracing support |
| `binary` | High-performance binary protocol handling (MsgPack/CBOR) |

---

## 🚀 Performance Benchmarks

According to the **2026 Core Audit Report**, Photon outperforms similar frameworks under identical conditions:

- **Throughput**: Up to 145,000 req/sec (40% higher than Hono)
- **Latency**: Average 0.08ms
- **Memory**: Only ~15MB overhead per 10,000 concurrent connections

---

## 🔗 Further Reading

- 🚦 [Routing Basics](../basics/routing.md)
- 📥 [Deep Dive: Request](../basics/requests.md)
- 📤 [Constructing Perfect Responses](../basics/responses.md)
- 📡 [Beam RPC: Cross-Satellite Communication](../specialized/beam-client.md)
