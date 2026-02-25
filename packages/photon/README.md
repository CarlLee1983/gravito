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
| **Security Middleware** | ✅ Stable | 65 tests |

> View the [Full Optimization History](./doc/HISTORY_OPTIMIZATIONS.md).

---

## ✨ Features

- 🚀 **Ultra-Fast Performance**: Built for maximum throughput on Bun runtime.
- 🎯 **Type-Safe Routing**: Full TypeScript support with intelligent type inference.
- 🔌 **Middleware System**: Composable middleware for authentication, validation, and more.
- 📡 **RPC Support**: Powers `@gravito/beam` for type-safe client-server communication.
- 🛡️ **Security Middleware**: CORS, CSRF, Security Headers, Rate Limiting, Body Size Limit, and Header Token Gate.

## 🚀 Quick Start

```typescript
import { Photon } from '@gravito/photon'
const app = new Photon()

app.get('/', (c) => c.text('Hello from Photon!'))
export default app
```

---

## 🛡️ Security Middleware

Photon provides a comprehensive set of HTTP security middleware, available via `@gravito/photon/middleware/security`. These middleware were migrated from `@gravito/core` as part of the Galaxy Architecture optimization (Phase 2.4).

> **Migration note**: The `@gravito/core` exports are now `@deprecated` (v2.0.0). Use the photon imports below instead.

```typescript
import {
  cors,
  csrfProtection,
  securityHeaders,
  bodySizeLimit,
  requireHeaderToken,
  throttleRequests,
} from '@gravito/photon/middleware/security'
```

### Available Middleware

| Middleware | Description | Key Options |
|-----------|-------------|-------------|
| `cors()` | Cross-Origin Resource Sharing | `origin`, `methods`, `credentials`, `maxAge` |
| `csrfProtection()` | CSRF token validation | `cookieName`, `headerName`, `formFieldName` |
| `securityHeaders()` | Helmet-style security headers | `contentSecurityPolicy`, `hsts`, `frameOptions` |
| `bodySizeLimit(maxBytes)` | Request body size limiting | `methods`, `requireContentLength` |
| `requireHeaderToken()` | Header-based token authentication | `headerName`, `token`, `status` |
| `throttleRequests()` | Rate limiting (function-based) | `maxAttempts`, `decaySeconds`, `trustProxy` |

### Usage Examples

```typescript
import { Photon } from '@gravito/photon'
import { cors, securityHeaders, throttleRequests } from '@gravito/photon/middleware/security'

const app = new Photon()

// CORS
app.use('*', cors({ origin: 'https://example.com', credentials: true }))

// Security headers (Helmet-style)
app.use('*', securityHeaders({ hsts: { maxAge: 31536000, preload: true } }))

// Rate limiting (100 requests per 60 seconds)
app.use('/api/*', throttleRequests({ maxAttempts: 100, decaySeconds: 60 }))
```

### API Changes from `@gravito/core`

- **`throttleRequests`**: Changed from class-based (`new ThrottleRequests(core).handle(max, decay)`) to function-based (`throttleRequests({ maxAttempts, decaySeconds })`). No longer requires PlanetCore injection.
- **`csrfProtection`**: Now uses built-in `parseCookies()` instead of `CookieJar` dependency. Fully self-contained.
- **All middleware**: Use native Hono types (`Context`, `MiddlewareHandler`) instead of Gravito-specific types, enabling standalone use without `@gravito/core`.

---

## 📚 Documentation

Detailed guides and references:

- [📖 **API Guide**](./doc/GUIDE.md) — Routing, Context, and Application API.
- [🔌 **Middleware**](./doc/MIDDLEWARE.md) — Built-in middleware (HTMX, Binary, Logger) and custom MW.
- [🛡️ **Security Middleware**](#-security-middleware) — CORS, CSRF, Security Headers, Rate Limiting, and more.
- [🔐 **JWT & Auth**](./doc/SECURITY.md) — Authentication, tokens, and best practices.
- [🏗️ **Architecture**](./doc/ARCHITECTURE.md) — Internals and implementation details.
- [🚀 **Evolution Plan**](./doc/EVOLUTION_PLAN.md) — Future roadmap and architectural enhancements.

---

## 🤝 Contributing

Contributions are welcome! Please read the main [CONTRIBUTING.md](../../CONTRIBUTING.md) first.

## 📝 License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
