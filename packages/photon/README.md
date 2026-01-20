# @gravito/photon

> The high-performance HTTP engine powering the Gravito Galaxy Architecture.

[![npm version](https://img.shields.io/npm/v/@gravito/photon.svg)](https://www.npmjs.com/package/@gravito/photon)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)

**@gravito/photon** is the core HTTP engine of the Gravito framework. It provides the foundational routing, middleware, and request/response handling used by `@gravito/core` and all Orbit modules.

## ✨ Features

- 🚀 **Ultra-Fast Performance**: Built for maximum throughput on Bun runtime
- 🎯 **Type-Safe Routing**: Full TypeScript support with intelligent type inference
- 🔌 **Middleware System**: Composable middleware for authentication, validation, and more
- 📡 **RPC Support**: Powers `@gravito/beam` for type-safe client-server communication
- 🪶 **Lightweight**: Minimal overhead, optimized bundle size
- 🔧 **Developer Experience**: Intuitive API with excellent IntelliSense support

## 📦 Installation

```bash
bun add @gravito/photon
```

> **Note**: This package is automatically included as a dependency of `@gravito/core`. You typically don't need to install it separately unless building custom adapters.

## 🚀 Quick Start

### Basic Usage

```typescript
import { Photon } from '@gravito/photon'

const app = new Photon()

app.get('/', (c) => c.text('Hello from Photon!'))

app.get('/json', (c) => c.json({ message: 'Hello World' }))

app.post('/users', async (c) => {
  const body = await c.req.json()
  return c.json({ id: 1, ...body }, 201)
})

export default app
```

### With Gravito Core (Recommended)

```typescript
import { PlanetCore, defineConfig, GravitoAdapter } from '@gravito/core'

const config = defineConfig({
  config: {
    PORT: 3000,
    APP_NAME: 'My App'
  },
  adapter: new GravitoAdapter()
})

const core = await PlanetCore.boot(config)

// Access the underlying Photon instance
core.app.get('/api/health', (c) => c.json({ status: 'ok' }))

export default core.liftoff()
```

## 📚 Exports

| Export | Description |
|--------|-------------|
| `@gravito/photon` | Main Photon class, core utilities, and built-in middleware |
| `@gravito/photon/client` | Type-safe RPC client (used by `@gravito/beam`) |
| `@gravito/photon/jwt` | JWT authentication utilities |
| `@gravito/photon/bun` | Bun-specific adapters (e.g., `serveStatic`) |
| `@gravito/photon/logger` | Logging middleware |
| `@gravito/photon/http-exception` | HTTP exception handling |

**Built-in Middleware** (exported from main package):
- `htmxMiddleware()` - HTMX request detection and header access
- `binaryMiddleware()` - Automatic CBOR encoding for JSON responses

## 🔧 API Reference

### `Photon`

The main application class for building HTTP applications.

```typescript
import { Photon } from '@gravito/photon'

const app = new Photon()

// Routing
app.get('/path', handler)
app.post('/path', handler)
app.put('/path', handler)
app.delete('/path', handler)
app.patch('/path', handler)

// Middleware
app.use(middleware)
app.use('/prefix/*', middleware)

// Route composition
app.route('/api', apiRoutes)
```

### Context (`c`)

The request context object passed to all handlers.

```typescript
app.get('/users/:id', async (c) => {
  // Request
  const id = c.req.param('id')
  const query = c.req.query('filter')
  const body = await c.req.json()
  const header = c.req.header('Authorization')

  // Response
  return c.json({ data })        // JSON response
  return c.text('Hello')         // Text response
  return c.html('<h1>Hi</h1>')   // HTML response
  return c.redirect('/other')    // Redirect

  // Context variables
  c.set('user', user)
  const user = c.get('user')
})
```

### JWT Utilities

```typescript
import { sign, verify, decode, jwt } from '@gravito/photon/jwt'

// Middleware
app.use('/protected/*', jwt({ secret: 'your-secret' }))

// Manual operations
const token = await sign({ sub: 'user123' }, 'secret')
const payload = await verify(token, 'secret')
const decoded = decode(token)
```

### Built-in Middleware

Photon includes several built-in middleware for common use cases.

#### HTMX Middleware

Automatically detects HTMX requests and provides easy access to HTMX-specific headers.

```typescript
import { Photon, htmxMiddleware } from '@gravito/photon'

const app = new Photon()
app.use(htmxMiddleware())

app.get('/search', async (c) => {
  // Check if request is from HTMX
  if (c.get('htmx')) {
    // Return HTML fragment for HTMX
    return c.html('<div>Search results...</div>')
  }
  
  // Return full page for regular requests
  return c.html('<html>...</html>')
})
```

The middleware automatically stores HTMX state and headers in the context:
- `c.get('htmx')` - Boolean indicating if request is from HTMX
- `c.get('htmx.target')` - Target element ID
- `c.get('htmx.trigger')` - Trigger element ID
- `c.get('htmx.boosted')` - Whether request was boosted
- And more HTMX-specific headers

#### Binary Middleware (CBOR)

Automatically encodes JSON responses as CBOR when the client requests it.

```typescript
import { Photon, binaryMiddleware } from '@gravito/photon'

const app = new Photon()
app.use(binaryMiddleware())

app.get('/api/data', (c) => c.json({ items: [...] }))
// Automatically returns CBOR when Accept: application/cbor header is present
```

**Performance Benefits:**
- CBOR encoding is ~2-3x faster than JSON.stringify for large objects
- Binary format reduces payload size by 20-40% on average
- Recommended for high-frequency API calls with large datasets

**Client Usage:**
```typescript
import { decode } from 'cborg'

const res = await fetch('/api/data', {
  headers: { Accept: 'application/cbor' }
})
const data = decode(new Uint8Array(await res.arrayBuffer()))
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   @gravito/core                       │
│       (PlanetCore, Orbits, Hooks, Container)        │
└───────────────────────┬─────────────────────────────┘
                        │ powered by
                        ▼
┌─────────────────────────────────────────────────────┐
│               @gravito/photon                        │
│    (Photon HTTP Engine, Routing, Middleware)        │
└─────────────────────────────────────────────────────┘
                        │
    ┌───────────────────┼───────────────────┐
    ▼                   ▼                   ▼
@gravito/beam    @gravito/ion    @gravito/sentinel
   (RPC)          (Inertia)         (Auth)
```

## 🤝 Contributing

Contributions are welcome! Please read the main [CONTRIBUTING.md](../../CONTRIBUTING.md) first.

## 📝 License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
