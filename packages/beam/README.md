# @gravito/beam (Orbit Beam)

A lightweight, type-safe HTTP client wrapper for Gravito framework applications. It provides an experience similar to tRPC but uses standard Hono app types with **zero runtime overhead**.

## Features

- **Zero Runtime Overhead**: Pure type wrapper that directly delegates to `hc<T>`, no additional abstraction layers
- **Zero-Config Type Safety**: Automatically infers types from your backend `AppType` or `AppRoutes`
- **IntelliSense Support**: Full autocomplete for routes, methods, request bodies, and response data
- **Lightweight**: A thin wrapper around `hono/client` (< 1kb), minimal dependencies
- **AI-Friendly**: Clear JSDoc annotations and examples for reliable code generation

## Installation

```bash
bun add @gravito/beam
```

## Quick Start

`@gravito/beam` supports two type patterns: `AppType` (simple) and `AppRoutes` (recommended for templates).

### Pattern 1: Using AppType (Simple Scenarios)

#### 1. In your Backend (Server)

Export the type of your Hono app instance directly.

```typescript
// server/app.ts
import { Hono } from 'hono'
import { validate } from '@gravito/mass'
import { Schema } from '@gravito/mass'

const app = new Hono()
  .get('/hello', (c) => c.json({ message: 'Hello World' }))
  .post(
    '/post',
    validate('json', Schema.Object({ title: Schema.String() })),
    (c) => {
      return c.json({ id: 1, title: c.req.valid('json').title })
    }
  )

export type AppType = typeof app
export default app
```

#### 2. In your Frontend (Client)

Import the type only (no runtime code imported from server) and create the client.

```typescript
// client/api.ts
import { createBeam } from '@gravito/beam'
import type { AppType } from '../server/app' // Import Type Only!

const client = createBeam<AppType>('http://localhost:3000')

// Usage
// 1. Fully typed GET request
const res = await client.hello.$get()
const data = await res.json() // { message: string }

// 2. Fully typed POST request with validation
const postRes = await client.post.$post({
  json: { title: 'Gravito Rocks' } // ✅ Type checked!
})

if (postRes.ok) {
  const data = await postRes.json()
  // data.title is automatically inferred as string
}
```

### Pattern 2: Using AppRoutes (Recommended, Matches Template Usage)

This pattern is recommended when using `app.route()` to compose routes, which is the standard pattern in Gravito templates.

#### 1. In your Backend (Server)

Use `app.route()` to compose routes and export the `AppRoutes` type.

```typescript
// server/app.ts
import { Hono } from 'hono'
import { userRoute } from './routes/user'
import { apiRoute } from './routes/api'

export function createApp() {
  const app = new Hono()
  
  // Use app.route() to compose routes (required for type inference)
  const routes = app
    .route('/api/users', userRoute)
    .route('/api', apiRoute)
  
  return { app, routes }
}

// For type inference only (no runtime dependency)
function _createTypeOnlyApp() {
  const app = new Hono()
  const routes = app
    .route('/api/users', userRoute)
    .route('/api', apiRoute)
  return routes
}

// Export the type for client usage
export type AppRoutes = ReturnType<typeof _createTypeOnlyApp>
```

```typescript
// server/types.ts (Type-only file, safe for frontend import)
import type { AppRoutes } from './app'

export type { AppRoutes }
```

#### 2. In your Frontend (Client)

Import the `AppRoutes` type and create the client.

```typescript
// client/api.ts
import { createBeam } from '@gravito/beam'
import type { AppRoutes } from '../server/types' // Import Type Only!

const client = createBeam<AppRoutes>('http://localhost:3000')

// Usage with nested routes
const loginRes = await client.api.users.login.$post({
  json: {
    username: 'user',
    password: 'pass'
  } // ✅ Type checked!
})

if (loginRes.ok) {
  const data = await loginRes.json()
  // Full type safety for nested route responses
}
```

## Type Patterns Comparison

| Pattern | Use Case | Type Definition | When to Use |
|---------|----------|----------------|------------|
| **AppType** | Simple apps | `export type AppType = typeof app` | Direct route definitions, small projects |
| **AppRoutes** | Modular apps | `export type AppRoutes = ReturnType<typeof _createTypeOnlyApp>` | Using `app.route()`, template-based projects, larger codebases |

Both patterns provide identical type safety and performance. Choose based on your project structure.

## API Reference

### `createBeam<T>(baseUrl, options?)`

Creates a type-safe API client that directly delegates to Hono's `hc<T>` function with zero runtime overhead.

**Parameters:**
- **T**: The generic type parameter representing your Hono app. Can be either:
  - `AppType`: `typeof app` - Direct type from Hono instance
  - `AppRoutes`: `ReturnType<typeof _createTypeOnlyApp>` - Type from `app.route()` chain
- **baseUrl**: The root URL of your API server (e.g., `'http://localhost:3000'`)
- **options**: Optional `BeamOptions` (extends `RequestInit`) for headers, credentials, etc.

**Returns:** A fully typed Hono client instance with IntelliSense support for all routes.

**Performance:** Zero runtime overhead - this is a pure type wrapper that directly calls `hc<T>`.

```typescript
// Basic usage
const client = createBeam<AppType>('https://api.example.com')

// With options (headers, credentials, etc.)
const client = createBeam<AppRoutes>('https://api.example.com', {
  headers: {
    'Authorization': 'Bearer ...',
    'Content-Type': 'application/json'
  },
  credentials: 'include'
})
```

## Design Principles

This package follows Gravito's core values:

- **High Performance**: Zero runtime overhead, direct delegation to `hc<T>`
- **Low Overhead**: No abstraction layers or middleware, minimal bundle size
- **Lightweight**: Single function, < 1kb, minimal dependencies (only `hono/client`)
- **AI-Friendly**: Clear JSDoc annotations, complete type inference, intuitive API
