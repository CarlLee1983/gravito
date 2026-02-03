# Hono to Gravito Migration Guide

> **Time Required**: ~5 Minutes  
> **Performance Gain**: +13% RPS (avg), 7x Lower Framework Overhead

Gravito Engine is designed to be the high-performance native engine for Bun. If you are using Hono on Bun, migrating to Gravito can unlock near-native performance (-1.7% overhead vs Bun.serve) while keeping a familiar developer experience.

## Why Migrate?

1.  **Native Performance**: Gravito is built *specifically* for Bun, bypassing compatibility layers used by Hono (which supports Node/Deno/CF Workers).
2.  **Ultra-Lightweight**: Zero-allocation "MinimalContext" for static routes makes your API fly.
3.  **Familiar API**: We intentionally kept the API surface 95% similar to Hono.

| Feature | Hono | Gravito Engine |
| :--- | :--- | :--- |
| **Runtime** | Node, Deno, Bun, Cloudflare | **Bun Only** (Optimized) |
| **RPS (Benchmark)** | ~80k | **~91k** (+13.6%) |
| **Framework Overhead** | ~13.5% | **~1.7%** (Near Native) |
| **Router** | RegExpRouter / Trie | **AOT Compiled** + Radix Tree |

---

## Migration Steps

### 1. Install Gravito Core

Remove Hono and add `@gravito/core`:

```bash
bun remove hono
bun add @gravito/core
```

### 2. Update Imports

Change your import source. The engine is exposed directly from `@gravito/core/engine`.

**Hono:**
```typescript
import { Hono } from 'hono'
```

**Gravito:**
```typescript
import { Gravito } from '@gravito/core/engine'
```

### 3. Update App Initialization

The constructor is compatible, but the class name changes.

**Hono:**
```typescript
const app = new Hono()
```

**Gravito:**
```typescript
const app = new Gravito()
```

### 4. Code Comparison (Side-by-Side)

Most of your route handlers will work **without any changes**.

**Hono Implementation:**

```typescript
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('Hello Hono!'))

app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ id, name: 'User' })
})

app.post('/api/data', async (c) => {
  const body = await c.req.json()
  return c.json({ received: body })
})

export default app
```

**Gravito Implementation:**

```typescript
import { Gravito } from '@gravito/core/engine'

const app = new Gravito()

// Identical API for standard result types
app.get('/', (c) => c.text('Hello Gravito!'))

app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ id, name: 'User' })
})

app.post('/api/data', async (c) => {
  const body = await c.req.json()
  return c.json({ received: body })
})

export default app
```

---

## Key Differences & Gotchas

While we aim for high compatibility, some advanced features might differ slightly to prioritize performance.

### 1. Context pooling is automatic
Gravito recycles `Context` objects. **Do not** try to store the `c` (Context) object outside the handler scope (e.g., in a global variable or long-running async operation that outlives the request). If you need data from it, extract it first.

```typescript
// ❌ Bad
let leakedContext
app.get('/', (c) => {
  leakedContext = c // Context will be reset/reused!
  return c.text('Bad')
})

// ✅ Good
app.get('/', (c) => {
  const data = c.req.header('User-Agent') // Extract what you need
  return c.text('Good')
})
```

### 2. Middleware Syntax
Middleware syntax is identical, but Gravito optimizes execution based on whether middleware is present.

```typescript
// Works exactly the same
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  console.log(`Request took ${Date.now() - start}ms`)
})
```

### 3. Error Handling
Global error handling is simpler.

```typescript
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal Error' }, 500)
})
```

---

## Getting the Best Performance

To get the **maximum** performance benefit (the 1.7% overhead tier):

1.  **Use Static Routes**: Direct paths like `/api/status` are O(1) optimized.
2.  **Avoid Unnecessary Middleware**: If a route doesn't need auth/logging, don't apply global middleware to it if possible (though Gravito's AOT router handles this intelligently).
3.  **Sync Handlers**: If your logic is synchronous, don't make the function `async`. Gravito has a specialized sync path that avoids Promise allocation.

```typescript
// Ultra-Fast Path (Sync)
app.get('/ping', (c) => c.text('pong')) 

// Standard Path (Async)
app.get('/data', async (c) => {
  const data = await db.find()
  return c.json(data)
})
```
