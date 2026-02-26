# Gravito Core Engine

> **The High-Performance Web Engine for Bun**

A standalone, Bun-optimized web engine extracted from the Gravito framework. Designed for developers who want maximum performance without the full framework overhead.

## Why Gravito Engine?

Universal frameworks sacrifice 20% of potential performance for cross-platform compatibility. **Gravito Engine chooses to be opinionated.** We only serve Bun, so we can unlock Bun's full potential.

### Performance Optimizations

1. **Object Pooling**: Zero-allocation request handling through context reuse
2. **AOT Router**: O(1) static route lookup, optimized Radix Tree for dynamic routes
3. **Lazy Parsing**: Only parse request data when accessed
4. **Bun-Native**: Direct integration with `Bun.serve` without wrapper layers

## 📊 Observability & Monitoring

### Route Pattern Support (v1.6.0+)

To prevent high cardinality in Prometheus metrics caused by dynamic paths (e.g., `/users/123`, `/users/456`), Gravito Engine automatically detects the `routePattern`:

- **Path**: `/users/123`
- **Pattern**: `/users/:id`

The `routePattern` is available on the `FastRequest` object (`c.req.routePattern`) and should be used as the label for HTTP request metrics.

### Benchmark Goals

- **Static routes**: 20%+ faster than Hono
- **Dynamic routes**: 15%+ faster than Hono
- **Memory per request**: < 1KB allocation
- **Package size**: < 10KB minified

## Installation

```bash
bun add @gravito/core
```

## Quick Start

```typescript
import { Gravito } from '@gravito/core/engine'

const app = new Gravito()

// Simple routes
app.get('/', (c) => {
  return c.json({ message: 'Hello, World!' })
})

app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ userId: id })
})

// Middleware
app.use(async (c, next) => {
  console.log(`${c.req.method} ${c.req.path}`)
  await next()
})

// Start server
export default app
```

### Predictive Route Warming (New in v1.1)

For ultra-low latency from the very first request, use `warmup()` to pre-trigger JIT optimization:

```typescript
// Warm up hot paths before starting the server
await app.warmup(['/api/users', '/health'])

export default app
```

Run with:
```bash
bun run server.ts
```

## API Reference

### Creating an App

```typescript
import { Gravito } from '@gravito/core/engine'

const app = new Gravito({
  poolSize: 256,        // Context pool size (default: 256)
  enableAOT: true,      // Enable AOT router (default: true)
})
```

### HTTP Methods

```typescript
app.get('/path', handler)
app.post('/path', handler)
app.put('/path', handler)
app.delete('/path', handler)
app.patch('/path', handler)
app.options('/path', handler)
app.head('/path', handler)
app.all('/path', handler)  // All methods
```

### Route Parameters

```typescript
app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ id })
})

app.get('/posts/:postId/comments/:commentId', (c) => {
  const postId = c.req.param('postId')
  const commentId = c.req.param('commentId')
  return c.json({ postId, commentId })
})
```

### Query Parameters

```typescript
app.get('/search', (c) => {
  const query = c.req.query('q')
  const page = c.req.query('page')
  return c.json({ query, page })
})
```

### Request Body

```typescript
// JSON
app.post('/users', async (c) => {
  const body = await c.req.json()
  return c.json({ created: body }, 201)
})

// Text
app.post('/text', async (c) => {
  const text = await c.req.text()
  return c.text(`You sent: ${text}`)
})

// Form Data
app.post('/upload', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file')
  return c.json({ uploaded: true })
})
```

### Response Helpers

```typescript
// JSON
c.json({ message: 'Hello' }, 200)

// Text
c.text('Hello, World!', 200)

// HTML
c.html('<h1>Hello</h1>', 200)

// Redirect
c.redirect('/new-path', 302)

// Custom body
c.body('Custom content', 200)
```

### Middleware

```typescript
// Global middleware
app.use(async (c, next) => {
  console.log(`${c.req.method} ${c.req.path}`)
  await next()
})

// Path-based middleware
app.use('/api/*', async (c, next) => {
  c.header('X-API-Version', '1.0')
  await next()
})

// Route-specific middleware
app.get(
  '/protected',
  async (c, next) => {
    // Auth middleware
    const token = c.req.header('Authorization')
    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    await next()
  },
  (c) => {
    // Handler
    return c.json({ secret: 'data' })
  }
)
```

### Error Handling

```typescript
// Custom error handler
app.onError((err, c) => {
  console.error('Error:', err)
  return c.json({ error: err.message }, 500)
})

// Custom 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404)
})
```

### Headers

```typescript
// Get request header
const auth = c.req.header('Authorization')

// Set response header
c.header('X-Custom', 'value')
```

## Migration from Hono

Gravito Engine is 99% API-compatible with Hono. Most Hono code works without changes:

```typescript
// Hono
import { Hono } from 'hono'
const app = new Hono()

// Gravito Engine
import { Gravito } from '@gravito/core/engine'
const app = new Gravito()

// Everything else is the same!
```

### Key Differences

1. **Import path**: `@gravito/core/engine` instead of `hono`
2. **Class name**: `Gravito` instead of `Hono`
3. **Bun-only**: No Node.js or Deno support (by design)

## Performance Tips

### 1. Use Static Routes When Possible

Static routes use O(1) Map lookup instead of tree traversal:

```typescript
// ✅ Fast (static)
app.get('/api/users', handler)

// ⚠️ Slower (dynamic)
app.get('/api/:resource', handler)
```

### 2. Minimize Middleware

Each middleware adds overhead. Combine when possible:

```typescript
// ❌ Multiple middleware
app.use(logger)
app.use(cors)
app.use(auth)

// ✅ Combined middleware
app.use(async (c, next) => {
  // Log
  console.log(c.req.path)
  // CORS
  c.header('Access-Control-Allow-Origin', '*')
  // Auth
  if (!c.req.header('Authorization')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})
```

### 3. Avoid Unnecessary Parsing

Only parse what you need:

```typescript
// ❌ Parse entire body when you only need one field
const body = await c.req.json()
const id = body.id

// ✅ Better: Use query params for simple data
const id = c.req.query('id')
```

## Advanced Usage

### Custom Pool Size

For high-traffic applications, increase the pool size:

```typescript
const app = new Gravito({
  poolSize: 512  // Default: 256
})
```

### Access Raw Request

```typescript
app.get('/raw', (c) => {
  const rawRequest = c.req.raw
  // Do something with native Request object
  return c.json({ ok: true })
})
```

## TypeScript Support

Full TypeScript support with type inference:

```typescript
import type { FastContext, Handler } from '@gravito/core/engine'

const handler: Handler = (c: FastContext) => {
  return c.json({ message: 'Typed!' })
}

app.get('/', handler)
```

## Examples

See the `examples/` directory for more examples:

- `examples/engine-simple.ts` - Basic usage
- `examples/engine-benchmark.ts` - Performance comparison (coming soon)

## Benchmarks

Coming soon! We'll provide transparent benchmarks comparing Gravito Engine with:

- Hono
- Elysia
- Native Bun.serve

## License

MIT

## Contributing

Contributions welcome! Please read our contributing guidelines first.

---

**Built with ❤️ for the Bun community**
